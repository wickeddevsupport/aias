export const COLOR_MAP = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#facc15',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  slate: '#64748b',
  gray: '#9ca3af',
  brown: '#92400e',
  beige: '#f5f5dc',
  cream: '#fff7d6',
  navy: '#0f172a',
  magenta: '#d946ef',
  gold: '#f59e0b',
  silver: '#cbd5f5',
  black: '#0f172a',
  white: '#f8fafc',
};

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  couple: 2,
  pair: 2,
  few: 3,
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

export function detectKeywords(text) {
  const t = normalizeText(text);
  return {
    add: /\b(add|create|draw|insert|generate)\b/.test(t),
    makeA: /\bmake (a|an|another|new)\b/.test(t),
    draw: /\b(draw|sketch|trace)\b/.test(t),
    animate: /\b(animate|animation|loop|motion)\b/.test(t),
    loop: /\b(loop|repeat|seamless)\b/.test(t),
    play: /\b(play|start)\b/.test(t),
    pause: /\b(pause|stop)\b/.test(t),
    bounce: /\b(bounce|bouncy|jump)\b/.test(t),
    dance: /\b(dance|groove)\b/.test(t),
    spin: /\b(spin|rotate|twirl)\b/.test(t),
    pulse: /\b(pulse|pulsate|throb)\b/.test(t),
    fade: /\b(fade|fading|opacity|transparent)\b/.test(t),
    move: /\b(move|travel|slide|across)\b/.test(t),
    walk: /\b(walk|walking|stroll)\b/.test(t),
    run: /\b(run|running|sprint)\b/.test(t),
    wave: /\b(wave|waving)\b/.test(t),
    idle: /\b(idle|breathing|still)\b/.test(t),
    float: /\b(float|drift|hover)\b/.test(t),
    pan: /\b(pan|panning)\b/.test(t),
    zoom: /\b(zoom|zooming)\b/.test(t),
    camera: /\b(camera|cinematic|shot)\b/.test(t),
    glow: /\b(glow|glowing|neon)\b/.test(t),
    left: /\bleft\b/.test(t),
    right: /\bright\b/.test(t),
    up: /\bup\b|\btop\b/.test(t),
    down: /\bdown\b|\bbottom\b/.test(t),
    leftmost: /\bleftmost\b/.test(t),
    rightmost: /\brightmost\b/.test(t),
    topmost: /\btopmost\b/.test(t),
    bottommost: /\bbottommost\b/.test(t),
    largest: /\b(largest|biggest)\b/.test(t),
    smallest: /\b(smallest|tiny)\b/.test(t),
    center: /\bcenter|centre|middle\b/.test(t),
    background: /\b(background|bg)\b/.test(t),
    foreground: /\b(foreground|front)\b/.test(t),
    subject: /\b(subject|person|main)\b/.test(t),
    existing: /\b(existing|current|selected)\b/.test(t),
    all: /\b(all|everything|entire)\b/.test(t),
    scene: /\b(scene|landscape|environment)\b/.test(t),
    sunset: /\b(sunset|sunrise|dawn|dusk)\b/.test(t),
    ocean: /\b(ocean|sea|beach)\b/.test(t),
    city: /\b(city|buildings|skyline)\b/.test(t),
    forest: /\b(forest|woods|trees|pine)\b/.test(t),
    mountain: /\b(mountain|mountains|hills|peaks)\b/.test(t),
    desert: /\b(desert|dunes|cactus)\b/.test(t),
    space: /\b(space|galaxy|cosmos|nebula)\b/.test(t),
    studio: /\b(studio|room|stage|interior)\b/.test(t),
    neon: /\b(neon|cyberpunk|synth)\b/.test(t),
    night: /\b(night|midnight|dark)\b/.test(t),
    snow: /\b(snow|winter|frost)\b/.test(t),
    rain: /\b(rain|storm|thunder)\b/.test(t),
    clouds: /\b(cloud|clouds)\b/.test(t),
    stars: /\b(star|stars)\b/.test(t),
    moon: /\b(moon)\b/.test(t),
    river: /\b(river|stream)\b/.test(t),
    lake: /\b(lake)\b/.test(t),
    meadow: /\b(meadow|field|grass)\b/.test(t),
    character: /\b(character|person|human|rider|girl|boy|man|woman)\b/.test(t),
    robot: /\b(robot|android|bot)\b/.test(t),
    animal: /\b(animal|cat|dog|bird|horse|fox|owl|wolf)\b/.test(t),
    circle: /\b(circle|ball|orb)\b/.test(t),
    rect: /\b(rect|rectangle|square|box)\b/.test(t),
    text: /\b(text|title|label)\b/.test(t),
    path: /\b(path|curve|bezier|vector)\b/.test(t),
    blob: /\b(blob|goo|amoeba)\b/.test(t),
    wavePath: /\b(wave|waves|sine)\b/.test(t),
    spiral: /\b(spiral|swirl|twist)\b/.test(t),
    heart: /\b(heart|love)\b/.test(t),
    starShape: /\b(star|sparkle)\b/.test(t),
    polygon: /\b(polygon|triangle|hexagon|octagon)\b/.test(t),
    zigzag: /\b(zigzag|zig-zag)\b/.test(t),
    stroke: /\b(stroke|outline|border)\b/.test(t),
    fill: /\b(fill)\b/.test(t),
    bigger: /\b(bigger|larger|increase|grow)\b/.test(t),
    smaller: /\b(smaller|decrease|shrink)\b/.test(t),
    grid: /\bgrid\b/.test(t),
    column: /\b(column|vertical)\b/.test(t),
    row: /\b(row|horizontal)\b/.test(t),
    gradient: /\b(gradient|ombre)\b/.test(t),
    pastel: /\b(pastel|soft)\b/.test(t),
    bold: /\b(bold|thick|chunky)\b/.test(t),
    minimal: /\b(minimal|clean|simple)\b/.test(t),
    flat: /\b(flat|2d)\b/.test(t),
    outline: /\b(outline|lineart|wireframe)\b/.test(t),
    dark: /\b(dark|night|moody)\b/.test(t),
    light: /\b(light|bright)\b/.test(t),
    photo: /\b(photo|photograph|image|picture|portrait|selfie)\b/.test(t),
    kenBurns: /\b(ken burns|pan and zoom|pan|zoom)\b/.test(t),
    parallax: /\b(parallax|depth)\b/.test(t),
    silhouette: /\b(silhouette|cutout)\b/.test(t),
    boundingBox: /\b(bounding box|bbox|selection box)\b/.test(t),
    textOnPath: /\b(text on path|text along|label along|type on path)\b/.test(t),
  };
}

