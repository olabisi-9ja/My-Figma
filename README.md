# Canvasly — offline personal design workspace

Canvasly is a browser-based, **offline-first** design workspace for personal use. It is packaged as an installable Progressive Web App (PWA), so one codebase can be used as an application on a laptop, Android phone/tablet, or iPhone/iPad.

Your projects are stored on the device in **IndexedDB**. No account, server, or internet connection is required for daily editing after the app has been opened once online.

## What works now

- Installable PWA app shell with an offline fallback
- Offline canvas editing, pan/zoom, selection, move, duplicate, delete, undo, and redo
- Rectangle, ellipse, text, frame-placeholder, and pen-placeholder creation tools
- Touch-friendly drawer panels for layers and properties on tablets and phones
- Local project library: create, rename, open, and delete projects
- IndexedDB autosave for larger, durable local project data
- Editable design properties, comments UI, component starters, and handoff panel
- Export the current design as SVG or editable Design JSON
- Export a complete offline backup of every local project
- Import a Canvasly backup or exported Design JSON file

> This remains an interface MVP: collaborative sync, real vector pen paths, image imports, version history, authentication, and a prototype player are future milestones.

## Run locally

```bash
npm install
npm run dev
```

Open the address printed by Vite, usually `http://localhost:5173`.

For a production build:

```bash
npm run build
npm run preview
```

## Deploy to Cloudflare Workers

This repo includes a `wrangler.jsonc` that deploys the `dist/` build as static assets on a Cloudflare Worker (`my-figma`), with single-page-app fallback for unmatched routes. No Worker script is needed — it is a pure static deployment.

```bash
npm run deploy        # builds, then runs `wrangler deploy`
```

Requires `CLOUDFLARE_API_TOKEN` (and optionally `CLOUDFLARE_ACCOUNT_ID`) in the environment, or `wrangler login` locally.

## Install it as an app

A PWA must be served over **HTTPS** in regular use (localhost is allowed for development). Deploy the `dist/` folder from `npm run build` to Cloudflare Pages, Netlify, Vercel, or any HTTPS static host.

After opening the deployed app once online:

| Device | Install action |
| --- | --- |
| Chrome / Edge on laptop | Use the install icon in the address bar, or the in-app **Install** button when shown. |
| Android phone or tablet | Chrome menu → **Install app** or **Add to Home screen**. |
| iPhone / iPad | Open in Safari → **Share** → **Add to Home Screen**. |
| macOS Safari | Open the Share menu → **Add to Dock**. |

The installed app opens in its own window/full-screen mode and keeps the app code cached for offline use. All local projects remain available while offline.

## Offline data and backups

- Canvasly autosaves project changes to the device’s IndexedDB store after a short pause.
- Use **Export → Offline backup** periodically to download every local project in one JSON file.
- Use the project menu beside the Canvasly icon to import a backup or a single exported Design JSON document.
- Browser storage belongs to that browser and device. An exported backup is important before clearing browser data, changing devices, or using private/incognito mode.

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

## Recommended next phases

1. Add real image/SVG import and an actual pen/vector path model.
2. Add document snapshots/version history locally.
3. Wrap this PWA with Capacitor if you later need App Store/Play Store packages and deeper device integration.
4. Add an authenticated cloud sync service, then WebSocket operations, presence, comments, and collaboration for SaaS use.
