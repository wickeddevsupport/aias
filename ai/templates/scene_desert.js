import { addRect, addCircle, addPath, addKeyframe, addGroup, withParent, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill, resolveAccentFill } from './palette.js';
import { buildDunePath } from './paths.js';

export function buildDesertScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#f97316', '#f59e0b', '#fbbf24', '#1f2937']);

  const sceneId = id();
  const skyId = id();
  const sunId = id();
  const duneId = id();

  actions.push(
    addGroup(sceneId, 0, 0),
    withParent(addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 100)), sceneId),
    withParent(addCircle(sunId, width * 0.75, height * 0.25, Math.min(width, height) * 0.08, resolveAccentFill(plan, palette, `${sunId}-grad`)), sceneId),
    withParent(addPath(duneId, width * 0.5, height * 0.7, buildDunePath(width * 1.2, height * 0.25), palette[1] || '#f59e0b'), sceneId)
  );

  actions.push(
    addKeyframe(duneId, 'y', 0, height * 0.7),
    addKeyframe(duneId, 'y', (plan.duration || 4), height * 0.68, 'ease-in-out')
  );

  return { summary: 'Built a warm desert scene with rolling dunes.', actions, rootId: sceneId };
}
