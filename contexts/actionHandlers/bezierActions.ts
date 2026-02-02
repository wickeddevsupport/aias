

import { AppState, AppAction, PathElementProps, BezierPoint, AnimatableProperty, AccumulatedTransform, SVGElementData, Keyframe, RectElementProps, CircleElementProps, AnimationTrack, ParsedDStringResult, SubReducerResult } from '../../types';
import { generateUniqueId, getNextOrderUtil } from '../appContextUtils';
import { buildPathDFromStructuredPoints, rectToPathStructuredPoints, circleToPathStructuredPoints, generatePointId, parseDStringToStructuredPoints } from '../../utils/pathUtils';
import { DEFAULT_MOTION_PATH_START, DEFAULT_MOTION_PATH_END, DEFAULT_MOTION_PATH_OFFSET_X, DEFAULT_MOTION_PATH_OFFSET_Y, DEFAULT_PATH_FILL, DEFAULT_ELEMENT_STROKE, DEFAULT_STROKE_WIDTH, DEFAULT_OPACITY, DEFAULT_ROTATION, DEFAULT_SCALE, DEFAULT_KEYFRAME_EASING, DEFAULT_SKEW_X, DEFAULT_SKEW_Y } from '../../constants';
import { getAccumulatedTransform } from '../../utils/transformUtils';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';


const autoKeyframePathD = (
    state: AppState,
    pathId: string,
    updatedStructuredPoints: BezierPoint[],
    existingAnimationTracks: AnimationTrack[]
): AnimationTrack[] => {
    if (state.selectedElementId === pathId && !state.isPlaying) {
        const property: AnimatableProperty = 'd';
        const time = state.currentTime;
        const value: BezierPoint[] = JSON.parse(JSON.stringify(updatedStructuredPoints)); 
        
        let newAnimationTracks = [...existingAnimationTracks];
        const trackIndexForKeyframe = newAnimationTracks.findIndex(t => t.elementId === pathId && t.property === property);
        
        if (trackIndexForKeyframe > -1) {
            const existingTrack = { ...newAnimationTracks[trackIndexForKeyframe], keyframes: [...newAnimationTracks[trackIndexForKeyframe].keyframes] };
            const existingKeyframeIndex = existingTrack.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.001);
            if (existingKeyframeIndex > -1) {
                existingTrack.keyframes[existingKeyframeIndex] = { ...existingTrack.keyframes[existingKeyframeIndex], value };
            } else {
                existingTrack.keyframes.push({ time, value, easing: DEFAULT_KEYFRAME_EASING, freeze: false });
            }
            existingTrack.keyframes.sort((a, b) => a.time - b.time);
            newAnimationTracks[trackIndexForKeyframe] = existingTrack;
        } else {
            newAnimationTracks.push({ elementId: pathId, property, keyframes: [{ time, value, easing: DEFAULT_KEYFRAME_EASING, freeze: false }] });
        }
        return newAnimationTracks;
    }
    return existingAnimationTracks;
};


export function handleStartDrawingBezierPath(state: AppState, payload: Extract<AppAction, { type: 'START_DRAWING_BEZIER_PATH' }>['payload']): SubReducerResult {
    const { x, y } = payload; 
    const newPathId = generateUniqueId('path');
    const firstPoint: BezierPoint = { id: generatePointId(), x, y, h1x:x, h1y:y, h2x:x, h2y:y, isSmooth: false, isSelected: true }; 
    const newPath: PathElementProps = {
        id: newPathId, artboardId: state.artboard.id, type: 'path',
        x: 0, y: 0, 
        d: `M${x.toFixed(1)},${y.toFixed(1)}`, 
        structuredPoints: [firstPoint], 
        closedByJoining: false,
        fill: 'none', stroke: DEFAULT_PATH_FILL, strokeWidth: DEFAULT_STROKE_WIDTH, opacity: DEFAULT_OPACITY,
        rotation: DEFAULT_ROTATION, scale: DEFAULT_SCALE, skewX: DEFAULT_SKEW_X, skewY: DEFAULT_SKEW_Y,
        name: `Bezier Path ${state.elements.filter(e => e.type === 'path').length + 1}`,
        parentId: null, order: getNextOrderUtil(state.elements, null, state.artboard.id),
        isRendered: true,
        motionPathId: null, alignToPath: false,
        motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
    };
    return {
        updatedStateSlice: { isDrawingBezierPath: true, currentBezierPathData: newPath, selectedElementId: newPath.id, selectedBezierPointId: firstPoint.id, currentTool: 'bezierPath', isExtendingPathInfo: null },
        skipHistoryRecording: true 
    };
}

