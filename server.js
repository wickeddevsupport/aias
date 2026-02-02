import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function newIdFactory() {
  let counter = 1;
  return () => `{{NEW_ID_${counter++}}}`;
}

const COLOR_MAP = {
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

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

function detectKeywords(text) {
  const t = normalizeText(text);
  return {
    add: /\b(add|create|draw|insert|generate)\b/.test(t),
    makeA: /\bmake (a|an|another|new)\b/.test(t),
    animate: /\b(animate|animation|loop|motion)\b/.test(t),
    bounce: /\b(bounce|bouncy|jump)\b/.test(t),
    spin: /\b(spin|rotate|twirl)\b/.test(t),
    pulse: /\b(pulse|pulsate|throb)\b/.test(t),
    fade: /\b(fade|fading|opacity|transparent)\b/.test(t),
    move: /\b(move|travel|slide|across)\b/.test(t),
    left: /\bleft\b/.test(t),
    right: /\bright\b/.test(t),
    up: /\bup\b|\btop\b/.test(t),
    down: /\bdown\b|\bbottom\b/.test(t),
    center: /\bcenter|centre|middle\b/.test(t),
    background: /\b(background|bg)\b/.test(t),
    sunset: /\b(sunset|sunrise|dawn|dusk)\b/.test(t),
    circle: /\b(circle|ball|orb)\b/.test(t),
    rect: /\b(rect|rectangle|square|box)\b/.test(t),
    text: /\b(text|title|label)\b/.test(t),
    stroke: /\b(stroke|outline|border)\b/.test(t),
    fill: /\b(fill)\b/.test(t),
    bigger: /\b(bigger|larger|increase|grow)\b/.test(t),
    smaller: /\b(smaller|decrease|shrink)\b/.test(t),
  };
}

function extractHexColor(text) {
  const match = text.match(/#([0-9a-f]{3,8})\b/i);
  return match ? `#${match[1]}` : null;
}

function extractNamedColor(text) {
  for (const name of Object.keys(COLOR_MAP)) {
    const re = new RegExp(`\\b${name}\\b`, 'i');
    if (re.test(text)) return COLOR_MAP[name];
  }
  return null;
}

function extractColor(text) {
  return extractHexColor(text) || extractNamedColor(text);
}

function extractOpacity(text) {
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

function extractStrokeWidth(text) {
  const t = normalizeText(text);
  const match = t.match(/\b(stroke|outline|border)\s*(\d+(\.\d+)?)\b/);
  if (match) return parseFloat(match[2]);
  return null;
}

function extractCount(text) {
  const t = normalizeText(text);
  const digitMatch = t.match(/(\d+)\s*(circles?|rectangles?|squares?|shapes?|objects?|items?)/);
  if (digitMatch) return clamp(parseInt(digitMatch[1], 10), 1, 12);

  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(t)) return clamp(value, 1, 12);
  }
  return 1;
}

function extractTextContent(text) {
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted && quoted[1]) return quoted[1].trim();
  const t = normalizeText(text);
  const textMatch = t.match(/\b(text|title|label)\b\s+(.+)/);
  if (textMatch && textMatch[2]) {
    return textMatch[2].replace(/\b(with|in|on|at)\b.*$/, '').trim();
  }
  return null;
}

