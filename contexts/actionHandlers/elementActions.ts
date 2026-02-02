
import { AppState, AppAction, SVGElementData, RectElementProps, CircleElementProps, PathElementProps, GroupElementProps, TextElementProps, ImageElementProps, BaseElementProps, AnimatableProperty, Keyframe, AnySVGGradient, BezierPoint } from '../../types';
import { generateUniqueId, getNextOrderUtil, reorderSiblingsAndNormalize } from '../appContextUtils';
import { getAccumulatedTransform } from '../../utils/transformUtils';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';
import {
    DEFAULT_MOTION_PATH_START, DEFAULT_MOTION_PATH_END, DEFAULT_MOTION_PATH_OFFSET_X, DEFAULT_MOTION_PATH_OFFSET_Y,
    DEFAULT_NAME, DEFAULT_GROUP_NAME, DEFAULT_GROUP_X, DEFAULT_GROUP_Y, DEFAULT_GROUP_ROTATION, DEFAULT_GROUP_SCALE, DEFAULT_GROUP_SKEW_X, DEFAULT_GROUP_SKEW_Y,
    PASTE_OFFSET, DEFAULT_KEYFRAME_EASING, DEFAULT_ELEMENT_STROKE, DEFAULT_ELEMENT_FILL, DEFAULT_STROKE_WIDTH,
    DEFAULT_OPACITY, DEFAULT_ROTATION, DEFAULT_SCALE, DEFAULT_SKEW_X, DEFAULT_SKEW_Y, DEFAULT_PATH_FILL, DEFAULT_TEXT_CONTENT, DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT, DEFAULT_FONT_STYLE, DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_VERTICAL_ALIGN,
    DEFAULT_IMAGE_HREF, DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO, DEFAULT_CIRCLE_R, DEFAULT_ELLIPSE_RX, DEFAULT_ELLIPSE_RY,
    DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, DEFAULT_TEXT_DECORATION, DEFAULT_TEXT_WRAP, DEFAULT_TEXT_ALIGN_KONVA
} from '../../constants';
import { getElementAnimatableProperties, interpolateValue } from '../../utils/animationUtils';
import { rectToPathStructuredPoints, circleToPathStructuredPoints, parseDStringToStructuredPoints, buildPathDFromStructuredPoints } from '../../utils/pathUtils'; // Added buildPathDFromStructuredPoints and parseDStringToStructuredPoints


export interface SubReducerResult {
    updatedStateSlice: Partial<AppState>;
    actionDescriptionForHistory?: string;
    newSvgCode?: string;
    skipHistoryRecording?: boolean;
}

const nonKeyframedElementProps: string[] = [
  'id', 'type', 'artboardId', 'alignToPath',
  'isRendered', 'parentId', 'order', 'name', 'structuredPoints', 'closedByJoining', 'gradientUpdates'
];