export function handleStartExtendingBezierPath(state: AppState, payload: Extract<AppAction, { type: 'START_EXTENDING_BEZIER_PATH' }>['payload']): SubReducerResult {
    const { pathId, pointIdToExtendFrom } = payload; // Removed initialNewPointX, initialNewPointY
    const originalPath = state.elements.find(el => el.id === pathId && el.type === 'path') as PathElementProps | undefined;

    if (!originalPath || !originalPath.structuredPoints || originalPath.structuredPoints.length === 0) {
        return { updatedStateSlice: {} };
    }

    const extendingFromStartActual = originalPath.structuredPoints[0].id === pointIdToExtendFrom;
    
    const pathDataForExtension: PathElementProps = {
        ...originalPath,
        structuredPoints: JSON.parse(JSON.stringify(originalPath.structuredPoints)), // Deep copy points
    };
    
    return {
        updatedStateSlice: {
            isDrawingBezierPath: true, 
            currentBezierPathData: pathDataForExtension, 
            isExtendingPathInfo: { originalPathId: pathId, pointIdToExtendFrom, extendingFromStart: extendingFromStartActual },
            selectedElementId: pathId, 
            selectedBezierPointId: pointIdToExtendFrom, 
            activeControlPoint: null,
            currentTool: 'bezierPath',
        },
        skipHistoryRecording: true 
    };
}


export function handleAddBezierPathPoint(state: AppState, payload: Extract<AppAction, { type: 'ADD_BEZIER_PATH_POINT' }>['payload']): SubReducerResult {
    if (!state.isDrawingBezierPath || !state.currentBezierPathData) return { updatedStateSlice: {}, skipHistoryRecording: true };
    const { x: artboardRelX, y: artboardRelY, dragPull } = payload;
    
    let pathBeingModified = { ...state.currentBezierPathData };
    let updatedPoints = pathBeingModified.structuredPoints ? [...pathBeingModified.structuredPoints] : [];

    let localX = artboardRelX - (pathBeingModified.x || 0);
    let localY = artboardRelY - (pathBeingModified.y || 0);
    const scale = pathBeingModified.scale || 1; const rotation = pathBeingModified.rotation || 0;
    if (scale !== 0 && scale !== 1) { localX /= scale; localY /= scale; }
    if (rotation !== 0) {
        const angleRad = -rotation * (Math.PI / 180); const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
        const rotatedX = localX * cosA - localY * sinA; const rotatedY = localX * sinA + localY * cosA;
        localX = rotatedX; localY = rotatedY;
    }
    
    const newPoint: BezierPoint = { id: generatePointId(), x: localX, y: localY, h1x: localX, h1y: localY, h2x: localX, h2y: localY, isSmooth: !!dragPull, isSelected: true };
    let newIsExtendingPathInfo = state.isExtendingPathInfo;

    if (state.isExtendingPathInfo) {
        const originalPath = state.elements.find(el => el.id === state.isExtendingPathInfo!.originalPathId) as PathElementProps | undefined;
        const originalLength = originalPath?.structuredPoints?.length || 0;

        if (state.isExtendingPathInfo.extendingFromStart && updatedPoints.length === originalLength) {
            updatedPoints.unshift(newPoint);
            newIsExtendingPathInfo = { 
                ...state.isExtendingPathInfo, 
                pointIdToExtendFrom: newPoint.id,
                extendingFromStart: false 
            };
        } else {
            updatedPoints.push(newPoint);
            if (newIsExtendingPathInfo) {
                newIsExtendingPathInfo = { 
                    ...newIsExtendingPathInfo, 
                    pointIdToExtendFrom: newPoint.id 
                };
            }
        }
    } else { 
        updatedPoints.push(newPoint);
    }
    
    if (dragPull && updatedPoints.length >= 1) {
        const newPointIndex = updatedPoints.findIndex(p => p.id === newPoint.id);
        let connectionPointForHandles: BezierPoint | undefined;

        if (state.isExtendingPathInfo) {
            // The point we are connecting *to* is the one we *originally* clicked to start extending from,
            // or the last point added in the current extension chain.
            connectionPointForHandles = updatedPoints.find(p => p.id === state.isExtendingPathInfo!.pointIdToExtendFrom && p.id !== newPoint.id);
        } else if (newPointIndex > 0) { 
            connectionPointForHandles = updatedPoints[newPointIndex - 1];
        }
        
        if (connectionPointForHandles) {
            const dx = newPoint.x - connectionPointForHandles.x;
            const dy = newPoint.y - connectionPointForHandles.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const handleLength = Math.max(10, dist * 0.3);
                newPoint.h1x = newPoint.x - (dx / dist) * handleLength; // h1 towards connection point
                newPoint.h1y = newPoint.y - (dy / dist) * handleLength;
                newPoint.h2x = newPoint.x + (dx / dist) * handleLength; // h2 outwards
                newPoint.h2y = newPoint.y + (dy / dist) * handleLength;
                updatedPoints[newPointIndex] = { ...newPoint };
            }
        }
    }

    const updatedPathData = { ...pathBeingModified, structuredPoints: updatedPoints, d: buildPathDFromStructuredPoints(updatedPoints, pathBeingModified.closedByJoining) };
    
    return { 
        updatedStateSlice: { 
            currentBezierPathData: updatedPathData, 
            selectedBezierPointId: newPoint.id,
            isExtendingPathInfo: newIsExtendingPathInfo 
        }, 
        skipHistoryRecording: true 
    };
}

