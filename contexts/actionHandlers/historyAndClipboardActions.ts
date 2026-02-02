

import { AppState, AppAction, SVGElementData, TimelineKeyframeClipboardData, Keyframe, AnimatableProperty, SubReducerResult } from '../../types';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';
import { generateUniqueId } from '../appContextUtils';
import { PASTE_OFFSET, DEFAULT_KEYFRAME_EASING } from '../../constants';

// Helper to get all descendants of a group element, including the group itself
const getDescendantsAndSelf = (elementId: string, allElements: SVGElementData[]): SVGElementData[] => {
  const results: SVGElementData[] = [];
  const element = allElements.find(el => el.id === elementId);
  if (!element) return results;
  results.push(JSON.parse(JSON.stringify(element))); // Deep copy
  if (element.type === 'group') {
    const children = allElements.filter(el => el.parentId === elementId);
    children.forEach(child => results.push(...getDescendantsAndSelf(child.id, allElements)));
  }
  return results;
};

export function handleUndo(state: AppState): SubReducerResult {
    if (state.historyIndex > 0) {
        const newHistoryIndex = state.historyIndex - 1;
        const previousStateSnapshot = state.history[newHistoryIndex];
        const newSvgCode = generateSvgStringForEditor(previousStateSnapshot.elements, previousStateSnapshot.artboard);
        return {
            updatedStateSlice: {
                artboard: JSON.parse(JSON.stringify(previousStateSnapshot.artboard)),
                elements: JSON.parse(JSON.stringify(previousStateSnapshot.elements)),
                animation: JSON.parse(JSON.stringify(previousStateSnapshot.animation)),
                selectedElementId: previousStateSnapshot.selectedElementId,
                currentTime: previousStateSnapshot.currentTime,
                historyIndex: newHistoryIndex,
                svgCode: newSvgCode, svgCodeError: null,
                activeControlPoint: null, selectedBezierPointId: null,
                motionPathSelectionTargetElementId: null, isDrawing: false, isDrawingBezierPath: false,
                currentDrawingPath: null, currentBezierPathData: null, isExtendingPathInfo: null,
            },
            newSvgCode,
            skipHistoryRecording: true
        };
    }
    return { updatedStateSlice: {}, skipHistoryRecording: true };
}

export function handleRedo(state: AppState): SubReducerResult {
    if (state.historyIndex < state.history.length - 1) {
        const newHistoryIndex = state.historyIndex + 1;
        const nextStateSnapshot = state.history[newHistoryIndex];
        const newSvgCode = generateSvgStringForEditor(nextStateSnapshot.elements, nextStateSnapshot.artboard);
        return {
            updatedStateSlice: {
                artboard: JSON.parse(JSON.stringify(nextStateSnapshot.artboard)),
                elements: JSON.parse(JSON.stringify(nextStateSnapshot.elements)),
                animation: JSON.parse(JSON.stringify(nextStateSnapshot.animation)),
                selectedElementId: nextStateSnapshot.selectedElementId,
                currentTime: nextStateSnapshot.currentTime,
                historyIndex: newHistoryIndex,
                svgCode: newSvgCode, svgCodeError: null,
                activeControlPoint: null, selectedBezierPointId: null,
                motionPathSelectionTargetElementId: null, isDrawing: false, isDrawingBezierPath: false,
                currentDrawingPath: null, currentBezierPathData: null, isExtendingPathInfo: null,
            },
            newSvgCode,
            skipHistoryRecording: true
        };
    }
    return { updatedStateSlice: {}, skipHistoryRecording: true };
}

export function handleGoToHistoryState(state: AppState, payload: Extract<AppAction, { type: 'GOTO_HISTORY_STATE' }>['payload']): SubReducerResult {
    const newHistoryIndex = payload;
    if (newHistoryIndex >= 0 && newHistoryIndex < state.history.length) {
        const targetStateSnapshot = state.history[newHistoryIndex];
        const newSvgCode = generateSvgStringForEditor(targetStateSnapshot.elements, targetStateSnapshot.artboard);
        return {
            updatedStateSlice: {
                artboard: JSON.parse(JSON.stringify(targetStateSnapshot.artboard)),
                elements: JSON.parse(JSON.stringify(targetStateSnapshot.elements)),
                animation: JSON.parse(JSON.stringify(targetStateSnapshot.animation)),
                selectedElementId: targetStateSnapshot.selectedElementId,
                currentTime: targetStateSnapshot.currentTime,
                historyIndex: newHistoryIndex,
                svgCode: newSvgCode, svgCodeError: null, isHistoryPanelOpen: false,
                activeControlPoint: null, selectedBezierPointId: null,
                motionPathSelectionTargetElementId: null, isDrawing: false, isDrawingBezierPath: false,
                currentDrawingPath: null, currentBezierPathData: null, isExtendingPathInfo: null,
            },
            newSvgCode,
            skipHistoryRecording: true
        };
    }
    return { updatedStateSlice: {}, skipHistoryRecording: true };
}

export function handleCopySelectedElement(state: AppState): SubReducerResult {
    if (state.selectedElementId && state.selectedElementId !== state.artboard.id) {
        const selectedElementsToCopy = getDescendantsAndSelf(state.selectedElementId, state.elements);
        return { updatedStateSlice: { clipboard: selectedElementsToCopy }, skipHistoryRecording: true };
    }
    return { updatedStateSlice: {}, skipHistoryRecording: true };
}

