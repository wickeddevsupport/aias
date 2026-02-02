

import { AppState, AppAction, AnimationTrack, AnimatableProperty, Keyframe, AnySVGGradient, BezierPoint, TextElementProps, SubReducerResult } from '../../types';
import { DEFAULT_KEYFRAME_EASING } from '../../constants';
import { generateUniqueId } from '../appContextUtils';

export function handleSetAnimation(state: AppState, payload: Extract<AppAction, { type: 'SET_ANIMATION' }>['payload']): SubReducerResult {
    return {
        updatedStateSlice: { animation: payload },
        actionDescriptionForHistory: `Set Animation (Full)`
    };
}

export function handleUpdateAnimationDuration(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_ANIMATION_DURATION' }>['payload']): SubReducerResult {
    const newDuration = Math.max(0.1, payload);
    return {
        updatedStateSlice: {
            animation: { ...state.animation, duration: newDuration },
            currentTime: Math.min(state.currentTime, newDuration)
        },
        actionDescriptionForHistory: `Update Duration to ${newDuration.toFixed(1)}s`
    };
}

export function handleAddKeyframe(state: AppState, payload: Extract<AppAction, { type: 'ADD_KEYFRAME' }>['payload']): SubReducerResult {
    const { elementId, property, time, value: valueToAdd } = payload;
    let validatedValue = valueToAdd;
    const element = state.elements.find(el => el.id === elementId);

    if (property === 'd' && Array.isArray(valueToAdd) && valueToAdd.every(item => typeof item === 'object' && 'x' in item && 'y' in item && 'id' in item)) {
        validatedValue = JSON.parse(JSON.stringify(valueToAdd));
    } else if (typeof valueToAdd === 'object' && valueToAdd !== null && (property === 'fill' || property === 'stroke')) {
        const grad = valueToAdd as AnySVGGradient;
        validatedValue = { ...grad, id: `kf-grad-${Date.now()}-${Math.random().toString(16).slice(2,8)}`, stops: grad.stops.map(s => ({...s, id: s.id || generateUniqueId('stop')})) };
    } else if (property === 'fill' || property === 'stroke' || property === 'd' || property === 'motionPath' || property === 'text') {
        validatedValue = valueToAdd === null ? '' : String(valueToAdd);
        if ((property === 'fill' || property === 'stroke') && valueToAdd === null) validatedValue = 'none';
    } else if (element?.type === 'text' && (property === 'width' || property === 'height')) {
        if (valueToAdd === undefined || valueToAdd === null || (typeof valueToAdd === 'string' && valueToAdd.trim() === '')) {
            validatedValue = undefined; // Allow undefined for text auto-sizing
        } else {
            const numVal = Number(valueToAdd);
            validatedValue = Number.isNaN(numVal) ? undefined : numVal;
        }
    } else {
        const numericProps: AnimatableProperty[] = ['x', 'y', 'width', 'height', 'r', 'rx', 'ry', 'opacity', 'rotation', 'scale', 'strokeWidth', 'strokeDashoffset', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY', 'drawStartPercent', 'drawEndPercent', 'fontSize', 'letterSpacing', 'lineHeight', 'skewX', 'skewY'];
        if (numericProps.includes(property)) {
            const numVal = Number(valueToAdd);
            if (Number.isNaN(numVal)) {
                console.warn(`Invalid number for ${property}: ${valueToAdd}. Keyframe not added/updated.`);
                return { updatedStateSlice: {} };
            }
            validatedValue = numVal;
        }
    }


    const trackIndex = state.animation.tracks.findIndex(t => t.elementId === elementId && t.property === property);
    let newTracks = [...state.animation.tracks];
    let isNewKeyframe = true;

    if (trackIndex > -1) {
        const existingTrack = { ...newTracks[trackIndex], keyframes: [...newTracks[trackIndex].keyframes] }; 
        const existingKeyframeIndex = existingTrack.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.001);
        if (existingKeyframeIndex > -1) {
            isNewKeyframe = false;
            existingTrack.keyframes[existingKeyframeIndex] = { ...existingTrack.keyframes[existingKeyframeIndex], value: validatedValue };
        } else {
            existingTrack.keyframes.push({ time, value: validatedValue, easing: DEFAULT_KEYFRAME_EASING, freeze: false });
        }
        existingTrack.keyframes.sort((a, b) => a.time - b.time);
        newTracks[trackIndex] = existingTrack;
    } else {
        newTracks.push({ elementId, property, keyframes: [{ time, value: validatedValue, easing: DEFAULT_KEYFRAME_EASING, freeze: false }] });
    }
    const elName = element?.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `${isNewKeyframe ? 'Add' : 'Update'} Keyframe for ${property} on ${elName} at ${time.toFixed(1)}s`
    };
}

export function handleRemoveKeyframe(state: AppState, payload: Extract<AppAction, { type: 'REMOVE_KEYFRAME' }>['payload']): SubReducerResult {
    const { elementId, property, time } = payload;
    const newTracks = state.animation.tracks.map(track => {
        if (track.elementId === elementId && track.property === property) {
            const updatedKeyframes = track.keyframes.filter(kf => Math.abs(kf.time - time) > 0.001);
            if (updatedKeyframes.length === 0) return null;
            return { ...track, keyframes: updatedKeyframes };
        }
        return track;
    }).filter(Boolean) as AnimationTrack[];
    const elName = state.elements.find(e => e.id === elementId)?.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Remove Keyframe for ${property} on ${elName} at ${time.toFixed(1)}s`
    };
}

export function handleUpdateKeyframeTime(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_KEYFRAME_TIME' }>['payload']): SubReducerResult {
    const { elementId, property, oldTime, newTime } = payload;
    const newTracks = state.animation.tracks.map(track => {
        if (track.elementId === elementId && track.property === property) {
            const keyframeToMove = track.keyframes.find(kf => Math.abs(kf.time - oldTime) < 0.001);
            if (!keyframeToMove) return track;
            const otherKeyframes = track.keyframes.filter(kf => Math.abs(kf.time - oldTime) >= 0.001);
            const updatedKeyframe: Keyframe = { ...keyframeToMove, time: newTime };
            const finalKeyframes = [...otherKeyframes, updatedKeyframe].sort((a,b) => a.time - b.time);
            return {...track, keyframes: finalKeyframes };
        }
        return track;
    });
    const elName = state.elements.find(e => e.id === elementId)?.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Move Keyframe for ${property} on ${elName} from ${oldTime.toFixed(1)}s to ${newTime.toFixed(1)}s`
    };
}