export function handleAddElement(state: AppState, payload: Extract<AppAction, { type: 'ADD_ELEMENT' }>['payload']): SubReducerResult {
    const { type: newElementType, targetParentId: targetParentIdFromContext, props: initialProps, andInitiateEdit } = payload;
    const currentArtboardId = state.artboard.id;
    const newId = generateUniqueId(newElementType);

    let finalParentId: string | null = null;
    const selectedElement = state.elements.find(el => el.id === state.selectedElementId);

    if (targetParentIdFromContext !== undefined) {
        finalParentId = targetParentIdFromContext;
    } else if (state.selectedElementId === state.artboard.id) {
        finalParentId = null;
    } else if (selectedElement) {
        finalParentId = selectedElement.type === 'group' ? selectedElement.id : selectedElement.parentId;
    }

    const newElementOrder = getNextOrderUtil(state.elements, finalParentId, currentArtboardId);

    const baseElementDefaults: Required<Omit<BaseElementProps, 'id' | 'artboardId' | 'parentId' | 'order' | 'name' | 'type' | 'fill' | 'stroke' | 'strokeWidth' | 'motionPathId' | 'alignToPath' | 'motionPathStart' | 'motionPathEnd' | 'motionPathOffsetX' | 'motionPathOffsetY' | 'gradientUpdates' | 'skewX' | 'skewY'>> & Partial<Pick<BaseElementProps, 'fill' | 'stroke' | 'strokeWidth' | 'motionPathId' | 'alignToPath' | 'motionPathStart' | 'motionPathEnd' | 'motionPathOffsetX' | 'motionPathOffsetY' | 'skewX' | 'skewY'>> = {
        opacity: DEFAULT_OPACITY, rotation: DEFAULT_ROTATION, scale: DEFAULT_SCALE, skewX: DEFAULT_SKEW_X, skewY: DEFAULT_SKEW_Y,
        x: 0, y: 0,
        filter: undefined,
        clipPath: undefined,
        mask: undefined,
    };

    let newElement: SVGElementData;
    const defaultX = 20 + Math.floor(Math.random() * (state.artboard.width / 10));
    const defaultY = 20 + Math.floor(Math.random() * (state.artboard.height / 10));


    if (newElementType === 'rect') {
        newElement = {
            id: newId, artboardId: currentArtboardId, parentId: finalParentId, order: newElementOrder,
            name: `${DEFAULT_NAME} ${state.elements.filter(e => e.type !== 'group').length + 1}`,
            type: 'rect', ...baseElementDefaults,
            x: initialProps?.x ?? defaultX,
            y: initialProps?.y ?? defaultY,
            width: 80, height: 50,
            fill: initialProps?.fill ?? `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            stroke: initialProps?.stroke ?? '#9ca3af',
            strokeWidth: initialProps?.strokeWidth ?? 1,
            motionPathId: null, alignToPath: false,
            motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
            motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
            ...(initialProps || {}),
        } as RectElementProps;
    } else if (newElementType === 'circle') {
        newElement = {
            id: newId, artboardId: currentArtboardId, parentId: finalParentId, order: newElementOrder,
            name: `${DEFAULT_NAME} ${state.elements.filter(e => e.type !== 'group').length + 1}`,
            type: 'circle', ...baseElementDefaults,
            x: initialProps?.x ?? defaultX,
            y: initialProps?.y ?? defaultY,
            r: DEFAULT_CIRCLE_R, rx: DEFAULT_CIRCLE_R, ry: DEFAULT_CIRCLE_R,
            fill: initialProps?.fill ?? `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            stroke: initialProps?.stroke ?? '#9ca3af',
            strokeWidth: initialProps?.strokeWidth ?? 1,
            motionPathId: null, alignToPath: false,
            motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
            motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
            ...(initialProps || {}),
        } as CircleElementProps;
    } else if (newElementType === 'text') {
      const textInitialProps = initialProps as Partial<TextElementProps> | undefined;
      newElement = {
        id: newId, artboardId: currentArtboardId, parentId: finalParentId, order: newElementOrder,
        name: `Text ${state.elements.filter(e => e.type === 'text').length + 1}`, type: 'text', ...baseElementDefaults,
        x: textInitialProps?.x ?? defaultX,
        y: textInitialProps?.y ?? defaultY,
        text: andInitiateEdit ? "\u200B" : (textInitialProps?.text ?? "Double Click to Edit"), 
        fontFamily: textInitialProps?.fontFamily ?? DEFAULT_FONT_FAMILY,
        fontSize: textInitialProps?.fontSize ?? DEFAULT_FONT_SIZE,
        fontWeight: textInitialProps?.fontWeight ?? DEFAULT_FONT_WEIGHT,
        fontStyle: textInitialProps?.fontStyle ?? DEFAULT_FONT_STYLE,
        textAnchor: textInitialProps?.textAnchor ?? DEFAULT_TEXT_ANCHOR,
        verticalAlign: textInitialProps?.verticalAlign ?? DEFAULT_TEXT_VERTICAL_ALIGN,
        letterSpacing: textInitialProps?.letterSpacing ?? DEFAULT_LETTER_SPACING,
        lineHeight: textInitialProps?.lineHeight ?? DEFAULT_LINE_HEIGHT,
        textDecoration: textInitialProps?.textDecoration ?? DEFAULT_TEXT_DECORATION,
        width: textInitialProps?.width, 
        height: textInitialProps?.height, 
        wrap: textInitialProps?.wrap ?? DEFAULT_TEXT_WRAP,
        align: textInitialProps?.align ?? DEFAULT_TEXT_ALIGN_KONVA,
        fill: textInitialProps?.fill ?? DEFAULT_ELEMENT_FILL,
        stroke: textInitialProps?.stroke ?? 'none',
        strokeWidth: textInitialProps?.strokeWidth ?? 0,
        opacity: textInitialProps?.opacity ?? DEFAULT_OPACITY,
        motionPathId: null, alignToPath: false, motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
        ...(textInitialProps || {}), 
      } as TextElementProps;
    } else if (newElementType === 'image') {
      newElement = {
        id: newId, artboardId: currentArtboardId, parentId: finalParentId, order: newElementOrder,
        name: `Image ${state.elements.filter(e => e.type === 'image').length + 1}`, type: 'image', ...baseElementDefaults,
        x: initialProps?.x ?? defaultX,
        y: initialProps?.y ?? defaultY,
        width: 150, height: 150, href: DEFAULT_IMAGE_HREF, preserveAspectRatio: DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO,
        motionPathId: null, alignToPath: false, motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
        ...(initialProps || {}),
      } as ImageElementProps;
    } else { 
        newElement = {
            id: newId, artboardId: currentArtboardId, parentId: finalParentId, order: newElementOrder,
            name: `${DEFAULT_NAME} ${state.elements.filter(e => e.type !== 'group').length + 1}`,
            type: 'path', ...baseElementDefaults,
            x: initialProps?.x ?? 0,
            y: initialProps?.y ?? 0,
            d: 'M10,10 L60,60 L110,10 Z', isRendered: true,
            fill: initialProps?.fill ?? 'none',
            stroke: initialProps?.stroke ?? `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            strokeWidth: initialProps?.strokeWidth ?? 1,
            motionPathId: null, alignToPath: false,
            motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
            motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
            ...(initialProps || {}),
        } as PathElementProps;
    }
    const newElements = [...state.elements, newElement];
    const updatedStateSlice: Partial<AppState> = { elements: newElements, selectedElementId: newId };

    if (newElementType === 'text' && andInitiateEdit) {
        updatedStateSlice.newlyAddedTextElementId = newId;
        updatedStateSlice.currentTool = 'text'; // Keep text tool for immediate edit
    } else {
        updatedStateSlice.currentTool = 'select'; // Switch to select tool for other elements or non-edit text add
        updatedStateSlice.newlyAddedTextElementId = null; // Ensure this is cleared
    }

    return {
        updatedStateSlice,
        actionDescriptionForHistory: `Add ${newElementType}: ${newElement.name}`,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleAddGroup(state: AppState): SubReducerResult {
    const currentArtboardId = state.artboard.id;
    const newId = generateUniqueId('group');
    const selectedElement = state.elements.find(el => el.id === state.selectedElementId);
    let finalParentId: string | null = null;

    if (state.selectedElementId === state.artboard.id) {
        finalParentId = null;
    } else if (selectedElement) {
        finalParentId = selectedElement.type === 'group' ? selectedElement.id : selectedElement.parentId;
    }

    const newOrder = getNextOrderUtil(state.elements, finalParentId, currentArtboardId);
    const newGroup: GroupElementProps = {
        id: newId, artboardId: currentArtboardId, type: 'group',
        name: `${DEFAULT_GROUP_NAME} ${state.elements.filter(e => e.type === 'group').length + 1}`,
        parentId: finalParentId, order: newOrder,
        x: DEFAULT_GROUP_X, y: DEFAULT_GROUP_Y, rotation: DEFAULT_GROUP_ROTATION, scale: DEFAULT_GROUP_SCALE, 
        skewX: DEFAULT_GROUP_SKEW_X, skewY: DEFAULT_GROUP_SKEW_Y, 
        opacity: DEFAULT_OPACITY,
        motionPathId: null, alignToPath: false,
        motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
    };
    const newElements = [...state.elements, newGroup];
    const newExpandedGroupIds = new Set(state.expandedGroupIds);
    newExpandedGroupIds.add(newId);

    return {
        updatedStateSlice: { elements: newElements, selectedElementId: newId, expandedGroupIds: newExpandedGroupIds },
        actionDescriptionForHistory: `Add Group: ${newGroup.name}`,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleUpdateElementProps(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_ELEMENT_PROPS' }>['payload']): SubReducerResult {
    const { id, props, skipHistory } = payload;
    const elementIndex = state.elements.findIndex(el => el.id === id);
    if (elementIndex === -1) return { updatedStateSlice: {} };

    const elementBeforeUpdate = state.elements[elementIndex];
    let newPropsCombined = { ...elementBeforeUpdate, ...props };

    const numericPropsRequiringFinite: AnimatableProperty[] = ['x', 'y', 'rotation', 'strokeWidth', 'opacity', 'fontSize', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY', 'drawStartPercent', 'drawEndPercent', 'letterSpacing', 'skewX', 'skewY'];
    const positiveNumericProps: AnimatableProperty[] = ['scale']; 

    (Object.keys(props) as Array<keyof typeof props>).forEach(propKey => {
        const propKeyAsString = propKey as string;
        let valueFromPayload = props[propKey];
        let sanitizedValue: any = valueFromPayload;
        let wasSanitized = false;

        if (elementBeforeUpdate.type === 'text' && (propKeyAsString === 'width' || propKeyAsString === 'height')) {
            if (valueFromPayload === undefined || valueFromPayload === null || (typeof valueFromPayload === 'number' && !Number.isFinite(valueFromPayload))) {
                sanitizedValue = undefined; 
                if (valueFromPayload !== undefined) wasSanitized = true;
            } else if (typeof valueFromPayload === 'number' && valueFromPayload < 0) {
                sanitizedValue = 0; wasSanitized = true;
            }
        } else if (elementBeforeUpdate.type === 'rect' && (propKeyAsString === 'width' || propKeyAsString === 'height')) {
            if (typeof valueFromPayload === 'number' && (!Number.isFinite(valueFromPayload) || valueFromPayload < 0)) {
                sanitizedValue = (elementBeforeUpdate as any)[propKey] ?? 0; wasSanitized = true;
            } else if (valueFromPayload === null || valueFromPayload === undefined) {
                 sanitizedValue = 0; wasSanitized = true;
            }
        } else if (elementBeforeUpdate.type === 'circle' && (propKeyAsString === 'r' || propKeyAsString === 'rx' || propKeyAsString === 'ry')) {
            const circleElementBeforeUpdate = elementBeforeUpdate as CircleElementProps;
            const currentR_base = circleElementBeforeUpdate.r;
            const currentRx_base = circleElementBeforeUpdate.rx;
            const currentRy_base = circleElementBeforeUpdate.ry;

            if (propKeyAsString === 'r') {
                if (((props as Partial<CircleElementProps>).rx !== undefined || (props as Partial<CircleElementProps>).ry !== undefined) && valueFromPayload === undefined) {
                    sanitizedValue = undefined;
                    if (valueFromPayload !== undefined) wasSanitized = true;
                } else if (typeof valueFromPayload === 'number' && (!Number.isFinite(valueFromPayload) || valueFromPayload < 0)) {
                    sanitizedValue = currentR_base ?? DEFAULT_CIRCLE_R; wasSanitized = true;
                } else if (valueFromPayload === null || valueFromPayload === undefined) {
                    sanitizedValue = currentR_base ?? DEFAULT_CIRCLE_R; wasSanitized = true;
                }
            } else { 
                const baseForThisProp = propKeyAsString === 'rx' ? currentRx_base : currentRy_base;
                if (typeof valueFromPayload === 'number' && (!Number.isFinite(valueFromPayload) || valueFromPayload < 0)) {
                    sanitizedValue = baseForThisProp ?? currentR_base ?? DEFAULT_CIRCLE_R; wasSanitized = true;
                } else if (valueFromPayload === null || valueFromPayload === undefined) {
                    sanitizedValue = baseForThisProp ?? currentR_base ?? DEFAULT_CIRCLE_R; wasSanitized = true;
                }
            }
        } else if (numericPropsRequiringFinite.includes(propKeyAsString as AnimatableProperty)) {
            if (typeof valueFromPayload === 'number' && !Number.isFinite(valueFromPayload)) {
                sanitizedValue = (elementBeforeUpdate as any)[propKey] ?? 0; wasSanitized = true;
            } else if (valueFromPayload === null || valueFromPayload === undefined) {
                sanitizedValue = (propKeyAsString === 'opacity') ? 1 : (propKeyAsString === 'fontSize' ? DEFAULT_FONT_SIZE : (propKeyAsString === 'letterSpacing' ? DEFAULT_LETTER_SPACING : 0) ) ; wasSanitized = true;
            }
        } else if (positiveNumericProps.includes(propKeyAsString as AnimatableProperty)) {
             if (typeof valueFromPayload === 'number' && (!Number.isFinite(valueFromPayload) || valueFromPayload < 0)) {
                 sanitizedValue = (elementBeforeUpdate as any)[propKey] ?? (propKeyAsString === 'scale' ? 1 : 0); wasSanitized = true;
             } else if (valueFromPayload === null || valueFromPayload === undefined) {
                 sanitizedValue = (propKeyAsString === 'scale' ? 1 : 0); wasSanitized = true;
             }
             if (propKeyAsString === 'scale' && sanitizedValue === 0) {
                sanitizedValue = 0.01; wasSanitized = true;
             }
        } else if (propKeyAsString === 'lineHeight') { 
            if (typeof valueFromPayload === 'number' && !Number.isFinite(valueFromPayload)) {
                sanitizedValue = (elementBeforeUpdate as any)[propKey] ?? DEFAULT_LINE_HEIGHT; wasSanitized = true;
            } else if (valueFromPayload === null || valueFromPayload === undefined) {
                 sanitizedValue = DEFAULT_LINE_HEIGHT; wasSanitized = true;
            }
        }

        if (wasSanitized && !skipHistory) {
            if (props[propKey] !== sanitizedValue) {
            }
        }
        (newPropsCombined as any)[propKey] = sanitizedValue;
    });

    if (elementBeforeUpdate.type === 'circle') {
        const circlePropsCombined = newPropsCombined as CircleElementProps;
        if (circlePropsCombined.rx !== undefined && circlePropsCombined.ry !== undefined && circlePropsCombined.rx === circlePropsCombined.ry) {
            circlePropsCombined.r = circlePropsCombined.rx;
        } else if (circlePropsCombined.rx !== undefined || circlePropsCombined.ry !== undefined) {
             circlePropsCombined.r = undefined;
        }
    }

    const updatedElement = newPropsCombined as SVGElementData;
    const updatedElements = [...state.elements];
    updatedElements[elementIndex] = updatedElement;

    let newAnimationTracks = [...state.animation.tracks];

    if (!skipHistory && id === state.selectedElementId && id !== state.artboard.id && !state.isPlaying) {
        const animatablePropsForElement = getElementAnimatableProperties(elementBeforeUpdate.type);
        for (const keyInPayload in props) {
            const currentPropKey = keyInPayload as string;
            if (nonKeyframedElementProps.includes(currentPropKey)) continue;

            const animProperty = currentPropKey === 'motionPathId' ? 'motionPath' : currentPropKey as AnimatableProperty;

            if (elementBeforeUpdate.type === 'circle' && animProperty === 'r' && ((props as Partial<CircleElementProps>).rx !== undefined || (props as Partial<CircleElementProps>).ry !== undefined) && (props as Partial<CircleElementProps>).r === undefined) {
                continue;
            }

            if (animatablePropsForElement.includes(animProperty)) {
                const committedValueFromUI = (newPropsCombined as any)[currentPropKey]; 
                let keyframeValueForStorage = committedValueFromUI;

                if (typeof committedValueFromUI === 'object' && committedValueFromUI !== null && (animProperty === 'fill' || animProperty === 'stroke')) {
                    const gradValue = committedValueFromUI as AnySVGGradient;
                    keyframeValueForStorage = { ...gradValue, id: `kf-grad-${Date.now()}-${Math.random().toString(16).slice(2,8)}`, stops: gradValue.stops.map(s => ({...s, id: s.id || generateUniqueId('stop')})) };
                } else if (animProperty === 'd' && Array.isArray(committedValueFromUI) && committedValueFromUI.every(item => typeof item === 'object' && 'x' in item && 'y' in item && 'id' in item)) {
                    keyframeValueForStorage = JSON.parse(JSON.stringify(committedValueFromUI));
                } else if (elementBeforeUpdate.type === 'text' && (animProperty === 'width' || animProperty === 'height')) {
                    if (committedValueFromUI === undefined || committedValueFromUI === null || (typeof committedValueFromUI === 'number' && !Number.isFinite(committedValueFromUI))) {
                        keyframeValueForStorage = undefined;
                    } else {
                        const numVal = Number(committedValueFromUI);
                        keyframeValueForStorage = numVal; 
                    }
                } else if (typeof committedValueFromUI !== 'string' && typeof committedValueFromUI !== 'number' && !Array.isArray(committedValueFromUI) && committedValueFromUI !== undefined) {
                    continue;
                } else if (committedValueFromUI === undefined && animProperty !== 'r' && !(elementBeforeUpdate.type === 'text' && (animProperty === 'width' || animProperty === 'height'))) {
                    continue;
                }
                if ((animProperty === 'fill' || animProperty === 'stroke') && keyframeValueForStorage === null) keyframeValueForStorage = 'none';
                if (animProperty === 'motionPath' && keyframeValueForStorage === null) keyframeValueForStorage = '';

                const trackIndex = newAnimationTracks.findIndex(t => t.elementId === id && t.property === animProperty);
                const targetTime = state.currentTime;
                const trackKeyframesBeforeUpdate = trackIndex > -1 ? newAnimationTracks[trackIndex].keyframes : [];

                let baseValueForInterpolation: Keyframe['value'] | undefined;
                let baseElementPropValue: any;
                if (elementBeforeUpdate.type === 'circle' && (animProperty === 'r' || animProperty === 'rx' || animProperty === 'ry')) {
                    baseElementPropValue = (elementBeforeUpdate as CircleElementProps)[animProperty as 'r' | 'rx' | 'ry'];
                } else if (elementBeforeUpdate.type === 'text' && (animProperty === 'width' || animProperty === 'height')) {
                    baseElementPropValue = (elementBeforeUpdate as TextElementProps)[animProperty as 'width' | 'height']; 
                } else {
                    baseElementPropValue = (elementBeforeUpdate as any)[animProperty];
                }


                if (baseElementPropValue !== undefined) {
                    if (animProperty === 'd' && Array.isArray(baseElementPropValue)) {
                        baseValueForInterpolation = JSON.parse(JSON.stringify(baseElementPropValue));
                    } else if (typeof baseElementPropValue !== 'boolean' && typeof baseElementPropValue !== 'function') {
                        baseValueForInterpolation = baseElementPropValue as Keyframe['value'];
                    }
                } else { 
                    if (elementBeforeUpdate.type === 'text' && (animProperty === 'width' || animProperty === 'height')) {
                         baseValueForInterpolation = undefined; 
                    } else if (animProperty === 'opacity' || animProperty === 'scale') baseValueForInterpolation = 1;
                    else if (numericPropsRequiringFinite.includes(animProperty) || positiveNumericProps.includes(animProperty) || animProperty === 'lineHeight') baseValueForInterpolation = (animProperty === 'lineHeight' ? DEFAULT_LINE_HEIGHT : 0);
                    else if (elementBeforeUpdate.type === 'circle' && (animProperty === 'r' || animProperty === 'rx' || animProperty === 'ry')) {
                         baseValueForInterpolation = DEFAULT_CIRCLE_R;
                    }
                    else if (animProperty === 'fill' || animProperty === 'stroke') baseValueForInterpolation = 'none';
                    else if (animProperty === 'text') baseValueForInterpolation = '';
                    else if (animProperty === 'd') baseValueForInterpolation = '';
                }

                const interpolatedValueAtTargetTime = interpolateValue(trackKeyframesBeforeUpdate, targetTime, baseValueForInterpolation, animProperty);
                const valuesDiffer = JSON.stringify(interpolatedValueAtTargetTime) !== JSON.stringify(keyframeValueForStorage);
                let existingKeyframeAtIndex = trackKeyframesBeforeUpdate.findIndex(kf => Math.abs(kf.time - targetTime) < 0.001);

                if (valuesDiffer || existingKeyframeAtIndex === -1) {
                    const newKeyframeEntry: Keyframe = { time: targetTime, value: keyframeValueForStorage, easing: DEFAULT_KEYFRAME_EASING, freeze: false };
                    if (trackIndex > -1) {
                        const updatedKeyframesForTrack = [...trackKeyframesBeforeUpdate];
                        if (existingKeyframeAtIndex > -1) { updatedKeyframesForTrack[existingKeyframeAtIndex] = newKeyframeEntry; }
                        else { updatedKeyframesForTrack.push(newKeyframeEntry); updatedKeyframesForTrack.sort((a, b) => a.time - b.time); }
                        newAnimationTracks[trackIndex] = { ...newAnimationTracks[trackIndex], keyframes: updatedKeyframesForTrack};
                    } else { newAnimationTracks.push({ elementId: id, property: animProperty, keyframes: [newKeyframeEntry] }); }
                }
            }
        }
    }

    const updatedStateSlice: Partial<AppState> = { elements: updatedElements, animation: { ...state.animation, tracks: newAnimationTracks } };
    if (state.previewTarget && state.previewTarget.elementId === id) {
        const updatedPropKey = Object.keys(props)[0] as AnimatableProperty;
        if (state.previewTarget.property === updatedPropKey) {
            updatedStateSlice.previewTarget = null;
            updatedStateSlice.previewGradient = null;
            updatedStateSlice.previewSolidColor = null;
        }
    }

    const propsChanged = Object.keys(props).join(', ');
    return {
        updatedStateSlice,
        actionDescriptionForHistory: skipHistory ? undefined : `Update ${propsChanged} of ${elementBeforeUpdate.name || elementBeforeUpdate.id}`,
        newSvgCode: skipHistory ? undefined : generateSvgStringForEditor(updatedElements, state.artboard),
        skipHistoryRecording: skipHistory
    };
}

export function handleUpdateElementName(state: AppState, payload: Extract<AppAction, { type: 'UPDATE_ELEMENT_NAME' }>['payload']): SubReducerResult {
    const { id, name } = payload;
    const elementToUpdate = state.elements.find(el => el.id === id);
    if (!elementToUpdate) return { updatedStateSlice: {} };
    const newElements = state.elements.map(el => el.id === id ? {...el, name } : el);
    return {
        updatedStateSlice: { elements: newElements },
        actionDescriptionForHistory: `Rename ${elementToUpdate.name || id} to ${name}`,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleDeleteElement(state: AppState, payload: Extract<AppAction, { type: 'DELETE_ELEMENT' }>['payload']): SubReducerResult {
    const idToDelete = payload;
    const elementToRemove = state.elements.find(el => el.id === idToDelete);
    if (!elementToRemove) return { updatedStateSlice: {} };

    let idsToDelete = new Set<string>([idToDelete]);
    if (elementToRemove.type === 'group') {
        const findDescendants = (parentId: string) => {
            state.elements.forEach(el => {
                if (el.parentId === parentId) { idsToDelete.add(el.id); if (el.type === 'group') findDescendants(el.id); }
            });
        };
        findDescendants(idToDelete);
    }
    const newElements = state.elements.filter(el => !idsToDelete.has(el.id));
    let newSelectedElementId = state.selectedElementId;
    if (idsToDelete.has(state.selectedElementId || '')) {
        newSelectedElementId = newElements.length > 0 ? newElements[0].id : state.artboard.id;
    }
    const newAnimationTracks = state.animation.tracks.filter(track => !idsToDelete.has(track.elementId));
    const newExpandedGroupIds = new Set(state.expandedGroupIds);
    idsToDelete.forEach(id => newExpandedGroupIds.delete(id));

    return {
        updatedStateSlice: { elements: newElements, animation: { ...state.animation, tracks: newAnimationTracks }, selectedElementId: newSelectedElementId, expandedGroupIds: newExpandedGroupIds },
        actionDescriptionForHistory: `Delete ${elementToRemove.name || elementToRemove.id} ${idsToDelete.size > 1 ? `and ${idsToDelete.size-1} children` : ''}`,
        newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
    };
}

export function handleReparentElement(state: AppState, payload: Extract<AppAction, { type: 'REPARENT_ELEMENT' }>['payload']): SubReducerResult {
    const { elementId, newParentId } = payload;
    const elementToMove = state.elements.find(el => el.id === elementId);
    if (!elementToMove) return { updatedStateSlice: {} };

    const oldParentId = elementToMove.parentId;
    const otherElementsInNewParent = state.elements.filter(el => el.id !== elementId && el.parentId === newParentId);
    const finalElementOrder = getNextOrderUtil(otherElementsInNewParent, newParentId, state.artboard.id);

    let updatedElements = state.elements.map(el =>
        el.id === elementId ? { ...el, parentId: newParentId, order: finalElementOrder } : el
    );
    updatedElements = reorderSiblingsAndNormalize(updatedElements, newParentId, state.artboard.id);
    if (oldParentId !== newParentId) {
        updatedElements = reorderSiblingsAndNormalize(updatedElements, oldParentId, state.artboard.id);
    }

    const parentName = newParentId ? (state.elements.find(el => el.id === newParentId)?.name || newParentId) : "Artboard Root";
    return {
        updatedStateSlice: { elements: updatedElements },
        actionDescriptionForHistory: `Move ${elementToMove.name || elementToMove.id} to ${parentName}`,
        newSvgCode: generateSvgStringForEditor(updatedElements, state.artboard)
    };
}

export function handleMoveElementInHierarchy(state: AppState, payload: Extract<AppAction, { type: 'MOVE_ELEMENT_IN_HIERARCHY' }>['payload']): SubReducerResult {
    const { draggedId, targetId, position } = payload;
    let workingElements = [...state.elements];
    const draggedElement = workingElements.find(el => el.id === draggedId);
    if (!draggedElement) return { updatedStateSlice: {} };

    const oldParentId = draggedElement.parentId;
    let newParentId: string | null = null;
    let tempOrder: number;

    const targetElement = targetId ? workingElements.find(el => el.id === targetId) : null;
    const targetOrder = targetElement ? targetElement.order : 0; 

    if (position === 'inside') {
        newParentId = targetId; 
        tempOrder = getNextOrderUtil(workingElements.filter(el => el.parentId === newParentId && el.id !== draggedId), newParentId, state.artboard.id);
    } else {
        newParentId = targetElement ? targetElement.parentId : null; 
        if (targetElement) {
            if (position === 'before') { 
                tempOrder = targetOrder + 0.5;
            } else { 
                tempOrder = targetOrder - 0.5;
            }
        } else { 
            tempOrder = getNextOrderUtil(workingElements.filter(el => el.parentId === newParentId && el.id !== draggedId), newParentId, state.artboard.id);
        }
    }

    const draggedIndex = workingElements.findIndex(el => el.id === draggedId);
    workingElements[draggedIndex] = { ...draggedElement, parentId: newParentId, order: tempOrder };

    let finalElements = reorderSiblingsAndNormalize(workingElements, newParentId, state.artboard.id);
    if (oldParentId !== newParentId) {
        finalElements = reorderSiblingsAndNormalize(finalElements, oldParentId, state.artboard.id);
    }

    const updatedStateSlice: Partial<AppState> = { elements: finalElements };
    if (position === 'inside' && targetId && targetElement?.type === 'group') {
        const newExpandedGroupIds = new Set(state.expandedGroupIds);
        newExpandedGroupIds.add(targetId);
        updatedStateSlice.expandedGroupIds = newExpandedGroupIds;
    }

    return {
        updatedStateSlice,
        actionDescriptionForHistory: `Reorder ${draggedElement.name || draggedElement.id}`,
        newSvgCode: generateSvgStringForEditor(finalElements, state.artboard)
    };
}


export function handleGroupElement(state: AppState, payload: Extract<AppAction, { type: 'GROUP_ELEMENT' }>['payload']): SubReducerResult {
    const { elementId } = payload;
    const elementToGroup = state.elements.find(el => el.id === elementId);
    if (!elementToGroup || elementToGroup.type === 'group') return { updatedStateSlice: {} };

    const newGroupId = generateUniqueId('group');
    const accTransform = getAccumulatedTransform(elementToGroup.id, state.elements);

    const newGroup: GroupElementProps = {
        id: newGroupId, artboardId: elementToGroup.artboardId, type: 'group',
        name: `${DEFAULT_GROUP_NAME} ${state.elements.filter(e => e.type === 'group').length + 1}`,
        parentId: elementToGroup.parentId,
        order: elementToGroup.order,
        x: accTransform.x, y: accTransform.y, rotation: accTransform.rotation, scale: 1,
        skewX: DEFAULT_GROUP_SKEW_X, skewY: DEFAULT_GROUP_SKEW_Y, 
        opacity: DEFAULT_OPACITY,
        motionPathId: null, alignToPath: false,
        motionPathStart: DEFAULT_MOTION_PATH_START, motionPathEnd: DEFAULT_MOTION_PATH_END,
        motionPathOffsetX: DEFAULT_MOTION_PATH_OFFSET_X, motionPathOffsetY: DEFAULT_MOTION_PATH_OFFSET_Y,
    };
    const updatedElement = {
        ...elementToGroup, parentId: newGroupId, order: 0,
        x: 0, y: 0, rotation: 0, scale: accTransform.scale,
        skewX: elementToGroup.skewX || DEFAULT_SKEW_X, 
        skewY: elementToGroup.skewY || DEFAULT_SKEW_Y,
    };

    const newElements = state.elements.map(el => el.id === elementId ? updatedElement : el);
    newElements.push(newGroup);

    let finalElements = reorderSiblingsAndNormalize(newElements, newGroup.parentId, state.artboard.id);
    finalElements = reorderSiblingsAndNormalize(finalElements, newGroupId, state.artboard.id);

    const newExpandedGroupIds = new Set(state.expandedGroupIds);
    newExpandedGroupIds.add(newGroupId);

    return {
        updatedStateSlice: { elements: finalElements, selectedElementId: newGroupId, expandedGroupIds: newExpandedGroupIds },
        actionDescriptionForHistory: `Group ${elementToGroup.name || elementToGroup.id}`,
        newSvgCode: generateSvgStringForEditor(finalElements, state.artboard)
    };
}

export function handleUngroupElement(state: AppState, payload: Extract<AppAction, { type: 'UNGROUP_ELEMENT' }>['payload']): SubReducerResult {
    const { groupId } = payload;
    const groupToUngroup = state.elements.find(el => el.id === groupId && el.type === 'group') as GroupElementProps | undefined;
    if (!groupToUngroup) return { updatedStateSlice: {} };

    const childrenOfGroup = state.elements.filter(el => el.parentId === groupId);
    if (childrenOfGroup.length === 0) {
        const newElements = state.elements.filter(el => el.id !== groupId);
        return {
            updatedStateSlice: { elements: newElements, selectedElementId: groupToUngroup.parentId || state.artboard.id },
            actionDescriptionForHistory: `Delete Empty Group: ${groupToUngroup.name || groupId}`,
            newSvgCode: generateSvgStringForEditor(newElements, state.artboard)
        };
    }

    const groupTransform: Required<Pick<GroupElementProps, 'x' | 'y' | 'rotation' | 'scale' | 'skewX' | 'skewY'>> = {
        x: groupToUngroup.x ?? 0, y: groupToUngroup.y ?? 0,
        rotation: groupToUngroup.rotation ?? 0, scale: groupToUngroup.scale ?? 1,
        skewX: groupToUngroup.skewX ?? 0, skewY: groupToUngroup.skewY ?? 0,
    };

    const updatedChildren = childrenOfGroup.map(child => {
        const childX = child.x ?? 0; const childY = child.y ?? 0;
        const childRot = child.rotation ?? 0; const childScale = child.scale ?? 1;
        const childSkewX = child.skewX ?? 0; const childSkewY = child.skewY ?? 0;
        
        let newX = childX * groupTransform.scale;
        let newY = childY * groupTransform.scale;
        
        if (groupTransform.rotation !== 0) {
            const angleRad = groupTransform.rotation * (Math.PI / 180);
            const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
            const rotatedX = newX * cosA - newY * sinA;
            const rotatedY = newX * sinA + newY * cosA;
            newX = rotatedX; newY = rotatedY;
        }
        newX += groupTransform.x; newY += groupTransform.y;
        return {
            ...child, parentId: groupToUngroup.parentId, order: groupToUngroup.order + (child.order * 0.01),
            x: newX, y: newY, 
            rotation: (childRot + groupTransform.rotation) % 360, 
            scale: childScale * groupTransform.scale,
            skewX: childSkewX + groupTransform.skewX, 
            skewY: childSkewY + groupTransform.skewY,
        };
    });

    let elementsWithoutGroup = state.elements.filter(el => el.id !== groupId && el.parentId !== groupId);
    elementsWithoutGroup.push(...updatedChildren);
    let finalElements = reorderSiblingsAndNormalize(elementsWithoutGroup, groupToUngroup.parentId, state.artboard.id);

    return {
        updatedStateSlice: { elements: finalElements, selectedElementId: childrenOfGroup[0]?.id || groupToUngroup.parentId || state.artboard.id },
        actionDescriptionForHistory: `Ungroup: ${groupToUngroup.name || groupId}`,
        newSvgCode: generateSvgStringForEditor(finalElements, state.artboard)
    };
}

export function handleBringToFront(state: AppState, payload: string): SubReducerResult {
    const elementId = payload;
    const element = state.elements.find(el => el.id === elementId);
    if (!element) return { updatedStateSlice: {} };
    const siblings = state.elements.filter(el => el.parentId === element.parentId && el.artboardId === element.artboardId && el.id !== elementId);
    const newOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order), -1) + 1 : 0;
    let updatedElements = state.elements.map(el => el.id === elementId ? { ...el, order: newOrder } : el );
    updatedElements = reorderSiblingsAndNormalize(updatedElements, element.parentId, state.artboard.id);
    return {
        updatedStateSlice: { elements: updatedElements },
        actionDescriptionForHistory: `Bring to Front: ${element.name || element.id}`,
        newSvgCode: generateSvgStringForEditor(updatedElements, state.artboard)
    };
}

export function handleSendToBack(state: AppState, payload: string): SubReducerResult {
    const elementId = payload;
    const element = state.elements.find(el => el.id === elementId);
    if (!element) return { updatedStateSlice: {} };
    const siblings = state.elements.filter(el => el.parentId === element.parentId && el.artboardId === element.artboardId && el.id !== elementId);
    const newOrder = siblings.length > 0 ? Math.min(...siblings.map(s => s.order), Infinity) -1 : 0;
    let updatedElements = state.elements.map(el => el.id === elementId ? { ...el, order: newOrder } : el );
    updatedElements = reorderSiblingsAndNormalize(updatedElements, element.parentId, state.artboard.id);
    return {
        updatedStateSlice: { elements: updatedElements },
        actionDescriptionForHistory: `Send to Back: ${element.name || element.id}`,
        newSvgCode: generateSvgStringForEditor(updatedElements, state.artboard)
    };
}

export function handleBringForward(state: AppState, payload: string): SubReducerResult {
    const elementId = payload;
    const element = state.elements.find(el => el.id === elementId);
    if (!element) return { updatedStateSlice: {} };
    const siblings = state.elements.filter(el => el.parentId === element.parentId && el.artboardId === element.artboardId).sort((a, b) => a.order - b.order);
    const currentIndex = siblings.findIndex(el => el.id === elementId);
    if (currentIndex === -1 || currentIndex === siblings.length - 1) return { updatedStateSlice: {} }; 
    const elementToSwapWith = siblings[currentIndex + 1];
    let updatedElements = state.elements.map(el => {
        if (el.id === elementId) return { ...el, order: elementToSwapWith.order + 0.5 }; 
        return el;
    });
    updatedElements = reorderSiblingsAndNormalize(updatedElements, element.parentId, state.artboard.id);
    return {
        updatedStateSlice: { elements: updatedElements },
        actionDescriptionForHistory: `Bring Forward: ${element.name || element.id}`,
        newSvgCode: generateSvgStringForEditor(updatedElements, state.artboard)
    };
}

export function handleSendBackward(state: AppState, payload: string): SubReducerResult {
    const elementId = payload;
    const element = state.elements.find(el => el.id === elementId);
    if (!element) return { updatedStateSlice: {} };
    const siblings = state.elements.filter(el => el.parentId === element.parentId && el.artboardId === element.artboardId).sort((a, b) => a.order - b.order);
    const currentIndex = siblings.findIndex(el => el.id === elementId);
    if (currentIndex === -1 || currentIndex === 0) return { updatedStateSlice: {} }; 
    const elementToSwapWith = siblings[currentIndex - 1];
    let updatedElements = state.elements.map(el => {
        if (el.id === elementId) return { ...el, order: elementToSwapWith.order - 0.5 }; 
        return el;
    });
    updatedElements = reorderSiblingsAndNormalize(updatedElements, element.parentId, state.artboard.id);
    return {
        updatedStateSlice: { elements: updatedElements },
        actionDescriptionForHistory: `Send Backward: ${element.name || element.id}`,
        newSvgCode: generateSvgStringForEditor(updatedElements, state.artboard)
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
            const parseResult = parseDStringToStructuredPoints(pathEl.d);
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
        // Auto-keyframe logic might need adjustment if 'd' values are complex
        // finalAnimationTracks = autoKeyframePathD(state, newPathElement.id, newStructuredPoints, finalAnimationTracks);
        // if (JSON.stringify(finalAnimationTracks) !== JSON.stringify(state.animation.tracks)) {
        //     actionDescription = `${actionDescription} & Keyframe Path`;
        // }
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
