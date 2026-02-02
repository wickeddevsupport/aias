import { clamp } from './parse.js';

const VALID_ACTIONS = new Set([
  'ADD_ELEMENT',
  'UPDATE_ELEMENT_PROPS',
  'SET_ARTBOARD_PROPS',
  'ADD_KEYFRAME',
  'UPDATE_ANIMATION_DURATION',
  'SET_CURRENT_TIME',
  'SET_PLAYBACK_SPEED',
  'SET_IS_PLAYING',
  'GROUP_ELEMENT',
  'REPARENT_ELEMENT',
  'BRING_TO_FRONT',
  'SEND_TO_BACK',
  'BRING_FORWARD',
  'SEND_BACKWARD',
]);

const VALID_ELEMENT_TYPES = new Set(['rect', 'circle', 'path', 'text', 'group', 'image']);
const VALID_ANIM_PROPS = new Set([
  'x', 'y', 'rotation', 'scale', 'skewX', 'skewY',
  'opacity', 'fill', 'stroke', 'strokeWidth', 'width', 'height',
  'rx', 'ry', 'r', 'd', 'text', 'fontSize', 'letterSpacing', 'lineHeight',
  'motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY',
  'strokeDasharray', 'strokeDashoffset', 'drawStartPercent', 'drawEndPercent',
  'textPath', 'textPathStartOffset', 'textDecoration'
]);

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeProps(props) {
  const cleaned = { ...props };
  if (isFiniteNumber(cleaned.opacity)) cleaned.opacity = clamp(cleaned.opacity, 0, 1);
  if (isFiniteNumber(cleaned.scale)) cleaned.scale = Math.max(cleaned.scale, 0.01);
  if (isFiniteNumber(cleaned.strokeWidth)) cleaned.strokeWidth = Math.max(cleaned.strokeWidth, 0);
  if (isFiniteNumber(cleaned.fontSize)) cleaned.fontSize = Math.max(cleaned.fontSize, 1);
  if (isFiniteNumber(cleaned.drawStartPercent)) cleaned.drawStartPercent = clamp(cleaned.drawStartPercent, 0, 1);
  if (isFiniteNumber(cleaned.drawEndPercent)) cleaned.drawEndPercent = clamp(cleaned.drawEndPercent, 0, 1);
  if (isFiniteNumber(cleaned.motionPathStart)) cleaned.motionPathStart = clamp(cleaned.motionPathStart, 0, 1);
  if (isFiniteNumber(cleaned.motionPathEnd)) cleaned.motionPathEnd = clamp(cleaned.motionPathEnd, 0, 1);
  if (isFiniteNumber(cleaned.textPathStartOffset)) cleaned.textPathStartOffset = clamp(cleaned.textPathStartOffset, 0, 1);
  return cleaned;
}

function sanitizeAction(action) {
  if (!action || typeof action !== 'object') return null;
  if (!VALID_ACTIONS.has(action.type)) return null;

  switch (action.type) {
    case 'ADD_ELEMENT': {
      const payload = action.payload || {};
      if (!payload.type || !VALID_ELEMENT_TYPES.has(payload.type)) return null;
      const props = sanitizeProps(payload.props || {});
      return { ...action, payload: { ...payload, props } };
    }
    case 'UPDATE_ELEMENT_PROPS': {
      const payload = action.payload || {};
      if (!payload.id || typeof payload.id !== 'string') return null;
      const props = sanitizeProps(payload.props || {});
      return { ...action, payload: { ...payload, props } };
    }
    case 'SET_ARTBOARD_PROPS': {
      const payload = action.payload || {};
      return { ...action, payload };
    }
    case 'ADD_KEYFRAME': {
      const payload = action.payload || {};
      if (!payload.elementId || typeof payload.elementId !== 'string') return null;
      if (!VALID_ANIM_PROPS.has(payload.property)) return null;
      if (!isFiniteNumber(payload.time) || payload.time < 0) return null;
      const safePayload = { ...payload };
      if (payload.property === 'opacity' && isFiniteNumber(payload.value)) {
        safePayload.value = clamp(payload.value, 0, 1);
      }
      if (payload.property === 'scale' && isFiniteNumber(payload.value)) {
        safePayload.value = Math.max(payload.value, 0.01);
      }
      if ((payload.property === 'drawStartPercent' || payload.property === 'drawEndPercent') && isFiniteNumber(payload.value)) {
        safePayload.value = clamp(payload.value, 0, 1);
      }
      if ((payload.property === 'motionPathStart' || payload.property === 'motionPathEnd') && isFiniteNumber(payload.value)) {
        safePayload.value = clamp(payload.value, 0, 1);
      }
      if (payload.property === 'textPathStartOffset' && isFiniteNumber(payload.value)) {
        safePayload.value = clamp(payload.value, 0, 1);
      }
      return { ...action, payload: safePayload };
    }
    case 'UPDATE_ANIMATION_DURATION': {
      if (!isFiniteNumber(action.payload) || action.payload <= 0) return null;
      return action;
    }
    case 'SET_CURRENT_TIME': {
      if (!isFiniteNumber(action.payload) || action.payload < 0) return null;
      return action;
    }
    case 'SET_PLAYBACK_SPEED': {
      if (!isFiniteNumber(action.payload) || action.payload <= 0) return null;
      return action;
    }
    case 'SET_IS_PLAYING': {
      if (typeof action.payload !== 'boolean') return null;
      return action;
    }
    case 'GROUP_ELEMENT':
    case 'REPARENT_ELEMENT': {
      const payload = action.payload || {};
      if (!payload.elementId || typeof payload.elementId !== 'string') return null;
      return action;
    }
    case 'BRING_TO_FRONT':
    case 'SEND_TO_BACK':
    case 'BRING_FORWARD':
    case 'SEND_BACKWARD': {
      if (typeof action.payload !== 'string') return null;
      return action;
    }
    default:
      return null;
  }
}

export function validateActions(actions) {
  const errors = [];
  const cleaned = [];
  if (!Array.isArray(actions)) {
    return { ok: false, actions: [], errors: ['actions_not_array'] };
  }
  actions.forEach((action, index) => {
    const sanitized = sanitizeAction(action);
    if (sanitized) cleaned.push(sanitized);
    else errors.push(`invalid_action_${index}`);
  });
  return { ok: errors.length === 0, actions: cleaned, errors };
}
