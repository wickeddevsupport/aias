import {
  COLOR_MAP,
  clamp,
  detectKeywords,
  extractColor,
  extractOpacity,
  extractStrokeWidth,
  extractCount,
  extractTextContent,
  extractFontSize,
  extractDurationSeconds,
  extractPlaybackSpeed,
  extractSize,
  resolvePosition,
  normalizeText,
} from './parse.js';
import { buildPlan } from './planner.js';
import { validateActions } from './validator.js';
import { buildSunsetScene } from './templates/scene_sunset.js';
import { buildOceanScene } from './templates/scene_ocean.js';
import { buildCityScene } from './templates/scene_city.js';
import { buildForestScene } from './templates/scene_forest.js';
import { buildMountainScene } from './templates/scene_mountain.js';
import { buildDesertScene } from './templates/scene_desert.js';
import { buildSpaceScene } from './templates/scene_space.js';
import { buildNeonStudioScene } from './templates/scene_neon_studio.js';
import { buildMeadowScene } from './templates/scene_meadow.js';
import { buildGenericScene } from './templates/scene_generic.js';
import { buildCharacterRig } from './templates/character_rig.js';
import { applyWalkCycle, applyWaveMotion, applyIdleMotion } from './templates/motions.js';
import { buildPathShape } from './templates/path_shapes.js';
import { buildPhotoTier1, buildPhotoTier2 } from './templates/photo_animation.js';

function createIdFactory() {
  let counter = 1;
  return () => `{{NEW_ID_${counter++}}}`;
}

function estimateElementArea(el) {
  if (!el) return 0;
  if (el.type === 'rect' || el.type === 'image') {
    const w = Number.isFinite(el.width) ? el.width : 0;
    const h = Number.isFinite(el.height) ? el.height : 0;
    return w * h;
  }
  if (el.type === 'circle') {
    const r = Number.isFinite(el.r) ? el.r : 0;
    return Math.PI * r * r;
  }
  return 0;
}

