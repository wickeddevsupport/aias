

import { AccumulatedTransform as TransformUtilsAccumulatedTransform } from './utils/transformUtils'; // Renamed to avoid conflict

export type SVGElementType = 'rect' | 'circle' | 'path' | 'group' | 'text' | 'image';

export interface GradientStop {
  id: string;
  offset: number;
  color: string;
}

export interface SVGGradient {
  id:string;
  type: 'linearGradient' | 'radialGradient';
  stops: GradientStop[];
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
}

export interface LinearSVGGradient extends SVGGradient {
  type: 'linearGradient';
  angle?: number;
  x1?: string; y1?: string; x2?: string; y2?: string;
}

export interface RadialSVGGradient extends SVGGradient {
  type: 'radialGradient';
  cx?: string; cy?: string; r?: string;
  fx?: string; fy?: string; fr?: string;
}

export type AnySVGGradient = LinearSVGGradient | RadialSVGGradient;

export interface SVGDefElement { // Common base for defs content
  id: string;
  rawContent: string; // Store the innerHTML of the defs element for now for easy export
}
export interface SVGFilterDef extends SVGDefElement {}

// Updated SVGClipPathDef
export interface ParsedClipShape {
  type: 'circle' | 'rect' | 'ellipse' | 'path';
  attrs: Record<string, string | number>; // Store original attributes as strings
}
export interface SVGClipPathDef extends SVGDefElement {
  clipPathUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  parsedShapes?: ParsedClipShape[];
}

export interface SVGMaskDef extends SVGDefElement {} // Future: for mask support

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  defs?: {
    gradients?: AnySVGGradient[];
    filters?: SVGFilterDef[];
    clipPaths?: SVGClipPathDef[];
    masks?: SVGMaskDef[];
  };
}

export interface InterpolatedGradientUpdateData {
  type: 'linearGradient' | 'radialGradient';
  data: AnySVGGradient; // The fully interpolated gradient object for this frame
  targetDefId: string; // The stable ID of the <def> element to update
}

export interface BaseElementProps {
  id: string;
  type: SVGElementType;
  artboardId: string;
  parentId?: string | null;
  order: number;
  name?: string;

  x: number; // Final transformed X of the element's anchor point (top-left for rect, center for circle)
  y: number; // Final transformed Y of the element's anchor point
  fill?: string | AnySVGGradient;
  stroke?: string | AnySVGGradient;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number; // Final visual rotation
  scale?: number;   // Final visual (uniform) scale
  skewX?: number; // Skew angle along X-axis in degrees
  skewY?: number; // Skew angle along Y-axis in degrees

  motionPathId?: string | null;
  alignToPath?: boolean;
  motionPathStart?: number;
  motionPathEnd?: number;
  motionPathOffsetX?: number;
  motionPathOffsetY?: number;

  filter?: string; // e.g., "url(#myFilter)"
  clipPath?: string; // e.g., "url(#myClipPath)"
  mask?: string; // e.g., "url(#myMask)"

  // For carrying imperative update info, not part of base SVG model
  gradientUpdates?: {
    fill?: InterpolatedGradientUpdateData | InterpolatedGradientUpdateData[];
    stroke?: InterpolatedGradientUpdateData | InterpolatedGradientUpdateData[];
  };
}

export interface RectElementProps extends BaseElementProps {
  type: 'rect';
  // x, y inherited from BaseElementProps represent the final transformed top-left corner
  width: number;  // Original, unscaled width
  height: number; // Original, unscaled height
  cornerRadius?: number; // For rounded corners
  fill: string | AnySVGGradient;
  stroke: string | AnySVGGradient;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scale: number;
  skewX: number;
  skewY: number;
  strokeDasharray?: string;
  strokeDashoffset?: number;
  drawStartPercent?: number;
  drawEndPercent?: number;
}

export interface CircleElementProps extends BaseElementProps {
  type: 'circle'; // Represents both circles and ellipses
  // x, y inherited from BaseElementProps represent the final transformed center point
  r?: number; // Radius, used if rx/ry are not specified (circle case)
  rx?: number; // Horizontal radius for ellipse
  ry?: number; // Vertical radius for ellipse
  fill: string | AnySVGGradient;
  stroke: string | AnySVGGradient;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scale: number;
  skewX: number;
  skewY: number;
  strokeDasharray?: string;
  strokeDashoffset?: number;
  drawStartPercent?: number;
  drawEndPercent?: number;
}

