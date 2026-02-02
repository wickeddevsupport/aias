
// utils/animationUtils.ts

import { Keyframe, SVGElementData, SVGElementType, AnimatableProperty, ALL_ANIMATABLE_PROPERTIES, GroupElementProps, AnySVGGradient, LinearSVGGradient, RadialSVGGradient, GradientStop, EASING_FUNCTIONS, BezierPoint, CustomBezierPoints, STANDARD_EASE_TO_BEZIER_MAP } from '../types'; // Added BezierPoint & CustomBezierPoints
import { colord, extend, Colord } from 'colord';
import namesPlugin from 'colord/plugins/names';
import lchPlugin from 'colord/plugins/lch';
import { DEFAULT_GRADIENT_ANGLE, DEFAULT_RADIAL_CX, DEFAULT_RADIAL_CY, DEFAULT_RADIAL_R, DEFAULT_RADIAL_FR, DEFAULT_RADIAL_FX, DEFAULT_RADIAL_FY } from '../constants';

extend([namesPlugin, lchPlugin]);

// Easing Functions (Robert Penner's Easing Functions)
const easeInSine = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInQuad = (t: number) => t * t;
const easeOutQuad = (t: number) => t * (2 - t);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => --t * t * t + 1;
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
const easeInQuart = (t: number) => t * t * t * t;
const easeOutQuart = (t: number) => 1 - --t * t * t * t;
const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
const easeInQuint = (t: number) => t * t * t * t * t;
const easeOutQuint = (t: number) => 1 + --t * t * t * t * t;
const easeInOutQuint = (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
const easeInExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutExpo = (t: number) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
const easeInCirc = (t: number) => 1 - Math.sqrt(1 - t * t);
const easeOutCirc = (t: number) => Math.sqrt(1 - --t * t);
const easeInOutCirc = (t: number) => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
const easeInBack = (t: number, s = 1.70158) => t * t * ((s + 1) * t - s);
const easeOutBack = (t: number, s = 1.70158) => --t * t * ((s + 1) * t + s) + 1;
const easeInOutBack = (t: number, s = 1.70158) => (t /= 0.5) < 1 ? 0.5 * (t * t * (((s *= 1.525) + 1) * t - s)) : 0.5 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);
const easeInElastic = (t: number, a = 1, period = 0.3) => t === 0 ? 0 : t === 1 ? 1 : -a * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period);
const easeOutElastic = (t: number, a = 1, period = 0.3) => t === 0 ? 0 : t === 1 ? 1 : a * Math.pow(2, -10 * t) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period) + 1;
const easeInOutElastic = (t: number, a = 1, period = 0.5) => t === 0 ? 0 : (t /= 0.5) === 2 ? 1 : t < 1 ? -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period)) : a * Math.pow(2, -10 * (t -= 1)) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period) * 0.5 + 1;
const easeOutBounce = (t: number): number => {
  let val = t; // Use a local variable for calculations
  if (val < 1 / 2.75) {
    return 7.5625 * val * val;
  } else if (val < 2 / 2.75) {
    val -= 1.5 / 2.75;
    return 7.5625 * val * val + 0.75;
  } else if (val < 2.5 / 2.75) {
    val -= 2.25 / 2.75;
    return 7.5625 * val * val + 0.9375;
  } else {
    val -= 2.625 / 2.75;
    return 7.5625 * val * val + 0.984375;
  }
};
const easeInBounce = (t: number) => 1 - easeOutBounce(1 - t);
const easeInOutBounce = (t: number) => t < 0.5 ? easeInBounce(t * 2) * 0.5 : easeOutBounce(t * 2 - 1) * 0.5 + 0.5;


const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number) => {
  // Newton's method for solving cubic Bezier parameter
  const newtonRaphsonIterate = (aX: number, aGuessT: number) => {
    for (let i = 0; i < 4; ++i) {
      const currentSlope = 3 * (1 - aGuessT) * (1 - aGuessT) * p1x + 6 * (1 - aGuessT) * aGuessT * (p2x - p1x) + 3 * aGuessT * aGuessT * (1 - p2x);
      if (currentSlope === 0.0) return aGuessT;
      const currentX = (1 - aGuessT) * (1 - aGuessT) * (1 - aGuessT) * 0 + 3 * (1 - aGuessT) * (1 - aGuessT) * aGuessT * p1x + 3 * (1 - aGuessT) * aGuessT * aGuessT * p2x + aGuessT * aGuessT * aGuessT * 1;
      aGuessT -= (currentX - aX) / currentSlope;
    }
    return aGuessT;
  };

  return (t: number) => {
    if (t === 0 || t === 1) return t;
    const aGuessT = newtonRaphsonIterate(t, t);
    return (1 - aGuessT) * (1 - aGuessT) * (1 - aGuessT) * 0 + 3 * (1 - aGuessT) * (1 - aGuessT) * aGuessT * p1y + 3 * (1 - aGuessT) * aGuessT * aGuessT * p2y + aGuessT * aGuessT * aGuessT * 1;
  };
};


