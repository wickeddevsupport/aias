export function buildBlobPath(radius = 80, lobes = 6) {
  const points = [];
  for (let i = 0; i < lobes; i += 1) {
    const angle = (Math.PI * 2 * i) / lobes;
    const wobble = 1 + 0.18 * Math.sin(angle * 2);
    const r = radius * wobble;
    points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  if (points.length === 0) return 'M0,0';

  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length; i += 1) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const cx = (curr.x + next.x) / 2;
    const cy = (curr.y + next.y) / 2;
    d += ` Q${curr.x.toFixed(2)},${curr.y.toFixed(2)} ${cx.toFixed(2)},${cy.toFixed(2)}`;
  }
  d += ' Z';
  return d;
}

export function buildWavePath(width = 300, amplitude = 30, cycles = 2) {
  const halfWidth = width / 2;
  const segmentWidth = width / (cycles * 2);
  let d = `M${-halfWidth.toFixed(2)},0`;
  let x = -halfWidth;
  for (let i = 0; i < cycles * 2; i += 1) {
    const controlX = x + segmentWidth / 2;
    const controlY = i % 2 === 0 ? -amplitude : amplitude;
    const endX = x + segmentWidth;
    d += ` Q${controlX.toFixed(2)},${controlY.toFixed(2)} ${endX.toFixed(2)},0`;
    x = endX;
  }
  return d;
}

export function buildSpiralPath(turns = 3, radius = 120, points = 60) {
  const totalPoints = Math.max(12, points);
  let d = 'M0,0';
  for (let i = 0; i <= totalPoints; i += 1) {
    const t = i / totalPoints;
    const angle = turns * Math.PI * 2 * t;
    const r = radius * t;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    d += ` L${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
}

export function buildHeartPath(size = 120) {
  const s = size / 2;
  return `M0,${s * 0.35}
    C${s * -0.9},${s * -0.6} ${s * -1.6},${s * 0.6} 0,${s * 1.4}
    C${s * 1.6},${s * 0.6} ${s * 0.9},${s * -0.6} 0,${s * 0.35} Z`
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildStarPath(points = 5, outerRadius = 80, innerRadius = 35) {
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return `${d}Z`.trim();
}

export function buildMountainPath(width = 800, height = 200) {
  const half = width / 2;
  return `M${-half},${height * 0.6}
    L${-half * 0.6},${height * 0.15}
    L${-half * 0.1},${height * 0.65}
    L${half * 0.1},${height * 0.2}
    L${half * 0.6},${height * 0.7}
    L${half},${height * 0.4}
    L${half},${height}
    L${-half},${height} Z`
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCloudPath(width = 200, height = 80) {
  const w = width;
  const h = height;
  return `M${-w * 0.35},${h * 0.2}
    C${-w * 0.55},${h * -0.1} ${-w * 0.15},${h * -0.4} ${0},${h * -0.1}
    C${w * 0.05},${h * -0.45} ${w * 0.45},${h * -0.35} ${w * 0.4},${h * -0.05}
    C${w * 0.6},${h * 0.05} ${w * 0.55},${h * 0.4} ${w * 0.2},${h * 0.35}
    L${-w * 0.35},${h * 0.35} Z`
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDunePath(width = 800, height = 120) {
  const half = width / 2;
  return `M${-half},${height}
    Q${-half * 0.5},${height * 0.2} 0,${height * 0.6}
    T${half},${height * 0.4}
    L${half},${height}
    Z`
    .replace(/\s+/g, ' ')
    .trim();
}
