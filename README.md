# Canvasly — personal design workspace

A polished, browser-based MVP for a personal Figma-like workspace. It is deliberately local-first: your working document is saved to the browser, so it is useful immediately without needing an account or hosted infrastructure.

## Included in this MVP

- A focused infinite-canvas-style editor with pan and zoom controls
- Select, move, duplicate, delete, and inspect individual layers
- Rectangle, ellipse, text, frame-placeholder, and pen-placeholder creation tools
- Layer tree, reusable local component starters, and a detailed property inspector
- Design, prototype/comments, and handoff/inspect panels
- Local browser persistence, keyboard shortcuts, undo/redo, and JSON/SVG export
- Share and export UI foundations ready to be connected to a backend later

## Run locally

```bash
npm install
npm run dev
```

Then open the local address printed by Vite (usually `http://localhost:5173`).

To make a production build:

```bash
npm run build
```

## Useful keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Move/select | `V` |
| Rectangle | `R` |
| Ellipse | `O` |
| Text | `T` |
| Hand/pan | `H` |
| Duplicate selected layer | `Cmd/Ctrl + D` |
| Undo / redo | `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` |
| Save local draft | `Cmd/Ctrl + S` |
| Delete selected layer | `Backspace` or `Delete` |

## Recommended next milestones

1. Extract the document model, command stack, and renderer into separate modules.
2. Add real image/SVG imports and an actual pen/vector path model.
3. Persist documents to a service with authentication instead of browser local storage.
4. Add WebSocket operation sync, presence, comments, and version snapshots for collaboration.
5. Turn the prototype panel into an interaction graph and presentation player.

This project is an interface MVP, not yet a replacement for Figma's rendering or real-time collaboration engine.