export const applyEasing = (progress: number, easing?: string): number => {
  if (!easing || easing === 'linear') return progress;
  switch (easing) {
    case 'easeInSine': return easeInSine(progress);
    case 'easeOutSine': return easeOutSine(progress);
    case 'easeInOutSine': return easeInOutSine(progress);
    case 'easeInQuad': return easeInQuad(progress);
    case 'easeOutQuad': return easeOutQuad(progress);
    case 'easeInOutQuad': return easeInOutQuad(progress);
    case 'easeInCubic': return easeInCubic(progress);
    case 'easeOutCubic': return easeOutCubic(progress);
    case 'easeInOutCubic': return easeInOutCubic(progress);
    case 'easeInQuart': return easeInQuart(progress);
    case 'easeOutQuart': return easeOutQuart(progress);
    case 'easeInOutQuart': return easeInOutQuart(progress);
    case 'easeInQuint': return easeInQuint(progress);
    case 'easeOutQuint': return easeOutQuint(progress);
    case 'easeInOutQuint': return easeInOutQuint(progress);
    case 'easeInExpo': return easeInExpo(progress);
    case 'easeOutExpo': return easeOutExpo(progress);
    case 'easeInOutExpo': return easeInOutExpo(progress);
    case 'easeInCirc': return easeInCirc(progress);
    case 'easeOutCirc': return easeOutCirc(progress);
    case 'easeInOutCirc': return easeInOutCirc(progress);
    case 'easeInBack': return easeInBack(progress);
    case 'easeOutBack': return easeOutBack(progress);
    case 'easeInOutBack': return easeInOutBack(progress);
    case 'easeInElastic': return easeInElastic(progress);
    case 'easeOutElastic': return easeOutElastic(progress);
    case 'easeInOutElastic': return easeInOutElastic(progress);
    case 'easeInBounce': return easeInBounce(progress);
    case 'easeOutBounce': return easeOutBounce(progress);
    case 'easeInOutBounce': return easeInOutBounce(progress);
    case 'step-start': return progress === 0 ? 0 : 1;
    case 'step-end': return progress === 1 ? 1 : 0;
    default:
      if (easing.startsWith('cubic-bezier(')) {
        try {
          const paramsMatch = easing.match(/cubic-bezier\(([^)]+)\)/);
          if (paramsMatch && paramsMatch[1]) {
            const params = paramsMatch[1].split(',').map(p => parseFloat(p.trim()));
            if (params.length === 4) {
              return cubicBezier(params[0], params[1], params[2], params[3])(progress);
            }
          }
        } catch (e) { /* Fallback to linear */ }
      }
      return progress; // Fallback for unknown or malformed custom
  }
};

const interpolateNumeric = (v1: number | undefined, v2: number | undefined, p: number): number | undefined => {
    // If either value is undefined, it's treated as a step transition
    if (v1 === undefined && v2 === undefined) return undefined;
    if (v1 === undefined) return p >= 0.5 ? v2 : undefined;
    if (v2 === undefined) return p < 0.5 ? v1 : undefined;
    // Both are numbers
    return v1 + (v2 - v1) * p;
};


const parsePercentageStringToFloat = (percentString: string | undefined, defaultValue: number): number => {
    if (typeof percentString === 'string' && percentString.endsWith('%')) {
        const num = parseFloat(percentString.slice(0, -1));
        return isNaN(num) ? defaultValue : num;
    }
    const num = parseFloat(String(percentString));
    return isNaN(num) ? defaultValue : num;
};
const parseFloatToPercentageString = (value: number): string => `${value.toFixed(2)}%`;


const interpolateColor = (c1Str: string, c2Str: string, p: number): string => {
  const color1 = colord(c1Str);
  const color2 = colord(c2Str);
  if (!color1.isValid() || !color2.isValid()) return p < 0.5 ? c1Str : c2Str; // fallback
  const r = interpolateNumeric(color1.rgba.r, color2.rgba.r, p)!; // Assumes number if valid
  const g = interpolateNumeric(color1.rgba.g, color2.rgba.g, p)!;
  const b = interpolateNumeric(color1.rgba.b, color2.rgba.b, p)!;
  const a = interpolateNumeric(color1.rgba.a, color2.rgba.a, p)!;
  return colord({ r: Math.round(r), g: Math.round(g), b: Math.round(b), a }).toRgbString();
};

