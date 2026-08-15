/* Skill files — import skills the way Claude Skills work.
 *
 * A skill can be:
 *   1. A single markdown file (SKILL.md / README.md / anything.md) with
 *      optional YAML frontmatter:  name / description
 *   2. A .zip bundle containing SKILL.md plus reference files
 *      (extra .md/.txt/.json/.csv files become searchable "resources"
 *      the AI can read alongside the instructions).
 *
 * Everything is parsed in the browser — no server, no dependencies.
 * The zip reader supports stored and deflate entries via the native
 * DecompressionStream, which every modern browser ships. */

import type { AiSkill, SkillResource } from './personalize'

export type ParsedSkill = {
  name: string
  description: string
  instructions: string
  resources: SkillResource[]
}

/* Keep prompts sane: instructions + resources are capped before they are
 * ever appended to an AI request. */
export const MAX_INSTRUCTIONS_CHARS = 6000
export const MAX_RESOURCE_CHARS = 4000
export const MAX_TOTAL_RESOURCE_CHARS = 12000

const TEXT_EXTENSIONS = ['.md', '.markdown', '.txt', '.json', '.csv', '.yaml', '.yml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx']

/* ------------------------------------------------------------------ */
/* Frontmatter + markdown                                              */
/* ------------------------------------------------------------------ */

/** Parses optional YAML frontmatter (--- ... ---) from a markdown file.
 * Only flat `key: value` pairs are read — enough for name/description. */
function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { meta: {}, body: text.trim() }
  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (pair) meta[pair[1].toLowerCase()] = pair[2].trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: text.slice(match[0].length).trim() }
}

/** Falls back to the first markdown heading when frontmatter has no name. */
function titleFromMarkdown(body: string): string {
  const heading = body.match(/^#{1,3}\s+(.+)$/m)
  return heading ? heading[1].trim() : ''
}

export function parseSkillMarkdown(text: string, fallbackName: string): ParsedSkill {
  const { meta, body } = parseFrontmatter(text)
  const name = meta.name || meta.title || titleFromMarkdown(body) || fallbackName
  const description = meta.description || body.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))?.trim().slice(0, 140) || 'Imported skill'
  return {
    name: name.slice(0, 80),
    description: description.slice(0, 160),
    instructions: body.slice(0, MAX_INSTRUCTIONS_CHARS),
    resources: [],
  }
}

/* ------------------------------------------------------------------ */
/* Zip reader (no dependencies)                                        */
/* ------------------------------------------------------------------ */

type ZipEntry = { path: string; method: number; compressedData: Uint8Array }

function findEndOfCentralDirectory(view: DataView): number {
  // EOCD signature 0x06054b50, scan backwards over the (max 64KB) comment.
  const minPos = Math.max(0, view.byteLength - 65557)
  for (let i = view.byteLength - 22; i >= minPos; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i
  }
  throw new Error('Not a valid zip file.')
}

function readZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const eocd = findEndOfCentralDirectory(view)
  const entryCount = view.getUint16(eocd + 10, true)
  let offset = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []

  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const path = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))

    // Local header: skip its own (possibly different) name/extra lengths.
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    entries.push({ path, method, compressedData: bytes.subarray(dataStart, dataStart + compressedSize) })

    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function inflateEntry(entry: ZipEntry): Promise<string> {
  if (entry.method === 0) return new TextDecoder().decode(entry.compressedData)
  if (entry.method === 8) {
    const stream = new Blob([new Uint8Array(entry.compressedData)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return await new Response(stream).text()
  }
  throw new Error(`Unsupported zip compression method ${entry.method}.`)
}

function isTextFile(path: string): boolean {
  const lower = path.toLowerCase()
  return TEXT_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

function isJunk(path: string): boolean {
  return path.endsWith('/') || path.includes('__MACOSX') || path.split('/').some((part) => part.startsWith('.'))
}

export async function parseSkillZip(buffer: ArrayBuffer, fallbackName: string): Promise<ParsedSkill> {
  const entries = readZipEntries(buffer).filter((entry) => !isJunk(entry.path) && isTextFile(entry.path))
  if (entries.length === 0) throw new Error('No readable text files were found in this zip.')

  // The main file: SKILL.md first (Claude convention), then README.md, then any .md.
  const score = (path: string) => {
    const name = path.toLowerCase().split('/').pop() ?? ''
    if (name === 'skill.md') return 0
    if (name === 'readme.md') return 1
    if (name.endsWith('.md')) return 2
    return 3
  }
  const sorted = [...entries].sort((a, b) => score(a.path) - score(b.path) || a.path.length - b.path.length)
  const main = sorted[0]
  const mainText = await inflateEntry(main)
  const skill = parseSkillMarkdown(mainText, fallbackName)

  // Everything else becomes bundled reference material, capped for prompt size.
  const resources: SkillResource[] = []
  let total = 0
  for (const entry of sorted.slice(1)) {
    if (total >= MAX_TOTAL_RESOURCE_CHARS) break
    try {
      const text = (await inflateEntry(entry)).trim()
      if (!text) continue
      const clipped = text.slice(0, Math.min(MAX_RESOURCE_CHARS, MAX_TOTAL_RESOURCE_CHARS - total))
      resources.push({ path: entry.path, text: clipped })
      total += clipped.length
    } catch {
      // Skip an unreadable entry rather than failing the whole import.
    }
  }
  return { ...skill, resources }
}

/* ------------------------------------------------------------------ */
/* Import + export helpers                                             */
/* ------------------------------------------------------------------ */

/** Imports a skill from a user-picked file: .zip bundle or markdown/text. */
export async function importSkillFile(file: File): Promise<ParsedSkill> {
  const fallbackName = file.name.replace(/\.(zip|md|markdown|txt)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Imported skill'
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
  if (isZip) return parseSkillZip(await file.arrayBuffer(), fallbackName)
  const text = await file.text()
  if (!text.trim()) throw new Error('This file is empty.')
  return parseSkillMarkdown(text, fallbackName)
}

/** Serializes any skill back to a portable SKILL.md (Claude-compatible). */
export function skillToMarkdown(skill: AiSkill): string {
  const frontmatter = [`---`, `name: ${skill.name}`, `description: ${skill.description.replace(/\r?\n/g, ' ')}`, `---`, ``].join('\n')
  const body = skill.instructions.trim()
  const resources = (skill.resources ?? []).map((resource) => `\n\n<!-- resource: ${resource.path} -->\n\n${resource.text}`).join('')
  return `${frontmatter}\n${body}${resources}\n`
}