function pickElementFromCanvas(elements, keywords) {
  if (!Array.isArray(elements) || elements.length === 0) return null;
  let filtered = elements;
  if (keywords.circle) filtered = filtered.filter(el => el.type === 'circle');
  else if (keywords.rect) filtered = filtered.filter(el => el.type === 'rect');
  else if (keywords.text) filtered = filtered.filter(el => el.type === 'text');
  else if (keywords.path) filtered = filtered.filter(el => el.type === 'path');
  else if (keywords.photo) filtered = filtered.filter(el => el.type === 'image');

  if (filtered.length === 0) filtered = elements;

  if (keywords.largest) {
    return filtered.reduce((best, el) => (estimateElementArea(el) > estimateElementArea(best) ? el : best), filtered[0]);
  }
  if (keywords.smallest) {
    return filtered.reduce((best, el) => (estimateElementArea(el) < estimateElementArea(best) ? el : best), filtered[0]);
  }
  if (keywords.leftmost) {
    return filtered.reduce((best, el) => ((el.x ?? 0) < (best.x ?? 0) ? el : best), filtered[0]);
  }
  if (keywords.rightmost) {
    return filtered.reduce((best, el) => ((el.x ?? 0) > (best.x ?? 0) ? el : best), filtered[0]);
  }
  if (keywords.topmost) {
    return filtered.reduce((best, el) => ((el.y ?? 0) < (best.y ?? 0) ? el : best), filtered[0]);
  }
  if (keywords.bottommost) {
    return filtered.reduce((best, el) => ((el.y ?? 0) > (best.y ?? 0) ? el : best), filtered[0]);
  }

  return filtered[0];
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

function generateFallbackActions(payload) {
  const { userRequest, artboard, animationDuration, elementToAnimate, existingElements } = payload || {};
  const keywords = detectKeywords(userRequest || '');
  const actions = [];
  const summaryParts = [];

  const width = Number.isFinite(artboard?.width) ? artboard.width : 800;
  const height = Number.isFinite(artboard?.height) ? artboard.height : 600;
  const color = extractColor(userRequest || '');
  const opacity = extractOpacity(userRequest || '');
  const count = extractCount(userRequest || '');
  const textContent = extractTextContent(userRequest || '');
  const requestedDuration = extractDurationSeconds(userRequest || '');
  const requestedSpeed = extractPlaybackSpeed(userRequest || '');
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

  if (requestedDuration && Number.isFinite(requestedDuration) && requestedDuration > 0) {
    actions.push({ type: 'UPDATE_ANIMATION_DURATION', payload: requestedDuration });
    summaryParts.push(`Set animation duration to ${requestedDuration}s.`);
  }
  if (requestedSpeed && Number.isFinite(requestedSpeed) && requestedSpeed > 0) {
    actions.push({ type: 'SET_PLAYBACK_SPEED', payload: requestedSpeed });
    summaryParts.push(`Set playback speed to ${requestedSpeed}x.`);
  }
  if (keywords.play) {
    actions.push({ type: 'SET_IS_PLAYING', payload: true });
    summaryParts.push('Started playback.');
  }
  if (keywords.pause) {
    actions.push({ type: 'SET_IS_PLAYING', payload: false });
    summaryParts.push('Paused playback.');
  }

  const wantsCreate = keywords.add || keywords.makeA || /new\b/.test(normalizeText(userRequest || ''));
  const autoTarget = !elementToAnimate && !wantsCreate ? pickElementFromCanvas(existingElements, keywords) : null;
  const targetElement = elementToAnimate || autoTarget;
  const shouldModifySelected = !!targetElement?.id && !wantsCreate;

  if (keywords.all && Array.isArray(existingElements) && existingElements.length > 0 && !wantsCreate) {
    existingElements.forEach(el => {
      const updateProps = {};
      const type = el.type;
      const size = extractSize(userRequest || '', type, { width, height });
      const strokeWidth = extractStrokeWidth(userRequest || '');
      if (color) {
        if (keywords.stroke) updateProps.stroke = color;
        else updateProps.fill = color;
      }
      if (keywords.stroke && strokeWidth) updateProps.strokeWidth = strokeWidth;
      if (opacity !== null) updateProps.opacity = opacity;
      if (keywords.bigger) updateProps.scale = clamp((el.scale ?? 1) * 1.2, 0.1, 10);
      if (keywords.smaller) updateProps.scale = clamp((el.scale ?? 1) * 0.8, 0.1, 10);
      if (type === 'circle' && size.r) updateProps.r = size.r;
      if (type === 'rect') {
        if (size.width) updateProps.width = size.width;
        if (size.height) updateProps.height = size.height;
      }
      if (type === 'text' && textContent) updateProps.text = textContent;

      if (Object.keys(updateProps).length > 0) {
        actions.push({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: el.id, props: updateProps } });
      }

      const shouldAnimate = keywords.animate || keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move;
      if (shouldAnimate) {
        actions.push(...buildAnimationActions(el.id, animationDuration, {
          ...keywords,
          pulse: keywords.pulse,
          baseX: el.x ?? width / 2,
          baseY: el.y ?? height / 2,
          move: keywords.move || keywords.left || keywords.right || keywords.up || keywords.down,
        }));
      }
    });
    if (actions.length > 0) {
      summaryParts.push('Updated all elements on the canvas.');
      return { summary: summaryParts.join(' '), actions };
    }
  }

  if (shouldModifySelected && targetElement) {
    const updateProps = {};
    const animIntent = keywords.animate || keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down;
    const defaultPulse = keywords.animate && !(keywords.bounce || keywords.spin || keywords.pulse || keywords.fade || keywords.move || keywords.left || keywords.right || keywords.up || keywords.down);
    const type = targetElement.type;
    const size = extractSize(userRequest || '', type, { width, height });

    if (type === 'rect') {
      if (!size.width && Number.isFinite(targetElement.width)) size.width = targetElement.width;
      if (!size.height && Number.isFinite(targetElement.height)) size.height = targetElement.height;
    }
    if (type === 'circle' && !size.r && Number.isFinite(targetElement.r)) {
      size.r = targetElement.r;
    }

    const strokeWidth = extractStrokeWidth(userRequest || '');
    if (color) {
      if (keywords.stroke) updateProps.stroke = color;
      else updateProps.fill = color;
    }
    if (keywords.stroke && strokeWidth) updateProps.strokeWidth = strokeWidth;
    if (opacity !== null) updateProps.opacity = opacity;
    if (keywords.bigger) updateProps.scale = clamp((targetElement.scale ?? 1) * 1.2, 0.1, 10);
    if (keywords.smaller) updateProps.scale = clamp((targetElement.scale ?? 1) * 0.8, 0.1, 10);
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
        { x: targetElement.x ?? width / 2, y: targetElement.y ?? height / 2 }
      );
      updateProps.x = targetPos.x;
      updateProps.y = targetPos.y;
    }

    if (Object.keys(updateProps).length > 0) {
      actions.push({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: targetElement.id, props: updateProps } });
      summaryParts.push('Updated an existing element.');
    }

    if (animIntent) {
      const moveTarget = (keywords.left || keywords.right || keywords.up || keywords.down || keywords.center)
        ? resolvePosition(
            type,
            { width, height },
            size,
            positionKeywords,
            { x: targetElement.x ?? width / 2, y: targetElement.y ?? height / 2 }
          )
        : null;

      const animActions = buildAnimationActions(targetElement.id, animationDuration, {
        ...keywords,
        pulse: keywords.pulse || defaultPulse,
        baseX: targetElement.x ?? width / 2,
        baseY: targetElement.y ?? height / 2,
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

  const newId = createIdFactory();
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

  const layout = keywords.grid ? 'grid' : keywords.column ? 'column' : 'row';
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

function buildSceneByType(plan) {
  switch (plan.sceneType) {
    case 'sunset':
      return { title: 'Scene: Sunset', ...buildSunsetScene(plan, plan.artboard) };
    case 'ocean':
      return { title: 'Scene: Ocean', ...buildOceanScene(plan, plan.artboard) };
    case 'city':
      return { title: 'Scene: City', ...buildCityScene(plan, plan.artboard) };
    case 'forest':
      return { title: 'Scene: Forest', ...buildForestScene(plan, plan.artboard) };
    case 'mountain':
      return { title: 'Scene: Mountain', ...buildMountainScene(plan, plan.artboard) };
    case 'desert':
      return { title: 'Scene: Desert', ...buildDesertScene(plan, plan.artboard) };
    case 'space':
      return { title: 'Scene: Space', ...buildSpaceScene(plan, plan.artboard) };
    case 'neonStudio':
      return { title: 'Scene: Neon Studio', ...buildNeonStudioScene(plan, plan.artboard) };
    case 'meadow':
      return { title: 'Scene: Meadow', ...buildMeadowScene(plan, plan.artboard) };
    case 'scene':
      return { title: 'Scene: Generic', ...buildGenericScene(plan, plan.artboard) };
    default:
      return null;
  }
}

function buildCharacterWithMotion(plan) {
  const rig = buildCharacterRig(plan, plan.artboard);
  const actions = [...rig.actions];
  const duration = Math.max(2, plan.duration || 4);
  const baseX = Number.isFinite(rig.parts?.baseX) ? rig.parts.baseX : 0;
  const baseY = Number.isFinite(rig.parts?.baseY) ? rig.parts.baseY : 0;

  if (plan.motionPreset === 'walk') {
    applyWalkCycle(actions, rig.parts, duration);
  } else if (plan.motionPreset === 'wave') {
    applyWaveMotion(actions, rig.parts, duration);
    applyIdleMotion(actions, rig.parts, duration);
  } else if (plan.motionPreset === 'bounce') {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'y', time: 0, value: baseY } },
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'y', time: duration * 0.5, value: baseY - 40, easing: 'ease-out' } },
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'y', time: duration, value: baseY, easing: 'ease-in' } }
    );
  } else if (plan.motionPreset === 'spin') {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'rotation', time: 0, value: 0 } },
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'rotation', time: duration, value: 360 } }
    );
  } else if (plan.motionPreset === 'pulse') {
    actions.push(
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'scale', time: 0, value: 1 } },
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'scale', time: duration * 0.5, value: 1.1 } },
      { type: 'ADD_KEYFRAME', payload: { elementId: rig.parts.groupId, property: 'scale', time: duration, value: 1 } }
    );
  } else {
    applyIdleMotion(actions, rig.parts, duration);
  }
  return { title: 'Character: Rig + Motion', summary: rig.summary, actions, rootId: rig.parts?.groupId || null };
}