export function handleFinishDrawingBezierPath(state: AppState, payload: Extract<AppAction, { type: 'FINISH_DRAWING_BEZIER_PATH' }>['payload']): SubReducerResult {
    if (!state.isDrawingBezierPath || !state.currentBezierPathData) return { updatedStateSlice: { isDrawingBezierPath: false, currentBezierPathData: null, isExtendingPathInfo: null } };
    const { closedByJoining, isDoubleClickEvent } = payload;
    let finalPathDataFromDrawing = { ...state.currentBezierPathData };
    let pointsToFinalize = finalPathDataFromDrawing.structuredPoints ? [...finalPathDataFromDrawing.structuredPoints] : [];

    if (pointsToFinalize.length === 0) { 
        return { updatedStateSlice: { isDrawingBezierPath: false, currentBezierPathData: null, selectedBezierPointId: null, activeControlPoint: null, currentTool: 'select', isExtendingPathInfo: null } };
    }
    // If only one point was "drawn" (e.g. user clicks once then hits Enter/Escape, or for an extension that only adds one point then finishes)
    // and it wasn't a double click event to truly create a single point path, and not a closing operation, then discard.
    // Exception: if extending, even a single new point is valid.
    if (pointsToFinalize.length === 1 && !isDoubleClickEvent && !closedByJoining && !state.isExtendingPathInfo) {
        return { updatedStateSlice: { isDrawingBezierPath: false, currentBezierPathData: null, selectedBezierPointId: null, activeControlPoint: null, currentTool: 'select', selectedElementId: state.artboard.id, isExtendingPathInfo: null } };
    }
    
    finalPathDataFromDrawing.closedByJoining = closedByJoining && pointsToFinalize.length > 1;
    finalPathDataFromDrawing.d = buildPathDFromStructuredPoints(pointsToFinalize, finalPathDataFromDrawing.closedByJoining);
    if (finalPathDataFromDrawing.closedByJoining && finalPathDataFromDrawing.fill === 'none') finalPathDataFromDrawing.fill = DEFAULT_PATH_FILL;

    let finalElements: SVGElementData[]; let finalSelectedElementId = state.selectedElementId;
    let actionDescriptionForHistory = ''; let finalAnimationTracks = [...state.animation.tracks];

    if (state.isExtendingPathInfo) {
        const originalPathId = state.isExtendingPathInfo.originalPathId;
        const pathIndex = state.elements.findIndex(el => el.id === originalPathId);
        if (pathIndex > -1) {
            finalElements = [...state.elements];
            const existingPathForUpdate = finalElements[pathIndex] as PathElementProps;
            finalElements[pathIndex] = { ...existingPathForUpdate, structuredPoints: finalPathDataFromDrawing.structuredPoints, d: finalPathDataFromDrawing.d, closedByJoining: finalPathDataFromDrawing.closedByJoining, fill: finalPathDataFromDrawing.fill };
            finalSelectedElementId = originalPathId;
            actionDescriptionForHistory = `Extend Path: ${finalElements[pathIndex].name || originalPathId}`;
            
            finalAnimationTracks = autoKeyframePathD(state, originalPathId, finalPathDataFromDrawing.structuredPoints!, finalAnimationTracks);
            if (JSON.stringify(finalAnimationTracks) !== JSON.stringify(state.animation.tracks)) { 
                 actionDescriptionForHistory = `Extend Path & Keyframe '${finalElements[pathIndex].name || originalPathId}'`;
            }

        } else { 
            finalElements = [...state.elements, finalPathDataFromDrawing]; finalSelectedElementId = finalPathDataFromDrawing.id;
            actionDescriptionForHistory = `Finish New Bezier Path: ${finalPathDataFromDrawing.name}`;
        }
    } else {
        finalElements = [...state.elements, finalPathDataFromDrawing]; finalSelectedElementId = finalPathDataFromDrawing.id;
        actionDescriptionForHistory = `Finish New Bezier Path: ${finalPathDataFromDrawing.name}`;
    }
    
    const updatedStateSlice: Partial<AppState> = {
        elements: finalElements, animation: { ...state.animation, tracks: finalAnimationTracks },
        isDrawingBezierPath: false, currentBezierPathData: null, isExtendingPathInfo: null,
    };
    if (isDoubleClickEvent || closedByJoining) { 
        updatedStateSlice.currentTool = 'select'; updatedStateSlice.selectedBezierPointId = null; updatedStateSlice.activeControlPoint = null; updatedStateSlice.selectedElementId = finalSelectedElementId;
    } else { 
        updatedStateSlice.currentTool = 'select'; 
        updatedStateSlice.selectedElementId = finalSelectedElementId; 
        updatedStateSlice.selectedBezierPointId = pointsToFinalize.length > 0 ? pointsToFinalize[pointsToFinalize.length -1].id : null; 
        updatedStateSlice.activeControlPoint = null;
    }
    return {
        updatedStateSlice, actionDescriptionForHistory,
        newSvgCode: generateSvgStringForEditor(finalElements, state.artboard)
    };
}

