
import { AppState, AppAction, AnySubReducerResult, RectElementProps, AppStateSnapshot, Artboard, SVGElementData } from '../types';
import { recordToHistory, reorderSiblingsAndNormalize, generateUniqueId, getNextOrderUtil } from './appContextUtils';
import { generateSvgStringForEditor } from '../utils/svgGenerationUtils';
import { getInitialState } from './initialState';

import { handleSetArtboardProps, handleUpdateArtboardPropsContinuous } from './actionHandlers/artboardActions';
import { 
    handleAddElement, handleAddGroup, handleUpdateElementProps, handleUpdateElementName, 
    handleDeleteElement, handleReparentElement, handleMoveElementInHierarchy, 
    handleGroupElement, handleUngroupElement, 
    handleBringToFront, handleSendToBack, handleBringForward, handleSendBackward, 
    handleConvertToEditablePath,
} from './actionHandlers/elementActions';
import { 
    handleSetAnimation, handleUpdateAnimationDuration, handleAddKeyframe, handleRemoveKeyframe, 
    handleUpdateKeyframeTime, handleUpdateKeyframeProperties, handleScaleKeyframeGroupTimes, 
    handleShiftElementAnimationTimes, handleShiftPropertyGroupTimes,
    handleUpdateAnimationFromAI
} from './actionHandlers/animationActions';
import { handleAddAsset, handleAddAssetFromLibrary, handleDeleteAsset } from './actionHandlers/assetActions';
import { handleAddAiLog } from './actionHandlers/aiActions';
import {
    handleStartDrawingBezierPath, handleStartExtendingBezierPath, handleAddBezierPathPoint,
    handleFinishDrawingBezierPath, handleCancelDrawingBezierPath,
    handleAddBezierPointToSegment, handleMoveBezierControlPoint, handleUpdateStructuredPoint,
    handleUpdateBezierPointType, handleDeleteBezierPoint,
} from './actionHandlers/bezierActions';
import {
    handleSetSelectedElementId, handleSetCurrentTime, handleSetIsPlaying, handleSetSvgCode,
    handleImportSvgString, handleSetAiPrompt, handleSetAiLoading, handleSetAiError,
    handleSetMotionPathSelectionTarget, handleSetTextOnPathSelectionTarget, handleAssignTextPath,
    handleStartGradientPreview, handleStopGradientPreview,
    handleStartSolidColorPreview, handleStopSolidColorPreview, handleShowContextMenu, handleHideContextMenu,
    handleToggleGroupExpansion, handleExpandGroups, handleToggleHistoryPanel, handleSetTimelineContextItem,
    handleSetTimelineViewMode,
    handleSetCurrentTool, handleSetRenderMode, 
    handleStartDrawingPath, handleUpdateDrawingPath,
    handleSelectBezierPoint, handleSetActiveControlPoint, handleSetKeyframeShapePreview,
    handleShowOnCanvasTextEditor, handleHideOnCanvasTextEditor, handleUpdateOnCanvasTextEditorValue, 
    handleClearNewlyAddedTextFlag, handleSetKeyModifierState, 
    handleSetPlaybackSpeed,
    handleToggleAutoKeyframing,
    handleShowConfirmationDialog,
    handleHideConfirmationDialog,
    handleShowNewProjectDialog,
    handleHideNewProjectDialog,
    handleShowNotification,
    handleHideNotification,
    handleSetActiveTab,
    handleAssignMotionPath,
} from './actionHandlers/toolAndUIActions';
import {
    handleUndo, handleRedo, handleGoToHistoryState,
    handleCopySelectedElement, handlePasteFromClipboard,
    handleCopyTimelineKeyframe, handlePasteTimelineKeyframe,
} from './actionHandlers/historyAndClipboardActions';


