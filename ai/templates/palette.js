import { createLinearGradient, createRadialGradient } from './utils.js';

export function resolvePalette(plan, fallback) {
  const palette = Array.isArray(plan?.palette) && plan.palette.length > 0 ? plan.palette : fallback;
  return palette.length > 0 ? palette : ['#3b82f6', '#22c55e', '#f97316'];
}

export function resolveBackgroundFill(plan, palette, id, angle = 90) {
  if (plan?.keywords?.gradient || plan?.style === 'neon' || plan?.style === 'pastel') {
    return createLinearGradient(id, palette, angle);
  }
  return palette[0];
}

export function resolveAccentFill(plan, palette, id) {
  if (plan?.keywords?.gradient && palette.length > 1) {
    return createRadialGradient(id, palette.slice().reverse());
  }
  return palette[palette.length - 1] || palette[0];
}
