import { SVGElementData, PathElementProps, AnySVGGradient, RectElementProps, CircleElementProps, BezierPoint, AILogEntry, AppAction, Artboard, AiPlan } from './types';
import { buildPathDFromStructuredPoints } from './utils/pathUtils'; 
import { generateUniqueId } from "./contexts/appContextUtils";

const AI_API_BASE = import.meta.env.VITE_AI_API_BASE || '';

interface AiPromptElementInput {
  id: string;
  type: SVGElementData['type'];
  name?: string;
  parentId?: string | null;
  order?: number;
  x: number;
  y: number;
  fill: string | any;
  stroke: string | any;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scale: number;
  width?: number; 
  height?: number; 
  r?: number; 
  d?: string; 
  href?: string;
}

interface AiPromptPathReference {
    id: string;
    d: string; 
}
interface AiPromptPayload {
  userRequest: string;
  artboard: { width: number, height: number };
  animationDuration: number;
  elementToAnimate: AiPromptElementInput | null;
  existingElements: AiPromptElementInput[];
  canvasState: {
    selectedElementId: string | null;
    currentTime: number;
    animationDuration: number;
    elementsCount: number;
  };
}

interface AiResponse {
  summary: string;
  actions: AppAction[];
  plan?: AiPlan;
}

export interface AIGenerationResult {
  actions: AppAction[];
  log: AILogEntry;
  plan?: AiPlan;
}


const MAX_D_LENGTH_FOR_PROMPT = 1500; 

function prepareElementForPrompt(element: SVGElementData): AiPromptElementInput {
    const { artboardId, motionPathId, ...restOfBase } = element; 
    
    let fillStringForAI: string;
    if (typeof restOfBase.fill === 'object' && restOfBase.fill !== null && (restOfBase.fill as AnySVGGradient).id) {
        fillStringForAI = `url(#${(restOfBase.fill as AnySVGGradient).id})`;
    } else if (restOfBase.fill) { 
        fillStringForAI = String(restOfBase.fill);
    } else {
        fillStringForAI = 'none'; 
    }

    let strokeStringForAI: string;
    if (typeof restOfBase.stroke === 'object' && restOfBase.stroke !== null && (restOfBase.stroke as AnySVGGradient).id) {
        strokeStringForAI = `url(#${(restOfBase.stroke as AnySVGGradient).id})`;
    } else if (restOfBase.stroke) { 
        strokeStringForAI = String(restOfBase.stroke);
    } else {
        strokeStringForAI = 'none'; 
    }
    
    const preparedElement: AiPromptElementInput = {
        id: restOfBase.id,
        type: restOfBase.type,
        name: restOfBase.name,
        parentId: restOfBase.parentId,
        order: restOfBase.order,
        x: restOfBase.x ?? 0,
        y: restOfBase.y ?? 0,
        fill: fillStringForAI,
        stroke: strokeStringForAI,
        strokeWidth: restOfBase.strokeWidth ?? 0,
        opacity: restOfBase.opacity ?? 1,
        rotation: restOfBase.rotation ?? 0,
        scale: restOfBase.scale ?? 1,
    };

    if (restOfBase.type === 'rect') {
        preparedElement.width = (restOfBase as RectElementProps).width;
        preparedElement.height = (restOfBase as RectElementProps).height;
    } else if (restOfBase.type === 'circle') {
        preparedElement.r = (restOfBase as CircleElementProps).r;
    } else if (restOfBase.type === 'path') {
        const pathElement = restOfBase as PathElementProps;
        let dStringForAI: string;

        if (Array.isArray(pathElement.d)) {
            dStringForAI = buildPathDFromStructuredPoints(pathElement.d as BezierPoint[], pathElement.closedByJoining);
        } else {
            dStringForAI = pathElement.d;
        }

        if (dStringForAI && dStringForAI.length > MAX_D_LENGTH_FOR_PROMPT) {
            preparedElement.d = `Path data too long (length: ${dStringForAI.length}). Animatable. Original first 100 chars: ${dStringForAI.substring(0,100)}...`;
        } else if (dStringForAI) {
            preparedElement.d = dStringForAI;
        }
    } else if (restOfBase.type === 'image') {
        preparedElement.width = (restOfBase as any).width;
        preparedElement.height = (restOfBase as any).height;
        preparedElement.href = (restOfBase as any).href;
    }
    return preparedElement;
}

type ActionElementInfo = {
  id: string;
  type: SVGElementData['type'] | 'element';
  name?: string;
  parentId?: string | null;
};

function buildElementLabel(id: string, existingMap: Map<string, ActionElementInfo>, createdMap: Map<string, ActionElementInfo>): string {
  const info = createdMap.get(id) || existingMap.get(id);
  if (!info) return `element ${id.slice(-4)}`;
  const baseName = info.name ? info.name : `${info.type} ${id.slice(-4)}`;
  if (info.parentId) {
    const parent = createdMap.get(info.parentId) || existingMap.get(info.parentId);
    if (parent) {
      const parentName = parent.name ? parent.name : parent.type;
      return `${parentName} > ${baseName}`;
    }
  }
  return baseName;
}

