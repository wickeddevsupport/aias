import { addRect, addCircle, addPath, addGroup, createIdFactory, withParent } from './utils.js';
import { resolvePalette } from './palette.js';
import { buildBlobPath } from './paths.js';

export function buildCharacterRig(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#e2e8f0', '#94a3b8', '#64748b']);

  const groupId = id();
  const baseX = width * 0.5;
  const baseY = height * 0.65;

  actions.push(addGroup(groupId, baseX, baseY));

  const style = plan?.keywords?.robot ? 'robot' : plan?.keywords?.blob ? 'blob' : 'stick';
  const parts = { groupId, baseX, baseY };

  if (style === 'blob') {
    const bodyId = id();
    const faceId = id();
    const eyeLId = id();
    const eyeRId = id();
    parts.bodyId = bodyId;
    parts.faceId = faceId;
    parts.eyeLId = eyeLId;
    parts.eyeRId = eyeRId;
    actions.push(
      withParent(addPath(bodyId, 0, 0, buildBlobPath(70, 7), palette[1] || '#94a3b8'), groupId),
      withParent(addCircle(faceId, 0, -10, 22, palette[0] || '#e2e8f0'), groupId),
      withParent(addCircle(eyeLId, -8, -12, 4, '#0f172a'), groupId),
      withParent(addCircle(eyeRId, 8, -12, 4, '#0f172a'), groupId)
    );
    return { summary: 'Built a blob character rig.', actions, parts };
  }

  const headId = id();
  const torsoId = id();
  const armLId = id();
  const armRId = id();
  const legLId = id();
  const legRId = id();
  parts.headId = headId;
  parts.torsoId = torsoId;
  parts.armLId = armLId;
  parts.armRId = armRId;
  parts.legLId = legLId;
  parts.legRId = legRId;

  if (style === 'robot') {
    actions.push(
      withParent(addRect(headId, -18, -110, 36, 30, palette[0] || '#e2e8f0'), groupId),
      withParent(addRect(torsoId, -20, -80, 40, 55, palette[1] || '#94a3b8'), groupId),
      withParent(addRect(armLId, -46, -70, 26, 8, palette[2] || '#64748b'), groupId),
      withParent(addRect(armRId, 20, -70, 26, 8, palette[2] || '#64748b'), groupId),
      withParent(addRect(legLId, -18, -25, 12, 34, palette[2] || '#64748b'), groupId),
      withParent(addRect(legRId, 6, -25, 12, 34, palette[2] || '#64748b'), groupId)
    );
    return { summary: 'Built a robot character rig.', actions, parts };
  }

  actions.push(
    withParent(addCircle(headId, 0, -90, 18, palette[0] || '#e2e8f0'), groupId),
    withParent(addRect(torsoId, -8, -70, 16, 42, palette[1] || '#94a3b8'), groupId),
    withParent(addRect(armLId, -28, -62, 16, 6, palette[1] || '#94a3b8'), groupId),
    withParent(addRect(armRId, 12, -62, 16, 6, palette[1] || '#94a3b8'), groupId),
    withParent(addRect(legLId, -10, -30, 8, 32, palette[2] || '#64748b'), groupId),
    withParent(addRect(legRId, 2, -30, 8, 32, palette[2] || '#64748b'), groupId)
  );

  return { summary: 'Built a stick figure character rig.', actions, parts };
}