export interface BezierPoint {
  id: string;    // Unique ID for the point itself
  x: number;     // Anchor x
  y: number;     // Anchor y
  h1x?: number;  // Incoming handle x (controls curve from P_prev to P_this)
  h1y?: number;  // Incoming handle y
  h2x?: number;  // Outgoing handle x (controls curve from P_this to P_next)
  h2y?: number;  // Outgoing handle y
  isSmooth?: boolean; // If true, h1 and h2 are collinear and equidistant from anchor
  isSelected?: boolean; // For UI feedback on which anchor point is selected
}

export interface PathElementProps extends BaseElementProps {
  type: 'path';
  // x, y inherited from BaseElementProps represent the transformed origin of the path's coordinate system
  d: string | BezierPoint[]; // Can also be BezierPoint[] during animation/interpolation
  fill: string | AnySVGGradient;
  stroke: string | AnySVGGradient;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scale: number;
  skewX: number;
  skewY: number;
  isRendered?: boolean;
  strokeDasharray?: string;
  strokeDashoffset?: number;
  drawStartPercent?: number;
  drawEndPercent?: number;
  closedByJoining?: boolean;
  structuredPoints?: BezierPoint[]; // For paths drawn with Bezier tool
}

export interface GroupElementProps extends BaseElementProps {
  type: 'group';
  // x, y, rotation, scale inherited from BaseElementProps define the group's transformation
  fill?: string | AnySVGGradient; // Allow fill/stroke on groups as per SVG spec
  stroke?: string | AnySVGGradient;
  strokeWidth?: number;
  opacity?: number;
  skewX: number;
  skewY: number;
}

export interface TextElementProps extends BaseElementProps {
  type: 'text';
  // x, y inherited from BaseElementProps represent the transformed position of the text's anchor point
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string; // 'normal', 'bold', '100'-'900'
  fontStyle?: string; // 'normal', 'italic'
  textAnchor?: 'start' | 'middle' | 'end'; // SVG text-anchor
  verticalAlign?: 'top' | 'middle' | 'bottom' | 'baseline'; 
  fill: string | AnySVGGradient;
  stroke: string | AnySVGGradient;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scale: number;
  skewX: number;
  skewY: number;
  letterSpacing?: number; 
  lineHeight?: number;   
  textDecoration?: string; 
  width?: number | undefined; // For multi-line text wrapping (bounding box width), undefined for auto
  height?: number | undefined; // For multi-line text height (bounding box height, optional - Konva can auto-size), undefined for auto
  align?: 'left' | 'center' | 'right' | 'justify'; // Konva text align (for within the bounding box)
  wrap?: 'word' | 'char' | 'none'; // Konva text wrap
  textPathId?: string | null; 
  textPathStartOffset?: number; // New: 0 to 1 value for starting offset on path
}

export interface ImageElementProps extends BaseElementProps {
  type: 'image';
  // x, y inherited from BaseElementProps represent the transformed top-left corner
  width?: number; // Optional, original unscaled width
  height?: number; // Optional, original unscaled height
  href: string;
  opacity: number;
  rotation: number;
  scale: number;
  skewX: number;
  skewY: number;
  preserveAspectRatio?: string; // SVG preserveAspectRatio string
}


export type SVGElementData = RectElementProps | CircleElementProps | PathElementProps | GroupElementProps | TextElementProps | ImageElementProps;

export type AnimatableProperty =
  | 'x' | 'y'
  | 'width' | 'height' // width/height can now be keyframed for text elements
  | 'r' | 'rx' | 'ry' 
  | 'd' 
  | 'fill' | 'stroke'
  | 'strokeWidth' | 'opacity'
  | 'rotation' | 'scale'
  | 'skewX' | 'skewY' // Added skew properties
  | 'motionPath'
  | 'motionPathStart'
  | 'motionPathEnd'
  | 'motionPathOffsetX'
  | 'motionPathOffsetY'
  | 'strokeDasharray'
  | 'strokeDashoffset'
  | 'drawStartPercent'
  | 'drawEndPercent'
  | 'fontSize' 
  | 'text'    
  | 'letterSpacing' 
  | 'lineHeight'   
  | 'textPath'
  | 'textPathStartOffset' // New: animatable property for text on path
  | 'textDecoration'; 


export interface Keyframe {
  time: number;
  value: number | string | AnySVGGradient | BezierPoint[] | undefined; // Allow undefined for width/height auto
  easing?: string; 
  freeze?: boolean; 
}

