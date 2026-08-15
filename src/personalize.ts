/* Personalization: AI skills and the user's profile.
 * Both live in localStorage, so they persist across sessions on this device. */

/** A reference file bundled with an imported skill (from a zip). */
export type SkillResource = {
  path: string
  text: string
}

export type AiSkill = {
  id: string
  name: string
  description: string
  instructions: string
  enabled: boolean
  builtin?: boolean
  /** 'file' when imported from SKILL.md / README / zip, matching Claude Skills. */
  source?: 'file'
  resources?: SkillResource[]
}

export type Profile = {
  name: string
  color: string
}

const SKILLS_KEY = 'canvasly-ai-skills-v1'
const PROFILE_KEY = 'canvasly-profile-v1'

export const PROFILE_COLORS = ['#C7F162', '#E6B4F7', '#A4D6FF', '#FFD9A1', '#F5B8B0', '#B8E8D8']

export const DEFAULT_PROFILE: Profile = { name: 'You', color: '#C7F162' }

export const BUILTIN_SKILLS: AiSkill[] = [
  {
    id: 'plain-voice',
    name: 'Plain, friendly voice',
    description: 'Copy and reviews use simple words — no jargon, no hype.',
    instructions: 'Write in a plain, friendly voice. Short sentences. No jargon, no marketing clichés.',
    enabled: true,
    builtin: true,
  },
  {
    id: 'minimal-wireframes',
    name: 'Minimal wireframes',
    description: 'Fewer, larger blocks with generous spacing.',
    instructions: 'Prefer minimal layouts: fewer and larger blocks, generous spacing, at most about 8 nodes total.',
    enabled: false,
    builtin: true,
  },
  {
    id: 'mobile-first',
    name: 'Mobile-first layouts',
    description: 'Wireframes laid out like a phone screen.',
    instructions: 'Lay wireframes out as a single column about 390px wide (a phone screen) instead of 1280px wide.',
    enabled: false,
    builtin: true,
  },
  {
    id: 'a11y-critic',
    name: 'Accessibility focus',
    description: 'Reviews check contrast, tap targets, and readability first.',
    instructions: 'When reviewing a design, check color contrast, touch target sizes, and text readability first, and mention problems before praise.',
    enabled: false,
    builtin: true,
  },
]

export function loadSkills(): AiSkill[] {
  try {
    const raw = window.localStorage.getItem(SKILLS_KEY)
    if (!raw) return BUILTIN_SKILLS.map((skill) => ({ ...skill }))
    const saved = JSON.parse(raw) as AiSkill[]
    if (!Array.isArray(saved)) return BUILTIN_SKILLS.map((skill) => ({ ...skill }))
    // Keep custom skills, and re-sync built-ins so new releases can add or fix them
    // while preserving the user's on/off choices and edits.
    const builtins = BUILTIN_SKILLS.map((builtin) => {
      const existing = saved.find((skill) => skill.id === builtin.id)
      return existing ? { ...builtin, enabled: existing.enabled, instructions: existing.instructions } : { ...builtin }
    })
    const customs = saved.filter((skill) => !BUILTIN_SKILLS.some((builtin) => builtin.id === skill.id))
    return [...builtins, ...customs]
  } catch {
    return BUILTIN_SKILLS.map((skill) => ({ ...skill }))
  }
}

export function saveSkills(skills: AiSkill[]) {
  window.localStorage.setItem(SKILLS_KEY, JSON.stringify(skills))
}

/** Combines every enabled skill into extra rules appended to AI system prompts.
 * Short skills stay as one-line rules; imported skill files keep their full
 * markdown body, and any bundled reference files are attached after it. */
export function composeSkillInstructions(skills: AiSkill[]): string {
  const active = skills.filter((skill) => skill.enabled && skill.instructions.trim())
  if (active.length === 0) return ''

  const simple = active.filter((skill) => skill.source !== 'file')
  const files = active.filter((skill) => skill.source === 'file')
  const parts: string[] = []

  if (simple.length) {
    parts.push(`Additional style rules from the user's active skills:\n${simple.map((skill) => `- ${skill.name}: ${skill.instructions.trim()}`).join('\n')}`)
  }
  for (const skill of files) {
    let block = `Active skill "${skill.name}" — follow these instructions:\n${skill.instructions.trim()}`
    for (const resource of skill.resources ?? []) {
      block += `\n\nReference file from this skill (${resource.path}):\n${resource.text}`
    }
    parts.push(block)
  }
  return parts.join('\n\n')
}

export function loadProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) return { ...DEFAULT_PROFILE }
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 40) : DEFAULT_PROFILE.name,
      color: typeof parsed.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(parsed.color) ? parsed.color : DEFAULT_PROFILE.color,
    }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

export function saveProfile(profile: Profile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'YO'
  const initials = parts.slice(0, 2).map((part) => part[0] ?? '').join('')
  return (initials || 'YO').toUpperCase()
}
