import { addRect, addKeyframe, createIdFactory } from './utils.js';
import { resolvePalette, resolveBackgroundFill } from './palette.js';

export function buildCityScene(plan, artboard) {
  const id = createIdFactory();
  const actions = [];
  const width = artboard.width;
  const height = artboard.height;
  const palette = resolvePalette(plan, ['#0b1020', '#1f2937', '#38bdf8', '#f8fafc']);

  const skyId = id();
  actions.push(addRect(skyId, 0, 0, width, height, resolveBackgroundFill(plan, palette, `${skyId}-grad`, 100)));

  const buildingCount = 5;
  const baseY = height * 0.6;
  const maxH = height * 0.35;
  const step = width / buildingCount;

  for (let i = 0; i < buildingCount; i += 1) {
    const bId = id();
    const bWidth = step * 0.7;
    const bHeight = maxH * (0.5 + (i % 3) * 0.2);
    const x = i * step + step * 0.15;
    const y = baseY - bHeight;
    actions.push(addRect(bId, x, y, bWidth, bHeight, palette[1] || '#1f2937'));
    actions.push(
      addKeyframe(bId, 'opacity', 0, 0),
      addKeyframe(bId, 'opacity', 1.5 + i * 0.2, 1)
    );
  }

  return {
    summary: 'Built a simple city skyline scene.',
    actions,
  };
}
