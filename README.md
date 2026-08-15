# Canvasly

### Your creative life, in one place.

Canvasly is **not a smaller Figma**. Figma is becoming a team platform; Canvasly deliberately goes the other direction:

> **Everything one independent creator needs to think, design, build, publish and archive — in one personal workspace.**

It is a browser-based, **local-first** personal creative operating system, packaged as an installable Progressive Web App (PWA). One codebase runs as an app on a laptop, Android phone/tablet, or iPhone/iPad. Your work is stored on your device in **IndexedDB** — no account, no server, and no internet connection required for daily use after the first visit.

## The workspace

Canvasly is organized around the creator's loop:

```text
Think → Design → Systemize → Reuse → Document → Archive → (back to Think)
```

The global navigation reflects that loop, and the canvas editor stays a focused production environment inside it:

| Space | What it's for |
| --- | --- |
| ⌂ **Home** | Your creative dashboard: recent designs, latest ideas, journal entries, snapshots, and your DNA at a glance |
| 💡 **Ideas** | A lightweight visual thinking space — notes, inspiration, references and prompts. One click turns any idea into an editable design |
| 🎨 **Design** | The full canvas editor: pan/zoom, layers, tools, comments, inspector, exports, and Canvasly AI |
| 🧩 **Systems** | Your personal design system: brand colors, type, an 8px-style spacing scale, radius tokens, brand voice — and **Canvasly DNA** |
| 📚 **Library** | Your asset universe: reusable colors, snippets, links and prompts, plus every local project |
| 📓 **Journal** | The creative process, not just the output: decisions, direction changes, client notes and lessons — optionally linked to projects |
| 🗄 **Archive** | Named snapshots instead of `final-final-v4-really-final.fig`. Save one from the editor, restore it anytime |

## Canvasly DNA

One place containing **Design DNA + Brand DNA + Code DNA + AI DNA** — your preferred type, spacing system, corner radii, style, colors, voice, stack, and standing instructions. Every AI action automatically respects it, together with your toggleable **AI Skills**. Stored only on this device.

## Canvasly AI — bring your own key (BYOK)

Canvasly has **no server and no AI subscription**. You paste your own API key, and AI calls go straight from your browser to the provider you pick. The key lives only in this browser's localStorage.

1. In the editor, click the **AI** button (sparkles) → **Set up AI**.
2. Pick a provider and paste a key:

   | Provider | Get a key | Default model |
   | --- | --- | --- |
   | OpenAI | platform.openai.com/api-keys | `gpt-4o-mini` |
   | Anthropic (Claude) | console.anthropic.com | `claude-3-5-haiku-latest` |
   | Google Gemini | aistudio.google.com/apikey | `gemini-2.0-flash` |
   | OpenAI-compatible | e.g. openrouter.ai/keys, LM Studio, Ollama | any model that endpoint serves |

3. Press **Test connection**, then **Save**.

What the AI can do today: **wireframe from a prompt** (added as fully editable layers), **plain-language design review**, and **copy improvement** on any selected text layer — all shaped by your Skills and your DNA.

### Skill files (Claude-compatible)

Skills aren't just toggles — you can **import them as files**, the same format Claude Skills use:

- A **`SKILL.md`** (or any markdown/README) with optional YAML frontmatter (`name:` / `description:`) — the body becomes the AI instructions.
- A **`.zip` bundle** containing `SKILL.md` plus reference files (`.md`, `.txt`, `.json`, `.csv`, …) — extra files become reference material the AI reads alongside the instructions.

Open **AI → Skills → Import skill (.md / .zip)**. Any imported skill can also be **exported back to a portable `SKILL.md`**, so your skills are files you own and can share — not settings locked in an app. A ready-made example lives in [`examples/skills/greene-studios-brand/`](examples/skills/greene-studios-brand/) (zip the folder and import it).

## Local-first is the brand promise

> **Your creative work belongs to you.**

```text
Local
   ↓
Optional Cloud Sync   (future)
   ↓
Optional Collaboration (future)
```

- All projects, ideas, journal entries, assets and snapshots live in IndexedDB on your device.
- Your brand kit, DNA, skills and profile live in localStorage.
- The PWA shell works fully offline after one online visit.
- One-click **offline backup** exports every project to a single file you own; re-import it anywhere.

## What works now (v0.4)

- The **creative OS shell**: Home, Ideas, Systems, Library, Journal, Archive
- Ideas → design in one click (capture → explore → create)
- Brand kit with colors, type, spacing scale, radii and voice, exportable as tokens JSON
- Canvasly DNA feeding every AI request
- Journal entries linked to projects
- Archive snapshots saved from the editor and restorable as new projects
- The full editor: offline canvas editing, pan/zoom, selection, move, duplicate, delete, undo/redo, text editing, strokes, shadows, comments, handoff panel
- Local project library with autosave, import/export, and offline backup
- BYOK AI (wireframes, reviews, copy), AI Skills, profile personalization, guided tour
- Exports: SVG, PNG (2×), Design JSON, design tokens, full backup

> Still an MVP in places: real vector pen paths, image imports, frames/groups/multi-select, Auto Layout, components, live code preview and publishing are on the roadmap — see [ROADMAP.md](ROADMAP.md).

## Export formats

| Format | Use it for |
| --- | --- |
| SVG | Vector artwork — imports cleanly into Figma and Sketch |
| PNG | 2× raster image for sharing and decks |
| Design JSON | Full editable document data (Canvasly re-imports it) |
| Design tokens | Colors and text styles extracted from the design; the brand kit exports richer tokens |
| Offline backup | Every local project in one file |
| Snapshot to Archive | A named version of the current design, kept inside Canvasly |

> **About `.fig` and `.sketch`:** these are proprietary formats only Figma and Sketch themselves can write. The practical path is **Export → SVG**, then import that SVG.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm run deploy   # build + wrangler deploy
```

## Privacy

Designs never leave the device. When you use an AI action, only your prompt, a compact canvas summary, your active Skills and your DNA are sent to the provider **you** configured — never to Canvasly itself, because there is no Canvasly server.
