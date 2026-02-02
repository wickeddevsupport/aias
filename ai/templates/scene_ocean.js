import { addRect, addCircle, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill, resolveAccentFill } from './palette.js';

export function buildOceanScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#0ea5e9', '#38bdf8', '#fde047']);

  const skyId = id();
  const sunId = id();
  const oceanId = id();

  actions.push(
    addRect(skyId, 0, 0, width, height * 0.6, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 180)),
    addCircle(sunId, width * 0.2, height * 0.25, Math.min(width, height) * 0.08, resolveAccentFill(plan, palette, `${sunId}-grad`)),
    addRect(oceanId, 0, height * 0.55, width, height * 0.45, palette[1] || '#0ea5e9')
  );

  const duration = Math.max(2, plan.duration || 4);
  actions.push(
    addKeyframe(oceanId, 'x', 0, 0),
    addKeyframe(oceanId, 'x', duration, -20, 'ease-in-out'),
    addKeyframe(oceanId, 'opacity', 0, 0),
    addKeyframe(oceanId, 'opacity', duration * 0.3, 1)
  );

  return {
    summary: 'Created an ocean scene with gentle motion.',
    actions,
  };
}