function mergeResults(results) {
  const actions = results.flatMap(result => result.actions || []);
  const summary = results.map(result => result.summary).filter(Boolean).join(' ');
  const rootIds = results.map(result => result.rootId).filter(Boolean);
  return { summary, actions, rootIds };
}

function buildCameraMotion(targetId, plan) {
  const actions = [];
  if (!targetId) return actions;
  const duration = Math.max(2, plan.duration || 4);
  const intro = plan.beats?.intro?.start ?? 0;
  const settle = plan.beats?.settle?.end ?? duration;
  const panX = plan.keywords.left ? -30 : plan.keywords.right ? 30 : 20;
  const panY = plan.keywords.up ? -20 : plan.keywords.down ? 20 : 12;
  const zoomStart = plan.keywords.zoom ? 1 : 1;
  const zoomEnd = plan.keywords.zoom ? 1.08 : plan.keywords.pan ? 1.03 : 1;

  actions.push(
    { type: 'ADD_KEYFRAME', payload: { elementId: targetId, property: 'x', time: intro, value: 0 } },
    { type: 'ADD_KEYFRAME', payload: { elementId: targetId, property: 'x', time: settle, value: panX, easing: 'ease-in-out' } },
    { type: 'ADD_KEYFRAME', payload: { elementId: targetId, property: 'y', time: intro, value: 0 } },
    { type: 'ADD_KEYFRAME', payload: { elementId: targetId, property: 'y', time: settle, value: panY, easing: 'ease-in-out' } },
    { type: 'ADD_KEYFRAME', payload: { elementId: targetId, property: 'scale', time: intro, value: zoomStart } },
    { type: 'ADD_KEYFRAME', payload: { elementId: targetId, property: 'scale', time: settle, value: zoomEnd, easing: 'ease-in-out' } }
  );
  return actions;
}

