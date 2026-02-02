import { addRect, addCircle, addPath, addImage, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';
import { buildBlobPath } from './paths.js';

function resolvePhotoTarget(plan) {
  const selected = plan.selectedElement;
  if (selected && selected.type === 'image') return selected;
  const existing = Array.isArray(plan.existingElements) ? plan.existingElements : [];
  return existing.find(el => el.type === 'image') || null;
}

export function buildPhotoTier1(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#38bdf8', '#f97316']);
  const duration = Math.max(3, plan.duration || 5);

  const bgId = id();
  actions.push(addRect(bgId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${bgId}-grad`, 140)));

  const target = resolvePhotoTarget(plan);
  const imageId = target ? target.id : id();
  const imageWidth = target?.width || width * 0.7;
  const imageHeight = target?.height || height * 0.7;
  const baseX = Number.isFinite(target?.x) ? target.x + imageWidth / 2 : width * 0.5;
  const baseY = Number.isFinite(target?.y) ? target.y + imageHeight / 2 : height * 0.5;

  if (!target) {
    actions.push(addImage(imageId, baseX - imageWidth / 2, baseY - imageHeight / 2, imageWidth, imageHeight, plan.imageHref || undefined));
  }

  actions.push(
    addKeyframe(imageId, 'scale', 0, 1),
    addKeyframe(imageId, 'scale', duration, 1.18, 'ease-in-out'),
    addKeyframe(imageId, 'x', 0, baseX - imageWidth / 2 - 20),
    addKeyframe(imageId, 'x', duration, baseX - imageWidth / 2 + 20, 'ease-in-out'),
    addKeyframe(imageId, 'y', 0, baseY - imageHeight / 2 - 10),
    addKeyframe(imageId, 'y', duration, baseY - imageHeight / 2 + 10, 'ease-in-out')
  );

  if (plan.keywords.parallax) {
    const orbId = id();
    actions.push(addCircle(orbId, width * 0.2, height * 0.2, Math.min(width, height) * 0.06, palette[2] || '#f97316'));
    actions.push(
      addKeyframe(orbId, 'x', 0, width * 0.18),
      addKeyframe(orbId, 'x', duration, width * 0.24, 'ease-in-out')
    );
  }

  if (plan.keywords.silhouette) {
    const silhouetteId = id();
    actions.push(
      addPath(silhouetteId, baseX, baseY + 40, buildBlobPath(Math.min(width, height) * 0.2, 6), 'rgba(15,23,42,0.5)')
    );
  }

  return { summary: 'Applied a Ken Burns photo animation with gentle parallax.', actions };
}

export function buildPhotoTier2(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0f172a', '#22d3ee', '#a855f7']);
  const duration = Math.max(4, plan.duration || 6);

  const bgId = id();
  actions.push(addRect(bgId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${bgId}-grad`, 120)));

  const target = resolvePhotoTarget(plan);
  const imageId = target ? target.id : id();
  const imageWidth = target?.width || width * 0.75;
  const imageHeight = target?.height || height * 0.75;
  const baseX = Number.isFinite(target?.x) ? target.x + imageWidth / 2 : width * 0.5;
  const baseY = Number.isFinite(target?.y) ? target.y + imageHeight / 2 : height * 0.5;

  if (!target) {
    actions.push(addImage(imageId, baseX - imageWidth / 2, baseY - imageHeight / 2, imageWidth, imageHeight, plan.imageHref || undefined));
  }

  actions.push(
    addKeyframe(imageId, 'scale', 0, 1.02),
    addKeyframe(imageId, 'scale', duration, 1.15, 'ease-in-out'),
    addKeyframe(imageId, 'x', 0, baseX - imageWidth / 2 - 30),
    addKeyframe(imageId, 'x', duration, baseX - imageWidth / 2 + 30, 'ease-in-out')
  );

  const boxW = width * 0.45;
  const boxH = height * 0.6;
  const boxX = baseX - boxW / 2;
  const boxY = baseY - boxH / 2;

  const subjectOverlayId = id();
  actions.push(addRect(subjectOverlayId, boxX, boxY, boxW, boxH, 'rgba(255,255,255,0.08)', palette[2] || '#a855f7', 2));

  actions.push(
    addKeyframe(subjectOverlayId, 'scale', 0, 1),
    addKeyframe(subjectOverlayId, 'scale', duration, 1.05, 'ease-in-out')
  );

  if (plan.keywords.boundingBox || plan.keywords.subject) {
    const bboxId = id();
    actions.push(addRect(bboxId, boxX, boxY, boxW, boxH, 'none', palette[1] || '#22d3ee', 2));
    actions.push(
      addKeyframe(bboxId, 'opacity', 0, 0.2),
      addKeyframe(bboxId, duration * 0.5, 1),
      addKeyframe(bboxId, duration, 0.4)
    );
  }

  return { summary: 'Split photo into background and subject layers with separate motion.', actions };
}
