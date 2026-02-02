import { addRect, addCircle, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill, resolveAccentFill } from './palette.js';

export function buildSunsetScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#f97316', '#fbbf24', '#1f2937']);

  const skyId = id();
  const sunId = id();
  const groundId = id();

  actions.push(
    addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 120)),
    addCircle(sunId, width * 0.55, height * 0.6, Math.min(width, height) * 0.12, resolveAccentFill(plan, palette, `${sunId}-grad`)),
    addRect(groundId, 0, height * 0.72, width, height * 0.28, palette[palette.length - 1] || '#0b1220')
  );

  const duration = Math.max(2, plan.duration || 4);
  actions.push(
    addKeyframe(sunId, 'y', 0, height * 0.6),
    addKeyframe(sunId, 'y', duration, height * 0.48, 'ease-in-out'),
    addKeyframe(groundId, 'opacity', 0, 0),
    addKeyframe(groundId, 'opacity', duration * 0.4, 1)
  );

  return {
    summary: 'Created a sunset scene with a drifting sun.',
    actions,
  };
}
