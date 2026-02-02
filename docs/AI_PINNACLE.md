# Vector Maestro AI: Path to Pinnacle

This document defines how to evolve the current in-house AI from rule-based intent parsing into a compact, high‑quality scene + animation generator (including animated characters) while keeping it deployable in our stack.

## Current State (Baseline)
- Rules-based intent parsing in `server.js`
- Outputs action sequences that the editor can execute
- Supports shape creation, colors, positions, counts, and basic animations

## North Star Behavior
Given a prompt, the AI should:
1) Generate a coherent **scene** (multiple elements with layout and style).
2) Produce **timed animation sequences** that read as a story.
3) Support **character rigs** (stick figures / vector puppets / animated characters) with reusable motion presets.
4) Provide consistent, validated **AppAction** output.

## Target Capabilities
- Scene composition: sky/ground, props, layers, depth, palettes
- Motion beats: entrance → action → settle/loop
- Character animation: walk, wave, nod, jump, idle
- Prompt control: style (“flat”, “bold”, “minimal”), palette, tempo
- Structured output: deterministic actions with constraints

## Architectural Plan

### Layer 1: Intent + Plan (Tiny)
- Parse the prompt into a **scene plan** (JSON):
  - scene_type: “sunset_city”, “space”, “studio”, “character_action”
  - elements: list of objects with roles (“background”, “prop”, “character”)
  - timing: beats (intro, action, outro)
  - style: palette, stroke style, scale
- This can remain rule-based + templated.

### Layer 2: Template Library (Medium)
- A curated set of vector templates:
  - Scene templates: “sunset”, “forest”, “city”, “ocean”
  - Character templates: “stick_figure”, “simple_robot”, “blob”
  - Motion presets: “walk_cycle”, “wave”, “bounce”, “spin”, “idle”
- Templates output **AppAction** sequences.

### Layer 3: Small Model (Optional)
- Replace parts of the plan stage with a small local LLM (if GPU available).
- Keep strict schema validation + fallback to templates if invalid.

## Implementation Steps

### Step 1: Scene Plan Schema
Define a JSON schema for plans:
```
{
  "scene": "sunset_city",
  "style": { "palette": ["#..."], "stroke": "none|thin|bold" },
  "elements": [{ "role": "sun", "type": "circle", "count": 1 }],
  "beats": [{ "t": 0, "action": "intro" }, { "t": 2, "action": "action" }]
}
```
Add plan → actions in `server.js`.

### Step 2: Template Library
Create `ai/templates/`:
- `scene_sunset_city.ts`
- `scene_ocean.ts`
- `char_stick_figure.ts`
- `motion_walk_cycle.ts`
Each template returns `{ summary, actions }`.

### Step 3: Character Rigs
Represent a character as a group with named child elements:
- head, torso, armL, armR, legL, legR
Add a helper that returns positions + grouped hierarchy.
Motion presets update rotations and positions over time.

### Step 4: Motion Beats
Introduce a beat timeline:
- `intro` (0–1s): fade in / move from offscreen
- `action` (1–4s): main movement
- `settle` (4–5s): slow down
This standardizes animation quality.

### Step 5: Action Validation
Add a strict action validator:
- ensure types + payloads are valid
- clamp numeric ranges
- reject invalid transforms
Fallback to “safe scene” if validation fails.

## Examples (Desired Output)

Prompt: “A robot waves in a neon room”
- Scene: dark room with neon strips
- Character: robot (rects + circles)
- Motion: wave arm loop + gentle idle bob

Prompt: “A character walks across the screen”
- Character rig
- Walk cycle for legs
- Translate group x from left → right

## Metrics (Quality Goals)
- 90% of prompts produce valid actions
- 80% produce multi-element scenes
- 60% include coherent animation beats
- 0% crashes from malformed actions

## Recommended Next Actions (Practical)
1) Add template library structure (`ai/templates/`).
2) Implement one character rig + one walk cycle.
3) Implement one full scene template with 3–5 elements.
4) Add action validator + fallback safe scene.


## Progress Update (2026-02-02)
- Milestone 1: Expanded template library + planner mapping prompts to scenes, motion presets, and safe fallback scene.
- Milestone 2: Added character rig (stick/robot/blob) with walk, wave, and idle presets plus scene + character composition.
- Milestone 3: Added photo animation tier 1 (Ken Burns + parallax + palette-based gradients + optional silhouette).
- Milestone 4: Added photo animation tier 2 (subject box overlay, layered motion, bounding box cues).
- Milestone 5: Added AI prompt regression harness (ai/regression.js) and scoring output for guardrails.

## V2 Definition (Advanced Behavior)
V2 should:
1) Build a structured plan for every prompt (scene, layers, palette, beats, constraints).
2) Generate full scenes from scratch with depth, props, and camera motion when requested.
3) Treat paths/curves/blobs/Bezier shapes as first-class outputs.
4) Add character rigs + reusable motion presets and place them into scenes.
5) Support photo animation tiers (Ken Burns + parallax + subject layers).
6) Validate all AppActions and fallback to safe scenes on invalid output.

## V2 Status (2026-02-02)
- Scene templates are grouped and camera-friendly with motion beats.
- Planner includes beats, camera intent, weather overlays, and style selection.
- Motion presets expanded (walk/wave/idle + bounce/spin/pulse fallback).
- Path generator supports blobs, spirals, waves, stars, hearts, and zigzags.
- Photo tier 1 + tier 2 presets with layered overlays and palette-based gradients.
- Weather overlays (rain/snow) available via prompt cues.
- Regression suite added for prompt validation.

## V3 Readiness (Prep Checklist)
- Prompt-to-Plan schema stabilization (explicit JSON schema + tests).
- Higher-fidelity character rigs (limb constraints, IK-ish limits, pose library).
- Semantic layout (rule-based composition with collision avoidance).
- Richer photo pipeline (silhouette tracing + mask refinement).
- Scoring + guardrails (quality thresholds with auto fallback tiers).

## V3 Status (2026-02-02)
- Context-aware AI: prompt + canvas elements + selection + timing feed into planning.
- Multi-step plan output: structured steps with per-step actions and live execution.
- Live UX: Maestro panel shows plan, current step, and next step while actions execute.
- Autonomous chaining: steps execute sequentially with validation and live canvas updates.

