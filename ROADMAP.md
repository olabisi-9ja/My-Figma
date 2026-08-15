# Canvasly roadmap

**The thesis:** don't build a smaller Figma. Build **a one-person product studio in a browser** — one coherent workflow connecting a single creator's ideas, design, AI, code, assets, projects and publishing.

The product loop Canvasly is built around:

```text
IDEAS → DESIGN → SYSTEM → PROTOTYPE → BUILD → PUBLISH → ARCHIVE → (back to IDEAS)
```

AI sits across every stage — not in a separate tab.

---

## ✅ v0.4 — The creative OS shell *(current)*

- Global navigation: Home · Ideas · Design · Systems · Library · Journal · Archive
- Ideas space: capture notes/inspiration/references/prompts, one-click "Create design"
- Systems space: brand kit (colors, type, spacing scale, radii, voice) + tokens export
- **Canvasly DNA**: Design + Brand + Code + AI DNA appended to every AI request
- Library space: reusable colors, snippets, links, prompts + project list
- Journal space: dated entries, optionally linked to projects
- Archive space: named snapshots saved from the editor, restorable as projects
- Everything local-first (IndexedDB + localStorage), fully offline PWA

## v0.5 — Canvas

Make the editor a real production environment:

- Real frames and groups (parenting, clipping)
- Multi-select, marquee select
- Resize handles on all sides + corners
- Alignment and distribution actions
- Snapping (edges, centers, spacing)
- Image import (stored in IndexedDB)
- Copy/paste across projects
- Vector pen paths
- Keyboard navigation of layers

## v0.6 — Systems in the canvas

- Auto Layout
- Constraints
- Components + variants (backed by the Library)
- Variables bound to brand-kit tokens
- Shared styles applied from the Systems space
- Theme switching (Light / Dark / Brand / Client / Experimental)

## v0.7 — Intelligence

AI as a layer across the whole ecosystem:

- AI commands on canvas ("make this section responsive")
- AI edits on components ("create a mobile variant")
- Design critique with DNA awareness ("find inconsistent spacing")
- Token generation from an existing design
- Turn Ideas cards into visual directions
- DNA that learns from what you repeatedly use

## v0.8 — Build

- Design / Code / Preview views of the same document
- Canvas → component → React + Tailwind generation
- HTML/CSS export
- Editable code layers with live preview

## v0.9 — Publish

- One-click publishing: landing pages, portfolios, prototypes, shareable previews
- Custom domains
- Public read-only project links
- No export/import cycle: Idea → Design → Build → Preview → Publish

## v1.0 — Optional cloud

Collaboration stays **optional** — the product assumes *"I am the creator"*:

- Solo mode (default): everything local
- Share mode: generate a link
- Review mode: invite someone to comment
- Collaborate mode: turn on multiplayer
- Optional encrypted cloud sync

---

### Positioning

> **Canvasly — your creative life, in one place.**

Local-first. Personal by default. No team bureaucracy, no organization admin, no collaboration complexity unless you choose it.
