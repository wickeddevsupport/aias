

import { AppState, AppAction, SVGElementData, PathElementProps, AnimationTrack, OnCanvasTextEditorState, TextElementProps, CurrentTool, TimelineViewMode, SubReducerResult, NotificationState, ActiveLeftTab } from '../../types';
import { parseSvgString } from '../../utils/svgParsingUtils';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';
import { DEFAULT_ELEMENT_STROKE, DEFAULT_OPACITY, DEFAULT_STROKE_WIDTH, DEFAULT_MOTION_PATH_END, DEFAULT_MOTION_PATH_OFFSET_X, DEFAULT_MOTION_PATH_OFFSET_Y, DEFAULT_MOTION_PATH_START, DEFAULT_SKEW_X, DEFAULT_SKEW_Y, DEFAULT_ROTATION, DEFAULT_SCALE, DEFAULT_TEXT_PATH_START_OFFSET } from '../../constants';
import { getAllParentGroupIds } from '../appContextUtils'; 
import { getAccumulatedTransform } from '../../utils/transformUtils';


export function handleSetSelectedElementId(state: AppState, payload: Extract<AppAction, { type: 'SET_SELECTED_ELEMENT_ID' }>['payload']): SubReducerResult {
    let updatedSlice: Partial<AppState> = { 
        selectedElementId: payload, 
        motionPathSelectionTargetElementId: null, 
        textOnPathSelectionTargetElementId: null,
        aiPrompt: '', 
        aiError: null, 
    };

    const newlySelectedElement = payload ? state.elements.find(el => el.id === payload) : null;

    if (newlySelectedElement && payload) { 
        const parentGroupIds = getAllParentGroupIds(payload, state.elements);
        if (parentGroupIds.length > 0) {
            const newExpandedGroupIds = new Set(state.expandedGroupIds);
            parentGroupIds.forEach(id => newExpandedGroupIds.add(id));
            updatedSlice.expandedGroupIds = newExpandedGroupIds;
        }
    }
    
    // If the text editor was visible for a *different* element, it should have been committed by handleSelectElement in App.tsx.
    // This ensures that if text tool is active and we are just selecting another text element to edit it, the old editor is handled.
    // If we are switching AWAY from text tool, the tool change handler will hide it.
    if (state.currentTool === 'text' && newlySelectedElement?.type !== 'text' && state.onCanvasTextEditor?.isVisible) {
         updatedSlice.onCanvasTextEditor = null; // Hide editor if text tool active but non-text selected.
    }


    // Bezier specific logic when selection changes
    if (state.currentTool === 'bezierPath') {
        if (newlySelectedElement?.type === 'path' && (newlySelectedElement as PathElementProps).structuredPoints) {
            const pathPoints = (newlySelectedElement as PathElementProps).structuredPoints!;
            updatedSlice.selectedBezierPointId = pathPoints && pathPoints.length > 0 ? pathPoints[0].id : null;
            updatedSlice.activeControlPoint = null; 
        } else { // Not a path with points, or deselected
            updatedSlice.selectedBezierPointId = null;
            updatedSlice.activeControlPoint = null;
        }
    } else { // If not Bezier tool, ensure point/control states are clear
        updatedSlice.selectedBezierPointId = null;
        updatedSlice.activeControlPoint = null;
    }
    
    // If was drawing a Bezier path and selection changes to something else, cancel drawing.
    if (state.isDrawingBezierPath && payload !== state.currentBezierPathData?.id) {
        updatedSlice.isDrawingBezierPath = false;
        updatedSlice.currentBezierPathData = null;
        updatedSlice.isExtendingPathInfo = null;
    }

    return { updatedStateSlice: updatedSlice };
}

export function handleSetCurrentTime(state: AppState, payload: Extract<AppAction, { type: 'SET_CURRENT_TIME' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { currentTime: payload } };
}

export function handleSetPlaybackSpeed(state: AppState, payload: Extract<AppAction, { type: 'SET_PLAYBACK_SPEED' }>['payload']): SubReducerResult { // Added
    return { updatedStateSlice: { playbackSpeed: payload }, skipHistoryRecording: true };
}