export function handleUpdateKeyframeProperties(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_KEYFRAME_PROPERTIES' }>['payload']): SubReducerResult {
    const { elementId, property, time, newKeyframeProps } = payload;
    const newTracks = state.animation.tracks.map(track => {
        if (track.elementId === elementId && track.property === property) {
            const keyframeIndex = track.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.001);
            if (keyframeIndex === -1) return track;
            const updatedKeyframes = [...track.keyframes];
            updatedKeyframes[keyframeIndex] = { ...updatedKeyframes[keyframeIndex], ...newKeyframeProps };
            return { ...track, keyframes: updatedKeyframes };
        }
        return track;
    });
    const elName = state.elements.find(e => e.id === elementId)?.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Update Keyframe Props for ${property} on ${elName} at ${time.toFixed(1)}s`
    };
}

export function handleScaleKeyframeGroupTimes(state: AppState, payload: Extract<AppAction, { type: 'SCALE_KEYFRAME_GROUP_TIMES' }>['payload']): SubReducerResult {
    const { elementId, propertiesToScale, originalTimespan, newTimespan } = payload;
    const newTracks = state.animation.tracks.map(track => {
        if (track.elementId === elementId && propertiesToScale.includes(track.property)) {
            const updatedKeyframes = track.keyframes.map(kf => {
                if (kf.time >= originalTimespan.start && kf.time <= originalTimespan.end) {
                    const progressWithinOriginal = (originalTimespan.end - originalTimespan.start === 0) ? 0 : (kf.time - originalTimespan.start) / (originalTimespan.end - originalTimespan.start);
                    const newKfTime = newTimespan.start + progressWithinOriginal * (newTimespan.end - newTimespan.start);
                    return { ...kf, time: Math.max(0, Math.min(state.animation.duration, parseFloat(newKfTime.toFixed(3)))) };
                }
                return kf;
            }).sort((a, b) => a.time - b.time);
            return { ...track, keyframes: updatedKeyframes };
        }
        return track;
    });
    const elName = state.elements.find(e => e.id === elementId)?.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Scale Keyframe Group for ${elName}`
    };
}

export function handleShiftElementAnimationTimes(state: AppState, payload: Extract<AppAction, { type: 'SHIFT_ELEMENT_ANIMATION_TIMES' }>['payload']): SubReducerResult {
    const { elementId, timeShift } = payload;
    const elementName = state.elements.find(el => el.id === elementId)?.name || elementId;

    const newTracks = state.animation.tracks.map(track => {
        if (track.elementId === elementId) {
            const newKeyframes = track.keyframes.map(kf => {
                let newTime = kf.time + timeShift;
                newTime = Math.max(0, Math.min(newTime, state.animation.duration)); // Clamp
                return { ...kf, time: parseFloat(newTime.toFixed(3)) };
            }).sort((a, b) => a.time - b.time); // Sort after shifting
            
            return { ...track, keyframes: newKeyframes };
        }
        return track;
    });

    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Shift animation for ${elementName}`
    };
}

export function handleShiftPropertyGroupTimes(state: AppState, payload: Extract<AppAction, { type: 'SHIFT_PROPERTY_GROUP_TIMES' }>['payload']): SubReducerResult {
    const { elementId, propertiesToShift, timeShift } = payload;
    const elementName = state.elements.find(el => el.id === elementId)?.name || elementId;

    const newTracks = state.animation.tracks.map(track => {
        if (track.elementId === elementId && propertiesToShift.includes(track.property)) {
            const newKeyframes = track.keyframes.map(kf => {
                let newTime = kf.time + timeShift;
                newTime = Math.max(0, Math.min(newTime, state.animation.duration)); // Clamp
                return { ...kf, time: parseFloat(newTime.toFixed(3)) };
            }).sort((a, b) => a.time - b.time);
            return { ...track, keyframes: newKeyframes };
        }
        return track;
    });
    
    const propertiesString = propertiesToShift.slice(0,3).join(', ') + (propertiesToShift.length > 3 ? '...' : '');

    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: newTracks } },
        actionDescriptionForHistory: `Shift '${propertiesString}' keyframes for ${elementName}`
    };
}


export function handleUpdateAnimationFromAI(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_ANIMATION_FROM_AI' }>['payload']): SubReducerResult {
    const { elementId, aiTracks } = payload;
    let currentTracks = [...state.animation.tracks];
    currentTracks = currentTracks.filter(track => 
        !(track.elementId === elementId && aiTracks.some(aiTrack => aiTrack.property === track.property))
    );
    currentTracks.push(...aiTracks);
    const elName = state.elements.find(e => e.id === elementId)?.name || elementId;
    return {
        updatedStateSlice: { animation: { ...state.animation, tracks: currentTracks } },
        actionDescriptionForHistory: `Apply AI Animation to ${elName}`
    };
}