export function handleCancelDrawingBezierPath(state: AppState): SubReducerResult {
    return {
        updatedStateSlice: {
            isDrawingBezierPath: false, currentBezierPathData: null, selectedBezierPointId: null, activeControlPoint: null,
            selectedElementId: state.isExtendingPathInfo ? state.isExtendingPathInfo.originalPathId : state.artboard.id,
            currentTool: state.isExtendingPathInfo ? 'bezierPath' : 'select', isExtendingPathInfo: null
        },
        skipHistoryRecording: true
    };
}

export function handleAddBezierPointToSegment(state: AppState, payload: Extract<AppAction, { type: 'ADD_BEZIER_POINT_TO_SEGMENT' }>['payload']): SubReducerResult {
    const { pathId, newPoint, insertAtIndex } = payload;
    const targetPathIndex = state.elements.findIndex(el => el.id === pathId && el.type === 'path');
    if (targetPathIndex === -1) return { updatedStateSlice: {} };
    
    const targetPath = state.elements[targetPathIndex] as PathElementProps;
    if (!targetPath.structuredPoints) return { updatedStateSlice: {} };

    let updatedPoints = [...targetPath.structuredPoints];
    updatedPoints.splice(insertAtIndex, 0, newPoint);

    const updatedElement = { ...targetPath, structuredPoints: updatedPoints, d: buildPathDFromStructuredPoints(updatedPoints, targetPath.closedByJoining) };
    let newElements = [...state.elements];
    newElements[targetPathIndex] = updatedElement;

    let newAnimationTracks = autoKeyframePathD(state, pathId, updatedPoints, state.animation.tracks);
    let actionDescriptionForHistory = `Add point to path ${targetPath.name || pathId}`;
    if (JSON.stringify(newAnimationTracks) !== JSON.stringify(state.animation.tracks)) {
        actionDescriptionForHistory = `Add point & Keyframe path '${targetPath.name || pathId}'`;
    }
    
    return {
        updatedStateSlice: {
            elements: newElements, animation: {...state.animation, tracks: newAnimationTracks},
            selectedBezierPointId: newPoint.id, activeControlPoint: null
        },
        actionDescriptionForHistory,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleMoveBezierControlPoint(state: AppState, payload: Extract<AppAction, { type: 'MOVE_BEZIER_CONTROL_POINT' }>['payload']): SubReducerResult {
    const { pathId, pointId, handleType, newLocalX, newLocalY, skipHistory: skipHistoryForDrag, shiftPressed, ctrlPressed, altPressed, keyframeTime } = payload;

    const isLiveDrawingOrExtending = state.isDrawingBezierPath && state.currentBezierPathData?.id === pathId;
    const isKeyframeEdit = keyframeTime !== undefined;
    
    let pointsToEdit: BezierPoint[] | undefined;
    let pathForBaseProps: PathElementProps | undefined; 
    
    if (isLiveDrawingOrExtending) {
        pointsToEdit = state.currentBezierPathData!.structuredPoints;
        pathForBaseProps = state.currentBezierPathData!;
    } else if (isKeyframeEdit) {
        if (state.editingKeyframeShapePreview?.pathId === pathId && Math.abs((state.editingKeyframeShapePreview?.time || -1) - keyframeTime) < 0.001) {
            pointsToEdit = state.editingKeyframeShapePreview.points;
            pathForBaseProps = state.elements.find(el => el.id === pathId && el.type === 'path') as PathElementProps | undefined;
        } else { return { updatedStateSlice: {} }; }
    } else { 
        const pathElement = state.elements.find(el => el.id === pathId && el.type === 'path') as PathElementProps | undefined;
        if (pathElement?.structuredPoints) { pointsToEdit = pathElement.structuredPoints; pathForBaseProps = pathElement; } 
        else { return { updatedStateSlice: {} }; }
    }

    if (!pointsToEdit || !pathForBaseProps) return { updatedStateSlice: {} };
    const pointIndex = pointsToEdit.findIndex(p => p.id === pointId);
    if (pointIndex === -1) return { updatedStateSlice: {} };
    
    let updatedPoint = { ...pointsToEdit[pointIndex] };
    const localX = newLocalX; 
    const localY = newLocalY;

    if (handleType === 'anchor') {
        const dx = localX - updatedPoint.x; const dy = localY - updatedPoint.y;
        updatedPoint.x = localX; updatedPoint.y = localY;
        if (updatedPoint.h1x !== undefined) updatedPoint.h1x += dx; if (updatedPoint.h1y !== undefined) updatedPoint.h1y += dy;
        if (updatedPoint.h2x !== undefined) updatedPoint.h2x += dx; if (updatedPoint.h2y !== undefined) updatedPoint.h2y += dy;
    } else { 
        const currentHandleKeyX = `${handleType}x` as keyof BezierPoint;
        const currentHandleKeyY = `${handleType}y` as keyof BezierPoint;
        (updatedPoint as any)[currentHandleKeyX] = localX;
        (updatedPoint as any)[currentHandleKeyY] = localY;

        if (!altPressed) { 
            if (shiftPressed && updatedPoint.isSmooth) {
            } else if (updatedPoint.isSmooth) { 
                const oppositeHandleKeyX = (handleType === 'h1' ? 'h2x' : 'h1x') as keyof BezierPoint;
                const oppositeHandleKeyY = (handleType === 'h1' ? 'h2y' : 'h1y') as keyof BezierPoint;
                const dx = updatedPoint.x - localX;
                const dy = updatedPoint.y - localY;
                (updatedPoint as any)[oppositeHandleKeyX] = updatedPoint.x + dx;
                (updatedPoint as any)[oppositeHandleKeyY] = updatedPoint.y + dy;
            }
        }
    }

    const newPointsArray = [...pointsToEdit]; 
    newPointsArray[pointIndex] = updatedPoint;
    
    if (isLiveDrawingOrExtending && state.isExtendingPathInfo && state.activeControlPoint && state.activeControlPoint.pointId === updatedPoint.id) {
        const { pointIdToExtendFrom, extendingFromStart } = state.isExtendingPathInfo;
        let connectionPointIndexInCurrent = newPointsArray.findIndex(p => p.id === pointIdToExtendFrom);
        if (connectionPointIndexInCurrent !== -1 && newPointsArray[connectionPointIndexInCurrent]) {
            let connectionPoint = { ...newPointsArray[connectionPointIndexInCurrent] };
            const currentlyMovedPoint = updatedPoint; 
            if (extendingFromStart && Array.isArray(newPointsArray) && newPointsArray.length > 1 && newPointsArray[0].id === currentlyMovedPoint.id && newPointsArray[1].id === connectionPoint.id) {
                const N0 = currentlyMovedPoint; const P0_orig = connectionPoint;
                const dx = P0_orig.x - N0.x; const dy = P0_orig.y - N0.y;
                P0_orig.h1x = P0_orig.x - dx * 0.3; P0_orig.h1y = P0_orig.y - dy * 0.3;
                if (P0_orig.isSmooth) { P0_orig.h2x = P0_orig.x + (P0_orig.x - P0_orig.h1x!); P0_orig.h2y = P0_orig.y + (P0_orig.y - P0_orig.h1y!); }
                newPointsArray[connectionPointIndexInCurrent] = P0_orig;
            } else if (!extendingFromStart && Array.isArray(newPointsArray) && newPointsArray.length > 1 && newPointsArray[newPointsArray.length - 1].id === currentlyMovedPoint.id && newPointsArray[newPointsArray.length - 2].id === connectionPoint.id) {
                const N0 = currentlyMovedPoint; const P_last_orig = connectionPoint;
                const dx = P_last_orig.x - N0.x; const dy = P_last_orig.y - N0.y;
                P_last_orig.h2x = P_last_orig.x - dx * 0.3; P_last_orig.h2y = P_last_orig.y - dy * 0.3;
                if (P_last_orig.isSmooth) { P_last_orig.h1x = P_last_orig.x + (P_last_orig.x - P_last_orig.h2x!); P_last_orig.h1y = P_last_orig.y + (P_last_orig.y - P_last_orig.h2y!); }
                newPointsArray[connectionPointIndexInCurrent] = P_last_orig;
            }
        }
    }


    if (isLiveDrawingOrExtending) {
        return { 
            updatedStateSlice: { currentBezierPathData: { ...state.currentBezierPathData!, structuredPoints: newPointsArray, d: buildPathDFromStructuredPoints(newPointsArray, pathForBaseProps.closedByJoining) } }, 
            skipHistoryRecording: true 
        };
    } else if (isKeyframeEdit) {
        if (skipHistoryForDrag) {
            return {
                updatedStateSlice: { editingKeyframeShapePreview: { pathId: pathId, time: keyframeTime, points: newPointsArray } },
                skipHistoryRecording: true
            };
        } else {
            let newAnimationTracks = [...state.animation.tracks];
            const trackIndex = newAnimationTracks.findIndex(t => t.elementId === pathId && t.property === 'd');
            let actionDescription = `Edit Keyframe Shape for 'd' on ${pathForBaseProps.name || pathId} at ${keyframeTime.toFixed(1)}s`;
            if (trackIndex > -1) {
                const keyframeIndex = newAnimationTracks[trackIndex].keyframes.findIndex(kf => Math.abs(kf.time - keyframeTime) < 0.001);
                if (keyframeIndex > -1) {
                    newAnimationTracks[trackIndex] = { ...newAnimationTracks[trackIndex], keyframes: newAnimationTracks[trackIndex].keyframes.map((kf, idx) => idx === keyframeIndex ? { ...kf, value: JSON.parse(JSON.stringify(newPointsArray)) } : kf ) };
                } else { newAnimationTracks[trackIndex].keyframes.push({ time: keyframeTime, value: JSON.parse(JSON.stringify(newPointsArray)), easing: DEFAULT_KEYFRAME_EASING, freeze: false }); newAnimationTracks[trackIndex].keyframes.sort((a,b)=>a.time-b.time); }
            } else { newAnimationTracks.push({ elementId: pathId, property: 'd', keyframes: [{ time: keyframeTime, value: JSON.parse(JSON.stringify(newPointsArray)), easing: DEFAULT_KEYFRAME_EASING, freeze: false }] }); }
            return {
                updatedStateSlice: { animation: { ...state.animation, tracks: newAnimationTracks }, editingKeyframeShapePreview: null, },
                actionDescriptionForHistory: actionDescription, newSvgCode: generateSvgStringForEditor(state.elements, state.artboard) 
            };
        }
    } else { // Base shape edit
        const updatedElement = { ...pathForBaseProps, structuredPoints: newPointsArray, d: buildPathDFromStructuredPoints(newPointsArray, pathForBaseProps.closedByJoining) };
        const newElements = state.elements.map(el => el.id === pathId ? updatedElement : el);
        let baseShapeAnimationTracks = [...state.animation.tracks];
        let baseShapeActionDescription = `Edit Bezier Point on ${pathForBaseProps.name || pathId}`;
        if (!skipHistoryForDrag) {
            baseShapeAnimationTracks = autoKeyframePathD(state, pathId, newPointsArray, baseShapeAnimationTracks);
             if (JSON.stringify(baseShapeAnimationTracks) !== JSON.stringify(state.animation.tracks)) { baseShapeActionDescription = `Edit Bezier Point & Keyframe '${pathForBaseProps.name || pathId}'`; }
        }
        return {
            updatedStateSlice: { elements: newElements, animation: { ...state.animation, tracks: baseShapeAnimationTracks } },
            actionDescriptionForHistory: skipHistoryForDrag ? undefined : baseShapeActionDescription,
            newSvgCode: skipHistoryForDrag ? undefined : generateSvgStringForEditor(newElements, state.artboard),
            skipHistoryRecording: skipHistoryForDrag
        };
    }
}

export function handleUpdateStructuredPoint(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_STRUCTURED_POINT' }>['payload']): SubReducerResult {
    const { pathId, pointId, newPointData } = payload;
    const pathElementIndex = state.elements.findIndex(el => el.id === pathId && el.type === 'path');
    if (pathElementIndex === -1) return { updatedStateSlice: {} };
    const pathElement = state.elements[pathElementIndex] as PathElementProps;
    if (!pathElement.structuredPoints) return { updatedStateSlice: {} };
    const pointIndex = pathElement.structuredPoints.findIndex(p => p.id === pointId);
    if (pointIndex === -1) return { updatedStateSlice: {} };
    const updatedPoints = [...pathElement.structuredPoints];
    updatedPoints[pointIndex] = { ...updatedPoints[pointIndex], ...newPointData };
    const updatedElement = { ...pathElement, structuredPoints: updatedPoints, d: buildPathDFromStructuredPoints(updatedPoints, pathElement.closedByJoining) };
    let newElements = [...state.elements];
    newElements[pathElementIndex] = updatedElement;
    let newAnimationTracks = autoKeyframePathD(state, pathId, updatedPoints, state.animation.tracks);
    let actionDescriptionForHistory = `Update Bezier Point Coords for ${pathElement.name || pathId}`;
     if (JSON.stringify(newAnimationTracks) !== JSON.stringify(state.animation.tracks)) { actionDescriptionForHistory = `Update Bezier Point Coords & Keyframe '${pathElement.name || pathId}'`; }
    return {
        updatedStateSlice: { elements: newElements, animation: {...state.animation, tracks: newAnimationTracks} },
        actionDescriptionForHistory, newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleConvertToEditablePath(state: AppState, payload: Extract<AppAction, { type: 'CONVERT_TO_EDITABLE_PATH' }>['payload']): SubReducerResult {
    const { elementId } = payload;
    const elementIndex = state.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return { updatedStateSlice: {} };
    const originalElement = state.elements[elementIndex];

    let newStructuredPoints: BezierPoint[] = [];
    let closed = true;
    let warnings: string[] = [];
    let actionDescription = `Convert ${originalElement.type} to Path`;

    if (originalElement.type === 'rect') {
        newStructuredPoints = rectToPathStructuredPoints(originalElement as RectElementProps);
        closed = true;
    } else if (originalElement.type === 'circle') {
        newStructuredPoints = circleToPathStructuredPoints(originalElement as CircleElementProps);
        closed = true;
    } else if (originalElement.type === 'path') {
        const pathEl = originalElement as PathElementProps;
        if (pathEl.structuredPoints && pathEl.structuredPoints.length > 0) {
            return { updatedStateSlice: {}, actionDescriptionForHistory: "Path already has structured points.", skipHistoryRecording: true }; 
        }
        if (typeof pathEl.d === 'string') {
            const parseResult: ParsedDStringResult = parseDStringToStructuredPoints(pathEl.d);
            newStructuredPoints = parseResult.points;
            closed = parseResult.closed;
            warnings = parseResult.warnings;
            actionDescription = `Convert Path 'd' to Editable Points`;
            if (warnings.length > 0) {
                console.warn(`Warnings during d-string parsing for path ${pathEl.id}:`, warnings.join('; '));
                actionDescription += ` (with warnings)`;
            }
            if (newStructuredPoints.length === 0 && pathEl.d.trim() !== "") {
                 actionDescription = `Failed to convert Path 'd' (empty or fully unsupported)`;
                 console.error(`Failed to parse d-string for path ${pathEl.id}: "${pathEl.d}"`);
                 return { updatedStateSlice: {}, actionDescriptionForHistory: actionDescription, skipHistoryRecording: true };
            }
        } else {
            return { updatedStateSlice: {}, actionDescriptionForHistory: "Path 'd' string is not valid for conversion.", skipHistoryRecording: true };
        }
    } else {
        return { updatedStateSlice: {} }; 
    }
    
    const newPathElement: PathElementProps = {
        id: originalElement.id, artboardId: originalElement.artboardId, type: 'path',
        name: originalElement.name || `Path from ${originalElement.type}`,
        parentId: originalElement.parentId, order: originalElement.order,
        x: originalElement.x, y: originalElement.y,
        fill: originalElement.fill || (originalElement.type === 'path' ? (originalElement as PathElementProps).fill : DEFAULT_PATH_FILL), 
        stroke: originalElement.stroke || DEFAULT_ELEMENT_STROKE,
        strokeWidth: originalElement.strokeWidth || DEFAULT_STROKE_WIDTH, 
        opacity: originalElement.opacity || DEFAULT_OPACITY,
        rotation: originalElement.rotation || DEFAULT_ROTATION, 
        scale: originalElement.scale || DEFAULT_SCALE,
        skewX: originalElement.skewX || DEFAULT_SKEW_X,
        skewY: originalElement.skewY || DEFAULT_SKEW_Y,
        d: buildPathDFromStructuredPoints(newStructuredPoints, closed), 
        structuredPoints: newStructuredPoints, 
        closedByJoining: closed, 
        isRendered: true,
        motionPathId: null, alignToPath: false,
        motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
    };
    const newElements = [...state.elements];
    newElements[elementIndex] = newPathElement;

    let finalAnimationTracks = [...state.animation.tracks];
    if (originalElement.type !== 'path' || !(originalElement as PathElementProps).structuredPoints) {
        finalAnimationTracks = autoKeyframePathD(state, newPathElement.id, newStructuredPoints, finalAnimationTracks);
        if (JSON.stringify(finalAnimationTracks) !== JSON.stringify(state.animation.tracks)) {
            actionDescription = `${actionDescription} & Keyframe Path`;
        }
    }

    return {
        updatedStateSlice: { 
            elements: newElements, 
            selectedElementId: newPathElement.id, 
            currentTool: 'bezierPath', 
            selectedBezierPointId: newStructuredPoints[0]?.id || null, 
            activeControlPoint: null,
            animation: { ...state.animation, tracks: finalAnimationTracks }
        },
        actionDescriptionForHistory: actionDescription,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleUpdateBezierPointType(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_BEZIER_POINT_TYPE' }>['payload']): SubReducerResult {
    const { pathId, pointId, isSmooth: targetSmoothState, ctrlPressed, altPressed } = payload;
    const pathElementIndex = state.elements.findIndex(el => el.id === pathId && el.type === 'path');
    if (pathElementIndex === -1) return { updatedStateSlice: {} };
    const pathElement = state.elements[pathElementIndex] as PathElementProps;
    if (!pathElement.structuredPoints) return { updatedStateSlice: {} };
    const pointIndex = pathElement.structuredPoints.findIndex(p => p.id === pointId);
    if (pointIndex === -1) return { updatedStateSlice: {} };
    
    let updatedPoints = [...pathElement.structuredPoints];
    let pointToUpdate = { ...updatedPoints[pointIndex] };
    const currentIsSmooth = pointToUpdate.isSmooth;
    const actualTargetSmoothState = ctrlPressed ? !currentIsSmooth : targetSmoothState; 
    pointToUpdate.isSmooth = actualTargetSmoothState;

    if (actualTargetSmoothState) { 
        const { x: ax, y: ay } = pointToUpdate; 
        let h1x = pointToUpdate.h1x ?? ax; let h1y = pointToUpdate.h1y ?? ay;
        let h2x = pointToUpdate.h2x ?? ax; let h2y = pointToUpdate.h2y ?? ay;
        
        const prevPointIndex = (pointIndex - 1 + updatedPoints.length) % updatedPoints.length;
        const nextPointIndex = (pointIndex + 1) % updatedPoints.length;
        const prevAnchor = updatedPoints[prevPointIndex];
        const nextAnchor = updatedPoints[nextPointIndex];

        let angleRad: number;
        const dx_h1_anchor = ax - h1x; const dy_h1_anchor = ay - h1y;
        const dx_h2_anchor = ax - h2x; const dy_h2_anchor = ay - h2y;
        const dist_h1_anchor = Math.sqrt(dx_h1_anchor*dx_h1_anchor + dy_h1_anchor*dy_h1_anchor);
        const dist_h2_anchor = Math.sqrt(dx_h2_anchor*dx_h2_anchor + dy_h2_anchor*dy_h2_anchor);

        if (dist_h1_anchor > 1 && dist_h2_anchor > 1 && pointToUpdate.h1x !== ax && pointToUpdate.h2x !== ax ) { 
             angleRad = Math.atan2(h1y - h2y, h1x - h2x); 
        } else if (dist_h1_anchor > 1 && pointToUpdate.h1x !== ax) { 
            angleRad = Math.atan2(h1y - ay, h1x - ax);
        } else if (dist_h2_anchor > 1 && pointToUpdate.h2x !== ax) { 
            angleRad = Math.atan2(ay - h2y, ax - h2x);
        } else { 
            const dx_neighbors = nextAnchor.x - prevAnchor.x;
            const dy_neighbors = nextAnchor.y - prevAnchor.y;
            angleRad = Math.atan2(dy_neighbors, dx_neighbors);
        }
        
        const handleLength1 = (dist_h1_anchor > 1 && pointToUpdate.h1x !== ax) ? dist_h1_anchor : 30;
        const handleLength2 = (dist_h2_anchor > 1 && pointToUpdate.h2x !== ax) ? dist_h2_anchor : 30;

        pointToUpdate.h1x = ax - handleLength1 * Math.cos(angleRad);
        pointToUpdate.h1y = ay - handleLength1 * Math.sin(angleRad);
        pointToUpdate.h2x = ax + handleLength2 * Math.cos(angleRad);
        pointToUpdate.h2y = ay + handleLength2 * Math.sin(angleRad);

    } else { 
        if (ctrlPressed) {
            pointToUpdate.h1x = pointToUpdate.x;
            pointToUpdate.h1y = pointToUpdate.y;
            pointToUpdate.h2x = pointToUpdate.x;
            pointToUpdate.h2y = pointToUpdate.y;
        }
    }
    updatedPoints[pointIndex] = pointToUpdate;
    const updatedElement = { ...pathElement, structuredPoints: updatedPoints, d: buildPathDFromStructuredPoints(updatedPoints, pathElement.closedByJoining) };
    const newElements = [...state.elements];
    newElements[pathElementIndex] = updatedElement;
    let newAnimationTracks = autoKeyframePathD(state, pathId, updatedPoints, state.animation.tracks);
    let actionDescriptionForHistory = `Update Bezier Point Type for ${pathElement.name || pathId}`;
    if (JSON.stringify(newAnimationTracks) !== JSON.stringify(state.animation.tracks)) { actionDescriptionForHistory = `Update Bezier Point Type & Keyframe '${pathElement.name || pathId}'`; }
    return {
        updatedStateSlice: { elements: newElements, animation: {...state.animation, tracks: newAnimationTracks} },
        actionDescriptionForHistory, newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleDeleteBezierPoint(state: AppState, payload: Extract<AppAction, { type: 'DELETE_BEZIER_POINT' }>['payload']): SubReducerResult {
    const { pathId, pointId } = payload;
    const pathElementIndex = state.elements.findIndex(el => el.id === pathId && el.type === 'path');
    if (pathElementIndex === -1) return { updatedStateSlice: {} };
    const pathElement = state.elements[pathElementIndex] as PathElementProps;
    if (!pathElement.structuredPoints) return { updatedStateSlice: {} };
    const updatedPoints = pathElement.structuredPoints.filter(p => p.id !== pointId);
    if (updatedPoints.length === pathElement.structuredPoints.length) return { updatedStateSlice: {} };
    let newSelectedBezierPointId = state.selectedBezierPointId;
    if (state.selectedBezierPointId === pointId) newSelectedBezierPointId = updatedPoints.length > 0 ? updatedPoints[0].id : null;
    const updatedElement = { ...pathElement, structuredPoints: updatedPoints, d: updatedPoints.length > 0 ? buildPathDFromStructuredPoints(updatedPoints, pathElement.closedByJoining) : "" };
    const newElements = [...state.elements];
    newElements[pathElementIndex] = updatedElement;
    let newAnimationTracks = autoKeyframePathD(state, pathId, updatedPoints, state.animation.tracks);
    let actionDescriptionForHistory = `Delete Bezier Point from ${pathElement.name || pathId}`;
     if (JSON.stringify(newAnimationTracks) !== JSON.stringify(state.animation.tracks)) { actionDescriptionForHistory = `Delete Bezier Point & Keyframe '${pathElement.name || pathId}'`; }
    return {
        updatedStateSlice: { elements: newElements, animation: {...state.animation, tracks: newAnimationTracks}, selectedBezierPointId: newSelectedBezierPointId, activeControlPoint: null },
        actionDescriptionForHistory, newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}
