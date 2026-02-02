

import { AppState, AppAction } from '../types';
import { recordToHistory, reorderSiblingsAndNormalize } from './appContextUtils';
import { generateSvgStringForEditor } from '../utils/svgGenerationUtils';

import { handleSetArtboardProps, SubReducerResult as ArtboardSubReducerResult } from './actionHandlers/artboardActions';
import { 
    handleAddElement, handleAddGroup, handleUpdateElementProps, handleUpdateElementName, 
    handleDeleteElement, handleReparentElement, handleMoveElementInHierarchy, 
    handleGroupElement, handleUngroupElement, 
    handleBringToFront, handleSendToBack, handleBringForward, handleSendBackward, 
    handleConvertToEditablePath, // Changed import alias
    SubReducerResult as ElementSubReducerResult 
} from './actionHandlers/elementActions';
import { 
    handleSetAnimation, handleUpdateAnimationDuration, handleAddKeyframe, handleRemoveKeyframe, 
    handleUpdateKeyframeTime, handleUpdateKeyframeProperties, handleScaleKeyframeGroupTimes, 
    handleShiftElementAnimationTimes, handleShiftPropertyGroupTimes, // Added handleShiftPropertyGroupTimes
    handleUpdateAnimationFromAI, SubReducerResult as AnimationSubReducerResult
} from './actionHandlers/animationActions';
import {
    handleStartDrawingBezierPath, handleStartExtendingBezierPath, handleAddBezierPathPoint,
    handleFinishDrawingBezierPath, handleCancelDrawingBezierPath,
    handleAddBezierPointToSegment, handleMoveBezierControlPoint, handleUpdateStructuredPoint,
    // handleConvertToEditablePath is now in elementActions
    handleUpdateBezierPointType, handleDeleteBezierPoint,
    SubReducerResult as BezierSubReducerResult
} from './actionHandlers/bezierActions';
import {
    handleSetSelectedElementId, handleSetCurrentTime, handleSetIsPlaying, handleSetSvgCode,
    handleImportSvgString, handleSetAiPrompt, handleSetAiLoading, handleSetAiError,
    handleSetMotionPathSelectionTarget, handleSetTextOnPathSelectionTarget, handleAssignTextPath,
    handleStartGradientPreview, handleStopGradientPreview,
    handleStartSolidColorPreview, handleStopSolidColorPreview, handleShowContextMenu, handleHideContextMenu,
    handleToggleGroupExpansion, handleExpandGroups, handleToggleHistoryPanel, handleSetTimelineContextItem,
    handleSetTimelineViewMode, // Added
    handleSetCurrentTool, handleSetRenderMode, 
    handleStartDrawingPath, handleUpdateDrawingPath,
    handleSelectBezierPoint, handleSetActiveControlPoint, handleSetKeyframeShapePreview,
    handleShowOnCanvasTextEditor, handleHideOnCanvasTextEditor, handleUpdateOnCanvasTextEditorValue, 
    handleClearNewlyAddedTextFlag, handleSetKeyModifierState, 
    handleSetPlaybackSpeed, // Added
    SubReducerResult as ToolUISubReducerResult
} from './actionHandlers/toolAndUIActions';
import {
    handleUndo, handleRedo, handleGoToHistoryState,
    handleCopySelectedElement, handlePasteFromClipboard,
    handleCopyTimelineKeyframe, handlePasteTimelineKeyframe, // Added timeline clipboard actions
    SubReducerResult as HistoryClipboardSubReducerResult
} from './actionHandlers/historyAndClipboardActions';

// Define a union type for all possible sub-reducer results
type AnySubReducerResult = ArtboardSubReducerResult | ElementSubReducerResult | AnimationSubReducerResult | BezierSubReducerResult | ToolUISubReducerResult | HistoryClipboardSubReducerResult;