function extractSize(text, shapeType, artboard) {
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

function extractFontSize(text) {
  const t = normalizeText(text);
  const match = t.match(/\b(font\s*size|size)\s*(\d+(\.\d+)?)\b/);
  if (match) return parseFloat(match[2]);
  return null;
}

function resolvePosition(type, artboard, size, positionKeywords, currentPosition) {
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

function buildAnimationActions(elementId, duration, intent) {
  const actions = [];
  const safeDuration = Math.max(0.5, Number.isFinite(duration) ? duration : 3);
  const t0 = 0;
  const tMid = safeDuration * 0.5;
  const tEnd = safeDuration;

  const baseX = Number.isFinite(intent?.baseX) ? intent.baseX : 0;
  const baseY = Number.isFinite(intent?.baseY) ? intent.baseY : 0;
  const moveDelta = intent?.moveDelta ?? 120;
  const moveTarget = intent?.moveTarget;

  if (intent?.move) {
    if (moveTarget) {
      actions.push(
        { type: 'ADD_KEYFRAME', payload: { elementId, property: 'x', time: t0, value: baseX } },
        { type: 'ADD_KEYFRAME', payload: { elementId, property: 'x', time: tEnd, value: moveTarget.x } },
        { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: t0, value: baseY } },
        { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: tEnd, value: moveTarget.y } }
      );
    } else {
      const dx = intent.left ? -moveDelta : intent.right ? moveDelta : moveDelta;
      const dy = intent.up ? -moveDelta : intent.down ? moveDelta : 0;
      actions.push(
        { type: 'ADD_KEYFRAME', payload: { elementId, property: 'x', time: t0, value: baseX } },
        { type: 'ADD_KEYFRAME', payload: { elementId, property: 'x', time: tEnd, value: baseX + dx } }
      );
      if (dy !== 0) {
        actions.push(
          { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: t0, value: baseY } },
          { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: tEnd, value: baseY + dy } }
        );
      }
    }
  }

  if (intent?.bounce) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: t0, value: baseY } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: tMid, value: baseY - 80, easing: 'ease-out' } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: tEnd, value: baseY, easing: 'ease-in' } }
    );
  }

  if (intent?.spin) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'rotation', time: t0, value: 0 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'rotation', time: tEnd, value: 360 } }
    );
  }

  if (intent?.pulse) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'scale', time: t0, value: 1 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'scale', time: tMid, value: 1.15 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'scale', time: tEnd, value: 1 } }
    );
  }

  if (intent?.fade) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'opacity', time: t0, value: 1 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'opacity', time: tEnd, value: 0 } }
    );
  }

  return actions;
}