export interface AnimationTrack {
  elementId: string;
  property: AnimatableProperty;
  keyframes: Keyframe[];
}

export interface Animation {
  duration: number;
  tracks: AnimationTrack[];
}

export type LoopMode = 'once' | 'repeat' | 'ping-pong';

export interface AppStateSnapshot {
  artboard: Artboard;
  elements: SVGElementData[];
  animation: Animation;
  selectedElementId: string | null;
  currentTime: number;
  playbackSpeed: number;
  loopMode: LoopMode;
  playbackDirection: 1 | -1;
  actionDescription: string;
}

export type TimelineSelectionType =
  | { type: 'keyframe', elementId: string, property: AnimatableProperty, time: number }
  | { type: 'segment', elementId: string, property: AnimatableProperty, startTime: number, endTime: number }
  | null;

export type CurrentTool = 'select' | 'pencil' | 'bezierPath' | 'text'; 
export type RenderMode = 'svg' | 'konva';
export type TimelineViewMode = 'dopesheet' | 'contextual'; // New Type

export interface MotionPathCacheEntry {
  pathElement: SVGPathElement;
  totalLength: number;
  originalD: string;
}

export interface OnCanvasTextEditorState {
  elementId: string;
  isVisible: boolean;
  text: string;
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  fontFamily: string;
  fontSize: number;
  fill: string;
  textAlign: string; 
  lineHeight: number; 
  letterSpacing: number;
  rotation: number; 
  transformOrigin: string;
}

export interface ParsedDStringResult {
  points: BezierPoint[];
  closed: boolean;
  warnings: string[];
}

export interface TimelineKeyframeClipboardData {
  elementId: string;
  property: AnimatableProperty;
  value: any;
  easing?: string;
  freeze?: boolean;
}

export interface AILogEntry {
  timestamp: string;
  prompt: string;
  status: 'success' | 'error';
  message: string;
}

export interface ImageAsset {
  id: string;
  type: 'image';
  name: string;
  thumbnailSrc: string; // data:image/...
  dataUrl: string; // The full data URL for the image
  width: number;
  height: number;
}

export interface SvgAsset {
  id: string;
  type: 'svg';
  name:string;
  thumbnailSrc: string; // A data URL of a rendered SVG thumbnail
  rawContent: string; // The original SVG string
  // Store the parsed result to avoid re-parsing on every drop
  parsedArtboard: Partial<Artboard>;
  parsedElements: SVGElementData[];
}

export type Asset = ImageAsset | SvgAsset;

export interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ActiveLeftTab = 'maestro' | 'hierarchy' | 'assets';

export interface AppState {
  artboard: Artboard;
  elements: SVGElementData[];
  assets: Asset[];
  selectedElementId: string | null;
  animation: Animation;
  currentTime: number;
  playbackSpeed: number;
  loopMode: LoopMode;
  playbackDirection: 1 | -1;
  isPlaying: boolean;
  isAutoKeyframing: boolean;
  svgCode: string;
  svgCodeError: string | null;
  aiPrompt: string;
  isAiLoading: boolean;
  aiError: string | null;
  aiLogs: AILogEntry[];
  motionPathSelectionTargetElementId: string | null;
  textOnPathSelectionTargetElementId: string | null; 
  previewTarget: {
    elementId: string;
    property: AnimatableProperty;
  } | null;
  previewGradient: AnySVGGradient | null;
  previewSolidColor: string | null;
  // Undo/Redo state
  history: AppStateSnapshot[];
  historyIndex: number;
  clipboard: SVGElementData[] | null; // For element copy/paste
  timelineKeyframeClipboard: TimelineKeyframeClipboardData | null; // For timeline keyframe copy/paste
  // Context Menu state
  contextMenuVisible: boolean;
  contextMenuPosition: { x: number; y: number } | null;
  contextMenuTargetId: string | null;
  // UI State for Hierarchy Panel
  expandedGroupIds: Set<string>;
  // UI State for Floating History Panel
  isHistoryPanelOpen: boolean;
  // Timeline Contextual Menu
  selectedTimelineContextItem: TimelineSelectionType;
  timelineViewMode: TimelineViewMode; // Added
  // Drawing Tools State
  currentTool: CurrentTool;
  isCtrlPressed: boolean; // Added
  isAltPressed: boolean;  // Added
  isShiftPressed: boolean; // Added
  // Pencil (Freehand) Tool State
  isDrawing: boolean; 
  currentDrawingPath: PathElementProps | null; 
  // Bezier Path Tool State
  isDrawingBezierPath: boolean; 
  currentBezierPathData: PathElementProps | null; 
  selectedBezierPointId: string | null; 
  activeControlPoint: { 
    pathId: string; 
    pointId: string; 
    handleType: 'h1' | 'h2' | 'anchor'; 
    keyframeTime?: number; 
  } | null;
  isExtendingPathInfo: { 
    originalPathId: string;
    pointIdToExtendFrom: string; 
    extendingFromStart: boolean; 
  } | null;
  // Legacy Bezier state to review/remove if redundant
  bezierPathTempStructuredPoints: BezierPoint[]; 
  // Keyframe Shape Editing
  editingKeyframeShapePreview: { 
    pathId: string;
    time: number;
    points: BezierPoint[];
  } | null;
  // Render Mode
  renderMode: RenderMode;
  // On-Canvas Text Editor State
  onCanvasTextEditor: OnCanvasTextEditorState | null;
  // Flag for Text Tool
  newlyAddedTextElementId: string | null;
  notification: NotificationState | null;
  activeLeftTab: ActiveLeftTab;
  // Confirmation Dialog State
  confirmationDialog: {
    isVisible: boolean;
    message: string;
    confirmButtonText: string;
    onConfirm: () => void;
  } | null;
  newProjectDialogVisible: boolean;
}

