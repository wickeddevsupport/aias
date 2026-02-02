import { addRect, addCircle, addKeyframe, addGroup, withParent, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildForestScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#166534', '#16a34a', '#a3e635']);

  const sceneId = id();
  const skyId = id();
  const groundId = id();
  actions.push(
    addGroup(sceneId, 0, 0),
    withParent(addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 160)), sceneId),
    withParent(addRect(groundId, 0, height * 0.7, width, height * 0.3, palette[1] || '#166534'), sceneId)
  );

  const treeCount = 5;
  const spacing = width / (treeCount + 1);
  const baseY = height * 0.7;
  for (let i = 0; i < treeCount; i += 1) {
    const trunkId = id();
    const crownId = id();
    const x = spacing * (i + 1);
    const trunkW = width * 0.035;
    const trunkH = height * 0.18;
    actions.push(
      withParent(addRect(trunkId, x - trunkW / 2, baseY - trunkH, trunkW, trunkH, '#7c2d12'), sceneId),
      withParent(addCircle(crownId, x, baseY - trunkH, Math.min(width, height) * 0.08, palette[2] || '#16a34a'), sceneId)
    );
    actions.push(
      addKeyframe(crownId, 'rotation', 0, -2),
      addKeyframe(crownId, 'rotation', (plan.duration || 4) * 0.5, 2, 'ease-in-out'),
      addKeyframe(crownId, 'rotation', plan.duration || 4, -2)
    );
  }

  return { summary: 'Built a forest scene with layered trees.', actions, rootId: sceneId };
}