export function extractHexColor(text) {
  const match = text.match(/#([0-9a-f]{3,8})\b/i);
  return match ? `#${match[1]}` : null;
}

export function extractHexColors(text) {
  const matches = text.match(/#([0-9a-f]{3,8})\b/gi);
  if (!matches) return [];
  const unique = new Set(matches.map(match => match.toLowerCase()));
  return Array.from(unique);
}

export function extractNamedColor(text) {
  for (const name of Object.keys(COLOR_MAP)) {
    const re = new RegExp(`\\b${name}\\b`, 'i');
    if (re.test(text)) return COLOR_MAP[name];
  }
  return null;
}

export function extractNamedColors(text) {
  const hits = new Set();
  for (const name of Object.keys(COLOR_MAP)) {
    const re = new RegExp(`\\b${name}\\b`, 'i');
    if (re.test(text)) hits.add(COLOR_MAP[name]);
  }
  return Array.from(hits);
}

export function extractColor(text) {
  return extractHexColor(text) || extractNamedColor(text);
}

export function extractPalette(text, fallback = []) {
  const colors = [...extractHexColors(text), ...extractNamedColors(text)];
  const unique = Array.from(new Set(colors.map(color => color.toLowerCase())));
  if (unique.length > 0) return unique.slice(0, 6);
  return fallback;
}

export function extractOpacity(text) {
  const t = normalizeText(text);
  if (/\btransparent\b/.test(t)) return 0.2;
  const percentMatch = t.match(/(\d{1,3})\s*%/);
  if (percentMatch) {
    const pct = clamp(parseInt(percentMatch[1], 10), 0, 100);
    return pct / 100;
  }
  const opacityMatch = t.match(/opacity\s*([0-9]*\.?[0-9]+)/);
  if (opacityMatch) {
    let val = parseFloat(opacityMatch[1]);
    if (val > 1) val = clamp(val, 0, 100) / 100;
    return clamp(val, 0, 1);
  }
  return null;
}

export function extractStrokeWidth(text) {
  const t = normalizeText(text);
  const match = t.match(/\b(stroke|outline|border)\s*(\d+(\.\d+)?)\b/);
  if (match) return parseFloat(match[2]);
  return null;
}

export function extractCount(text) {
  const t = normalizeText(text);
  const digitMatch = t.match(/(\d+)\s*(circles?|rectangles?|squares?|shapes?|objects?|items?)/);
  if (digitMatch) return clamp(parseInt(digitMatch[1], 10), 1, 12);

  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(t)) return clamp(value, 1, 12);
  }
  return 1;
}