// Export AccumulatedTransform by referencing its renamed import
export type AccumulatedTransform = TransformUtilsAccumulatedTransform;


export const ALL_ANIMATABLE_PROPERTIES: AnimatableProperty[] = [
  'x', 'y', 'width', 'height', 'r', 'rx', 'ry', 'd', 'fill', 'stroke', 'strokeWidth', 'opacity', 
  'rotation', 'scale', 'skewX', 'skewY', // Added skewX, skewY
  'motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY', 
  'strokeDasharray', 'strokeDashoffset', 'drawStartPercent', 'drawEndPercent', 
  'fontSize', 'text', 'letterSpacing', 'lineHeight', 'textPath', 'textPathStartOffset', 'textDecoration'
];

// Define a type for the transform payload properties
export type TransformableProps = {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  skewX?: number; // Added
  skewY?: number; // Added
  width?: number | undefined; // Intrinsic width, allow undefined for text
  height?: number | undefined; // Intrinsic height, allow undefined for text
  r?: number;
  rx?: number; 
  ry?: number; 
};

export interface SubReducerResult {
  updatedStateSlice: Partial<AppState>;
  actionDescriptionForHistory?: string;
  newSvgCode?: string;
  skipHistoryRecording?: boolean;
}

export type AnySubReducerResult = SubReducerResult;


