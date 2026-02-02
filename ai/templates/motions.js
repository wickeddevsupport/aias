import { addKeyframe } from './utils.js';

export function applyIdleMotion(actions, parts, duration = 4) {
  if (!parts || !parts.groupId) return;
  const t0 = 0;
  const tMid = duration * 0.5;
  const tEnd = duration;
  const baseY = Number.isFinite(parts.baseY) ? parts.baseY : 0;
  actions.push(
    addKeyframe(parts.groupId, 'y', t0, baseY),
    addKeyframe(parts.groupId, 'y', tMid, baseY - 6, 'ease-in-out'),
    addKeyframe(parts.groupId, 'y', tEnd, baseY)
  );
}

export function applyWaveMotion(actions, parts, duration = 4) {
  if (!parts || !parts.armRId) return;
  const t0 = 0;
  const tMid = duration * 0.5;
  const tEnd = duration;
  actions.push(
    addKeyframe(parts.armRId, 'rotation', t0, 0),
    addKeyframe(parts.armRId, 'rotation', tMid, -35, 'ease-in-out'),
    addKeyframe(parts.armRId, 'rotation', tEnd, 0)
  );
}

export function applyWalkCycle(actions, parts, duration = 4) {
  if (!parts || !parts.legLId || !parts.legRId || !parts.armLId || !parts.armRId || !parts.groupId) return;
  const t0 = 0;
  const tQ = duration * 0.25;
  const tMid = duration * 0.5;
  const tT = duration * 0.75;
  const tEnd = duration;
  const baseX = Number.isFinite(parts.baseX) ? parts.baseX : 0;
  const baseY = Number.isFinite(parts.baseY) ? parts.baseY : 0;

  actions.push(
    addKeyframe(parts.legLId, 'rotation', t0, -20),
    addKeyframe(parts.legLId, 'rotation', tMid, 20, 'ease-in-out'),
    addKeyframe(parts.legLId, 'rotation', tEnd, -20),
    addKeyframe(parts.legRId, 'rotation', t0, 20),
    addKeyframe(parts.legRId, 'rotation', tMid, -20, 'ease-in-out'),
    addKeyframe(parts.legRId, 'rotation', tEnd, 20),
    addKeyframe(parts.armLId, 'rotation', t0, 15),
    addKeyframe(parts.armLId, 'rotation', tMid, -15, 'ease-in-out'),
    addKeyframe(parts.armLId, 'rotation', tEnd, 15),
    addKeyframe(parts.armRId, 'rotation', t0, -15),
    addKeyframe(parts.armRId, 'rotation', tMid, 15, 'ease-in-out'),
    addKeyframe(parts.armRId, 'rotation', tEnd, -15)
  );

  actions.push(
    addKeyframe(parts.groupId, 'x', t0, baseX - 140),
    addKeyframe(parts.groupId, 'x', tEnd, baseX + 140, 'ease-in-out'),
    addKeyframe(parts.groupId, 'y', t0, baseY),
    addKeyframe(parts.groupId, 'y', tQ, baseY - 4, 'ease-in-out'),
    addKeyframe(parts.groupId, 'y', tMid, baseY),
    addKeyframe(parts.groupId, 'y', tT, baseY - 4, 'ease-in-out'),
    addKeyframe(parts.groupId, 'y', tEnd, baseY)
  );
}
