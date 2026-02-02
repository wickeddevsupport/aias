# Vector Maestro Starter Guide

This file is a quick map of the repo, how the app works, and the next steps to reach a full "Vector Maestro" product.

## What This Repo Is
- A Vite + React canvas editor for SVG/animation built on Konva.
- A single Node server (`server.js`) that serves the built UI and hosts the in-house AI API.

## Quick Start (Local)
1) Install deps:
   `npm install`
2) Run UI:
   `npm run dev`
3) Run server (AI + static files):
   `npm run start`
4) Optional: set `VITE_AI_API_BASE=http://localhost:3000` in `.env.local`

## Repo Map (Where Things Are)
- `App.tsx`
  - App shell, main state usage, timeline, panels, and AI dispatch.
- `components/`
  - UI + editor panels, toolbar, menus, dialogs.
- `components/konva/`
  - Canvas render pipeline (Konva nodes, hitboxes, transforms).
- `components/KonvaCanvasContainer.tsx`
  - Stage/event handling, selection, transforms, double-click editing logic.
- `contexts/`
  - App state, reducers, action handlers, history, and selection logic.
- `utils/`
  - Export, path utils, animation interpolation, svg parsing.
- `aiUtils.ts`
  - Frontend AI client: POSTs to `/api/ai/generate` and returns actions.
- `server.js`
  - Express server: serves `dist/` and handles `/api/ai/generate`.
- `docs/`
  - Documentation (this file).

## How It Works (High Level)
- The UI dispatches actions → reducers update state → components re-render.
- `animatedElements` is derived each frame from keyframes + current time.
- Konva renderers map state into shapes and apply transforms.
- Export uses `utils/exportUtils.ts` to build runnable HTML/SVG.

## In-House AI Flow
1) User prompt in the UI.
2) `aiUtils.ts` sends payload to `/api/ai/generate`.
3) `server.js` runs rules-based AI to return `{ summary, actions }`.
4) App dispatches actions to update the scene and timeline.

## Render Deployment
- Create a **Web Service**.
- Build: `npm install && npm run build`
- Start: `npm run start`
- Visit `/api/health` to confirm server is live.

## Path To True Vector Maestro (Roadmap)

Phase 0: Stabilize
- Fix production CSS warning (`/index.css`) and remove Tailwind CDN usage.
- Add smoke tests for export and path editing.
- Clean up unused files and duplicate Konva renderers.

Phase 1: Core Editor Excellence
- Shape editing parity (paths, circles, groups).
- Better snapping/alignment guides.
- Solid asset library and templates.

Phase 2: In-House AI v1 (Rules + Templates)
- Add a prompt → scene library (sunset, logo, icon pack, hero layout).
- Validate AI actions before dispatch (schema validation).
- Add an AI debug panel to inspect actions.

Phase 3: In-House AI v2 (Local Model)
- Replace or augment rules with a small local model (ONNX/llama.cpp).
- Add prompt-to-actions fine-tuning and feedback loops.

Phase 4: Product Maturity
- Collaboration, project versioning, export presets.
- Marketplace for templates and assets.

## Immediate Next Steps (Recommended)
1) Fix production CSS warning and remove tailwind CDN.
2) Add a basic AI "preset" selector in the UI.
3) Add a simple schema validator for AI actions.
4) Add a Render checklist to README (optional).