function generateInhouseActions(payload) {
  const { userRequest, artboard, animationDuration, elementToAnimate } = payload || {};
  const keywords = detectKeywords(userRequest || '');
  const actions = [];
  const summaryParts = [];

  const width = Number.isFinite(artboard?.width) ? artboard.width : 800;
  const height = Number.isFinite(artboard?.height) ? artboard.height : 600;
  const color = extractColor(userRequest || '');
  const opacity = extractOpacity(userRequest || '');
  const count = extractCount(userRequest || '');
  const textContent = extractTextContent(userRequest || '');
  const positionKeywords = {
    left: keywords.left,
    right: keywords.right,
    up: keywords.up,
    down: keywords.down,
    center: keywords.center,
  };

  if (keywords.background && color) {
    actions.push({ type: 'SET_ARTBOARD_PROPS', payload: { backgroundColor: color } });
    summaryParts.push('Updated the artboard background.');
  }

  const wantsCreate = keywords.add || keywords.makeA || /new\b/.test(normalizeText(userRequest || ''));
  const shouldModifySelected = !!elementToAnimate?.id && !wantsCreate;

  if (shouldModifySelected && elementToAnimate) {
    const updateProps = {};
    const animIntent = keywords.animate || keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down;
    const defaultPulse = keywords.animate && !(keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down);
    const type = elementToAnimate.type;
    const size = extractSize(userRequest || '', type, { width, height });
    if (type === 'rect') {
      if (!size.width && Number.isFinite(elementToAnimate.width)) size.width = elementToAnimate.width;
      if (!size.height && Number.isFinite(elementToAnimate.height)) size.height = elementToAnimate.height;
    }
    if (type === 'circle' && !size.r && Number.isFinite(elementToAnimate.r)) {
      size.r = elementToAnimate.r;
    }

    const strokeWidth = extractStrokeWidth(userRequest || '');
    if (color) {
      if (keywords.stroke) updateProps.stroke = color;
      else updateProps.fill = color;
    }
    if (keywords.stroke && strokeWidth) updateProps.strokeWidth = strokeWidth;
    if (opacity !== null) updateProps.opacity = opacity;
    if (keywords.bigger) updateProps.scale = clamp((elementToAnimate.scale ?? 1) * 1.2, 0.1, 10);
    if (keywords.smaller) updateProps.scale = clamp((elementToAnimate.scale ?? 1) * 0.8, 0.1, 10);
    if (type === 'circle' && size.r) updateProps.r = size.r;
    if (type === 'rect') {
      if (size.width) updateProps.width = size.width;
      if (size.height) updateProps.height = size.height;
    }
    if (type === 'text' && textContent) updateProps.text = textContent;

    if (keywords.left || keywords.right || keywords.up || keywords.down || keywords.center) {
      const targetPos = resolvePosition(
        type,
        { width, height },
        size,
        positionKeywords,
        { x: elementToAnimate.x ?? width / 2, y: elementToAnimate.y ?? height / 2 }
      );
      updateProps.x = targetPos.x;
      updateProps.y = targetPos.y;
    }

    if (Object.keys(updateProps).length > 0) {
      actions.push({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementToAnimate.id, props: updateProps } });
      summaryParts.push('Updated the selected element.');
    }

    if (animIntent) {
      const moveTarget = (keywords.left || keywords.right || keywords.up || keywords.down || keywords.center)
        ? resolvePosition(
            type,
            { width, height },
            size,
            positionKeywords,
            { x: elementToAnimate.x ?? width / 2, y: elementToAnimate.y ?? height / 2 }
          )
        : null;

      const animActions = buildAnimationActions(elementToAnimate.id, animationDuration, {
        ...keywords,
        pulse: keywords.pulse || defaultPulse,
        baseX: elementToAnimate.x ?? width / 2,
        baseY: elementToAnimate.y ?? height / 2,
        move: keywords.move || keywords.left || keywords.right || keywords.up || keywords.down,
        moveTarget,
      });
      actions.push(...animActions);
      if (animActions.length > 0) summaryParts.push('Added animation to the selected element.');
    }

    if (actions.length > 0) {
      return { summary: summaryParts.join(' '), actions };
    }
  }

  const newId = newIdFactory();

  if (keywords.sunset) {
    const bgId = newId();
    const sunId = newId();
    actions.push(
      { type: 'ADD_ELEMENT', payload: { type: 'rect', props: { id: bgId, x: 0, y: 0, width, height, fill: '#0f172a' } } },
      { type: 'ADD_ELEMENT', payload: { type: 'circle', props: { id: sunId, x: width * 0.5, y: height * 0.6, r: Math.min(width, height) * 0.12, fill: '#f97316', stroke: 'none' } } }
    );
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId: sunId, property: 'y', time: 0, value: height * 0.6 } },
      { type: 'ADD_KEYFRAME', payload: { elementId: sunId, property: 'y', time: Math.max(1, animationDuration || 3), value: height * 0.4 } }
    );
    summaryParts.push('Created a simple sunset scene with a moving sun.');
    return { summary: summaryParts.join(' '), actions };
  }

  const shapeTypes = [];
  if (keywords.circle) shapeTypes.push('circle');
  if (keywords.rect) shapeTypes.push('rect');
  if (keywords.text) shapeTypes.push('text');
  if (shapeTypes.length === 0 && textContent) shapeTypes.push('text');
  if (shapeTypes.length === 0) shapeTypes.push('rect');

  const elementsToCreate = [];
  if (shapeTypes.length === 1) {
    for (let i = 0; i < count; i += 1) elementsToCreate.push(shapeTypes[0]);
  } else {
    shapeTypes.forEach(type => elementsToCreate.push(type));
    while (elementsToCreate.length < count) elementsToCreate.push(shapeTypes[0]);
  }

  const layout = /\b(grid)\b/.test(normalizeText(userRequest || ''))
    ? 'grid'
    : /\b(column|vertical)\b/.test(normalizeText(userRequest || ''))
      ? 'column'
      : 'row';

  const positions = [];
  if (elementsToCreate.length === 1) {
    positions.push({ x: width / 2, y: height / 2 });
  } else if (layout === 'column') {
    const startY = height * 0.2;
    const endY = height * 0.8;
    const step = (endY - startY) / (elementsToCreate.length - 1);
    for (let i = 0; i < elementsToCreate.length; i += 1) {
      positions.push({ x: width / 2, y: startY + step * i });
    }
  } else if (layout === 'grid') {
    const cols = Math.ceil(Math.sqrt(elementsToCreate.length));
    const rows = Math.ceil(elementsToCreate.length / cols);
    const startX = width * 0.2;
    const endX = width * 0.8;
    const startY = height * 0.2;
    const endY = height * 0.8;
    const stepX = cols > 1 ? (endX - startX) / (cols - 1) : 0;
    const stepY = rows > 1 ? (endY - startY) / (rows - 1) : 0;
    for (let i = 0; i < elementsToCreate.length; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({ x: startX + stepX * col, y: startY + stepY * row });
    }
  } else {
    const startX = width * 0.2;
    const endX = width * 0.8;
    const step = (endX - startX) / (elementsToCreate.length - 1);
    for (let i = 0; i < elementsToCreate.length; i += 1) {
      positions.push({ x: startX + step * i, y: height / 2 });
    }
  }

  elementsToCreate.forEach((type, idx) => {
    const id = newId();
    const size = extractSize(userRequest || '', type, { width, height });
    let pos = positions[idx] || { x: width / 2, y: height / 2 };

    if (elementsToCreate.length === 1 && (keywords.left || keywords.right || keywords.up || keywords.down || keywords.center)) {
      pos = resolvePosition(type, { width, height }, size, positionKeywords, pos);
    }

    const fillColor = color || Object.values(COLOR_MAP)[idx % Object.values(COLOR_MAP).length];
    const strokeColor = keywords.stroke ? (color || '#0f172a') : 'none';
    const strokeWidth = extractStrokeWidth(userRequest || '') || (keywords.stroke ? 2 : 0);

    if (type === 'circle') {
      actions.push({
        type: 'ADD_ELEMENT',
        payload: {
          type: 'circle',
          props: {
            id,
            x: pos.x,
            y: pos.y,
            r: size.r,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
          },
        },
      });
    } else if (type === 'rect') {
      const widthVal = size.width ?? width * 0.2;
      const heightVal = size.height ?? height * 0.15;
      actions.push({
        type: 'ADD_ELEMENT',
        payload: {
          type: 'rect',
          props: {
            id,
            x: pos.x - widthVal / 2,
            y: pos.y - heightVal / 2,
            width: widthVal,
            height: heightVal,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
          },
        },
      });
    } else if (type === 'text') {
      const fontSize = Math.max(18, Math.min(96, extractFontSize(userRequest || '') || 48));
      actions.push({
        type: 'ADD_ELEMENT',
        payload: {
          type: 'text',
          props: {
            id,
            x: pos.x,
            y: pos.y,
            text: textContent || 'Vector Maestro',
            fontSize,
            fill: fillColor || '#e2e8f0',
            textAnchor: 'middle',
          },
        },
      });
    }

    const shouldAnimate = keywords.animate || keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down;
    const defaultPulseNew = keywords.animate && !(keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down);
    if (shouldAnimate) {
      actions.push(...buildAnimationActions(id, animationDuration, {
        ...keywords,
        pulse: keywords.pulse || defaultPulseNew,
        baseX: pos.x,
        baseY: pos.y,
        move: keywords.move || keywords.left || keywords.right || keywords.up || keywords.down,
      }));
    }
  });

  summaryParts.push(`Created ${elementsToCreate.length} element${elementsToCreate.length > 1 ? 's' : ''}.`);
  if (keywords.animate || keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down) {
    summaryParts.push('Added animation based on your prompt.');
  }
  return { summary: summaryParts.join(' '), actions };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/ai/generate', (req, res) => {
  try {
    const result = generateInhouseActions(req.body);
    res.json(result);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ summary: 'AI failed to process the request.', actions: [] });
  }
});

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
