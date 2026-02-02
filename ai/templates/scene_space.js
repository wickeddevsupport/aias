import { addRect, addCircle, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildSpaceScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0b1020', '#312e81', '#38bdf8', '#f472b6']);

  const skyId = id();
  actions.push(addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 200)));

  const starCount = 12;
  for (let i = 0; i < starCount; i += 1) {
    const starId = id();
    const x = (width * 0.1) + (i % 6) * (width * 0.14);
    const y = height * (0.12 + Math.floor(i / 6) * 0.18);
    const r = 3 + (i % 3);
    actions.push(addCircle(starId, x, y, r, palette[2] || '#38bdf8'));
    actions.push(
      addKeyframe(starId, 'opacity', 0, 0.3),
      addKeyframe(starId, 'opacity', (plan.duration || 4) * 0.5, 1),
      addKeyframe(starId, 'opacity', plan.duration || 4, 0.4)
    );
  }

  const planetId = id();
  actions.push(addCircle(planetId, width * 0.7, height * 0.65, Math.min(width, height) * 0.14, palette[3] || '#f472b6'));
  actions.push(
    addKeyframe(planetId, 'y', 0, height * 0.7),
    addKeyframe(planetId, (plan.duration || 4) * 0.5, height * 0.62, 'ease-in-out'),
    addKeyframe(planetId, plan.duration || 4, height * 0.7)
  );

  return { summary: 'Generated a space scene with twinkling stars.', actions };
}