function buildWeatherOverlay(plan, artboard, parentId, idFactory) {
  const actions = [];
  if (!plan.weather) return actions;
  const width = artboard.width;
  const height = artboard.height;
  const groupId = idFactory();

  actions.push({
    type: 'ADD_ELEMENT',
    payload: { type: 'group', targetParentId: parentId || null, props: { id: groupId, x: 0, y: 0 } },
  });

  if (plan.weather === 'rain') {
    const drops = 16;
    for (let i = 0; i < drops; i += 1) {
      const dropId = idFactory();
      const x = (width * 0.1) + (i % 8) * (width * 0.1);
      const y = (i % 2) * (height * 0.2);
      actions.push({
        type: 'ADD_ELEMENT',
        payload: {
          type: 'rect',
          targetParentId: groupId,
          props: { id: dropId, x, y, width: 2, height: height * 0.12, fill: 'rgba(148,163,184,0.6)' },
        },
      });
      actions.push(
        { type: 'ADD_KEYFRAME', payload: { elementId: dropId, property: 'y', time: 0, value: y - height * 0.2 } },
        { type: 'ADD_KEYFRAME', payload: { elementId: dropId, property: 'y', time: plan.duration || 4, value: y + height * 0.8, easing: 'linear' } }
      );
    }
  }

  if (plan.weather === 'snow') {
    const flakes = 14;
    for (let i = 0; i < flakes; i += 1) {
      const flakeId = idFactory();
      const x = (width * 0.12) + (i % 7) * (width * 0.12);
      const y = (i % 2) * (height * 0.2);
      const r = 3 + (i % 3);
      actions.push({
        type: 'ADD_ELEMENT',
        payload: {
          type: 'circle',
          targetParentId: groupId,
          props: { id: flakeId, x, y, r, fill: 'rgba(248,250,252,0.9)' },
        },
      });
      actions.push(
        { type: 'ADD_KEYFRAME', payload: { elementId: flakeId, property: 'y', time: 0, value: y - 20 } },
        { type: 'ADD_KEYFRAME', payload: { elementId: flakeId, property: 'y', time: plan.duration || 4, value: y + height * 0.7, easing: 'ease-in-out' } },
        { type: 'ADD_KEYFRAME', payload: { elementId: flakeId, property: 'x', time: 0, value: x - 10 } },
        { type: 'ADD_KEYFRAME', payload: { elementId: flakeId, property: 'x', time: plan.duration || 4, value: x + 10, easing: 'ease-in-out' } }
      );
    }
  }
  return actions;
}

