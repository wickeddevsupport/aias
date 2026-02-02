import { addRect, addKeyframe, addGroup, withParent, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildNeonStudioScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0b1020', '#22d3ee', '#a855f7', '#f472b6']);

  const sceneId = id();
  const wallId = id();
  const floorId = id();
  actions.push(
    addGroup(sceneId, 0, 0),
    withParent(addRect(wallId, 0, 0, width, height * 0.7, resolveBackgroundFill(plan, palette, `${wallId}-grad`, 120)), sceneId),
    withParent(addRect(floorId, 0, height * 0.7, width, height * 0.3, '#111827'), sceneId)
  );

  const stripCount = 4;
  for (let i = 0; i < stripCount; i += 1) {
    const stripId = id();
    const stripX = width * 0.15 + i * width * 0.2;
    const stripY = height * 0.18 + (i % 2) * 40;
    actions.push(withParent(addRect(stripId, stripX, stripY, width * 0.12, 6, palette[(i % palette.length)] || '#22d3ee'), sceneId));
    actions.push(
      addKeyframe(stripId, 'opacity', 0, 0.4),
      addKeyframe(stripId, 'opacity', (plan.duration || 4) * 0.5, 1),
      addKeyframe(stripId, 'opacity', plan.duration || 4, 0.5)
    );
  }

  return { summary: 'Set up a neon studio scene with glowing strips.', actions, rootId: sceneId };
}