// Action Types
export type AppAction =
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'ADD_ASSET_FROM_LIBRARY'; payload: { assetId: string; position: { x: number; y: number } } }
  | { type: 'SET_ARTBOARD_PROPS'; payload: Partial<Artboard> }
  | { type: 'UPDATE_ARTBOARD_PROPS_CONTINUOUS'; payload: Partial<Artboard> }
  | { type: 'ADD_ELEMENT'; payload: { type: SVGElementType; targetParentId?: string | null; props?: Partial<SVGElementData>; andInitiateEdit?: boolean } } 
  | { type: 'ADD_GROUP' }
  | { type: 'UPDATE_ELEMENT_PROPS'; payload: { id: string; props: Partial<SVGElementData>; skipHistory?: boolean } }
  | { type: 'UPDATE_ELEMENT_TRANSFORM'; payload: { elementId: string; newTransform: TransformableProps } } 
  | { type: 'UPDATE_ELEMENT_NAME'; payload: { id: string; name: string } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'REPARENT_ELEMENT'; payload: { elementId: string; newParentId: string | null } }
  | { type: 'MOVE_ELEMENT_IN_HIERARCHY'; payload: { draggedId: string; targetId: string | null; position: 'before' | 'after' | 'inside' } }
  | { type: 'SET_SELECTED_ELEMENT_ID'; payload: string | null }
  | { type: 'SET_ANIMATION'; payload: Animation }
  | { type: 'UPDATE_ANIMATION_DURATION'; payload: number }
  | { type: 'ADD_KEYFRAME'; payload: { elementId: string; property: AnimatableProperty; time: number; value: any } } 
  | { type: 'REMOVE_KEYFRAME'; payload: { elementId: string; property: AnimatableProperty; time: number } }
  | { type: 'UPDATE_KEYFRAME_TIME'; payload: { elementId: string; property: AnimatableProperty; oldTime: number; newTime: number } }
  | { type: 'UPDATE_KEYFRAME_PROPERTIES'; payload: { elementId: string; property: AnimatableProperty; time: number; newKeyframeProps: Partial<Omit<Keyframe, 'time' | 'value'>> } }
  | { type: 'SCALE_KEYFRAME_GROUP_TIMES'; payload: { elementId: string; propertiesToScale: AnimatableProperty[]; originalTimespan: { start: number, end: number }; newTimespan: { start: number, end: number } } }
  | { type: 'UPDATE_ANIMATION_FROM_AI'; payload: {elementId: string; aiTracks: AnimationTrack[]}}
  | { type: 'SHIFT_ELEMENT_ANIMATION_TIMES'; payload: { elementId: string; timeShift: number } } 
  | { type: 'SHIFT_PROPERTY_GROUP_TIMES'; payload: { elementId: string; propertiesToShift: AnimatableProperty[]; timeShift: number } }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_PLAYBACK_SPEED'; payload: number }
  | { type: 'SET_LOOP_MODE'; payload: LoopMode }
  | { type: 'SET_PLAYBACK_DIRECTION'; payload: 1 | -1 }
  | { type: 'SET_IS_PLAYING'; payload: boolean }
  | { type: 'TOGGLE_AUTO_KEYFRAMING' }
  | { type: 'SET_SVG_CODE'; payload: { code: string; error?: string | null } }
  | { type: 'APPLY_SVG_CODE'; payload: string }
  | { type: 'SET_AI_PROMPT'; payload: string }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_AI_ERROR'; payload: string | null }
  | { type: 'ADD_AI_LOG'; payload: AILogEntry }
  | { type: 'EXECUTE_AI_ACTIONS_BATCH', payload: { actions: AppAction[], log: string } }
  | { type: 'SET_MOTION_PATH_SELECTION_TARGET'; payload: string | null }
  | { type: 'ASSIGN_MOTION_PATH'; payload: { elementId: string; pathId: string | null } }
  | { type: 'SET_TEXT_ON_PATH_SELECTION_TARGET'; payload: string | null } 
  | { type: 'ASSIGN_TEXT_PATH'; payload: { textElementId: string; pathElementId: string | null } } 
  | { type: 'IMPORT_SVG_STRING'; payload: string }
  | { type: 'START_GRADIENT_PREVIEW'; payload: { elementId: string; property: AnimatableProperty; gradient: AnySVGGradient } }
  | { type: 'STOP_GRADIENT_PREVIEW' }
  | { type: 'START_SOLID_COLOR_PREVIEW'; payload: { elementId: string; property: AnimatableProperty; color: string } }
  | { type: 'STOP_SOLID_COLOR_PREVIEW' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'GOTO_HISTORY_STATE'; payload: number }
  | { type: 'COPY_SELECTED_ELEMENT' }
  | { type: 'PASTE_FROM_CLIPBOARD' }
  | { type: 'COPY_TIMELINE_KEYFRAME' } // New
  | { type: 'PASTE_TIMELINE_KEYFRAME' } // New
  | { type: 'SHOW_CONTEXT_MENU'; payload: { targetId: string; position: { x: number; y: number } } }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'BRING_TO_FRONT'; payload: string }
  | { type: 'SEND_TO_BACK'; payload: string }
  | { type: 'BRING_FORWARD'; payload: string }
  | { type: 'SEND_BACKWARD'; payload: string }
  | { type: 'GROUP_ELEMENT'; payload: { elementId: string } }
  | { type: 'UNGROUP_ELEMENT'; payload: { groupId: string } }
  | { type: 'TOGGLE_GROUP_EXPANSION'; payload: string }
  | { type: 'EXPAND_GROUPS'; payload: string[] } 
  | { type: 'TOGGLE_HISTORY_PANEL' }
  | { type: 'SET_TIMELINE_CONTEXT_ITEM'; payload: TimelineSelectionType }
  | { type: 'SET_TIMELINE_VIEW_MODE'; payload: TimelineViewMode } // Added
  | { type: 'SET_CURRENT_TOOL'; payload: CurrentTool }
  | { type: 'SET_KEY_MODIFIER_STATE'; payload: { key: 'Control' | 'Alt' | 'Shift'; pressed: boolean } } // Added
  // Pencil (Freehand) Tool Actions
  | { type: 'START_DRAWING_PATH'; payload: { x: number; y: number } } 
  | { type: 'UPDATE_DRAWING_PATH'; payload: { x: number; y: number } } 
  | { type: 'FINISH_DRAWING_PATH' }
  // Bezier Path Tool Actions
  | { type: 'START_DRAWING_BEZIER_PATH'; payload: { x: number; y: number } } 
  | { type: 'START_EXTENDING_BEZIER_PATH'; payload: { pathId: string; pointIdToExtendFrom: string } } 
  | { type: 'ADD_BEZIER_PATH_POINT'; payload: { x: number; y: number; dragPull?: boolean } } 
  | { type: 'ADD_BEZIER_POINT_TO_SEGMENT'; payload: { pathId: string; newPoint: BezierPoint; insertAtIndex: number } } 
  | { type: 'MOVE_BEZIER_CONTROL_POINT'; payload: { // Updated payload
      pathId: string;
      pointId: string;
      handleType: 'h1' | 'h2' | 'anchor';
      newLocalX: number; // Local coordinate X relative to the path
      newLocalY: number; // Local coordinate Y relative to the path
      keyframeTime?: number; 
      skipHistory?: boolean;
      shiftPressed?: boolean; 
      ctrlPressed?: boolean;  
      altPressed?: boolean;   
    }
  }
  | { type: 'UPDATE_STRUCTURED_POINT'; payload: { pathId: string; pointId: string; newPointData: Partial<BezierPoint> } } 
  | { type: 'SELECT_BEZIER_POINT'; payload: { pathId: string; pointId: string | null } }
  | { type: 'SET_ACTIVE_CONTROL_POINT'; payload: AppState['activeControlPoint'] }
  | { type: 'FINISH_DRAWING_BEZIER_PATH'; payload: { closedByJoining?: boolean; isDoubleClickEvent?: boolean; } }
  | { type: 'CANCEL_DRAWING_BEZIER_PATH' }
  | { type: 'CONVERT_TO_EDITABLE_PATH'; payload: { elementId: string } }
  | { type: 'UPDATE_BEZIER_POINT_TYPE'; payload: { pathId: string; pointId: string; isSmooth: boolean; ctrlPressed?: boolean; altPressed?: boolean;} }
  | { type: 'DELETE_BEZIER_POINT'; payload: { pathId: string; pointId: string } }
  | { type: 'SET_KEYFRAME_SHAPE_PREVIEW'; payload: AppState['editingKeyframeShapePreview'] }
  // Render Mode Action
  | { type: 'SET_RENDER_MODE'; payload: RenderMode }
  // On-Canvas Text Editor Actions
  | { type: 'SHOW_ON_CANVAS_TEXT_EDITOR'; payload: OnCanvasTextEditorState }
  | { type: 'HIDE_ON_CANVAS_TEXT_EDITOR' }
  | { type: 'UPDATE_ON_CANVAS_TEXT_EDITOR_VALUE'; payload: string }
  | { type: 'CLEAR_NEWLY_ADDED_TEXT_FLAG' }
  | { type: 'NEW_PROJECT'; payload: { width: number; height: number } }
  // Confirmation Dialog Actions
  | { type: 'SHOW_CONFIRMATION_DIALOG'; payload: { message: string; confirmButtonText?: string; onConfirm: () => void; } }
  | { type: 'HIDE_CONFIRMATION_DIALOG' }
  | { type: 'SHOW_NEW_PROJECT_DIALOG' }
  | { type: 'HIDE_NEW_PROJECT_DIALOG' }
  | { type: 'SHOW_NOTIFICATION'; payload: NotificationState }
  | { type: 'HIDE_NOTIFICATION' }
  | { type: 'SET_ACTIVE_TAB'; payload: ActiveLeftTab };


