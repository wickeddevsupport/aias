import { generateAiActions } from './engine.js';
import { validateActions } from './validator.js';

const artboard = { width: 800, height: 600 };
const defaultPayload = {
  artboard,
  animationDuration: 5,
  elementToAnimate: null,
  existingElements: [],
};

const imageElement = {
  id: 'image-1',
  type: 'image',
  x: 120,
  y: 80,
  width: 420,
  height: 320,
  opacity: 1,
  rotation: 0,
  scale: 1,
  fill: 'none',
  stroke: 'none',
  strokeWidth: 0,
  href: 'https://via.placeholder.com/640x480?text=Photo',
};

const cases = [
  { name: 'Scene + character', prompt: 'A robot waves in a neon room', expect: { scene: true, character: true } },
  { name: 'Path blob', prompt: 'Create a blob path with curves', expect: { path: true } },
  { name: 'Spiral', prompt: 'Draw a spiral path', expect: { path: true } },
  { name: 'Forest scene', prompt: 'A forest landscape with trees', expect: { scene: true } },
  { name: 'Space scene', prompt: 'Space scene with stars and a planet', expect: { scene: true } },
  { name: 'Photo tier1', prompt: 'Animate photo with Ken Burns', expect: { photo: true }, payload: { elementToAnimate: imageElement, existingElements: [imageElement] } },
  { name: 'Photo tier2', prompt: 'Subject selection photo with bounding box', expect: { photo: true }, payload: { elementToAnimate: imageElement, existingElements: [imageElement] } },
  { name: 'Character walk', prompt: 'A character walks across the screen', expect: { character: true } },
];

function analyzeActions(actions) {
  const summary = {
    elements: 0,
    keyframes: 0,
    hasPath: false,
    hasImage: false,
    hasGroup: false,
    hasAnimation: false,
  };
  actions.forEach(action => {
    if (action.type === 'ADD_ELEMENT') {
      summary.elements += 1;
      if (action.payload?.type === 'path') summary.hasPath = true;
      if (action.payload?.type === 'image') summary.hasImage = true;
      if (action.payload?.type === 'group') summary.hasGroup = true;
    }
    if (action.type === 'ADD_KEYFRAME') {
      summary.keyframes += 1;
      summary.hasAnimation = true;
    }
  });
  return summary;
}

function scoreCase(expect, analysis) {
  let score = 0;
  if (analysis.elements > 0) score += 1;
  if (analysis.hasAnimation) score += 1;
  if (expect?.path && analysis.hasPath) score += 1;
  if (expect?.photo && analysis.hasImage) score += 1;
  if (expect?.character && analysis.hasGroup) score += 1;
  return score;
}

let totalScore = 0;
let maxScore = 0;

cases.forEach(testCase => {
  const payload = {
    ...defaultPayload,
    userRequest: testCase.prompt,
    ...(testCase.payload || {}),
  };
  const result = generateAiActions(payload);
  const validated = validateActions(result.actions);
  const analysis = analyzeActions(validated.actions);
  const score = scoreCase(testCase.expect, analysis);
  maxScore += 3;
  totalScore += score;
  const status = validated.actions.length > 0 ? 'ok' : 'empty';
  console.log(`[${status}] ${testCase.name}: ${result.summary}`);
  console.log(`  elements=${analysis.elements} keyframes=${analysis.keyframes} score=${score}/3`);
});

const percent = Math.round((totalScore / maxScore) * 100);
console.log(`\nAI regression score: ${totalScore}/${maxScore} (${percent}%)`);