export function handlePasteFromClipboard(state: AppState): SubReducerResult {
    if (!state.clipboard || state.clipboard.length === 0) return { updatedStateSlice: {}, skipHistoryRecording: true };
    
    const idMap = new Map<string, string>();
    state.clipboard.forEach(originalElement => {
        const newId = generateUniqueId(originalElement.type);
        idMap.set(originalElement.id, newId);
    });

    const rootPastedElementId = state.clipboard[0].id; 
    const newRootPastedId = idMap.get(rootPastedElementId)!;
    
    let targetParentIdForPaste: string | null = null;
    const currentSelected = state.elements.find(el => el.id === state.selectedElementId);
    if (state.selectedElementId === state.artboard.id) targetParentIdForPaste = null;
    else if (currentSelected && currentSelected.type === 'group') targetParentIdForPaste = currentSelected.id;
    else if (currentSelected) targetParentIdForPaste = currentSelected.parentId;
    
    const newElementsFromClipboard = state.clipboard.map(originalElement => {
        const newId = idMap.get(originalElement.id)!;
        const newParentIdForThisInstance = originalElement.parentId ? idMap.get(originalElement.parentId) || null : null;
        const newElementData = {
            ...JSON.parse(JSON.stringify(originalElement)), id: newId,
            parentId: originalElement.id === rootPastedElementId ? targetParentIdForPaste : newParentIdForThisInstance,
            name: `${originalElement.name || 'Pasted'} Copy`,
            x: (originalElement.x ?? 0) + (originalElement.id === rootPastedElementId ? PASTE_OFFSET : 0),
            y: (originalElement.y ?? 0) + (originalElement.id === rootPastedElementId ? PASTE_OFFSET : 0),
        };
        if (originalElement.motionPathId && idMap.has(originalElement.motionPathId)) {
            newElementData.motionPathId = idMap.get(originalElement.motionPathId);
        } else if (originalElement.motionPathId) {
            const originalPathExistsInCurrentDoc = state.elements.find(el => el.id === originalElement.motionPathId);
            newElementData.motionPathId = originalPathExistsInCurrentDoc ? originalElement.motionPathId : null;
        }
        return newElementData;
    });

    const combinedElements = [...state.elements, ...newElementsFromClipboard];
    
    const updatedStateSlice: Partial<AppState> = {
        elements: combinedElements, 
        selectedElementId: newRootPastedId
    };
    if (targetParentIdForPaste) {
        const newExpandedGroupIds = new Set(state.expandedGroupIds);
        newExpandedGroupIds.add(targetParentIdForPaste);
        updatedStateSlice.expandedGroupIds = newExpandedGroupIds;
    }

    return {
        updatedStateSlice,
        actionDescriptionForHistory: `Paste ${state.clipboard[0].name || 'Element'}`,
        newSvgCode: generateSvgStringForEditor(combinedElements, state.artboard) 
    };
}

export function handleCopyTimelineKeyframe(state: AppState): SubReducerResult {
    if (state.selectedTimelineContextItem?.type === 'keyframe') {
        const { elementId, property, time } = state.selectedTimelineContextItem;
        const track = state.animation.tracks.find(t => t.elementId === elementId && t.property === property);
        const keyframe = track?.keyframes.find(kf => kf.time === time);
        if (keyframe) {
            const clipboardData: TimelineKeyframeClipboardData = {
                elementId,
                property,
                value: JSON.parse(JSON.stringify(keyframe.value)), // Deep copy value
                easing: keyframe.easing,
                freeze: keyframe.freeze,
            };
            return { updatedStateSlice: { timelineKeyframeClipboard: clipboardData }, skipHistoryRecording: true };
        }
    }
    return { updatedStateSlice: {}, skipHistoryRecording: true };
}

export function handlePasteTimelineKeyframe(state: AppState): SubReducerResult {
    if (!state.timelineKeyframeClipboard) return { updatedStateSlice: {}, skipHistoryRecording: true };

    const { elementId, property, value, easing, freeze } = state.timelineKeyframeClipboard;
    const targetTime = state.currentTime;

    const targetElement = state.elements.find(el => el.id === elementId);
    if (!targetElement) {
        console.warn(`Target element ${elementId} for keyframe paste not found.`);
        return { updatedStateSlice: {}, skipHistoryRecording: true };
    }

    let newTracks = [...state.animation.tracks];
    const trackIndex = newTracks.findIndex(t => t.elementId === elementId && t.property === property);

    const newKeyframe: Keyframe = {
        time: targetTime,
        value: JSON.parse(JSON.stringify(value)), // Deep copy value
        easing: easing || DEFAULT_KEYFRAME_EASING,
        freeze: freeze || false,
    };

    if (trackIndex > -1) {
        let keyframes = [...newTracks[trackIndex].keyframes];
        const existingKeyframeIndex = keyframes.findIndex(kf => Math.abs(kf.time - targetTime) < 0.001);
        if (existingKeyframeIndex > -1) {
            keyframes[existingKeyframeIndex] = newKeyframe; // Overwrite
        } else {
            keyframes.push(newKeyframe);
        }
        keyframes.sort((a, b) => a.time - b.time);
        newTracks[trackIndex] = { ...newTracks[trackIndex], keyframes };
    } else {
        newTracks.push({ elementId, property, keyframes: [newKeyframe] });
    }
    const elName = targetElement.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Paste Keyframe for ${property} on ${elName} at ${targetTime.toFixed(1)}s`,
        skipHistoryRecording: false // This is a modification, so record it
    };
}