const interpolateStops = (stops1: GradientStop[], stops2: GradientStop[], p: number): GradientStop[] => {
  if (stops1.length !== stops2.length) return p < 1 ? stops1 : stops2; // Basic fallback, could be smarter
  return stops1.map((stop1, i) => {
    const stop2 = stops2[i];
    if (!stop2) return stop1; // Should not happen if lengths are equal
    return {
      id: stop1.id, // Keep original ID for stability if possible, or generate new if needed
      offset: interpolateNumeric(stop1.offset, stop2.offset, p)!, // Assumes number
      color: interpolateColor(stop1.color, stop2.color, p),
    };
  });
};

// Fix: Refactored interpolateGradient for type safety
const interpolateGradient = (grad1: AnySVGGradient, grad2: AnySVGGradient, p: number): AnySVGGradient => {
  if (grad1.type !== grad2.type) {
    // @ts-ignore - _isCrossfade is a temporary flag for the rendering logic
    return { ...(p < 1 ? grad1 : grad2), _isCrossfade: true, from: grad1, to: grad2, progress: p };
  }

  const interpolatedStops = interpolateStops(grad1.stops, grad2.stops, p);
  const commonProps = {
    id: `temp-grad-${Date.now()}-${Math.random().toString(16).slice(2,8)}`, // Temporary ID for preview
    stops: interpolatedStops,
    gradientUnits: grad1.gradientUnits || grad2.gradientUnits || 'objectBoundingBox',
  };

  if (grad1.type === 'linearGradient' && grad2.type === 'linearGradient') {
    // grad1 and grad2 are now correctly typed as LinearSVGGradient
    return {
      ...commonProps,
      type: 'linearGradient',
      angle: interpolateNumeric(grad1.angle ?? DEFAULT_GRADIENT_ANGLE, grad2.angle ?? DEFAULT_GRADIENT_ANGLE, p)!, // Assumes number
    } as LinearSVGGradient;
  } else if (grad1.type === 'radialGradient' && grad2.type === 'radialGradient') {
    // grad1 and grad2 are now correctly typed as RadialSVGGradient
    return {
      ...commonProps,
      type: 'radialGradient',
      cx: parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.cx, 50), parsePercentageStringToFloat(grad2.cx, 50), p)!),
      cy: parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.cy, 50), parsePercentageStringToFloat(grad2.cy, 50), p)!),
      r: parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.r, 50), parsePercentageStringToFloat(grad2.r, 50), p)!),
      fx: parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.fx, parsePercentageStringToFloat(grad1.cx, 50)), parsePercentageStringToFloat(grad2.fx, parsePercentageStringToFloat(grad2.cx, 50)), p)!),
      fy: parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.fy, parsePercentageStringToFloat(grad1.cy, 50)), parsePercentageStringToFloat(grad2.fy, parsePercentageStringToFloat(grad2.cy, 50)), p)!),
      fr: parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.fr, 0), parsePercentageStringToFloat(grad2.fr, 0), p)!),
    } as RadialSVGGradient;
  }
  // Fallback, though theoretically unreachable if grad1.type === grad2.type and types are only linear/radial
  return { ...(p < 1 ? grad1 : grad2) } as AnySVGGradient;
};

const interpolateBezierPoints = (points1: BezierPoint[], points2: BezierPoint[], p: number): BezierPoint[] => {
  if (points1.length !== points2.length) {
    console.warn("BezierPoint arrays have different lengths. Morphing will show the start shape until the end of the segment, then switch to the end shape.");
    // This creates a "step-end" behavior for the shape if point counts differ.
    return (p >= 1.0) ? points2 : points1;
  }

  return points1.map((pt1, i) => {
    const pt2 = points2[i];
    if (!pt2) return pt1; // Should not happen if lengths are equal

    return {
      id: pt1.id, 
      x: interpolateNumeric(pt1.x, pt2.x, p)!, // Assumes number
      y: interpolateNumeric(pt1.y, pt2.y, p)!, // Assumes number
      h1x: pt1.h1x !== undefined && pt2.h1x !== undefined ? interpolateNumeric(pt1.h1x, pt2.h1x, p) : undefined,
      h1y: pt1.h1y !== undefined && pt2.h1y !== undefined ? interpolateNumeric(pt1.h1y, pt2.h1y, p) : undefined,
      h2x: pt1.h2x !== undefined && pt2.h2x !== undefined ? interpolateNumeric(pt1.h2x, pt2.h2x, p) : undefined,
      h2y: pt1.h2y !== undefined && pt2.h2y !== undefined ? interpolateNumeric(pt1.h2y, pt2.h2y, p) : undefined,
      isSmooth: pt1.isSmooth, 
      isSelected: false, 
    };
  });
};