// For Timeline Panel Property Grouping
export type TimelinePropertyGroupKey = 'Transform' | 'Appearance' | 'Geometry' | 'Text' | 'ImageSource' | 'MotionPath' | 'DrawEffect' | 'FiltersAndEffects' | 'TextLayout'; 

export interface TimelinePropertyUIGroup {
  key: TimelinePropertyGroupKey;
  label: string;
  properties: AnimatableProperty[];
}
export const TIMELINE_PROPERTY_GROUPS: Record<SVGElementType, TimelinePropertyUIGroup[]> = {
  rect: [
    { key: 'Transform', label: 'Transform', properties: ['x', 'y', 'rotation', 'scale', 'skewX', 'skewY'] },
    { key: 'Appearance', label: 'Appearance', properties: ['fill', 'stroke', 'strokeWidth', 'opacity'] },
    { key: 'Geometry', label: 'Geometry', properties: ['width', 'height'] },
    { key: 'MotionPath', label: 'Motion Path', properties: ['motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'] },
    { key: 'DrawEffect', label: 'Draw Effect', properties: ['strokeDasharray', 'strokeDashoffset', 'drawStartPercent', 'drawEndPercent'] },
  ],
  circle: [
    { key: 'Transform', label: 'Transform', properties: ['x', 'y', 'rotation', 'scale', 'skewX', 'skewY'] },
    { key: 'Appearance', label: 'Appearance', properties: ['fill', 'stroke', 'strokeWidth', 'opacity'] },
    { key: 'Geometry', label: 'Geometry', properties: ['rx', 'ry'] }, // Changed from r to rx, ry
    { key: 'MotionPath', label: 'Motion Path', properties: ['motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'] },
    { key: 'DrawEffect', label: 'Draw Effect', properties: ['strokeDasharray', 'strokeDashoffset', 'drawStartPercent', 'drawEndPercent'] },
  ],
  path: [
    { key: 'Transform', label: 'Transform', properties: ['x', 'y', 'rotation', 'scale', 'skewX', 'skewY'] },
    { key: 'Appearance', label: 'Appearance', properties: ['fill', 'stroke', 'strokeWidth', 'opacity'] },
    { key: 'Geometry', label: 'Geometry', properties: ['d'] }, 
    { key: 'MotionPath', label: 'Motion Path', properties: ['motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'] },
    { key: 'DrawEffect', label: 'Draw Effect', properties: ['strokeDasharray', 'strokeDashoffset', 'drawStartPercent', 'drawEndPercent'] },
  ],
  group: [
    { key: 'Transform', label: 'Transform', properties: ['x', 'y', 'rotation', 'scale', 'skewX', 'skewY'] },
    { key: 'Appearance', label: 'Appearance', properties: ['fill', 'stroke', 'strokeWidth', 'opacity'] },
    { key: 'MotionPath', label: 'Motion Path', properties: ['motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'] },
  ],
  text: [
    { key: 'Transform', label: 'Transform', properties: ['x', 'y', 'rotation', 'scale', 'skewX', 'skewY'] },
    { key: 'Appearance', label: 'Appearance', properties: ['fill', 'stroke', 'strokeWidth', 'opacity'] },
    { key: 'Geometry', label: 'Geometry', properties: ['width', 'height']}, 
    { key: 'Text', label: 'Text Properties', properties: ['fontSize', 'text', 'letterSpacing', 'lineHeight'] }, 
    { key: 'TextLayout', label: 'Text Path', properties: ['textPath', 'textPathStartOffset'] }, 
    { key: 'MotionPath', label: 'Motion Path', properties: ['motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'] },
  ],
  image: [
    { key: 'Transform', label: 'Transform', properties: ['x', 'y', 'rotation', 'scale', 'skewX', 'skewY'] },
    { key: 'Appearance', label: 'Appearance', properties: ['opacity'] },
    { key: 'Geometry', label: 'Geometry', properties: ['width', 'height'] }, 
    { key: 'MotionPath', label: 'Motion Path', properties: ['motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'] },
  ],
};

