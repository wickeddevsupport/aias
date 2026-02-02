import { addRect, addCircle, addKeyframe, createIdFactory } from './utils.js';

export function buildBasicCharacter(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;

  const groupId = id();
  const baseX = width * 0.5;
  const baseY = height * 0.6;

  const headId = id();
  const bodyId = id();
  const armLId = id();
  const armRId = id();
  const legLId = id();
  const legRId = id();

  actions.push({ type: 'ADD_ELEMENT', payload: { type: 'group', props: { id: groupId, x: baseX, y: baseY } } });

  actions.push(
    addCircle(headId, baseX, baseY - 80, 18, '#e2e8f0'),
    addRect(bodyId, baseX - 8, baseY - 60, 16, 40, '#94a3b8'),
    addRect(armLId, baseX - 24, baseY - 55, 14, 6, '#94a3b8'),
    addRect(armRId, baseX + 10, baseY - 55, 14, 6, '#94a3b8'),
    addRect(legLId, baseX - 10, baseY - 20, 8, 30, '#64748b'),
    addRect(legRId, baseX + 2, baseY - 20, 8, 30, '#64748b')
  );

  const duration = Math.max(2, plan.duration || 4);
  actions.push(
    addKeyframe(armRId, 'rotation', 0, 0),
    addKeyframe(armRId, 'rotation', duration * 0.5, -35),
    addKeyframe(armRId, 'rotation', duration, 0),
    addKeyframe(groupId, 'y', 0, baseY),
    addKeyframe(groupId, 'y', duration * 0.5, baseY - 6),
    addKeyframe(groupId, 'y', duration, baseY)
  );

  return {
    summary: 'Created a basic character with a wave animation.',
    actions,
  };
}
