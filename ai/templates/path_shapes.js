import { addPath, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette } from './palette.js';
import { buildBlobPath, buildWavePath, buildSpiralPath, buildHeartPath, buildStarPath } from './paths.js';

export function buildPathShape(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#38bdf8', '#a855f7', '#f97316']);

  const pathId = id();
  let d = buildBlobPath(Math.min(width, height) * 0.18, 7);
  let summary = 'Created a curved path shape.';

  if (plan.keywords.spiral) {
    d = buildSpiralPath(3, Math.min(width, height) * 0.25, 80);
    summary = 'Created a spiral path.';
  } else if (plan.keywords.wavePath) {
    d = buildWavePath(width * 0.6, height * 0.08, 3);
    summary = 'Created a wave path.';
  } else if (plan.keywords.heart) {
    d = buildHeartPath(Math.min(width, height) * 0.35);
    summary = 'Created a heart path.';
  } else if (plan.keywords.starShape) {
    d = buildStarPath(5, Math.min(width, height) * 0.2, Math.min(width, height) * 0.08);
    summary = 'Created a star path.';
  } else if (plan.keywords.zigzag) {
    d = `M${-width * 0.25},0 L${-width * 0.15},${-height * 0.08} L${-width * 0.05},${height * 0.08} L${width * 0.05},${-height * 0.08} L${width * 0.15},${height * 0.08} L${width * 0.25},0`;
    summary = 'Created a zigzag path.';
  } else if (plan.keywords.polygon) {
    d = buildStarPath(6, Math.min(width, height) * 0.18, Math.min(width, height) * 0.18);
    summary = 'Created a polygon path.';
  } else if (plan.keywords.blob) {
    d = buildBlobPath(Math.min(width, height) * 0.22, 8);
    summary = 'Created an organic blob path.';
  }

  const wantsOutline = plan.keywords.outline || plan.keywords.stroke;
  const fill = wantsOutline ? 'none' : palette[1] || palette[0];
  const stroke = wantsOutline ? palette[0] : '#0f172a';
  const strokeWidth = wantsOutline ? 4 : 2;

  actions.push(
    addPath(pathId, width * 0.5, height * 0.5, d, fill, stroke, strokeWidth, {
      strokeDasharray: plan.keywords.animate ? '8 6' : undefined,
    })
  );

  if (plan.keywords.animate || plan.keywords.draw || plan.keywords.path) {
    const duration = Math.max(2, plan.duration || 4);
    actions.push(
      addKeyframe(pathId, 'drawStartPercent', 0, 0),
      addKeyframe(pathId, 'drawEndPercent', 0, 0.05),
      addKeyframe(pathId, 'drawEndPercent', duration, 1, 'ease-in-out')
    );
  }

  return { summary, actions };
}
