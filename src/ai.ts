/* Canvasly AI — bring-your-own-key (BYOK).
 * The user's API key lives only in this browser (localStorage) and is sent
 * exclusively to the provider endpoint the user picked. Canvasly has no server. */

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'compatible'

export type AiSettings = {
  provider: AiProvider
  apiKey: string
  model: string
  baseUrl: string
}

export type WireframeNode = {
  type: 'rect' | 'ellipse' | 'text'
  name?: string
  x: number
  y: number
  width: number
  height: number
  fill?: string
  radius?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  color?: string
}

const SETTINGS_KEY = 'canvasly-ai-settings-v1'

export const PROVIDERS: { id: AiProvider; label: string; keyHint: string; defaultModel: string; keyUrl: string }[] = [
  { id: 'openai', label: 'OpenAI', keyHint: 'sk-…', defaultModel: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', label: 'Anthropic (Claude)', keyHint: 'sk-ant-…', defaultModel: 'claude-3-5-haiku-latest', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'gemini', label: 'Google Gemini', keyHint: 'AIza…', defaultModel: 'gemini-2.0-flash', keyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'compatible', label: 'OpenAI-compatible (OpenRouter, local…)', keyHint: 'API key for that service', defaultModel: 'gpt-4o-mini', keyUrl: 'https://openrouter.ai/keys' },
]

export const DEFAULT_SETTINGS: AiSettings = { provider: 'openai', apiKey: '', model: '', baseUrl: '' }

export function loadAiSettings(): AiSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    return {
      provider: parsed.provider === 'anthropic' || parsed.provider === 'gemini' || parsed.provider === 'compatible' ? parsed.provider : 'openai',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveAiSettings(settings: AiSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function clearAiSettings() {
  window.localStorage.removeItem(SETTINGS_KEY)
}

export function providerMeta(provider: AiProvider) {
  return PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0]
}

function resolveModel(settings: AiSettings) {
  return settings.model.trim() || providerMeta(settings.provider).defaultModel
}

export function aiConfigured(settings: AiSettings) {
  return settings.apiKey.trim().length > 8
}

/* ------------------------------------------------------------------ */
/* Provider calls                                                      */
/* ------------------------------------------------------------------ */

export class AiError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message)
  }
}

function friendlyHttpError(provider: string, status: number, body: string): AiError {
  let detail = ''
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string }
    detail = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message ?? ''
  } catch {
    detail = body.replace(/\s+/g, ' ').slice(0, 160)
  }
  // Keep the endpoint's own explanation — it usually says exactly what's wrong
  // (expired credits, unknown model, wrong header…), which beats a generic guess.
  const said = detail.trim() ? ` The endpoint said: “${detail.trim().slice(0, 200)}”.` : ''
  if (status === 401 || status === 403) return new AiError(`${provider} rejected the API key.${said}`, 'Double-check the key in AI settings, or confirm the account has access.')
  if (status === 404) return new AiError(`${provider} could not find that model.${said}`, 'Check the model name in AI settings — the default usually works.')
  if (status === 429) return new AiError(`${provider} rate limit reached.${said}`, 'Wait a moment and try again, or check your plan limits.')
  return new AiError(`${provider} returned an error (${status}).`, detail.trim() || undefined)
}