function summarizeActions(actions: AppAction[], existingElements: AiPromptElementInput[]): string {
  const existingMap = new Map<string, ActionElementInfo>();
  existingElements.forEach(el => existingMap.set(el.id, { id: el.id, type: el.type, name: el.name, parentId: el.parentId }));
  const createdMap = new Map<string, ActionElementInfo>();
  const createdOrder: string[] = [];
  const updatedMap = new Map<string, Set<string>>();
  const animatedMap = new Map<string, Set<string>>();
  const deleted = new Set<string>();
  let duration: number | null = null;
  let speed: number | null = null;
  let artboardChanged = false;
  let playback: 'play' | 'pause' | null = null;

  const addProp = (map: Map<string, Set<string>>, id: string, prop: string) => {
    if (!map.has(id)) map.set(id, new Set());
    map.get(id)!.add(prop);
  };

  actions.forEach(action => {
    switch (action.type) {
      case 'ADD_ELEMENT': {
        const id = action.payload?.props?.id;
        if (typeof id === 'string') {
          createdOrder.push(id);
          createdMap.set(id, {
            id,
            type: action.payload.type,
            name: action.payload.props?.name,
            parentId: action.payload.targetParentId ?? action.payload.props?.parentId ?? null,
          });
        }
        break;
      }
      case 'UPDATE_ELEMENT_PROPS': {
        const id = action.payload?.id;
        if (typeof id === 'string') {
          Object.keys(action.payload.props || {}).forEach(prop => addProp(updatedMap, id, prop));
        }
        break;
      }
      case 'UPDATE_ELEMENT_TRANSFORM': {
        const id = action.payload?.elementId;
        if (typeof id === 'string') {
          Object.keys(action.payload.newTransform || {}).forEach(prop => addProp(updatedMap, id, prop));
        }
        break;
      }
      case 'UPDATE_ELEMENT_NAME': {
        const id = action.payload?.id;
        if (typeof id === 'string') addProp(updatedMap, id, 'name');
        break;
      }
      case 'ADD_KEYFRAME': {
        const id = action.payload?.elementId;
        if (typeof id === 'string') addProp(animatedMap, id, String(action.payload.property || 'animation'));
        break;
      }
      case 'REMOVE_KEYFRAME':
      case 'UPDATE_KEYFRAME_TIME':
      case 'UPDATE_KEYFRAME_PROPERTIES': {
        const id = action.payload?.elementId;
        if (typeof id === 'string') addProp(animatedMap, id, String(action.payload.property || 'animation'));
        break;
      }
      case 'SCALE_KEYFRAME_GROUP_TIMES': {
        const id = action.payload?.elementId;
        if (typeof id === 'string' && Array.isArray(action.payload.propertiesToScale)) {
          action.payload.propertiesToScale.forEach(prop => addProp(animatedMap, id, String(prop)));
        }
        break;
      }
      case 'SHIFT_ELEMENT_ANIMATION_TIMES': {
        const id = action.payload?.elementId;
        if (typeof id === 'string') addProp(animatedMap, id, 'animation');
        break;
      }
      case 'SHIFT_PROPERTY_GROUP_TIMES': {
        const id = action.payload?.elementId;
        if (typeof id === 'string' && Array.isArray(action.payload.propertiesToShift)) {
          action.payload.propertiesToShift.forEach(prop => addProp(animatedMap, id, String(prop)));
        }
        break;
      }
      case 'UPDATE_ANIMATION_FROM_AI': {
        const id = action.payload?.elementId;
        if (typeof id === 'string') addProp(animatedMap, id, 'animation');
        break;
      }
      case 'ASSIGN_MOTION_PATH': {
        const id = action.payload?.elementId;
        if (typeof id === 'string') addProp(updatedMap, id, 'motionPath');
        break;
      }
      case 'ASSIGN_TEXT_PATH': {
        const id = action.payload?.textElementId;
        if (typeof id === 'string') addProp(updatedMap, id, 'textPath');
        break;
      }
      case 'DELETE_ELEMENT': {
        if (typeof action.payload === 'string') deleted.add(action.payload);
        break;
      }
      case 'UPDATE_ANIMATION_DURATION':
        duration = action.payload;
        break;
      case 'SET_PLAYBACK_SPEED':
        speed = action.payload;
        break;
      case 'SET_ARTBOARD_PROPS':
        artboardChanged = true;
        break;
      case 'SET_IS_PLAYING':
        playback = action.payload ? 'play' : 'pause';
        break;
      default:
        break;
    }
  });

  const createdSet = new Set(createdOrder);
  const createdIds = Array.from(createdSet);
  const updatedIds = Array.from(updatedMap.keys()).filter(id => !createdSet.has(id));
  const animatedIds = Array.from(animatedMap.keys()).filter(id => !createdSet.has(id));
  const deletedIds = Array.from(deleted);

  const formatProps = (props: Set<string>) => {
    if (!props || props.size === 0) return '';
    const items = Array.from(props);
    const mapped = items.map(prop => {
      if (prop === 'x' || prop === 'y') return 'position';
      if (prop === 'width' || prop === 'height') return 'size';
      if (prop === 'strokeWidth') return 'stroke width';
      if (prop === 'fontSize') return 'font size';
      if (prop === 'letterSpacing') return 'letter spacing';
      if (prop === 'lineHeight') return 'line height';
      if (prop === 'motionPath') return 'motion path';
      if (prop === 'textPath') return 'text path';
      return prop;
    });
    const deduped = Array.from(new Set(mapped));
    const preview = deduped.slice(0, 3).join(', ');
    return deduped.length > 3 ? `${preview} +${deduped.length - 3}` : preview;
  };

  const formatList = (ids: string[], map: Map<string, Set<string>> | null) => {
    const limit = 3;
    const items = ids.slice(0, limit).map(id => {
      const label = buildElementLabel(id, existingMap, createdMap);
      const props = map ? formatProps(map.get(id) || new Set()) : '';
      return props ? `${label} (${props})` : label;
    });
    return ids.length > limit ? `${items.join(', ')} +${ids.length - limit} more` : items.join(', ');
  };

  const parts: string[] = [];
  if (createdIds.length > 0) parts.push(`Created ${createdIds.length} element${createdIds.length > 1 ? 's' : ''}: ${formatList(createdIds, null)}.`);
  if (updatedIds.length > 0) parts.push(`Updated ${updatedIds.length} element${updatedIds.length > 1 ? 's' : ''}: ${formatList(updatedIds, updatedMap)}.`);
  if (animatedIds.length > 0) parts.push(`Animated ${animatedIds.length} element${animatedIds.length > 1 ? 's' : ''}: ${formatList(animatedIds, animatedMap)}.`);
  if (deletedIds.length > 0) parts.push(`Deleted ${deletedIds.length} element${deletedIds.length > 1 ? 's' : ''}: ${formatList(deletedIds, null)}.`);
  if (artboardChanged) parts.push('Updated the artboard.');
  if (duration) parts.push(`Set duration to ${duration}s.`);
  if (speed) parts.push(`Set playback speed to ${speed}x.`);
  if (playback) parts.push(playback === 'play' ? 'Started playback.' : 'Paused playback.');

  return parts.join(' ');
}

