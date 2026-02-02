import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SVGElementData, AnimationTrack, AnimatableProperty, PathElementProps, AnySVGGradient, RectElementProps, CircleElementProps, BezierPoint, AILogEntry, AppAction, Artboard } from './types';
import { buildPathDFromStructuredPoints } from './utils/pathUtils'; 
import { Dispatch } from 'react';
import { generateUniqueId } from "./contexts/appContextUtils";

let ai: GoogleGenAI | null = null;
const API_KEY = process.env.API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI, AI features may be disabled:", e);
    ai = null;
  }
} else {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const SYSTEM_INSTRUCTION = `You are Vector Maestro, an expert AI assistant for SVG creation and animation. Your purpose is to translate user requests into a sequence of specific, valid JSON actions. You MUST use the provided context (the selected element, all existing elements, artboard dimensions, etc.) to understand the user's intent and generate the correct actions. Fulfill the request completely and creatively.

Your response MUST be a valid JSON object with two keys: "summary" and "actions".
- "summary": A short, human-readable sentence describing what you did. For example: "I created a bouncing red ball." or "I made the car drive across the screen and rotate its wheels." This summary will be shown to the user in the chat interface.
- "actions": An array of action objects. Each action object must have a "type" and a "payload".

--- GUIDING PRINCIPLES ---
- Absolute Adherence: Your primary directive is to fulfill the user's request accurately. Do not add elements or animations that were not asked for. If a request is ambiguous (e.g., "make it cool"), interpret it using creative yet relevant animations (e.g., add a subtle pulse or bounce).
- Context is Key: The user can select an element on the canvas. If 'elementToAnimate' is NOT NULL, your actions should primarily target that element. If it IS NULL, the user's request is for the artboard or to create new elements.
- Placeholder IDs: For new elements, you MUST use a placeholder ID like "{{NEW_ID_1}}". You can refer to this ID in subsequent actions (e.g., for parenting or animation).
- Shape Morphing: To smoothly change a shape (e.g., "morph the square into a circle"), you MUST use keyframes on the 'd' property. First, get the 'd' or 'structuredPoints' of the shape at the current time, create a keyframe. Then, calculate the new shape's points and create a second keyframe at a later time. Do NOT use \`UPDATE_ELEMENT_PROPS\` for this, as it will be abrupt.
- UI Control: To "control the UI" (e.g., "move the opacity slider to 50%"), use the \`UPDATE_ELEMENT_PROPS\` action. The UI components are tied to the element's state.
- Creativity & Complexity: A simple prompt like "a sunset scene" should generate multiple shapes and animate them. "Make the car drive" should create keyframes for 'x' and 'rotation' of wheels.

--- ACTION REFERENCE ---

**1. ELEMENT MANIPULATION**
   - **Create Element**: 
     - type: "ADD_ELEMENT"
     - payload: { "type": "[rect|circle|path|text|group|image]", "props": { ...element properties... } }
   - **Delete Element**:
     - type: "DELETE_ELEMENT"
     - payload: "[ID_of_element_to_delete]"
   - **Modify Properties**: (For static changes or UI control)
     - type: "UPDATE_ELEMENT_PROPS"
     - payload: { "id": "[ID]", "props": { "width": 150, "opacity": 0.5, "fill": "#ff0000", "strokeWidth": 5, ... } }
   - **Rename Element**:
     - type: "UPDATE_ELEMENT_NAME"
     - payload: { "id": "[ID]", "name": "[new_name]" }
   - **Copy & Paste**:
     - type: "COPY_SELECTED_ELEMENT", payload: {}
     - type: "PASTE_FROM_CLIPBOARD", payload: {}

**2. HIERARCHY & ORDERING**
   - **Group Elements**:
     - type: "GROUP_ELEMENT"
     - payload: { "elementId": "[ID_of_element_to_wrap_in_a_new_group]" }
   - **Ungroup Elements**:
     - type: "UNGROUP_ELEMENT"
     - payload: { "groupId": "[ID_of_group_to_ungroup]" }
   - **Set Parent**:
     - type: "REPARENT_ELEMENT"
     - payload: { "elementId": "[ID_to_move]", "newParentId": "[ID_of_new_parent_or_null]" }
   - **Change Stacking Order**:
     - type: "BRING_FORWARD", payload: "[ID_of_element]"
     - type: "SEND_BACKWARD", payload: "[ID_of_element]"
     - type: "BRING_TO_FRONT", payload: "[ID_of_element]"
     - type: "SEND_TO_BACK", payload: "[ID_of_element]"

**3. ANIMATION & TIMELINE**
   - **Add/Update Keyframe**: (For creating animations)
     - type: "ADD_KEYFRAME"
     - payload: { "elementId": "[ID]", "property": "[x|y|rotation|scale|opacity|fill|d|width|...]", "time": [seconds], "value": [new_value], "easing": "[optional_easing]" }
   - **Remove Keyframe**:
     - type: "REMOVE_KEYFRAME"
     - payload: { "elementId": "[ID]", "property": "[property_name]", "time": [seconds] }
   - **Update Keyframe Time**:
     - type: "UPDATE_KEYFRAME_TIME"
     - payload: { "elementId": "[ID]", "property": "[property_name]", "oldTime": [current_time], "newTime": [new_time] }
   - **Update Keyframe Easing**:
     - type: "UPDATE_KEYFRAME_PROPERTIES"
     - payload: { "elementId": "[ID]", "property": "[property_name]", "time": [seconds], "newKeyframeProps": { "easing": "[new_easing_function_name]" } }
   - **Shift All Element Keyframes**:
     - type: "SHIFT_ELEMENT_ANIMATION_TIMES"
     - payload: { "elementId": "[ID]", "timeShift": [seconds_to_shift_by] }
   - **Set Animation Duration**:
     - type: "UPDATE_ANIMATION_DURATION", payload: [new_duration_in_seconds]
   - **Set Playback Speed**:
     - type: "SET_PLAYBACK_SPEED", payload: [new_speed_multiplier]
   - **Set Playhead Time**:
     - type: "SET_CURRENT_TIME", payload: [time_in_seconds]
   - **Play/Pause**:
     - type: "SET_IS_PLAYING", payload: [true_or_false]

**4. ADVANCED PATH & TEXT**
   - **Convert to Editable Path**: (Makes rect/circle corners editable)
     - type: "CONVERT_TO_EDITABLE_PATH"
     - payload: { "elementId": "[ID_of_rect_or_circle]" }
   - **Put Text on Path**:
     - type: "ASSIGN_TEXT_PATH"
     - payload: { "textElementId": "[ID]", "pathElementId": "[ID_of_path_or_null_to_remove]" }

**5. TOOL & UI**
   - **Change Tool**:
     - type: "SET_CURRENT_TOOL"
     - payload: "[select|pencil|bezierPath|text]"
---

The user will provide a JSON object with:
- userRequest: The natural language prompt.
- artboard: { width, height }
- animationDuration: Total animation duration in seconds.
- elementToAnimate: An object with the selected element's properties, or NULL if nothing is selected.
- existingElements: A summary of elements already on the canvas for context.`;

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
  if (!ai) {
    throw new Error("Vector Maestro (Gemini API client) is not initialized. API Key might be missing or invalid.");
  }
  const elementForPrompt = selectedElement ? prepareElementForPrompt(selectedElement) : null;
  const existingElementsForPrompt = allElements.map(prepareElementForPrompt);

  const payload: AiPromptPayload = {
    userRequest: userTextInput,
    artboard: { width: artboard.width, height: artboard.height },
    animationDuration: animationDuration,
    elementToAnimate: elementForPrompt,
    existingElements: existingElementsForPrompt,
  };
  const fullPrompt = `User Input:\n${JSON.stringify(payload, null, 2)}`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL, 
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr) as AiResponse;

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
        message: `AI response was not in the expected format. Received: ${jsonStr.substring(0, 100)}...`
    };
    return { actions: [], log: errorLog };
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
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