async function chat(settings: AiSettings, system: string, user: string, jsonMode: boolean): Promise<string> {
  const model = resolveModel(settings)
  const key = settings.apiKey.trim()

  if (settings.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Anthropic's documented opt-in for direct browser requests.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 1800, temperature: 0.5, system, messages: [{ role: 'user', content: user }] }),
    })
    if (!response.ok) throw friendlyHttpError('Anthropic', response.status, await response.text())
    const data = await response.json() as { content?: { type: string; text?: string }[] }
    const text = (data.content ?? []).filter((block) => block.type === 'text').map((block) => block.text ?? '').join('')
    if (!text) throw new AiError('Anthropic returned an empty answer.', 'Try again, or use a smaller prompt.')
    return text
  }

  if (settings.provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.5, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) },
      }),
    })
    if (!response.ok) throw friendlyHttpError('Google Gemini', response.status, await response.text())
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = (data.candidates ?? []).flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text ?? '').join('')
    if (!text) throw new AiError('Gemini returned an empty answer.', 'Try again, or rephrase the prompt.')
    return text
  }

  // OpenAI and any OpenAI-compatible endpoint (OpenRouter, LM Studio, Ollama…).
  const base = (settings.baseUrl.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${key}` }
  // Some OpenAI-compatible gateways read the key from `x-api-key` rather than
  // (or in addition to) the standard Bearer header — send both so either style authenticates.
  if (settings.provider === 'compatible') headers['x-api-key'] = key
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.5,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  })
  if (!response.ok) throw friendlyHttpError(settings.provider === 'openai' ? 'OpenAI' : 'The AI endpoint', response.status, await response.text())
  const data = await response.json() as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new AiError('The AI returned an empty answer.', 'Try again, or rephrase the prompt.')
  return text
}

async function callWithNetworkFallback(settings: AiSettings, system: string, user: string, jsonMode: boolean): Promise<string> {
  try {
    return await chat(settings, system, user, jsonMode)
  } catch (error) {
    if (error instanceof TypeError && !navigator.onLine) {
      throw new AiError('You are offline.', 'AI calls need a connection. Canvasly editing still works offline.')
    }
    if (error instanceof TypeError) {
      throw new AiError('Could not reach the AI provider.', 'Check your connection. For custom endpoints, make sure the server allows browser (CORS) requests.')
    }
    throw error
  }
}

export async function testAiConnection(settings: AiSettings): Promise<string> {
  const reply = await callWithNetworkFallback(settings, 'You are a connectivity test. Reply with the single word OK.', 'Ping.', false)
  return reply.trim().slice(0, 80)
}

/* ------------------------------------------------------------------ */
/* Canvas-aware prompts                                                */
/* ------------------------------------------------------------------ */

type CanvasNodeLike = {
  id: string
  type: string
  name: string
  x: number
  y: number
  width: number
  height: number
  fill?: string
  text?: string
  fontSize?: number
  color?: string
}

export function buildDesignSummary(nodes: CanvasNodeLike[]): string {
  const lines = nodes.slice(0, 48).map((node) => {
    const shape = `${Math.round(node.width)}×${Math.round(node.height)} at (${Math.round(node.x)}, ${Math.round(node.y)})`
    if (node.type === 'text') return `- text "${(node.text ?? '').replace(/\s+/g, ' ').slice(0, 90)}" · font ${node.fontSize ?? 16}px · ${shape}`
    return `- ${node.type} "${node.name}" · fill ${node.fill ?? 'none'} · ${shape}`
  })
  return `Canvas artboard: 1440×900 desktop frame.\nLayers (top to bottom):\n${lines.join('\n')}`
}

/* --- Wireframe generation ----------------------------------------- */

const WIREFRAME_SYSTEM = `You are the design assistant inside Canvasly, an offline design workspace.
You generate simple, tidy wireframes as JSON that Canvasly renders as editable layers.

Respond with ONLY a JSON object, no prose and no markdown, matching exactly:
{"nodes":[{"type":"rect"|"ellipse"|"text","name":"short label","x":number,"y":number,"width":number,"height":number,"fill":"#hex","radius":number,"text":"copy for text nodes","fontSize":number,"fontWeight":number,"color":"#hex"}]}

Rules:
- Lay everything out inside a 1280px wide space, starting near (0,0). Keep total height under 1500.
- Use at most 14 nodes. Prefer big simple blocks: header bar, hero heading, body copy, buttons, cards.
- Every visible word must be a "text" node with realistic copy (no lorem ipsum).
- Palette: ink #1C1C1A, paper #FFFFFF, mist #F0EFEA, lime #D1FF5C, violet #C4B2FF, muted text #625F58.
- Buttons: rounded rect (radius ~ half height) + centered text node on top.
- Text nodes: fill is irrelevant, set "text", "fontSize", "color", "fontWeight".
- Give every node a clear "name" like "Hero / Heading".`

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)
}

export function parseWireframe(raw: string): WireframeNode[] {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) throw new AiError('The AI answer was not valid JSON.', 'Try again — generating once more usually fixes this.')
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { nodes?: unknown[] }
  if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) throw new AiError('The AI returned no wireframe layers.', 'Try again with a slightly more specific prompt.')

  return parsed.nodes.slice(0, 16).flatMap((item): WireframeNode[] => {
    if (!item || typeof item !== 'object') return []
    const node = item as Record<string, unknown>
    const type = node.type === 'ellipse' ? 'ellipse' : node.type === 'text' ? 'text' : 'rect'
    const result: WireframeNode = {
      type,
      name: typeof node.name === 'string' ? node.name.slice(0, 48) : undefined,
      x: clamp(Number(node.x), -100, 3000),
      y: clamp(Number(node.y), -100, 3000),
      width: clamp(Number(node.width), 12, 1600),
      height: clamp(Number(node.height), 8, 1200),
    }
    if (type === 'text') {
      const text = typeof node.text === 'string' ? node.text.slice(0, 300) : 'Text'
      result.text = text
      result.fontSize = clamp(Number(node.fontSize), 9, 96)
      result.fontWeight = clamp(Number(node.fontWeight) || 600, 300, 900)
      result.color = isHexColor(node.color) ? node.color : '#1C1C1A'
      result.fill = 'transparent'
    } else {
      result.fill = isHexColor(node.fill) ? node.fill : type === 'ellipse' ? '#C4B2FF' : '#F0EFEA'
      result.radius = clamp(Number(node.radius) || 0, 0, 200)
    }
    return [result]
  })
}

export async function generateWireframe(settings: AiSettings, prompt: string, extraRules = ''): Promise<WireframeNode[]> {
  const raw = await callWithNetworkFallback(settings, WIREFRAME_SYSTEM + (extraRules ? `\n\n${extraRules}` : ''), `Design a wireframe for: ${prompt.trim().slice(0, 600)}`, true)
  return parseWireframe(raw)
}

/* --- Design review --------------------------------------------------*/

export async function reviewDesign(settings: AiSettings, summary: string, extraRules = ''): Promise<string> {
  return callWithNetworkFallback(
    settings,
    'You are a friendly senior product designer reviewing a screen inside Canvasly. Write for a non-designer: plain language, no jargon, short sentences.' + (extraRules ? `\n\n${extraRules}` : ''),
    `${summary}\n\nFirst, explain what this screen is in 2–3 plain sentences. Then give exactly 3 specific, actionable improvements as a numbered list. Keep the whole reply under 160 words.`,
    false,
  )
}

/* --- Copy improvements ----------------------------------------------*/

export async function suggestCopy(settings: AiSettings, currentText: string, layerName: string, extraRules = ''): Promise<string[]> {
  const raw = await callWithNetworkFallback(
    settings,
    'You are a concise UX copywriter. Improve short UI copy without changing its meaning or tone. Respond with ONLY JSON: {"options":["…","…","…"]}' + (extraRules ? `\n\n${extraRules}` : ''),
    `The layer is named "${layerName}". Current copy: "${currentText.slice(0, 300)}". Give exactly 3 improved alternatives, each similar in length to the original.`,
    true,
  )
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const parsed = JSON.parse(cleaned.slice(start, cleaned.lastIndexOf('}') + 1)) as { options?: unknown[] }
  const options = (parsed.options ?? []).filter((option): option is string => typeof option === 'string' && option.trim().length > 0).map((option) => option.slice(0, 300))
  if (options.length === 0) throw new AiError('The AI returned no copy options.', 'Try again.')
  return options.slice(0, 3)
}
