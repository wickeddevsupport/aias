
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SVGElementData, AnimationTrack, AnimatableProperty, PathElementProps, AnySVGGradient, RectElementProps, CircleElementProps, BezierPoint } from './types';
import { buildPathDFromStructuredPoints } from './utils/pathUtils'; // Added import

let ai: GoogleGenAI | null = null;
const API_KEY = process.env.API_KEY;

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

const SYSTEM_INSTRUCTION = `You are an expert SVG animation assistant. Your task is to generate animation keyframes for a given SVG element based on a user's natural language description.
The animation has a total duration. All keyframe times must be between 0 and this total duration, inclusive.
Keyframes for a property should be sorted by their 'time' attribute in ascending order.
The user will provide details of the element to be animated, the total animation duration, a list of properties that can be animated for this specific element type, and a list of any existing path elements on the canvas (for 'motionPath' reference).
If a path's 'd' attribute is summarized (e.g., "Path data too long..."), you can still animate its other properties or generate a completely new 'd' string if the user requests a shape change.

Output your response ONLY as a JSON object with a single key "animationTracks".
"animationTracks" should be an array of objects. Each object must have:
1.  "property": A string, one of the animatable properties valid for the element.
2.  "keyframes": An array of keyframe objects. Each keyframe object must have:
    a. "time": A number (in seconds), e.g., 0, 1.5, 5.
    b. "value": A number or a string, appropriate for the property.
       - For numeric properties (x, y, width, height, r, opacity, rotation, scale, strokeWidth): a number.
       - For color properties (fill, stroke): a hex color string (e.g., "#FF0000") or a named CSS color (e.g., "blue").
       - For path data 'd': an SVG path string (e.g., "M10 10 L 20 20").
       - For 'motionPath': the string ID of an existing SVG path element (e.g., "motionPath1").

Consider the element's current properties as the starting point for animations unless the user's description implies otherwise.
For example, if the user says "fade it out over 2 seconds", and the current opacity is 1 and duration is 5s:
  - If the intent is to fade out starting from t=0 over 2s and stay faded:
    { "property": "opacity", "keyframes": [{ "time": 0, "value": 1 }, { "time": 2, "value": 0 }] }

If the user says "move to x 200", assume it means the element's 'x' property should be 200 at the end of the animation, starting from its current 'x' value at time 0, unless other timing is specified.
{ "property": "x", "keyframes": [{ "time": 0, "value": <current_element_x> }, { "time": <animation_duration>, "value": 200 }] }

If the user requests an animation that requires a motion path (e.g., "move along path 'path1'"), use the provided ID for the 'motionPath' property.
Example for 'motionPath': { "property": "motionPath", "keyframes": [{ "time": 0, "value": "path1" }, { "time": <animation_duration>, "value": "path1" }] }
Do not invent complex 'd' strings for new motion paths if not explicitly asked. If a path 'd' was summarized in the input, you might be asked to generate a new 'd' from scratch based on description.

Ensure all generated keyframe times are within the 0 to animation_duration range.
Do not output any text or explanation outside the JSON object.
`;

interface AiPromptElementInput {
  id: string;
  type: SVGElementData['type'];
  x: number;
  y: number;
  fill: string;
  stroke: string;
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
  elementToAnimate: AiPromptElementInput;
  animationDuration: number;
  availableProperties: AnimatableProperty[];
  existingPathElements: AiPromptPathReference[];
}

interface AiResponse {
  animationTracks: AnimationTrack[];
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


export const generateAnimationWithAI = async (
  selectedElement: SVGElementData,
  userTextInput: string,
  animationDuration: number,
  availableProperties: AnimatableProperty[],
  existingPathElementsData: { id: string; d: string }[]
): Promise<AnimationTrack[] | null> => {
  if (!ai) {
    throw new Error("Gemini API client is not initialized. API Key might be missing or invalid.");
  }

  const elementForPrompt = prepareElementForPrompt(selectedElement);

  const pathReferencesForPrompt = existingPathElementsData.map(p => {
    if (p.d.length > MAX_D_LENGTH_FOR_PROMPT) {
        return { id: p.id, d: `Path data too long (length: ${p.d.length}). Usable as motion path reference.` };
    }
    return p;
  });

  const payload: AiPromptPayload = {
    userRequest: userTextInput,
    elementToAnimate: elementForPrompt,
    animationDuration: animationDuration,
    availableProperties: availableProperties,
    existingPathElements: pathReferencesForPrompt,
  };

  const fullPrompt = `User Input:\n${JSON.stringify(payload, null, 2)}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17", 
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

    if (parsedData && Array.isArray(parsedData.animationTracks)) {
      const validTracks = parsedData.animationTracks.filter(track => 
        typeof track.property === 'string' &&
        Array.isArray(track.keyframes) &&
        track.keyframes.every(kf => typeof kf.time === 'number' && kf.value !== undefined) &&
        availableProperties.includes(track.property as AnimatableProperty)
      );
      return validTracks;
    }
    console.warn("AI response was not in the expected format:", parsedData);
    return null;
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    if (error instanceof Error && error.message.includes("INVALID_ARGUMENT")) {
        throw new Error(`AI API Error: ${error.message}. This might be due to the prompt size. The path data was truncated, but the overall prompt might still be too large or complex.`);
    } else if (error instanceof Error) {
        throw new Error(`AI API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
};
