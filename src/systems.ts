/* Canvasly Systems — a solo creator's design system.
 * The brand kit lives in localStorage so it follows you across projects
 * on this device, and it can be exported as design tokens at any time. */

export type BrandKit = {
  colors: { name: string; value: string }[]
  fontHeading: string
  fontBody: string
  spacingBase: number
  radii: { name: string; value: number }[]
  voice: string
}

const BRAND_KEY = 'canvasly-brand-kit-v1'

export const DEFAULT_BRAND: BrandKit = {
  colors: [
    { name: 'brand.primary', value: '#1C1C1A' },
    { name: 'brand.accent', value: '#D1FF5C' },
    { name: 'brand.surface', value: '#FCFAF8' },
    { name: 'brand.muted', value: '#827D73' },
  ],
  fontHeading: 'Inter',
  fontBody: 'Inter',
  spacingBase: 8,
  radii: [
    { name: 'radius.sm', value: 6 },
    { name: 'radius.md', value: 12 },
    { name: 'radius.lg', value: 20 },
  ],
  voice: 'Concise and confident. Plain words over jargon.',
}

export function loadBrandKit(): BrandKit {
  try {
    const raw = window.localStorage.getItem(BRAND_KEY)
    if (!raw) return structuredClone(DEFAULT_BRAND)
    const parsed = JSON.parse(raw) as Partial<BrandKit>
    return {
      colors: Array.isArray(parsed.colors) && parsed.colors.length ? parsed.colors : DEFAULT_BRAND.colors,
      fontHeading: typeof parsed.fontHeading === 'string' ? parsed.fontHeading : DEFAULT_BRAND.fontHeading,
      fontBody: typeof parsed.fontBody === 'string' ? parsed.fontBody : DEFAULT_BRAND.fontBody,
      spacingBase: typeof parsed.spacingBase === 'number' && parsed.spacingBase > 0 ? parsed.spacingBase : DEFAULT_BRAND.spacingBase,
      radii: Array.isArray(parsed.radii) && parsed.radii.length ? parsed.radii : DEFAULT_BRAND.radii,
      voice: typeof parsed.voice === 'string' ? parsed.voice : DEFAULT_BRAND.voice,
    }
  } catch {
    return structuredClone(DEFAULT_BRAND)
  }
}

export function saveBrandKit(kit: BrandKit) {
  window.localStorage.setItem(BRAND_KEY, JSON.stringify(kit))
}

/** Spacing scale derived from the base unit: space.1 … space.8. */
export function spacingScale(base: number): { name: string; value: number }[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((step) => ({ name: `space.${step}`, value: base * step }))
}

/** A tokens document ready to paste into code or hand to AI. */
export function brandTokensJson(kit: BrandKit): string {
  const tokens: Record<string, string | number> = {}
  for (const color of kit.colors) tokens[color.name] = color.value
  for (const space of spacingScale(kit.spacingBase)) tokens[space.name] = space.value
  for (const radius of kit.radii) tokens[radius.name] = radius.value
  tokens['font.heading'] = kit.fontHeading
  tokens['font.body'] = kit.fontBody
  return JSON.stringify({ format: 'canvasly-tokens', version: 2, tokens, voice: kit.voice }, null, 2)
}