export function extractFontSize(text) {
  const t = normalizeText(text);
  const match = t.match(/\b(font\s*size|size)\s*(\d+(\.\d+)?)\b/);
  if (match) return parseFloat(match[2]);
  return null;
}

export function extractDurationSeconds(text) {
  const t = normalizeText(text);
  const durationMatch = t.match(/\b(duration|length)\s*(\d+(\.\d+)?)\b/);
  if (durationMatch) return parseFloat(durationMatch[2]);
  const secondsMatch = t.match(/\b(\d+(\.\d+)?)\s*(s|sec|secs|seconds)\b/);
  if (secondsMatch) return parseFloat(secondsMatch[1]);
  return null;
}

export function extractPlaybackSpeed(text) {
  const t = normalizeText(text);
  const speedMatch = t.match(/\b(speed|playback)\s*(\d+(\.\d+)?)\b/);
  if (speedMatch) return parseFloat(speedMatch[2]);
  const xMatch = t.match(/\b(\d+(\.\d+)?)x\b/);
  if (xMatch) return parseFloat(xMatch[1]);
  return null;
}

export function extractTextContent(text) {
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted && quoted[1]) return quoted[1].trim();
  const t = normalizeText(text);
  const textMatch = t.match(/\b(text|title|label)\b\s+(.+)/);
  if (textMatch && textMatch[2]) {
    return textMatch[2].replace(/\b(with|in|on|at)\b.*$/, '').trim();
  }
  return null;
}

export function extractSize(text, shapeType, artboard) {
  const t = normalizeText(text);
  const minDim = Math.min(artboard.width, artboard.height);

  if (shapeType === 'circle') {
    const rMatch = t.match(/\b(radius|r)\s*(\d+(\.\d+)?)\b/);
    if (rMatch) return { r: parseFloat(rMatch[2]) };
    if (/\bsmall\b/.test(t)) return { r: minDim * 0.06 };
    if (/\blarge\b/.test(t)) return { r: minDim * 0.18 };
    return { r: minDim * 0.1 };
  }

  if (shapeType === 'rect') {
    const wMatch = t.match(/\bwidth\s*(\d+(\.\d+)?)\b/);
    const hMatch = t.match(/\bheight\s*(\d+(\.\d+)?)\b/);
    const squareMatch = t.match(/\bsquare\s*(\d+(\.\d+)?)\b/);
    const base = minDim * 0.18;
    if (squareMatch) {
      const size = parseFloat(squareMatch[1]);
      return { width: size, height: size };
    }
    const width = wMatch ? parseFloat(wMatch[1]) : base * 1.4;
    const height = hMatch ? parseFloat(hMatch[1]) : base;
    if (/\bsmall\b/.test(t)) return { width: base, height: base * 0.7 };
    if (/\blarge\b/.test(t)) return { width: base * 2, height: base * 1.2 };
    return { width, height };
  }

  return {};
}

export function resolvePosition(type, artboard, size, positionKeywords, currentPosition) {
  const padding = 40;
  let x = currentPosition?.x ?? artboard.width * 0.5;
  let y = currentPosition?.y ?? artboard.height * 0.5;

  const width = size.width ?? (size.r ? size.r * 2 : 0);
  const height = size.height ?? (size.r ? size.r * 2 : 0);

  if (positionKeywords.center) {
    if (type === 'rect') x = (artboard.width - width) / 2;
    else x = artboard.width / 2;
    if (type === 'rect') y = (artboard.height - height) / 2;
    else y = artboard.height / 2;
  }

  if (positionKeywords.left) {
    x = type === 'rect' ? padding : padding + (size.r ?? 0);
  }
  if (positionKeywords.right) {
    x = type === 'rect'
      ? artboard.width - width - padding
      : artboard.width - padding - (size.r ?? 0);
  }
  if (positionKeywords.up) {
    y = type === 'rect' ? padding : padding + (size.r ?? 0);
  }
  if (positionKeywords.down) {
    y = type === 'rect'
      ? artboard.height - height - padding
      : artboard.height - padding - (size.r ?? 0);
  }

  return { x, y };
}