export const interpolateValue = (keyframes: Keyframe[], time: number, defaultValue: any, property?: AnimatableProperty): any => {
  if (!keyframes || keyframes.length === 0) {
    if (defaultValue === undefined && property) {
        const numericProps: AnimatableProperty[] = ['x', 'y', 'r', 'rx', 'ry', 'opacity', 'rotation', 'scale', 'strokeWidth', 'strokeDashoffset', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY', 'drawStartPercent', 'drawEndPercent', 'fontSize', 'letterSpacing', 'lineHeight'];
        // Text width/height can be undefined (auto), so don't default them to 0 here.
        if (numericProps.includes(property)) {
            if (property === 'opacity' || property === 'scale') return 1;
            if (property === 'drawEndPercent') return 1;
            if (property === 'fontSize') return 16; // Default font size
            return 0;
        }
        if (property === 'width' || property === 'height') return undefined; // Default for text width/height is auto
        if (property === 'text') return 'Hello'; // Default text
        if (property === 'textPath') return null; // Default textPath
    }
    return defaultValue;
  }
  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  if (time <= sortedKeyframes[0].time) return sortedKeyframes[0].value;
  if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) return sortedKeyframes[sortedKeyframes.length - 1].value;

  let prevKeyframe = sortedKeyframes[0];
  let nextKeyframe = sortedKeyframes[sortedKeyframes.length - 1]; // Default to last if no intermediate found

  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    // Find the segment where time falls between keyframes
    if (sortedKeyframes[i].time <= time && sortedKeyframes[i+1].time >= time) {
      prevKeyframe = sortedKeyframes[i];
      nextKeyframe = sortedKeyframes[i+1];
      break;
    }
  }
  
  // If time exactly matches a keyframe, return that keyframe's value directly
  if (time === prevKeyframe.time) return prevKeyframe.value;
  if (time === nextKeyframe.time) return nextKeyframe.value;
  // At this point, prevKeyframe.time < time < nextKeyframe.time
  
  if (prevKeyframe.freeze) return prevKeyframe.value;

  const timeDiff = nextKeyframe.time - prevKeyframe.time;
  // timeDiff should not be 0 here because of the exact match checks above
  let progress = (time - prevKeyframe.time) / timeDiff;
  progress = applyEasing(progress, prevKeyframe.easing || 'linear');

  const val1 = prevKeyframe.value;
  const val2 = nextKeyframe.value;

  if (Array.isArray(val1) && val1.every(item => typeof item === 'object' && 'x' in item && 'y' in item) &&
      Array.isArray(val2) && val2.every(item => typeof item === 'object' && 'x' in item && 'y' in item)) {
    return interpolateBezierPoints(val1 as BezierPoint[], val2 as BezierPoint[], progress);
  }

  const val1IsGradientObj = typeof val1 === 'object' && val1 !== null && 'type' in val1 && 'stops' in val1;
  const val2IsGradientObj = typeof val2 === 'object' && val2 !== null && 'type' in val2 && 'stops' in val2;
  const val1IsColorStr = typeof val1 === 'string' && !val1.startsWith('url(#') && colord(val1).isValid();
  const val2IsColorStr = typeof val2 === 'string' && !val2.startsWith('url(#') && colord(val2).isValid();

  if (val1IsGradientObj && val2IsGradientObj) {
    return interpolateGradient(val1 as AnySVGGradient, val2 as AnySVGGradient, progress);
  } else if (val1IsColorStr && val2IsGradientObj) { 
    const grad2Val = val2 as AnySVGGradient;
    let typeSpecificDummyProps: Partial<LinearSVGGradient> | Partial<RadialSVGGradient>;
    if (grad2Val.type === 'linearGradient') {
        typeSpecificDummyProps = { angle: grad2Val.angle ?? DEFAULT_GRADIENT_ANGLE } as Partial<LinearSVGGradient>;
    } else { 
        typeSpecificDummyProps = {
            cx: grad2Val.cx ?? DEFAULT_RADIAL_CX, cy: grad2Val.cy ?? DEFAULT_RADIAL_CY, r: grad2Val.r ?? DEFAULT_RADIAL_R,
            fx: grad2Val.fx ?? DEFAULT_RADIAL_FX, fy: grad2Val.fy ?? DEFAULT_RADIAL_FY, fr: grad2Val.fr ?? DEFAULT_RADIAL_FR,
        } as Partial<RadialSVGGradient>;
    }
    const dummyGradient1: AnySVGGradient = {
        id: `dummy-from-${grad2Val.id || 'g2'}-${Date.now() % 1000}`,
        type: grad2Val.type,
        stops: grad2Val.stops.map(s => ({...s, color: val1 as string})),
        gradientUnits: grad2Val.gradientUnits || 'objectBoundingBox',
        ...typeSpecificDummyProps 
    };
    return interpolateGradient(dummyGradient1, grad2Val, progress);
  } else if (val1IsGradientObj && val2IsColorStr) { 
      const grad1Val = val1 as AnySVGGradient;
      let typeSpecificDummyProps: Partial<LinearSVGGradient> | Partial<RadialSVGGradient>;
      if (grad1Val.type === 'linearGradient') {
          typeSpecificDummyProps = { angle: grad1Val.angle ?? DEFAULT_GRADIENT_ANGLE } as Partial<LinearSVGGradient>;
      } else { 
          typeSpecificDummyProps = {
              cx: grad1Val.cx ?? DEFAULT_RADIAL_CX, cy: grad1Val.cy ?? DEFAULT_RADIAL_CY, r: grad1Val.r ?? DEFAULT_RADIAL_R,
              fx: grad1Val.fx ?? DEFAULT_RADIAL_FX, fy: grad1Val.fy ?? DEFAULT_RADIAL_FY, fr: grad1Val.fr ?? DEFAULT_RADIAL_FR,
          } as Partial<RadialSVGGradient>;
      }
      const dummyGradient2: AnySVGGradient = {
          id: `dummy-to-${grad1Val.id || 'g1'}-${Date.now() % 1000}`,
          type: grad1Val.type,
          stops: grad1Val.stops.map(s => ({...s, color: val2 as string})),
          gradientUnits: grad1Val.gradientUnits || 'objectBoundingBox',
          ...typeSpecificDummyProps 
      };
      return interpolateGradient(grad1Val, dummyGradient2, progress);
  }

  if (val1IsColorStr && val2IsColorStr) {
    return interpolateColor(val1 as string, val2 as string, progress);
  }
  // Handle numeric properties that can also be undefined (like text width/height)
  if ((property === 'width' || property === 'height') && (val1 === undefined || typeof val1 === 'number') && (val2 === undefined || typeof val2 === 'number')) {
    return interpolateNumeric(val1 as number | undefined, val2 as number | undefined, progress);
  }
  if (typeof val1 === 'number' && typeof val2 === 'number') {
    return interpolateNumeric(val1, val2, progress);
  }
  if (typeof val1 === 'string' && typeof val2 === 'string' && val1.startsWith('url(#') && val2.startsWith('url(#') && val1 === val2) {
    return val1; 
  }
  
  if (property === 'text' && typeof val1 === 'string' && typeof val2 === 'string') {
    // For text, typically step interpolation (no smooth transition of characters)
    return progress < 1 ? val1 : val2;
  }
  
  return prevKeyframe.value;
};


