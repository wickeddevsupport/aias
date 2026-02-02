

import { AppState, AppStateSnapshot, TimelineViewMode } from '../types'; // Added TimelineViewMode
import { INITIAL_ELEMENTS as BASE_INITIAL_ELEMENTS, INITIAL_ANIMATION, INITIAL_ARTBOARDS, DEFAULT_TEXT_ALIGN_KONVA, DEFAULT_TEXT_WRAP, DEFAULT_SKEW_X, DEFAULT_SKEW_Y, DEFAULT_PLAYBACK_SPEED } from '../constants'; // Added DEFAULT_TEXT_ALIGN_KONVA, DEFAULT_TEXT_WRAP, DEFAULT_PLAYBACK_SPEED
import { generateSvgStringForEditor } from '../utils/svgGenerationUtils';

// Apply new text defaults to the initial elements constant
export const INITIAL_ELEMENTS = BASE_INITIAL_ELEMENTS.map(el => {
    const elementWithSkew = { ...el, skewX: DEFAULT_SKEW_X, skewY: DEFAULT_SKEW_Y };
    if (el.type === 'text') {
        return {
            ...elementWithSkew,
            width: el.width === undefined ? undefined : el.width, // Keep explicit width if set, else undefined for auto
            height: el.height === undefined ? undefined : el.height, // Keep explicit height if set, else undefined for auto
            align: el.align || DEFAULT_TEXT_ALIGN_KONVA,
            wrap: el.wrap || DEFAULT_TEXT_WRAP,
        };
    }
    return elementWithSkew;
});


// Helper to create initial snapshot for history
const createInitialSnapshot = (stateForSnapshot: Omit<AppState, 'history' | 'historyIndex' | 'svgCode' | 'svgCodeError' | 'aiPrompt' | 'isAiLoading' | 'aiError' | 'motionPathSelectionTargetElementId' | 'textOnPathSelectionTargetElementId' | 'previewTarget' | 'previewGradient' | 'previewSolidColor' | 'clipboard' | 'timelineKeyframeClipboard' | 'contextMenuVisible' | 'contextMenuPosition' | 'contextMenuTargetId' | 'expandedGroupIds' | 'isHistoryPanelOpen' | 'selectedTimelineContextItem' | 'currentTool' | 'isCtrlPressed' | 'isAltPressed' | 'isShiftPressed' | 'isDrawing' | 'currentDrawingPath' | 'isDrawingBezierPath' | 'currentBezierPathData' | 'bezierPathTempStructuredPoints' | 'selectedBezierPointId' | 'activeControlPoint' | 'editingKeyframeShapePreview' | 'isExtendingPathInfo' | 'renderMode' | 'onCanvasTextEditor' | 'newlyAddedTextElementId' | 'timelineViewMode'>): AppStateSnapshot => ({
  artboard: JSON.parse(JSON.stringify(stateForSnapshot.artboard)),
  elements: JSON.parse(JSON.stringify(stateForSnapshot.elements)),
  animation: JSON.parse(JSON.stringify(stateForSnapshot.animation)),
  selectedElementId: stateForSnapshot.selectedElementId,
  currentTime: stateForSnapshot.currentTime,
  playbackSpeed: stateForSnapshot.playbackSpeed, // Added
  actionDescription: "Initial State"
});


// Base initial state without history and index
const initialStateBase: Omit<AppState, 'history' | 'historyIndex' | 'newlyAddedTextElementId'> = {
  artboard: INITIAL_ARTBOARDS[0], 
  elements: INITIAL_ELEMENTS,     
  selectedElementId: INITIAL_ARTBOARDS[0].id, 
  animation: INITIAL_ANIMATION,   
  currentTime: 0,
  playbackSpeed: DEFAULT_PLAYBACK_SPEED, // Added
  isPlaying: false,
  svgCode: generateSvgStringForEditor(INITIAL_ELEMENTS, INITIAL_ARTBOARDS[0]),
  svgCodeError: null,
  aiPrompt: '',
  isAiLoading: false,
  aiError: null,
  motionPathSelectionTargetElementId: null,
  textOnPathSelectionTargetElementId: null, 
  previewTarget: null,
  previewGradient: null,
  previewSolidColor: null,
  clipboard: null,
  timelineKeyframeClipboard: null, // Added for timeline keyframe copy/paste
  contextMenuVisible: false,
  contextMenuPosition: null,
  contextMenuTargetId: null,
  expandedGroupIds: new Set<string>(['main-group', 'sub-group1']), 
  isHistoryPanelOpen: false,
  selectedTimelineContextItem: null,
  timelineViewMode: 'contextual', // Added timelineViewMode
  currentTool: 'select',
  isCtrlPressed: false,
  isAltPressed: false,
  isShiftPressed: false,
  isDrawing: false,
  currentDrawingPath: null,
  isDrawingBezierPath: false,
  currentBezierPathData: null,
  bezierPathTempStructuredPoints: [],
  selectedBezierPointId: null,
  activeControlPoint: null,
  editingKeyframeShapePreview: null,
  isExtendingPathInfo: null,
  renderMode: 'konva',
  onCanvasTextEditor: null, 
};

// Full initial state including history
export const initialState: AppState = {
  ...initialStateBase,
  history: [createInitialSnapshot(initialStateBase)],
  historyIndex: 0,
  newlyAddedTextElementId: null, 
};