export function generateAiActions(payload) {
  const plan = buildPlan(payload);
  const idFactory = createIdFactory();
  const results = [];
  const steps = [];

  if (plan.wantsPhoto) {
    const photoResult = plan.wantsPhotoTier2
      ? buildPhotoTier2(plan, plan.artboard)
      : buildPhotoTier1(plan, plan.artboard);
    const validatedPhoto = validateActions(photoResult.actions);
    steps.push({
      id: `step-photo-${Date.now()}`,
      title: plan.wantsPhotoTier2 ? 'Photo: Subject Layers' : 'Photo: Ken Burns',
      rationale: plan.wantsPhotoTier2 ? 'Animate background + subject layers.' : 'Apply cinematic pan/zoom to the photo.',
      actions: validatedPhoto.actions,
    });
    if (!validatedPhoto.ok && validatedPhoto.actions.length === 0) {
      const safeScene = buildGenericScene(plan, plan.artboard);
      const safeValidated = validateActions(safeScene.actions);
      return {
        summary: safeValidated.actions.length > 0 ? 'Generated a safe starter scene.' : photoResult.summary,
        actions: safeValidated.actions.length > 0 ? safeValidated.actions : validatedPhoto.actions,
        plan: {
          id: `plan-${Date.now()}`,
          summary: safeValidated.actions.length > 0 ? 'Generated a safe starter scene.' : photoResult.summary,
          steps: steps,
          createdAt: new Date().toISOString(),
        },
      };
    }
    return {
      summary: photoResult.summary,
      actions: validatedPhoto.actions,
      plan: {
        id: `plan-${Date.now()}`,
        summary: photoResult.summary,
        steps: steps,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (plan.wantsScene) {
    const sceneResult = buildSceneByType(plan);
    if (sceneResult) {
      const validated = validateActions(sceneResult.actions);
      results.push({ ...sceneResult, actions: validated.actions });
      steps.push({
        id: `step-scene-${Date.now()}`,
        title: sceneResult.title || 'Scene',
        rationale: 'Compose the base environment and layers.',
        actions: validated.actions,
      });
    }
  }

  if (plan.wantsCharacter) {
    const characterResult = buildCharacterWithMotion(plan);
    const validated = validateActions(characterResult.actions);
    results.push({ ...characterResult, actions: validated.actions });
    steps.push({
      id: `step-character-${Date.now()}`,
      title: characterResult.title || 'Character',
      rationale: 'Add a rigged character and motion preset.',
      actions: validated.actions,
    });
  }

  if (plan.wantsPath) {
    const pathResult = buildPathShape(plan, plan.artboard);
    const validated = validateActions(pathResult.actions);
    results.push({ title: 'Path: Shape', ...pathResult, actions: validated.actions });
    steps.push({
      id: `step-path-${Date.now()}`,
      title: 'Path: Curves/Blob',
      rationale: 'Generate path-based shapes and draw effects.',
      actions: validated.actions,
    });
  }

  const composed = results.length > 0 ? mergeResults(results) : generateFallbackActions(payload);
  const cameraTargetId = Array.isArray(composed.rootIds) ? composed.rootIds[0] : null;
  if (plan.cameraMotion && cameraTargetId) {
    const cameraActions = buildCameraMotion(cameraTargetId, plan);
    const validatedCamera = validateActions(cameraActions);
    composed.actions.push(...validatedCamera.actions);
    steps.push({
      id: `step-camera-${Date.now()}`,
      title: 'Camera: Pan/Zoom',
      rationale: 'Add cinematic camera motion.',
      actions: validatedCamera.actions,
    });
  }
  const weatherActions = buildWeatherOverlay(plan, plan.artboard, cameraTargetId, idFactory);
  if (weatherActions.length > 0) {
    const validatedWeather = validateActions(weatherActions);
    composed.actions.push(...validatedWeather.actions);
    steps.push({
      id: `step-weather-${Date.now()}`,
      title: `Weather: ${plan.weather}`,
      rationale: 'Overlay atmospheric motion.',
      actions: validatedWeather.actions,
    });
  }

  const validated = validateActions(composed.actions);

  if (steps.length === 0 && validated.actions.length > 0) {
    steps.push({
      id: `step-direct-${Date.now()}`,
      title: 'Direct Edit',
      rationale: 'Apply changes to existing canvas elements.',
      actions: validated.actions,
    });
  }

  if (!validated.ok && validated.actions.length === 0) {
    const safeScene = buildGenericScene(plan, plan.artboard);
    const safeValidated = validateActions(safeScene.actions);
    return {
      summary: safeValidated.actions.length > 0 ? 'Generated a safe starter scene.' : 'Unable to generate a valid scene. Please try a simpler prompt.',
      actions: safeValidated.actions,
      plan: {
        id: `plan-${Date.now()}`,
        summary: safeValidated.actions.length > 0 ? 'Generated a safe starter scene.' : 'Unable to generate a valid scene. Please try a simpler prompt.',
        steps: steps.length > 0 ? steps : [{
          id: `step-safe-${Date.now()}`,
          title: 'Safe Scene',
          rationale: 'Fallback scene generated after validation.',
          actions: safeValidated.actions,
        }],
        createdAt: new Date().toISOString(),
      },
    };
  }
  return {
    summary: composed.summary,
    actions: validated.actions,
    plan: {
      id: `plan-${Date.now()}`,
      summary: composed.summary,
      steps: steps,
      createdAt: new Date().toISOString(),
    },
  };
}