export const getElementAnimatableProperties = (elementType: SVGElementType): AnimatableProperty[] => {
  const commonProps: AnimatableProperty[] = ['x', 'y', 'fill', 'stroke', 'strokeWidth', 'opacity', 'rotation', 'scale', 'motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'];
  const pathLikeDrawProps: AnimatableProperty[] = ['strokeDasharray', 'strokeDashoffset', 'drawStartPercent', 'drawEndPercent'];

  switch (elementType) {
    case 'rect':
      return [...commonProps, 'width', 'height', ...pathLikeDrawProps];
    case 'circle':
      return [...commonProps, 'r', 'rx', 'ry', ...pathLikeDrawProps]; // Added rx, ry
    case 'path':
      return [...commonProps, 'd', ...pathLikeDrawProps];
    case 'group':
      // Groups typically don't have width/height/r/d, but share common transform/appearance props
      return ['x', 'y', 'fill', 'stroke', 'strokeWidth', 'opacity', 'rotation', 'scale', 'motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'];
    case 'text':
      return [...commonProps, 'width', 'height', 'fontSize', 'text', 'letterSpacing', 'lineHeight', 'textPath']; // Added 'width', 'height', 'textPath'
    case 'image':
      // Opacity is common, width/height are specific geometric. 'href' is static.
      return ['x', 'y', 'opacity', 'rotation', 'scale', 'width', 'height', 'motionPath', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY'];
    default:
      return [];
  }
};
