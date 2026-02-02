import { addRect, addCircle, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildMeadowScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#38bdf8', '#16a34a', '#4ade80', '#fde047']);

  const skyId = id();
  const sunId = id();
  const fieldId = id();
  actions.push(
    addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 160)),
    addCircle(sunId, width * 0.2, height * 0.2, Math.min(width, height) * 0.08, palette[3] || '#fde047'),
    addRect(fieldId, 0, height * 0.65, width, height * 0.35, palette[1] || '#16a34a')
  );
  actions.push(
    addKeyframe(fieldId, 'opacity', 0, 0.6),
    addKeyframe(fieldId, (plan.duration || 4) * 0.4, 1)
  );
  return { summary: 'Created a bright meadow scene.', actions };
}
