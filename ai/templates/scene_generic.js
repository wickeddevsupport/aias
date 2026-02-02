import { addRect, addCircle, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildGenericScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#38bdf8', '#22c55e', '#facc15']);

  const skyId = id();
  const groundId = id();
  const accentId = id();
  actions.push(
    addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 110)),
    addRect(groundId, 0, height * 0.7, width, height * 0.3, palette[2] || '#22c55e'),
    addCircle(accentId, width * 0.7, height * 0.3, Math.min(width, height) * 0.08, palette[3] || '#facc15')
  );
  actions.push(
    addKeyframe(accentId, 'y', 0, height * 0.32),
    addKeyframe(accentId, plan.duration || 4, height * 0.26, 'ease-in-out')
  );
  return { summary: 'Generated a simple scene with sky and ground.', actions };
}
