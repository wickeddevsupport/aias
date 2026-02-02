import { addRect, addCircle, addKeyframe, addGroup, withParent, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildSpaceScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0b1020', '#312e81', '#38bdf8', '#f472b6']);

  const sceneId = id();
  const skyId = id();
  actions.push(
    addGroup(sceneId, 0, 0),
    withParent(addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 200)), sceneId)
  );

  const starCount = 12;
  for (let i = 0; i < starCount; i += 1) {
    const starId = id();
    const x = (width * 0.1) + (i % 6) * (width * 0.14);
    const y = height * (0.12 + Math.floor(i / 6) * 0.18);
    const r = 3 + (i % 3);
    actions.push(withParent(addCircle(starId, x, y, r, palette[2] || '#38bdf8'), sceneId));
    actions.push(
      addKeyframe(starId, 'opacity', 0, 0.3),
      addKeyframe(starId, 'opacity', (plan.duration || 4) * 0.5, 1),
      addKeyframe(starId, 'opacity', plan.duration || 4, 0.4)
    );
  }

  const planetId = id();
  actions.push(withParent(addCircle(planetId, width * 0.7, height * 0.65, Math.min(width, height) * 0.14, palette[3] || '#f472b6'), sceneId));
  actions.push(
    addKeyframe(planetId, 'y', 0, height * 0.7),
    addKeyframe(planetId, (plan.duration || 4) * 0.5, height * 0.62, 'ease-in-out'),
    addKeyframe(planetId, plan.duration || 4, height * 0.7)
  );

  return { summary: 'Generated a space scene with twinkling stars.', actions, rootId: sceneId };
}