export const generateAiActions = async (
  selectedElement: SVGElementData | null,
  userTextInput: string,
  animationDuration: number,
  artboard: Artboard,
  allElements: SVGElementData[],
  currentTime: number
): Promise<AIGenerationResult> => {
  const elementForPrompt = selectedElement ? prepareElementForPrompt(selectedElement) : null;
  const existingElementsForPrompt = allElements.map(prepareElementForPrompt);

  const payload: AiPromptPayload = {
    userRequest: userTextInput,
    artboard: { width: artboard.width, height: artboard.height },
    animationDuration: animationDuration,
    elementToAnimate: elementForPrompt,
    existingElements: existingElementsForPrompt,
    canvasState: {
      selectedElementId: selectedElement ? selectedElement.id : null,
      currentTime: currentTime || 0,
      animationDuration: animationDuration,
      elementsCount: allElements.length,
    },
  };
  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }
    const parsedData = (await response.json()) as AiResponse;

    if (parsedData && Array.isArray(parsedData.actions) && typeof parsedData.summary === 'string') {
        // Replace placeholder IDs
        const idMap = new Map<string, string>();
        const dataForReplace = { actions: parsedData.actions, plan: parsedData.plan || null };
        let stringifiedActions = JSON.stringify(dataForReplace);
        const placeholderRegex = /\{\{NEW_ID_(\d+)\}\}/g;
        
        stringifiedActions = stringifiedActions.replace(placeholderRegex, (match, p1) => {
            const placeholder = `{{NEW_ID_${p1}}}`;
            if (!idMap.has(placeholder)) {
                idMap.set(placeholder, generateUniqueId('ai'));
            }
            return idMap.get(placeholder)!;
        });

        const parsedReplaced = JSON.parse(stringifiedActions) as { actions: AppAction[]; plan: AiPlan | null };
        const finalActions = parsedReplaced.actions;
        const finalPlan = parsedReplaced.plan || undefined;
        const actionSummary = summarizeActions(finalActions, existingElementsForPrompt);
        const baseSummary = parsedData.summary.trim();
        const message = actionSummary
          ? (baseSummary ? `${baseSummary} ${actionSummary}` : actionSummary)
          : (baseSummary || `Generated ${finalActions.length} action(s).`);

        const log: AILogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            prompt: userTextInput,
            status: 'success',
            message: message
        };
        return { actions: finalActions, log, plan: finalPlan };
    }
    console.warn("AI response was not in the expected format:", parsedData);
    const errorLog: AILogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        prompt: userTextInput,
        status: 'error',
        message: `AI response was not in the expected format.`
    };
    return { actions: [], log: errorLog };
  } catch (error) {
    console.error("Error calling in-house AI or parsing response:", error);
    const userFriendlyError = "I had some trouble with that request. Could you please rephrase it or try something different?";
     const errorLog: AILogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        prompt: userTextInput,
        status: 'error',
        message: userFriendlyError
    };
    return { actions: [], log: errorLog };
  }
};
