import { addRect, addCircle, addPath, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill, resolveAccentFill } from './palette.js';
import { buildMountainPath, buildCloudPath } from './paths.js';

export function buildMountainScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#64748b', '#94a3b8', '#f8fafc']);

  const skyId = id();
  const sunId = id();
  const mountainId = id();

  actions.push(
    addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 140)),
    addCircle(sunId, width * 0.18, height * 0.25, Math.min(width, height) * 0.09, resolveAccentFill(plan, palette, `${sunId}-grad`)),
    addPath(mountainId, width * 0.5, height * 0.55, buildMountainPath(width * 1.2, height * 0.4), palette[1] || '#64748b')
  );

  const cloudCount = 3;
  for (let i = 0; i < cloudCount; i += 1) {
    const cloudId = id();
    const cloudX = width * (0.25 + i * 0.25);
    const cloudY = height * (0.2 + (i % 2) * 0.08);
    actions.push(addPath(cloudId, cloudX, cloudY, buildCloudPath(140, 50), palette[3] || '#f8fafc', 'none', 0));
    actions.push(
      addKeyframe(cloudId, 'x', 0, cloudX - 20),
      addKeyframe(cloudId, 'x', (plan.duration || 4), cloudX + 30, 'ease-in-out')
    );
  }

  return { summary: 'Created a mountain landscape with drifting clouds.', actions };
}