export function handleSetIsPlaying(state: AppState, payload: Extract<AppAction, { type: 'SET_IS_PLAYING' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { isPlaying: payload } };
}

export function handleToggleAutoKeyframing(state: AppState): SubReducerResult {
    return {
        updatedStateSlice: { isAutoKeyframing: !state.isAutoKeyframing },
        skipHistoryRecording: true,
    };
}

export function handleSetSvgCode(state: AppState, payload: Extract<AppAction, { type: 'SET_SVG_CODE' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { svgCode: payload.code, svgCodeError: payload.error || null } };
}

export function handleImportSvgString(state: AppState, payload: Extract<AppAction, { type: 'IMPORT_SVG_STRING' }>['payload']): SubReducerResult {
    try {
        const { elements: parsedElements, artboardOverrides } = parseSvgString(payload, state.artboard.id);
        const newArtboard = { ...state.artboard, ...artboardOverrides };
        const newAnimationTracks: AnimationTrack[] = []; 

        const updatedStateSlice: Partial<AppState> = {
            artboard: newArtboard, elements: parsedElements,
            animation: { ...state.animation, tracks: newAnimationTracks },
            selectedElementId: newArtboard.id, currentTime: 0,
            svgCode: generateSvgStringForEditor(parsedElements, newArtboard), svgCodeError: null,
            expandedGroupIds: new Set(), currentTool: 'select',
            isDrawing: false, currentDrawingPath: null,
            isDrawingBezierPath: false, currentBezierPathData: null, bezierPathTempStructuredPoints: [],
            selectedBezierPointId: null, activeControlPoint: null, isExtendingPathInfo: null,
            motionPathSelectionTargetElementId: null, 
            textOnPathSelectionTargetElementId: null,
            onCanvasTextEditor: null, 
        };
        return {
            updatedStateSlice,
            actionDescriptionForHistory: `Import SVG from String`,
            newSvgCode: updatedStateSlice.svgCode,
        };
    } catch (error) {
        console.error("Error parsing SVG:", error);
        return { updatedStateSlice: { svgCodeError: error instanceof Error ? error.message : "Unknown SVG parsing error" } };
    }
}

export function handleSetAiPrompt(state: AppState, payload: Extract<AppAction, { type: 'SET_AI_PROMPT' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { aiPrompt: payload } };
}
export function handleSetAiLoading(state: AppState, payload: Extract<AppAction, { type: 'SET_AI_LOADING' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { isAiLoading: payload } };
}
export function handleSetAiError(state: AppState, payload: Extract<AppAction, { type: 'SET_AI_ERROR' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { aiError: payload } };
}
export function handleSetMotionPathSelectionTarget(state: AppState, payload: Extract<AppAction, { type: 'SET_MOTION_PATH_SELECTION_TARGET' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { motionPathSelectionTargetElementId: payload, textOnPathSelectionTargetElementId: null } };
}

