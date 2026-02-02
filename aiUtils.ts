import { SVGElementData, PathElementProps, AnySVGGradient, RectElementProps, CircleElementProps, BezierPoint, AILogEntry, AppAction, Artboard } from './types';
import { buildPathDFromStructuredPoints } from './utils/pathUtils'; 
import { generateUniqueId } from "./contexts/appContextUtils";

const AI_API_BASE = import.meta.env.VITE_AI_API_BASE || '';

interface AiPromptElementInput {
  id: string;
  type: SVGElementData['type'];
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
}

interface AiResponse {
  summary: string;
  actions: AppAction[];
}

export interface AIGenerationResult {
  actions: AppAction[];
  log: AILogEntry;
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
    }
    return preparedElement;
}

export const generateAiActions = async (
  selectedElement: SVGElementData | null,
  userTextInput: string,
  animationDuration: number,
  artboard: Artboard,
  allElements: SVGElementData[]
): Promise<AIGenerationResult> => {
  const elementForPrompt = selectedElement ? prepareElementForPrompt(selectedElement) : null;
  const existingElementsForPrompt = allElements.map(prepareElementForPrompt);

  const payload: AiPromptPayload = {
    userRequest: userTextInput,
    artboard: { width: artboard.width, height: artboard.height },
    animationDuration: animationDuration,
    elementToAnimate: elementForPrompt,
    existingElements: existingElementsForPrompt,
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
        let stringifiedActions = JSON.stringify(parsedData.actions);
        const placeholderRegex = /\{\{NEW_ID_(\d+)\}\}/g;
        
        stringifiedActions = stringifiedActions.replace(placeholderRegex, (match, p1) => {
            const placeholder = `{{NEW_ID_${p1}}}`;
            if (!idMap.has(placeholder)) {
                idMap.set(placeholder, generateUniqueId('ai'));
            }
            return idMap.get(placeholder)!;
        });

        const finalActions = JSON.parse(stringifiedActions) as AppAction[];
        
        const message = parsedData.summary.trim() || `Generated ${finalActions.length} action(s).`;

        const log: AILogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            prompt: userTextInput,
            status: 'success',
            message: message
        };
        return { actions: finalActions, log };
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
