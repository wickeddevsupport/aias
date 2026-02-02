# Photo-to-Scene AI: Practical Path to Pinnacle

This document outlines a doable roadmap to transform user-uploaded photos into animated vector scenes. It focuses on approaches that can run on our current stack (Node + Vite) and can be deployed on Render free tier, while mapping a path to full automatic, high-quality results.

## Goal
Given a user photo (e.g., sunset + bicycle rider), the AI should:
1) Understand the scene structure (background vs subject).
2) Generate a vector scene from the photo.
3) Animate the scene in a cinematic, believable way.

---

## Tiered Approach (Doable -> Pinnacle)

### Tier 1: No-ML Auto (Free-Tier Friendly)
What it does:
- Extract palette from the image
- Generate a simplified vector scene (sky gradient + ground)
- Vectorize the subject as a silhouette
- Animate with presets (sun drift, parallax, subject bob)

How:
- Use a lightweight color palette extractor
- Convert photo -> silhouette via threshold + edge detection
- Use Potrace (or svg path tracing) to get a vector path
- Build layered scene templates

Pros:
- Runs on CPU
- Same server deployment

Cons:
- Best for high-contrast images
- Subjects can be inaccurate

---

### Tier 2: Semi-Auto (Best Free-Tier Quality)
What it does:
- User marks subject (simple bounding box or rough mask)
- Split into layers (background + subject)
- Generate vector scene + animated subject

How:
- UI tool: "Mark Subject"
- Crop subject region
- Vectorize subject region separately
- Animate with character presets

Pros:
- High success rate
- Still cheap and fast

Cons:
- Requires user input

---

### Tier 3: Full Auto (GPU or External Service)
What it does:
- Automatically segments subject + background
- Generates vector layers + animation rigs

How:
- Use SAM/MediaPipe/CLIP or a segmentation model
- Use GPU service to run model
- Same action pipeline (AppActions)

Pros:
- Fully automatic

Cons:
- Requires GPU or paid API

---

## Architecture: What to Build

### 1) Image Ingestion Pipeline
- Save image to assets
- Extract dominant colors
- Compute basic luminance + edges

### 2) Scene Plan Generator
Output a scene plan JSON:
```
{
  "sceneType": "sunset_rider",
  "palette": ["#ffcc66", "#f97316", "#0f172a"],
  "layers": ["sky", "sun", "ground", "subject"],
  "animationBeats": ["intro", "action", "settle"]
}
```

### 3) Vector Scene Builder
- Sky: gradient rectangle
- Sun: circle
- Ground: path or rectangle with slight curve
- Subject: traced silhouette path (Tier 1) or extracted subject (Tier 2)

### 4) Animation Presets
- Sun drift: slow y movement
- Parallax: background moves slower than subject
- Subject bob: small y oscillation
- Camera sway: slight rotation + zoom

---

## Implementation Steps (Doable)

### Phase A (Now)
1) Add "Animate Photo" preset:
   - Pan + zoom (Ken Burns)
   - Fade in/out
2) Add palette extraction for auto gradients

### Phase B (Next)
1) Add subject selection tool
2) Extract subject layer
3) Animate subject + background separately

### Phase C (Later)
1) Add silhouette tracing
2) Animate traced subject as a vector path

---

## Validation and Safety
- Always validate AppActions before dispatch
- Clamp sizes, positions, animation times
- Fallback to safe scene if parsing fails

---

## Example: Sunset Rider (Tier 2)
1) User uploads photo, selects rider.
2) AI extracts palette and builds:
   - gradient sky
   - sun circle
   - ground strip
   - rider silhouette layer
3) Animates:
   - sun drifting down
   - background parallax
   - rider bob

---

## Next Steps You Can Approve
1) Implement palette extraction + Ken Burns presets
2) Add subject selection tool
3) Add silhouette tracing for subject vectorization
