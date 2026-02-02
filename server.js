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

function detectKeywords(text) {
  const t = text.toLowerCase();
  return {
    bounce: /bounce|bouncy|jump/.test(t),
    spin: /spin|rotate|twirl/.test(t),
    pulse: /pulse|pulsate|throb|scale/.test(t),
    fade: /fade|fading|opacity/.test(t),
    move: /move|travel|slide|across|left|right|up|down/.test(t),
    left: /left/.test(t),
    right: /right/.test(t),
    up: /up/.test(t),
    down: /down/.test(t),
    sunset: /sunset|sunrise|dawn|dusk/.test(t),
    circle: /circle|ball|orb/.test(t),
    rect: /rect|square|box/.test(t),
    text: /text|title|label/.test(t),
  };
}

function buildAnimationActions(elementId, duration, keywords, elementToAnimate) {
  const actions = [];
  const safeDuration = Math.max(0.5, Number.isFinite(duration) ? duration : 3);
  const t0 = 0;
  const tMid = safeDuration * 0.5;
  const tEnd = safeDuration;

  const baseX = Number.isFinite(elementToAnimate?.x) ? elementToAnimate.x : 0;
  const baseY = Number.isFinite(elementToAnimate?.y) ? elementToAnimate.y : 0;
  const moveDelta = 120;

  if (keywords.move || keywords.left || keywords.right || keywords.up || keywords.down) {
    const dx = keywords.left ? -moveDelta : keywords.right ? moveDelta : moveDelta;
    const dy = keywords.up ? -moveDelta : keywords.down ? moveDelta : 0;
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

  if (keywords.bounce) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: t0, value: baseY } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: tMid, value: baseY - 80, easing: 'ease-out' } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'y', time: tEnd, value: baseY, easing: 'ease-in' } }
    );
  }

  if (keywords.spin) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'rotation', time: t0, value: 0 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'rotation', time: tEnd, value: 360 } }
    );
  }

  if (keywords.pulse) {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'scale', time: t0, value: 1 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'scale', time: tMid, value: 1.15 } },
      { type: 'ADD_KEYFRAME', payload: { elementId, property: 'scale', time: tEnd, value: 1 } }
    );
  }

  if (keywords.fade) {
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

  if (elementToAnimate?.id) {
    const animActions = buildAnimationActions(elementToAnimate.id, animationDuration, keywords, elementToAnimate);
    actions.push(...animActions);
    if (animActions.length === 0) {
      actions.push(
        { type: 'ADD_KEYFRAME', payload: { elementId: elementToAnimate.id, property: 'scale', time: 0, value: 1 } },
        { type: 'ADD_KEYFRAME', payload: { elementId: elementToAnimate.id, property: 'scale', time: 1.2, value: 1.1 } },
        { type: 'ADD_KEYFRAME', payload: { elementId: elementToAnimate.id, property: 'scale', time: 2.4, value: 1 } }
      );
      summaryParts.push('Added a subtle pulse to the selected element.');
    } else {
      summaryParts.push('Animated the selected element based on your request.');
    }
    return { summary: summaryParts.join(' '), actions };
  }

  const newId = newIdFactory();
  const width = Number.isFinite(artboard?.width) ? artboard.width : 800;
  const height = Number.isFinite(artboard?.height) ? artboard.height : 600;

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

  if (keywords.circle) {
    const circleId = newId();
    actions.push({
      type: 'ADD_ELEMENT',
      payload: {
        type: 'circle',
        props: {
          id: circleId,
          x: width * 0.5,
          y: height * 0.5,
          r: Math.min(width, height) * 0.1,
          fill: '#38bdf8',
          stroke: '#0f172a',
          strokeWidth: 2,
        },
      },
    });
    actions.push(...buildAnimationActions(circleId, animationDuration, { ...keywords, bounce: true }, { x: width * 0.5, y: height * 0.5 }));
    summaryParts.push('Added a bouncing circle.');
    return { summary: summaryParts.join(' '), actions };
  }

  if (keywords.rect) {
    const rectId = newId();
    const rectWidth = clamp(width * 0.35, 80, width * 0.8);
    const rectHeight = clamp(height * 0.25, 60, height * 0.8);
    actions.push({
      type: 'ADD_ELEMENT',
      payload: {
        type: 'rect',
        props: {
          id: rectId,
          x: width * 0.5 - rectWidth / 2,
          y: height * 0.5 - rectHeight / 2,
          width: rectWidth,
          height: rectHeight,
          fill: '#22c55e',
          stroke: '#14532d',
          strokeWidth: 2,
        },
      },
    });
    actions.push(...buildAnimationActions(rectId, animationDuration, { ...keywords, spin: true }, { x: width * 0.5, y: height * 0.5 }));
    summaryParts.push('Added a rotating rectangle.');
    return { summary: summaryParts.join(' '), actions };
  }

  const textId = newId();
  actions.push({
    type: 'ADD_ELEMENT',
    payload: {
      type: 'text',
      props: {
        id: textId,
        x: width * 0.5,
        y: height * 0.5,
        text: 'Vector Maestro',
        fontSize: 48,
        fill: '#e2e8f0',
        textAnchor: 'middle',
      },
    },
  });
  actions.push(...buildAnimationActions(textId, animationDuration, { ...keywords, pulse: true }, { x: width * 0.5, y: height * 0.5 }));
  summaryParts.push('Added a title and a gentle pulse.');
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