export function handleAssignMotionPath(state: AppState, payload: Extract<AppAction, { type: 'ASSIGN_MOTION_PATH' }>['payload']): SubReducerResult {
    const { elementId, pathId } = payload;
    const elementIndex = state.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return { updatedStateSlice: {} };

    const targetElement = state.elements[elementIndex];
    const pathElement = pathId ? state.elements.find(el => el.id === pathId) : null;
    
    // Build the props to update
    const propsToUpdate: Partial<SVGElementData> = { 
        motionPathId: pathId,
        // Reset motion path properties to default when a new path is assigned
        motionPathStart: DEFAULT_MOTION_PATH_START,
        motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X,
        motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
    };
    
    if (targetElement.type === 'text') {
        (propsToUpdate as Partial<TextElementProps>).textPathId = null; // Mutually exclusive
    }

    // If assigning a new path, snap the element to the path's origin for immediate feedback
    // This provides a better user experience than snapping to a random point based on currentTime.
    if (pathElement) {
        const pathTransform = getAccumulatedTransform(pathId!, state.elements);
        let targetX = pathTransform.x;
        let targetY = pathTransform.y;

        // The path's accumulated transform is its absolute position on the artboard.
        // We need to calculate the target element's new *local* coordinates
        // that will place its origin at this absolute position.
        if (targetElement.parentId) {
            const parentTransform = getAccumulatedTransform(targetElement.parentId, state.elements);
            // Create a matrix for the parent's transformation
            const parentMatrix = new DOMMatrix()
                .translate(parentTransform.x, parentTransform.y)
                .rotate(parentTransform.rotation)
                .scale(parentTransform.scale);
            
            // Invert it to transform from world space back to the parent's local space
            const invertedParentMatrix = parentMatrix.inverse();
            const localPoint = new DOMPoint(targetX, targetY).matrixTransform(invertedParentMatrix);
            
            targetX = localPoint.x;
            targetY = localPoint.y;
        }

        propsToUpdate.x = targetX;
        propsToUpdate.y = targetY;
    }
    
    // Create the updated element and the new elements array
    const updatedElement = { ...targetElement, ...propsToUpdate } as SVGElementData;
    const newElements = [...state.elements];
    newElements[elementIndex] = updatedElement;
    
    const elName = updatedElement.name || elementId;
    const pathName = pathId ? (pathElement?.name || pathId) : 'None';
    
    return {
        updatedStateSlice: { 
            elements: newElements, 
            motionPathSelectionTargetElementId: null 
        },
        actionDescriptionForHistory: pathId
            ? `Assign Motion Path '${pathName}' to ${elName}`
            : `Clear Motion Path from ${elName}`,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}


export function handleSetTextOnPathSelectionTarget(state: AppState, payload: Extract<AppAction, { type: 'SET_TEXT_ON_PATH_SELECTION_TARGET' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { textOnPathSelectionTargetElementId: payload, motionPathSelectionTargetElementId: null } };
}
export function handleAssignTextPath(state: AppState, payload: Extract<AppAction, { type: 'ASSIGN_TEXT_PATH' }>['payload']): SubReducerResult {
    const { textElementId, pathElementId } = payload;
    const textElementIndex = state.elements.findIndex(el => el.id === textElementId && el.type === 'text');
    if (textElementIndex === -1) return { updatedStateSlice: {} };

    const updatedElements = [...state.elements];
    const textElementToUpdate = updatedElements[textElementIndex] as TextElementProps;
    
    const propsToUpdate: Partial<TextElementProps> = { 
        textPathId: pathElementId,
        textPathStartOffset: DEFAULT_TEXT_PATH_START_OFFSET, // Reset offset when assigning new path
    };
    
    // When assigning a path, reset the text's own transform as it will now be controlled by the path.
    if (pathElementId) {
        propsToUpdate.x = 0;
        propsToUpdate.y = 0;
        propsToUpdate.rotation = DEFAULT_ROTATION;
        propsToUpdate.scale = DEFAULT_SCALE;
        propsToUpdate.skewX = DEFAULT_SKEW_X;
        propsToUpdate.skewY = DEFAULT_SKEW_Y;
        propsToUpdate.motionPathId = null; // Text on path and motion path are mutually exclusive.
    }

    updatedElements[textElementIndex] = {
        ...textElementToUpdate,
        ...propsToUpdate,
    } as TextElementProps;

    const textElName = updatedElements[textElementIndex].name || textElementId;
    const pathElName = pathElementId ? (state.elements.find(el => el.id === pathElementId)?.name || pathElementId) : 'None';
    
    return {
        updatedStateSlice: { elements: updatedElements, textOnPathSelectionTargetElementId: null },
        actionDescriptionForHistory: pathElementId 
            ? `Assign Path '${pathElName}' to Text '${textElName}'`
            : `Clear Path from Text '${textElName}'`,
        newSvgCode: generateSvgStringForEditor(updatedElements, state.artboard)
    };
}
export function handleStartGradientPreview(state: AppState, payload: Extract<AppAction, { type: 'START_GRADIENT_PREVIEW' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { previewTarget: { elementId: payload.elementId, property: payload.property }, previewGradient: payload.gradient, previewSolidColor: null } };
}
export function handleStopGradientPreview(state: AppState): SubReducerResult {
    return { updatedStateSlice: { previewTarget: null, previewGradient: null } };
}
export function handleStartSolidColorPreview(state: AppState, payload: Extract<AppAction, { type: 'START_SOLID_COLOR_PREVIEW' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { previewTarget: { elementId: payload.elementId, property: payload.property }, previewSolidColor: payload.color, previewGradient: null } };
}
export function handleStopSolidColorPreview(state: AppState): SubReducerResult {
    return { updatedStateSlice: { previewTarget: null, previewSolidColor: null } };
}
export function handleShowContextMenu(state: AppState, payload: Extract<AppAction, { type: 'SHOW_CONTEXT_MENU' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { contextMenuVisible: true, contextMenuPosition: payload.position, contextMenuTargetId: payload.targetId } };
}
export function handleHideContextMenu(state: AppState): SubReducerResult {
    return { updatedStateSlice: { contextMenuVisible: false, contextMenuPosition: null, contextMenuTargetId: null } };
}
export function handleToggleGroupExpansion(state: AppState, payload: Extract<AppAction, { type: 'TOGGLE_GROUP_EXPANSION' }>['payload']): SubReducerResult {
    const newExpandedGroupIds = new Set(state.expandedGroupIds);
    if (newExpandedGroupIds.has(payload)) newExpandedGroupIds.delete(payload);
    else newExpandedGroupIds.add(payload);
    return { updatedStateSlice: { expandedGroupIds: newExpandedGroupIds } };
}
export function handleExpandGroups(state: AppState, payload: Extract<AppAction, { type: 'EXPAND_GROUPS' }>['payload']): SubReducerResult {
    const newExpandedGroupIds = new Set(state.expandedGroupIds);
    payload.forEach(groupId => newExpandedGroupIds.add(groupId));
    return { updatedStateSlice: { expandedGroupIds: newExpandedGroupIds } };
}
export function handleToggleHistoryPanel(state: AppState): SubReducerResult {
    return { updatedStateSlice: { isHistoryPanelOpen: !state.isHistoryPanelOpen } };
}
export function handleSetTimelineContextItem(state: AppState, payload: Extract<AppAction, { type: 'SET_TIMELINE_CONTEXT_ITEM' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { selectedTimelineContextItem: payload } };
}
export function handleSetTimelineViewMode(state: AppState, payload: TimelineViewMode): SubReducerResult { // Added
    return { updatedStateSlice: { timelineViewMode: payload }, skipHistoryRecording: true };
}

export function handleSetCurrentTool(state: AppState, payload: CurrentTool): SubReducerResult {
    let updatedSlice: Partial<AppState> = { currentTool: payload };

    // If switching to Bezier tool
    if (payload === 'bezierPath') {
        // Reset drawing/extending states unless actively working on the selected path
        const selectedElIsCurrentDrawingOrExtending = 
            state.currentBezierPathData && 
            state.selectedElementId === state.currentBezierPathData.id &&
            (state.isDrawingBezierPath || state.isExtendingPathInfo);

        if (!selectedElIsCurrentDrawingOrExtending) {
            updatedSlice.isDrawingBezierPath = false;
            updatedSlice.currentBezierPathData = null; 
            updatedSlice.isExtendingPathInfo = null;
        }
        
        const selectedEl = state.elements.find(el => el.id === state.selectedElementId);
        if (selectedEl && selectedEl.type === 'path' && (selectedEl as PathElementProps).structuredPoints) {
            const pathPoints = (selectedEl as PathElementProps).structuredPoints!;
            if (!state.selectedBezierPointId || !pathPoints.find(p => p.id === state.selectedBezierPointId)) {
                 updatedSlice.selectedBezierPointId = pathPoints.length > 0 ? pathPoints[0].id : null;
            }
             updatedSlice.activeControlPoint = null;
        } else { 
            updatedSlice.selectedBezierPointId = null;
            updatedSlice.activeControlPoint = null;
        }
        // If text editor was active, hide it (handled by App.tsx's handleSelectElement if selection changes,
        // but this is a direct tool switch)
        if (state.onCanvasTextEditor?.isVisible) {
            updatedSlice.onCanvasTextEditor = null;
        }

    } else { // Switching AWAY from Bezier tool
        if (state.isDrawingBezierPath || state.isExtendingPathInfo) {
            updatedSlice.isDrawingBezierPath = false;
            updatedSlice.currentBezierPathData = null;
            updatedSlice.isExtendingPathInfo = null;
        }
        updatedSlice.activeControlPoint = null;
        updatedSlice.selectedBezierPointId = null;

        // If switching away from Text tool and editor is visible, it should be committed.
        // This is primarily handled by App.tsx's handleSelectElement or text editor's blur/commit.
        // However, a direct tool switch should also hide it if not already handled.
        if (state.currentTool === 'text' && state.onCanvasTextEditor?.isVisible && payload !== 'text') {
             updatedSlice.onCanvasTextEditor = null; // Hide editor on tool switch away from text
        }
    }

    // General cleanup for other tools
    if (payload !== 'select') {
        updatedSlice.motionPathSelectionTargetElementId = null;
        updatedSlice.textOnPathSelectionTargetElementId = null;
    }
    if (payload !== 'pencil' && state.isDrawing) {
        updatedSlice.isDrawing = false; 
        updatedSlice.currentDrawingPath = null;
    }
    if (payload !== 'text' && state.newlyAddedTextElementId) {
        updatedSlice.newlyAddedTextElementId = null; // Clear flag if switching away from text before edit starts
    }


    return { updatedStateSlice: updatedSlice };
}


export function handleSetKeyModifierState(state: AppState, payload: Extract<AppAction, { type: 'SET_KEY_MODIFIER_STATE' }>['payload']): SubReducerResult {
    const { key, pressed } = payload;
    if (key === 'Control') return { updatedStateSlice: { isCtrlPressed: pressed } };
    if (key === 'Alt') return { updatedStateSlice: { isAltPressed: pressed } };
    if (key === 'Shift') return { updatedStateSlice: { isShiftPressed: pressed } };
    return { updatedStateSlice: {} };
}


export function handleSetRenderMode(state: AppState, payload: Extract<AppAction, { type: 'SET_RENDER_MODE' }>['payload']): SubReducerResult {
    return { updatedStateSlice: { renderMode: payload } };
}

// Pencil tool actions
export function handleStartDrawingPath(state: AppState, payload: Extract<AppAction, { type: 'START_DRAWING_PATH' }>['payload']): SubReducerResult {
    const { x: artboardRelX, y: artboardRelY } = payload;
     const newPath: PathElementProps = {
        id: `temp-pencil-${Date.now()}`, artboardId: state.artboard.id, type: 'path',
        x: 0, y: 0, d: `M${artboardRelX.toFixed(1)},${artboardRelY.toFixed(1)}`,
        fill: 'none', stroke: DEFAULT_ELEMENT_STROKE, strokeWidth: DEFAULT_STROKE_WIDTH, opacity: DEFAULT_OPACITY,
        rotation: 0, scale: 1, skewX: DEFAULT_SKEW_X, skewY: DEFAULT_SKEW_Y,
        name: "Pencil Drawing", parentId: null, order: 0,
        isRendered: true, motionPathId: null, alignToPath: false,
        motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END, motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
    };
    return { updatedStateSlice: { isDrawing: true, currentDrawingPath: newPath, selectedElementId: null, isExtendingPathInfo: null, currentTool: 'pencil', onCanvasTextEditor: null, motionPathSelectionTargetElementId: null, textOnPathSelectionTargetElementId: null }, skipHistoryRecording: true };
}

export function handleUpdateDrawingPath(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_DRAWING_PATH' }>['payload']): SubReducerResult {
    if (!state.isDrawing || !state.currentDrawingPath) return { updatedStateSlice: {}, skipHistoryRecording: true };
    const { x: artboardRelX, y: artboardRelY } = payload;
    const updatedPath = { ...state.currentDrawingPath, d: `${state.currentDrawingPath.d} L${artboardRelX.toFixed(1)},${artboardRelY.toFixed(1)}` };
    return { updatedStateSlice: { currentDrawingPath: updatedPath }, skipHistoryRecording: true };
}

// Bezier UI specific actions
export function handleSelectBezierPoint(state: AppState, payload: Extract<AppAction, { type: 'SELECT_BEZIER_POINT' }>['payload']): SubReducerResult {
  return { updatedStateSlice: { selectedBezierPointId: payload.pointId, activeControlPoint: null } };
}

export function handleSetActiveControlPoint(state: AppState, payload: Extract<AppAction, { type: 'SET_ACTIVE_CONTROL_POINT' }>['payload']): SubReducerResult {
  return { updatedStateSlice: { activeControlPoint: payload } };
}

export function handleSetKeyframeShapePreview(state: AppState, payload: Extract<AppAction, { type: 'SET_KEYFRAME_SHAPE_PREVIEW' }>['payload']): SubReducerResult {
  return { updatedStateSlice: { editingKeyframeShapePreview: payload } };
}

// On-Canvas Text Editor Actions
export function handleShowOnCanvasTextEditor(state: AppState, payload: OnCanvasTextEditorState): SubReducerResult {
    const newOnCanvasTextEditorState = { ...payload, isVisible: true };
    return { 
        updatedStateSlice: { 
            onCanvasTextEditor: newOnCanvasTextEditorState,
            // Ensure the tool is text when editor is shown, especially if activated by dbl click
            currentTool: 'text' 
        }, 
        skipHistoryRecording: true 
    };
}
export function handleHideOnCanvasTextEditor(state: AppState): SubReducerResult {
    return { updatedStateSlice: { onCanvasTextEditor: null }, skipHistoryRecording: true };
}
export function handleUpdateOnCanvasTextEditorValue(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_ON_CANVAS_TEXT_EDITOR_VALUE' }>['payload']): SubReducerResult {
    if (!state.onCanvasTextEditor) {
        return { updatedStateSlice: {}, skipHistoryRecording: true };
    }
    return { updatedStateSlice: { onCanvasTextEditor: { ...state.onCanvasTextEditor, text: payload } }, skipHistoryRecording: true };
}

export function handleClearNewlyAddedTextFlag(state: AppState): SubReducerResult {
    return { updatedStateSlice: { newlyAddedTextElementId: null }, skipHistoryRecording: true };
}

export function handleShowConfirmationDialog(state: AppState, payload: Extract<AppAction, { type: 'SHOW_CONFIRMATION_DIALOG' }>['payload']): SubReducerResult {
  return {
    updatedStateSlice: {
      confirmationDialog: {
        isVisible: true,
        message: payload.message,
        confirmButtonText: payload.confirmButtonText || 'Confirm',
        onConfirm: payload.onConfirm,
      }
    },
    skipHistoryRecording: true,
  };
}

export function handleHideConfirmationDialog(state: AppState): SubReducerResult {
  return { updatedStateSlice: { confirmationDialog: null }, skipHistoryRecording: true };
}

export function handleShowNewProjectDialog(state: AppState): SubReducerResult {
  return { updatedStateSlice: { newProjectDialogVisible: true }, skipHistoryRecording: true };
}

export function handleHideNewProjectDialog(state: AppState): SubReducerResult {
  return { updatedStateSlice: { newProjectDialogVisible: false }, skipHistoryRecording: true };
}

export function handleShowNotification(state: AppState, payload: NotificationState): SubReducerResult {
    return { updatedStateSlice: { notification: payload }, skipHistoryRecording: true };
}

export function handleHideNotification(state: AppState): SubReducerResult {
    return { updatedStateSlice: { notification: null }, skipHistoryRecording: true };
}

export function handleSetActiveTab(state: AppState, payload: ActiveLeftTab): SubReducerResult {
    return { updatedStateSlice: { activeLeftTab: payload }, skipHistoryRecording: true };
}