export const appReducer = (state: AppState, action: AppAction): AppState => {
  let result: AnySubReducerResult | null = null;
  let requiresNormalization = false;
  let normalizationParentId: string | null = null;
  let normalizationArtboardId = state.artboard.id; // Default to current artboard

  switch (action.type) {
    case 'SET_ARTBOARD_PROPS':
      result = handleSetArtboardProps(state, action.payload);
      break;
    case 'ADD_ELEMENT':
      result = handleAddElement(state, action.payload);
      requiresNormalization = true;
      const addedElInfo = (result.updatedStateSlice.elements || state.elements).find(el => el.id === result.updatedStateSlice.selectedElementId);
      normalizationParentId = addedElInfo?.parentId || null;
      normalizationArtboardId = addedElInfo?.artboardId || state.artboard.id;
      // Special handling for text tool: ensure tool remains 'text' and new element is selected
      if (action.payload.type === 'text' && action.payload.andInitiateEdit) {
        if (!result.updatedStateSlice) result.updatedStateSlice = {};
        result.updatedStateSlice.currentTool = 'text';
        if(addedElInfo) result.updatedStateSlice.selectedElementId = addedElInfo.id;
      }
      break;
    case 'ADD_GROUP':
      result = handleAddGroup(state);
      requiresNormalization = true;
      const addedGroup = (result.updatedStateSlice.elements || state.elements).find(el => el.id === result.updatedStateSlice.selectedElementId);
      normalizationParentId = addedGroup?.parentId || null;
      normalizationArtboardId = addedGroup?.artboardId || state.artboard.id;
      break;
    case 'UPDATE_ELEMENT_PROPS':
      result = handleUpdateElementProps(state, action.payload);
      break;
    case 'UPDATE_ELEMENT_NAME':
      result = handleUpdateElementName(state, action.payload);
      break;
    case 'DELETE_ELEMENT':
      result = handleDeleteElement(state, action.payload);
      // Normalization might be needed if children of a group are deleted, but reorderSiblingsAndNormalize handles parent context
      break;
    case 'REPARENT_ELEMENT':
      result = handleReparentElement(state, action.payload);
      // handleReparentElement should internally call reorderSiblingsAndNormalize for old and new parents
      break;
    case 'MOVE_ELEMENT_IN_HIERARCHY':
      result = handleMoveElementInHierarchy(state, action.payload);
      // This handler should take care of order normalization for involved parents
      break;
    case 'GROUP_ELEMENT':
      result = handleGroupElement(state, action.payload);
      requiresNormalization = true; 
      const groupedElNewParent = (result.updatedStateSlice.elements || state.elements).find(el => el.id === result.updatedStateSlice.selectedElementId)?.parentId;
      normalizationParentId = groupedElNewParent !== undefined ? groupedElNewParent : null;
      const groupedEl = (result.updatedStateSlice.elements || state.elements).find(el => el.id === result.updatedStateSlice.selectedElementId);
      normalizationArtboardId = groupedEl?.artboardId || state.artboard.id;
      break;
    case 'UNGROUP_ELEMENT':
      result = handleUngroupElement(state, action.payload);
      requiresNormalization = true; 
      const ungroupedGroup = state.elements.find(el => el.id === action.payload.groupId);
      normalizationParentId = ungroupedGroup?.parentId || null;
      normalizationArtboardId = ungroupedGroup?.artboardId || state.artboard.id;
      break;
    
    // Ordering Actions
    case 'BRING_TO_FRONT':
      result = handleBringToFront(state, action.payload);
      requiresNormalization = true;
      const btfEl = state.elements.find(el => el.id === action.payload);
      normalizationParentId = btfEl?.parentId || null;
      normalizationArtboardId = btfEl?.artboardId || state.artboard.id;
      break;
    case 'SEND_TO_BACK':
      result = handleSendToBack(state, action.payload);
      requiresNormalization = true;
      const stbEl = state.elements.find(el => el.id === action.payload);
      normalizationParentId = stbEl?.parentId || null;
      normalizationArtboardId = stbEl?.artboardId || state.artboard.id;
      break;
    case 'BRING_FORWARD':
      result = handleBringForward(state, action.payload);
      requiresNormalization = true;
      const bfEl = state.elements.find(el => el.id === action.payload);
      normalizationParentId = bfEl?.parentId || null;
      normalizationArtboardId = bfEl?.artboardId || state.artboard.id;
      break;
    case 'SEND_BACKWARD':
      result = handleSendBackward(state, action.payload);
      requiresNormalization = true;
      const sbEl = state.elements.find(el => el.id === action.payload);
      normalizationParentId = sbEl?.parentId || null;
      normalizationArtboardId = sbEl?.artboardId || state.artboard.id;
      break;

    // Animation Actions
    case 'SET_ANIMATION': result = handleSetAnimation(state, action.payload); break;
    case 'UPDATE_ANIMATION_DURATION': result = handleUpdateAnimationDuration(state, action.payload); break;
    case 'ADD_KEYFRAME': result = handleAddKeyframe(state, action.payload); break;
    case 'REMOVE_KEYFRAME': result = handleRemoveKeyframe(state, action.payload); break;
    case 'UPDATE_KEYFRAME_TIME': result = handleUpdateKeyframeTime(state, action.payload); break;
    case 'UPDATE_KEYFRAME_PROPERTIES': result = handleUpdateKeyframeProperties(state, action.payload); break;
    case 'SCALE_KEYFRAME_GROUP_TIMES': result = handleScaleKeyframeGroupTimes(state, action.payload); break;
    case 'SHIFT_ELEMENT_ANIMATION_TIMES': result = handleShiftElementAnimationTimes(state, action.payload); break; 
    case 'SHIFT_PROPERTY_GROUP_TIMES': result = handleShiftPropertyGroupTimes(state, action.payload); break;
    case 'UPDATE_ANIMATION_FROM_AI': result = handleUpdateAnimationFromAI(state, action.payload); break;

    // Bezier Actions
    case 'START_DRAWING_BEZIER_PATH': result = handleStartDrawingBezierPath(state, action.payload); break;
    case 'START_EXTENDING_BEZIER_PATH': result = handleStartExtendingBezierPath(state, action.payload); break;
    case 'ADD_BEZIER_PATH_POINT': result = handleAddBezierPathPoint(state, action.payload); break;
    case 'ADD_BEZIER_POINT_TO_SEGMENT': result = handleAddBezierPointToSegment(state, action.payload); break;
    case 'MOVE_BEZIER_CONTROL_POINT': result = handleMoveBezierControlPoint(state, action.payload); break;
    case 'UPDATE_STRUCTURED_POINT': result = handleUpdateStructuredPoint(state, action.payload); break;
    case 'FINISH_DRAWING_BEZIER_PATH': 
        result = handleFinishDrawingBezierPath(state, action.payload);
        requiresNormalization = true;
        const finishedPath = (result.updatedStateSlice.elements || state.elements).find(el => el.id === result.updatedStateSlice.selectedElementId);
        normalizationParentId = finishedPath?.parentId || null;
        normalizationArtboardId = finishedPath?.artboardId || state.artboard.id;
        break;
    case 'CANCEL_DRAWING_BEZIER_PATH': result = handleCancelDrawingBezierPath(state); break;
    case 'CONVERT_TO_EDITABLE_PATH': result = handleConvertToEditablePath(state, action.payload); break; // Use renamed handler
    case 'UPDATE_BEZIER_POINT_TYPE': result = handleUpdateBezierPointType(state, action.payload); break;
    case 'DELETE_BEZIER_POINT': result = handleDeleteBezierPoint(state, action.payload); break;


    // Tool and UI Actions
    case 'SET_SELECTED_ELEMENT_ID': result = handleSetSelectedElementId(state, action.payload); break;
    case 'SET_CURRENT_TIME': result = handleSetCurrentTime(state, action.payload); break;
    case 'SET_PLAYBACK_SPEED': result = handleSetPlaybackSpeed(state, action.payload); break; // Added
    case 'SET_IS_PLAYING': result = handleSetIsPlaying(state, action.payload); break;
    case 'SET_SVG_CODE': result = handleSetSvgCode(state, action.payload); break;
    case 'IMPORT_SVG_STRING': result = handleImportSvgString(state, action.payload); break;
    case 'SET_AI_PROMPT': result = handleSetAiPrompt(state, action.payload); break;
    case 'SET_AI_LOADING': result = handleSetAiLoading(state, action.payload); break;
    case 'SET_AI_ERROR': result = handleSetAiError(state, action.payload); break;
    case 'SET_MOTION_PATH_SELECTION_TARGET': result = handleSetMotionPathSelectionTarget(state, action.payload); break;
    case 'SET_TEXT_ON_PATH_SELECTION_TARGET': result = handleSetTextOnPathSelectionTarget(state, action.payload); break;
    case 'ASSIGN_TEXT_PATH': result = handleAssignTextPath(state, action.payload); break;
    case 'START_GRADIENT_PREVIEW': result = handleStartGradientPreview(state, action.payload); break;
    case 'STOP_GRADIENT_PREVIEW': result = handleStopGradientPreview(state); break;
    case 'START_SOLID_COLOR_PREVIEW': result = handleStartSolidColorPreview(state, action.payload); break;
    case 'STOP_SOLID_COLOR_PREVIEW': result = handleStopSolidColorPreview(state); break;
    case 'SHOW_CONTEXT_MENU': result = handleShowContextMenu(state, action.payload); break;
    case 'HIDE_CONTEXT_MENU': result = handleHideContextMenu(state); break;
    case 'TOGGLE_GROUP_EXPANSION': result = handleToggleGroupExpansion(state, action.payload); break;
    case 'EXPAND_GROUPS': result = handleExpandGroups(state, action.payload); break;
    case 'TOGGLE_HISTORY_PANEL': result = handleToggleHistoryPanel(state); break;
    case 'SET_TIMELINE_CONTEXT_ITEM': result = handleSetTimelineContextItem(state, action.payload); break;
    case 'SET_TIMELINE_VIEW_MODE': result = handleSetTimelineViewMode(state, action.payload); break; // Added
    case 'SET_CURRENT_TOOL': result = handleSetCurrentTool(state, action.payload); break;
    case 'SET_RENDER_MODE': result = handleSetRenderMode(state, action.payload); break;
    case 'START_DRAWING_PATH': result = handleStartDrawingPath(state, action.payload); break;
    case 'UPDATE_DRAWING_PATH': result = handleUpdateDrawingPath(state, action.payload); break;
    // Bezier UI specific actions
    case 'SELECT_BEZIER_POINT': result = handleSelectBezierPoint(state, action.payload); break;
    case 'SET_ACTIVE_CONTROL_POINT': result = handleSetActiveControlPoint(state, action.payload); break;
    case 'SET_KEYFRAME_SHAPE_PREVIEW': result = handleSetKeyframeShapePreview(state, action.payload); break;
    // On-Canvas Text Editor actions
    case 'SHOW_ON_CANVAS_TEXT_EDITOR': result = handleShowOnCanvasTextEditor(state, action.payload); break;
    case 'HIDE_ON_CANVAS_TEXT_EDITOR': result = handleHideOnCanvasTextEditor(state); break;
    case 'UPDATE_ON_CANVAS_TEXT_EDITOR_VALUE': result = handleUpdateOnCanvasTextEditorValue(state, action.payload); break;
    case 'CLEAR_NEWLY_ADDED_TEXT_FLAG': result = handleClearNewlyAddedTextFlag(state); break;
    case 'SET_KEY_MODIFIER_STATE': result = handleSetKeyModifierState(state, action.payload); break;


    // History and Clipboard Actions
    case 'UNDO': result = handleUndo(state); break;
    case 'REDO': result = handleRedo(state); break;
    case 'GOTO_HISTORY_STATE': result = handleGoToHistoryState(state, action.payload); break;
    case 'COPY_SELECTED_ELEMENT': result = handleCopySelectedElement(state); break;
    case 'PASTE_FROM_CLIPBOARD': 
        result = handlePasteFromClipboard(state);
        requiresNormalization = true;
        const pastedElRoot = (result.updatedStateSlice.elements || state.elements).find(el => el.id === result.updatedStateSlice.selectedElementId);
        normalizationParentId = pastedElRoot?.parentId || null;
        normalizationArtboardId = pastedElRoot?.artboardId || state.artboard.id;
      break;
    case 'COPY_TIMELINE_KEYFRAME': result = handleCopyTimelineKeyframe(state); break;
    case 'PASTE_TIMELINE_KEYFRAME': result = handlePasteTimelineKeyframe(state); break;

    default:
      return state;
  }

  if (result) {
    let newState = { ...state, ...result.updatedStateSlice };

    if (requiresNormalization && newState.elements) {
        newState.elements = reorderSiblingsAndNormalize(newState.elements, normalizationParentId, normalizationArtboardId);
        if (result.newSvgCode === undefined) { 
            newState.svgCode = generateSvgStringForEditor(newState.elements, newState.artboard);
            newState.svgCodeError = null;
        }
    }
    
    if (result.actionDescriptionForHistory && !result.skipHistoryRecording) {
      const historyUpdate = recordToHistory(
        state.history,
        state.historyIndex,
        {
          artboard: newState.artboard,
          elements: newState.elements,
          animation: newState.animation,
          selectedElementId: newState.selectedElementId,
          currentTime: newState.currentTime,
          playbackSpeed: newState.playbackSpeed, // Added playbackSpeed to snapshot payload
        },
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