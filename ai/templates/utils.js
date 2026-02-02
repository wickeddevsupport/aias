export function createIdFactory() {
  let counter = 1;
  return () => `{{NEW_ID_${counter++}}}`;
}

export function addRect(id, x, y, width, height, fill, stroke = 'none', strokeWidth = 0) {
  return {
    type: 'ADD_ELEMENT',
    payload: {
      type: 'rect',
      props: { id, x, y, width, height, fill, stroke, strokeWidth },
    },
  };
}

export function addCircle(id, x, y, r, fill, stroke = 'none', strokeWidth = 0) {
  return {
    type: 'ADD_ELEMENT',
    payload: {
      type: 'circle',
      props: { id, x, y, r, fill, stroke, strokeWidth },
    },
  };
}

export function addText(id, x, y, text, fontSize, fill) {
  return {
    type: 'ADD_ELEMENT',
    payload: {
      type: 'text',
      props: { id, x, y, text, fontSize, fill, textAnchor: 'middle' },
    },
  };
}

export function addPath(id, x, y, d, fill, stroke = 'none', strokeWidth = 0, extraProps = {}) {
  return {
    type: 'ADD_ELEMENT',
    payload: {
      type: 'path',
      props: { id, x, y, d, fill, stroke, strokeWidth, ...extraProps },
    },
  };
}

export function addGroup(id, x, y, extraProps = {}) {
  return {
    type: 'ADD_ELEMENT',
    payload: {
      type: 'group',
      props: { id, x, y, ...extraProps },
    },
  };
}

export function addImage(id, x, y, width, height, href, extraProps = {}) {
  return {
    type: 'ADD_ELEMENT',
    payload: {
      type: 'image',
      props: { id, x, y, width, height, href, ...extraProps },
    },
  };
}

export function addKeyframe(elementId, property, time, value, easing) {
  const payload = { elementId, property, time, value };
  if (easing) payload.easing = easing;
  return { type: 'ADD_KEYFRAME', payload };
}

export function createLinearGradient(id, colors, angle = 90) {
  const stops = colors.map((color, index) => ({
    id: `${id}-stop-${index + 1}`,
    offset: colors.length === 1 ? 0 : index / (colors.length - 1),
    color,
  }));
  return {
    id,
    type: 'linearGradient',
    angle,
    stops,
  };
}

export function createRadialGradient(id, colors) {
  const stops = colors.map((color, index) => ({
    id: `${id}-stop-${index + 1}`,
    offset: colors.length === 1 ? 0 : index / (colors.length - 1),
    color,
  }));
  return {
    id,
    type: 'radialGradient',
    cx: '50%',
    cy: '50%',
    r: '60%',
    stops,
  };
}

export function withParent(action, parentId) {
  if (!action || !action.payload) return action;
  return {
    ...action,
    payload: {
      ...action.payload,
      targetParentId: parentId,
    },
  };
}