function getActionSubReducerResult(state: AppState, action: AppAction): AnySubReducerResult | null {
  switch (action.type) {
    // Artboard Actions
    case 'SET_ARTBOARD_PROPS': return handleSetArtboardProps(state, action.payload);
    case 'UPDATE_ARTBOARD_PROPS_CONTINUOUS': return handleUpdateArtboardPropsContinuous(state, action.payload);

    // Asset Actions
    case 'ADD_ASSET': return handleAddAsset(state, action.payload);
    case 'DELETE_ASSET': return handleDeleteAsset(state, action.payload);
    case 'ADD_ASSET_FROM_LIBRARY': return handleAddAssetFromLibrary(state, action.payload);

    // Element Actions
    case 'ADD_ELEMENT': return handleAddElement(state, action.payload);
    case 'ADD_GROUP': return handleAddGroup(state);
    case 'UPDATE_ELEMENT_PROPS': return handleUpdateElementProps(state, action.payload);
    case 'UPDATE_ELEMENT_NAME': return handleUpdateElementName(state, action.payload);
    case 'DELETE_ELEMENT': return handleDeleteElement(state, action.payload);
    case 'REPARENT_ELEMENT': return handleReparentElement(state, action.payload);
    case 'MOVE_ELEMENT_IN_HIERARCHY': return handleMoveElementInHierarchy(state, action.payload);
    case 'GROUP_ELEMENT': return handleGroupElement(state, action.payload);
    case 'UNGROUP_ELEMENT': return handleUngroupElement(state, action.payload);
    case 'BRING_TO_FRONT': return handleBringToFront(state, action.payload);
    case 'SEND_TO_BACK': return handleSendToBack(state, action.payload);
    case 'BRING_FORWARD': return handleBringForward(state, action.payload);
    case 'SEND_BACKWARD': return handleSendBackward(state, action.payload);
    case 'CONVERT_TO_EDITABLE_PATH': return handleConvertToEditablePath(state, action.payload);

    // Animation Actions
    case 'SET_ANIMATION': return handleSetAnimation(state, action.payload);
    case 'UPDATE_ANIMATION_DURATION': return handleUpdateAnimationDuration(state, action.payload);
    case 'ADD_KEYFRAME': return handleAddKeyframe(state, action.payload);
    case 'REMOVE_KEYFRAME': return handleRemoveKeyframe(state, action.payload);
    case 'UPDATE_KEYFRAME_TIME': return handleUpdateKeyframeTime(state, action.payload);
    case 'UPDATE_KEYFRAME_PROPERTIES': return handleUpdateKeyframeProperties(state, action.payload);
    case 'SCALE_KEYFRAME_GROUP_TIMES': return handleScaleKeyframeGroupTimes(state, action.payload);
    case 'SHIFT_ELEMENT_ANIMATION_TIMES': return handleShiftElementAnimationTimes(state, action.payload); 
    case 'SHIFT_PROPERTY_GROUP_TIMES': return handleShiftPropertyGroupTimes(state, action.payload);
    case 'UPDATE_ANIMATION_FROM_AI': return handleUpdateAnimationFromAI(state, action.payload);

    // Bezier Actions
    case 'START_DRAWING_BEZIER_PATH': return handleStartDrawingBezierPath(state, action.payload);
    case 'START_EXTENDING_BEZIER_PATH': return handleStartExtendingBezierPath(state, action.payload);
    case 'ADD_BEZIER_PATH_POINT': return handleAddBezierPathPoint(state, action.payload);
    case 'ADD_BEZIER_POINT_TO_SEGMENT': return handleAddBezierPointToSegment(state, action.payload);
    case 'MOVE_BEZIER_CONTROL_POINT': return handleMoveBezierControlPoint(state, action.payload);
    case 'UPDATE_STRUCTURED_POINT': return handleUpdateStructuredPoint(state, action.payload);
    case 'FINISH_DRAWING_BEZIER_PATH': return handleFinishDrawingBezierPath(state, action.payload);
    case 'CANCEL_DRAWING_BEZIER_PATH': return handleCancelDrawingBezierPath(state);
    case 'UPDATE_BEZIER_POINT_TYPE': return handleUpdateBezierPointType(state, action.payload);
    case 'DELETE_BEZIER_POINT': return handleDeleteBezierPoint(state, action.payload);

    // AI Actions
    case 'ADD_AI_LOG': return handleAddAiLog(state, action.payload);
    
    // UI/Tool/State Actions
    case 'SET_SELECTED_ELEMENT_ID': return handleSetSelectedElementId(state, action.payload);
    case 'SET_CURRENT_TIME': return handleSetCurrentTime(state, action.payload);
    case 'SET_PLAYBACK_SPEED': return handleSetPlaybackSpeed(state, action.payload);
    case 'SET_LOOP_MODE': return { updatedStateSlice: { loopMode: action.payload, playbackDirection: 1 }, skipHistoryRecording: true };
    case 'SET_PLAYBACK_DIRECTION': return { updatedStateSlice: { playbackDirection: action.payload }, skipHistoryRecording: true };
    case 'SET_IS_PLAYING': return handleSetIsPlaying(state, action.payload);
    case 'TOGGLE_AUTO_KEYFRAMING': return handleToggleAutoKeyframing(state);
    case 'SET_SVG_CODE': return handleSetSvgCode(state, action.payload);
    case 'IMPORT_SVG_STRING': return handleImportSvgString(state, action.payload);
    case 'SET_AI_PROMPT': return handleSetAiPrompt(state, action.payload);
    case 'SET_AI_LOADING': return handleSetAiLoading(state, action.payload);
    case 'SET_AI_ERROR': return handleSetAiError(state, action.payload);
    case 'SET_MOTION_PATH_SELECTION_TARGET': return handleSetMotionPathSelectionTarget(state, action.payload);
    case 'ASSIGN_MOTION_PATH': return handleAssignMotionPath(state, action.payload);
    case 'SET_TEXT_ON_PATH_SELECTION_TARGET': return handleSetTextOnPathSelectionTarget(state, action.payload);
    case 'ASSIGN_TEXT_PATH': return handleAssignTextPath(state, action.payload);
    case 'START_GRADIENT_PREVIEW': return handleStartGradientPreview(state, action.payload);
    case 'STOP_GRADIENT_PREVIEW': return handleStopGradientPreview(state);
    case 'START_SOLID_COLOR_PREVIEW': return handleStartSolidColorPreview(state, action.payload);
    case 'STOP_SOLID_COLOR_PREVIEW': return handleStopSolidColorPreview(state);
    case 'SHOW_CONTEXT_MENU': return handleShowContextMenu(state, action.payload);
    case 'HIDE_CONTEXT_MENU': return handleHideContextMenu(state);
    case 'TOGGLE_GROUP_EXPANSION': return handleToggleGroupExpansion(state, action.payload);
    case 'EXPAND_GROUPS': return handleExpandGroups(state, action.payload);
    case 'TOGGLE_HISTORY_PANEL': return handleToggleHistoryPanel(state);
    case 'SET_TIMELINE_CONTEXT_ITEM': return handleSetTimelineContextItem(state, action.payload);
    case 'SET_TIMELINE_VIEW_MODE': return handleSetTimelineViewMode(state, action.payload);
    case 'SET_CURRENT_TOOL': return handleSetCurrentTool(state, action.payload);
    case 'SET_RENDER_MODE': return handleSetRenderMode(state, action.payload);
    case 'START_DRAWING_PATH': return handleStartDrawingPath(state, action.payload);
    case 'UPDATE_DRAWING_PATH': return handleUpdateDrawingPath(state, action.payload);
    case 'FINISH_DRAWING_PATH': return { updatedStateSlice: { isDrawing: false, currentDrawingPath: null } }; // Finish is handled in the main reducer
    case 'SELECT_BEZIER_POINT': return handleSelectBezierPoint(state, action.payload);
    case 'SET_ACTIVE_CONTROL_POINT': return handleSetActiveControlPoint(state, action.payload);
    case 'SET_KEYFRAME_SHAPE_PREVIEW': return handleSetKeyframeShapePreview(state, action.payload);
    case 'SHOW_ON_CANVAS_TEXT_EDITOR': return handleShowOnCanvasTextEditor(state, action.payload);
    case 'HIDE_ON_CANVAS_TEXT_EDITOR': return handleHideOnCanvasTextEditor(state);
    case 'UPDATE_ON_CANVAS_TEXT_EDITOR_VALUE': return handleUpdateOnCanvasTextEditorValue(state, action.payload);
    case 'CLEAR_NEWLY_ADDED_TEXT_FLAG': return handleClearNewlyAddedTextFlag(state);
    case 'SET_KEY_MODIFIER_STATE': return handleSetKeyModifierState(state, action.payload);
    case 'UNDO': return handleUndo(state);
    case 'REDO': return handleRedo(state);
    case 'GOTO_HISTORY_STATE': return handleGoToHistoryState(state, action.payload);
    case 'COPY_SELECTED_ELEMENT': return handleCopySelectedElement(state);
    case 'PASTE_FROM_CLIPBOARD': return handlePasteFromClipboard(state);
    case 'COPY_TIMELINE_KEYFRAME': return handleCopyTimelineKeyframe(state);
    case 'PASTE_TIMELINE_KEYFRAME': return handlePasteTimelineKeyframe(state);
    case 'SHOW_CONFIRMATION_DIALOG': return handleShowConfirmationDialog(state, action.payload);
    case 'HIDE_CONFIRMATION_DIALOG': return handleHideConfirmationDialog(state);
    case 'SHOW_NEW_PROJECT_DIALOG': return handleShowNewProjectDialog(state);
    case 'HIDE_NEW_PROJECT_DIALOG': return handleHideNewProjectDialog(state);
    case 'SHOW_NOTIFICATION': return handleShowNotification(state, action.payload);
    case 'HIDE_NOTIFICATION': return handleHideNotification(state);
    case 'SET_ACTIVE_TAB': return handleSetActiveTab(state, action.payload);
    
    // EXECUTE_AI_ACTIONS_BATCH is handled specially in the main reducer.
    default:
      return null;
  }
}

