/* Canvasly DNA — a personal creative profile the AI reads on every request.
 * Design DNA + Brand DNA + Code DNA + AI DNA, all stored on this device. */

export type CreativeDna = {
  /** Design DNA */
  preferredType: string
  spacingSystem: string
  cornerRadius: string
  primaryStyle: string
  preferredColors: string
  /** Brand DNA */
  voice: string
  /** Code DNA */
  stack: string
  /** AI DNA */
  aiNotes: string
}

const DNA_KEY = 'canvasly-dna-v1'

export const DEFAULT_DNA: CreativeDna = {
  preferredType: '',
  spacingSystem: '',
  cornerRadius: '',
  primaryStyle: '',
  preferredColors: '',
  voice: '',
  stack: '',
  aiNotes: '',
}

export const DNA_FIELDS: { key: keyof CreativeDna; group: 'Design DNA' | 'Brand DNA' | 'Code DNA' | 'AI DNA'; label: string; placeholder: string }[] = [
  { key: 'preferredType', group: 'Design DNA', label: 'Preferred type', placeholder: 'e.g. Inter / Geist' },
  { key: 'spacingSystem', group: 'Design DNA', label: 'Spacing', placeholder: 'e.g. 8px system' },
  { key: 'cornerRadius', group: 'Design DNA', label: 'Corner radius', placeholder: 'e.g. 12–20px' },
  { key: 'primaryStyle', group: 'Design DNA', label: 'Primary style', placeholder: 'e.g. Minimal / editorial' },
  { key: 'preferredColors', group: 'Design DNA', label: 'Preferred colors', placeholder: 'e.g. Neutral + one accent' },
  { key: 'voice', group: 'Brand DNA', label: 'Voice', placeholder: 'e.g. Concise / confident' },
  { key: 'stack', group: 'Code DNA', label: 'Common stack', placeholder: 'e.g. React / Next.js / Tailwind' },
  { key: 'aiNotes', group: 'AI DNA', label: 'Standing instructions', placeholder: 'Anything the AI should always know about how you work' },
]

export function loadDna(): CreativeDna {
  try {
    const raw = window.localStorage.getItem(DNA_KEY)
    if (!raw) return { ...DEFAULT_DNA }
    const parsed = JSON.parse(raw) as Partial<CreativeDna>
    const dna = { ...DEFAULT_DNA }
    for (const key of Object.keys(DEFAULT_DNA) as (keyof CreativeDna)[]) {
      if (typeof parsed[key] === 'string') dna[key] = (parsed[key] as string).slice(0, 300)
    }
    return dna
  } catch {
    return { ...DEFAULT_DNA }
  }
}

export function saveDna(dna: CreativeDna) {
  window.localStorage.setItem(DNA_KEY, JSON.stringify(dna))
}

export function dnaIsEmpty(dna: CreativeDna): boolean {
  return Object.values(dna).every((value) => !value.trim())
}

/** Composes the DNA into instructions appended to every AI request. */
export function composeDnaInstructions(dna: CreativeDna): string {
  const lines: string[] = []
  for (const field of DNA_FIELDS) {
    const value = dna[field.key].trim()
    if (value) lines.push(`- ${field.label}: ${value}`)
  }
  if (lines.length === 0) return ''
  return `The user's creative DNA (always respect these personal preferences):\n${lines.join('\n')}`
}