export const EASING_FUNCTIONS = [
  { id: 'linear', label: 'Linear' },
  { id: 'easeInSine', label: 'Ease In Sine' },
  { id: 'easeOutSine', label: 'Ease Out Sine' },
  { id: 'easeInOutSine', label: 'Ease In Out Sine' },
  { id: 'easeInQuad', label: 'Ease In Quad (Power1)' },
  { id: 'easeOutQuad', label: 'Ease Out Quad (Power1)' },
  { id: 'easeInOutQuad', label: 'Ease In Out Quad (Power1)' },
  { id: 'easeInCubic', label: 'Ease In Cubic (Power2)' },
  { id: 'easeOutCubic', label: 'Ease Out Cubic (Power2)' },
  { id: 'easeInOutCubic', label: 'Ease In Out Cubic (Power2)' },
  { id: 'easeInQuart', label: 'Ease In Quart (Power3)' },
  { id: 'easeOutQuart', label: 'Ease Out Quart (Power3)' },
  { id: 'easeInOutQuart', label: 'Ease In Out Quart (Power3)' },
  { id: 'easeInQuint', label: 'Ease In Quint (Power4)' },
  { id: 'easeOutQuint', label: 'Ease Out Quint (Power4)' },
  { id: 'easeInOutQuint', label: 'Ease In Out Quint (Power4)' },
  { id: 'easeInExpo', label: 'Ease In Expo' },
  { id: 'easeOutExpo', label: 'Ease Out Expo' },
  { id: 'easeInOutExpo', label: 'Ease In Out Expo' },
  { id: 'easeInCirc', label: 'Ease In Circ' },
  { id: 'easeOutCirc', label: 'Ease Out Circ' },
  { id: 'easeInOutCirc', label: 'Ease In Out Circ' },
  { id: 'easeInBack', label: 'Ease In Back' },
  { id: 'easeOutBack', label: 'Ease Out Back' },
  { id: 'easeInOutBack', label: 'Ease In Out Back' },
  { id: 'easeInElastic', label: 'Ease In Elastic' },
  { id: 'easeOutElastic', label: 'Ease Out Elastic' },
  { id: 'easeInOutElastic', label: 'Ease In Out Elastic' },
  { id: 'easeInBounce', label: 'Ease In Bounce' },
  { id: 'easeOutBounce', label: 'Ease Out Bounce' },
  { id: 'easeInOutBounce', label: 'Ease In Out Bounce' },
  { id: 'step-start', label: 'Step Start' },
  { id: 'step-end', label: 'Step End' },
  { id: 'custom', label: 'Custom Cubic Bezier' }
];