export const appReducer = (state: AppState, action: AppAction): AppState => {
  if (action.type === 'EXECUTE_AI_ACTIONS_BATCH') {
    let currentState = { ...state };
    const actions = action.payload.actions as AppAction[];

    for (const subAction of actions) {
      const tempResult = getActionSubReducerResult(currentState, subAction);
      if (tempResult) {
        currentState = { ...currentState, ...tempResult.updatedStateSlice };
      }
    }
    const historyUpdate = recordToHistory(
      state.history,
      state.historyIndex,
      currentState, // Use the final accumulated state for the snapshot
      action.payload.log // The log message for the whole batch
    );
    return {
      ...currentState,
      ...historyUpdate,
      svgCode: generateSvgStringForEditor(currentState.elements, currentState.artboard),
      svgCodeError: null,
    };
  }

  if (action.type === 'NEW_PROJECT') {
    const { width, height } = (action as Extract<AppAction, { type: 'NEW_PROJECT' }>).payload;
    const baseDefaults = getInitialState();
    const newArtboardId = generateUniqueId('artboard');
    
    const blankArtboard: Artboard = { 
      ...baseDefaults.artboard, 
      id: newArtboardId,
      name: `New Artboard`,
      width: width, 
      height: height,
      defs: { gradients: [], filters: [], clipPaths: [], masks: [] } 
    };
    
    const blankElements: SVGElementData[] = [];

    const blankState: AppState = {
        ...baseDefaults, 
        artboard: blankArtboard, 
        elements: blankElements, 
        animation: { duration: 20, tracks: [] },
        assets: [], 
        selectedElementId: blankArtboard.id,
        svgCode: generateSvgStringForEditor(blankElements, blankArtboard), 
        svgCodeError: null,
        aiLogs: [], 
        aiPrompt: '', 
        history: [], 
        historyIndex: -1,
        clipboard: null, 
        timelineKeyframeClipboard: null, 
        expandedGroupIds: new Set(),
        confirmationDialog: null,
        newProjectDialogVisible: false,
    };
    const firstSnapshot: AppStateSnapshot = {
        artboard: blankState.artboard, 
        elements: blankState.elements, 
        animation: blankState.animation,
        selectedElementId: blankState.selectedElementId, 
        currentTime: 0, 
        playbackSpeed: 1.0,
        loopMode: 'once', 
        playbackDirection: 1, 
        actionDescription: 'New Project'
    };
    blankState.history = [firstSnapshot];
    blankState.historyIndex = 0;
    return blankState;
  }
  
  // Handle single actions
  const result = getActionSubReducerResult(state, action);

  if (result) {
    let newState = { ...state, ...result.updatedStateSlice };
    
    if (action.type === 'FINISH_DRAWING_PATH' && state.currentDrawingPath) {
        const newPath = { ...state.currentDrawingPath, id: generateUniqueId('path'), order: getNextOrderUtil(state.elements, null, state.artboard.id) };
        newState.elements = [...state.elements, newPath];
        newState.selectedElementId = newPath.id;
        result.actionDescriptionForHistory = `Create Pencil Path`;
        result.newSvgCode = generateSvgStringForEditor(newState.elements, newState.artboard);
    }
    
    if (result.actionDescriptionForHistory && !result.skipHistoryRecording) {
      const historyUpdate = recordToHistory(
        state.history,
        state.historyIndex,
        newState,
        result.actionDescriptionForHistory
      );
      newState = { ...newState, ...historyUpdate };
    }

    if (result.newSvgCode !== undefined) {
      newState.svgCode = result.newSvgCode;
      newState.svgCodeError = null; 
    }
    return newState;
  }
  return state;
};