export interface CustomBezierPoints {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

const defaultCustomPoints: CustomBezierPoints = { p1x: 0.645, p1y: 0.045, p2x: 0.355, p2y: 1.0 }; // easeInOutCubic

export const STANDARD_EASE_TO_BEZIER_MAP: Record<string, CustomBezierPoints> = {
  linear: { p1x: 0.0, p1y: 0.0, p2x: 1.0, p2y: 1.0 },
  easeInCubic: { p1x: 0.32, p1y: 0, p2x: 0.67, p2y: 0 },
  easeOutCubic: { p1x: 0.33, p1y: 1, p2x: 0.68, p2y: 1 },
  easeInOutCubic: { p1x: 0.65, p1y: 0, p2x: 0.35, p2y: 1 },
  easeInQuad: { p1x: 0.11, p1y: 0, p2x: 0.5, p2y: 0 },
  easeOutQuad: { p1x: 0.5, p1y: 1, p2x: 0.89, p2y: 1 },
  easeInOutQuad: { p1x: 0.45, p1y: 0, p2x: 0.55, p2y: 1 },
  easeInQuart: { p1x: 0.5, p1y: 0, p2x: 0.75, p2y: 0 },
  easeOutQuart: { p1x: 0.25, p1y: 1, p2x: 0.5, p2y: 1 },
  easeInOutQuart: { p1x: 0.76, p1y: 0, p2x: 0.24, p2y: 1 },
  easeInQuint: { p1x: 0.6, p1y: 0, p2x: 0.8, p2y: 0 },
  easeOutQuint: { p1x: 0.2, p1y: 1, p2x: 0.4, p2y: 1 },
  easeInOutQuint: { p1x: 0.83, p1y: 0, p2x: 0.17, p2y: 1 },
  easeInSine: { ...defaultCustomPoints },
  easeOutSine: { ...defaultCustomPoints },
  easeInOutSine: { ...defaultCustomPoints },
  easeInExpo: { ...defaultCustomPoints },
  easeOutExpo: { ...defaultCustomPoints },
  easeInOutExpo: { ...defaultCustomPoints },
  easeInCirc: { ...defaultCustomPoints },
  easeOutCirc: { ...defaultCustomPoints },
  easeInOutCirc: { ...defaultCustomPoints },
  easeInBack: { ...defaultCustomPoints },
  easeOutBack: { ...defaultCustomPoints },
  easeInOutBack: { ...defaultCustomPoints },
  easeInElastic: { ...defaultCustomPoints },
  easeOutElastic: { ...defaultCustomPoints },
  easeInOutElastic: { ...defaultCustomPoints },
  easeInBounce: { ...defaultCustomPoints },
  easeOutBounce: { ...defaultCustomPoints },
  easeInOutBounce: { ...defaultCustomPoints },
  'step-start': { p1x: 0.0, p1y: 1.0, p2x: 1.0, p2y: 1.0 },
  'step-end': { p1x: 0.0, p1y: 0.0, p2x: 1.0, p2y: 0.0 },
  custom: { ...defaultCustomPoints },
};
