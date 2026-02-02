import Konva from 'konva';
import { AnySVGGradient, InterpolatedGradientUpdateData, SVGElementData, RadialSVGGradient, LinearSVGGradient, TextElementProps } from '../types';
import { DEFAULT_GRADIENT_ANGLE, DEFAULT_RADIAL_CX, DEFAULT_RADIAL_CY, DEFAULT_RADIAL_FR, DEFAULT_RADIAL_FX, DEFAULT_RADIAL_FY, DEFAULT_RADIAL_R } from '../constants';

export const parseDashArrayKonva = (dashArrayString: string | undefined): number[] | undefined => {
  if (!dashArrayString || typeof dashArrayString !== 'string' || dashArrayString.toLowerCase() === 'none') return undefined;

  const parts = dashArrayString.trim().split(/[\s,]+/);
  const numbers: number[] = [];

  for (const part of parts) {
    if (part.trim() === '') continue; 

    const num = parseFloat(part); 

    if (!isNaN(num) && Number.isFinite(num)) {
      numbers.push(num);
    }
  }
  return numbers.length > 0 ? numbers : undefined;
};

export const deriveKonvaLinearGradientPoints = (angleDegrees: number, width: number, height: number) => {
  const mathAngleRad = (angleDegrees - 90) * Math.PI / 180; // Konva's 0deg is horizontal right, SVG's is often vertical up or based on x1,y1,x2,y2
  const dx_unit = Math.cos(mathAngleRad);
  const dy_unit = Math.sin(mathAngleRad);

  // Start and end points relative to a 0-1 bounding box
  // These points define a line perpendicular to the gradient line, passing through the center
  const startX_rel = 0.5 - 0.5 * dx_unit;
  const startY_rel = 0.5 - 0.5 * dy_unit;
  const endX_rel = 0.5 + 0.5 * dx_unit;
  const endY_rel = 0.5 + 0.5 * dy_unit;
  
  return {
    startPoint: { x: startX_rel * width, y: startY_rel * height },
    endPoint: { x: endX_rel * width, y: endY_rel * height },
  };
};

export const parsePercentOrNumber = (val: string | number | undefined, relativeTo: number, defaultPercent?: number): number => {
  if (val === undefined) {
    return defaultPercent !== undefined ? (defaultPercent / 100) * relativeTo : 0;
  }
  if (typeof val === 'string') {
    if (val.endsWith('%')) {
      const num = parseFloat(val.slice(0, -1));
      return isNaN(num) ? (defaultPercent !== undefined ? (defaultPercent / 100) * relativeTo : 0) : (num / 100) * relativeTo;
    }
    const num = parseFloat(val);
    return isNaN(num) ? (defaultPercent !== undefined ? (defaultPercent / 100) * relativeTo : 0) : num;
  }
  return val; // Assuming it's already a number
};


export const deriveKonvaRadialGradientParams = (svgGradient: RadialSVGGradient, width: number, height: number) => {
  const referenceDimensionForR = (width + height) / 2; // Or Math.sqrt(width*width + height*height) / 2 for diagonal

  const cx_abs = parsePercentOrNumber(svgGradient.cx, width, parseFloat(DEFAULT_RADIAL_CX));
  const cy_abs = parsePercentOrNumber(svgGradient.cy, height, parseFloat(DEFAULT_RADIAL_CY));
  const r_abs = parsePercentOrNumber(svgGradient.r, referenceDimensionForR, parseFloat(DEFAULT_RADIAL_R));
  
  // Default fx/fy to cx/cy if not provided, then parse
  const fx_val = svgGradient.fx !== undefined ? svgGradient.fx : String(cx_abs/width * 100) + '%';
  const fy_val = svgGradient.fy !== undefined ? svgGradient.fy : String(cy_abs/height * 100) + '%';
  
  const fx_abs = parsePercentOrNumber(fx_val, width, parseFloat(DEFAULT_RADIAL_FX)); // fx defaults to cx
  const fy_abs = parsePercentOrNumber(fy_val, height, parseFloat(DEFAULT_RADIAL_FY)); // fy defaults to cy
  const fr_abs = parsePercentOrNumber(svgGradient.fr, r_abs, parseFloat(DEFAULT_RADIAL_FR)); // fr defaults to 0
  
  return {
    startPoint: { x: fx_abs, y: fy_abs }, // Konva startPoint is the inner circle center (fx, fy)
    endPoint: { x: cx_abs, y: cy_abs },   // Konva endPoint is the outer circle center (cx, cy)
    startRadius: fr_abs,                  // Konva startRadius is the inner circle radius (fr)
    endRadius: r_abs,                     // Konva endRadius is the outer circle radius (r)
  };
};

export function prepareFillStrokeKonvaAttributes(
    type: 'fill' | 'stroke',
    elementData: SVGElementData,
    konvaNode: Konva.Node, 
    initialGradientDefs: AnySVGGradient[],
    frameSpecificGradientUpdates?: InterpolatedGradientUpdateData[] 
): Konva.ShapeConfig {
    const attrs: Konva.ShapeConfig = {};
    const prefix = type;

    // Reset all gradient properties first
    attrs[prefix] = undefined; // Clear solid color
    attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = false; // Disable fill/stroke by default
    
    // Clear specific gradient type properties
    attrs[`${prefix}LinearGradientStartPoint`] = undefined;
    attrs[`${prefix}LinearGradientEndPoint`] = undefined;
    attrs[`${prefix}LinearGradientColorStops`] = undefined;
    attrs[`${prefix}RadialGradientStartPoint`] = undefined;
    attrs[`${prefix}RadialGradientEndPoint`] = undefined;
    attrs[`${prefix}RadialGradientStartRadius`] = undefined;
    attrs[`${prefix}RadialGradientEndRadius`] = undefined;
    attrs[`${prefix}RadialGradientColorStops`] = undefined;

    // Groups in Konva don't typically have their own fill/stroke that renders directly.
    // Their appearance is a result of their children. If we want groups to have a visual fill/stroke,
    // we'd need to add a background Rect to them. For now, skip direct fill/stroke for groups.
    if (konvaNode instanceof Konva.Group) {
        return attrs;
    }
    
    let sourceGradient: AnySVGGradient | null = null;
    let colorString: string | null = null;

    // Check for frame-specific overrides first (highest priority)
    // A frame update might be an array if it's a crossfade. We take the 'to' part.
    const frameUpdateArray = frameSpecificGradientUpdates?.filter(upd => 
      upd.targetDefId.includes(`-${elementData.id}-${type}`) // Match stable def ID part
    );
    const frameUpdate = frameUpdateArray && frameUpdateArray.length > 0 ? frameUpdateArray[frameUpdateArray.length - 1] : undefined; // Get the latest one if multiple (e.g. crossfade)
    
    if (frameUpdate) {
        sourceGradient = frameUpdate.data;
    }
    
    // If no frame update, check element's current gradientUpdates (from animation interpolation without preview)
    if (!sourceGradient) {
        const gradientUpdateForThisProp = elementData.gradientUpdates?.[type];
        if (gradientUpdateForThisProp) {
            // If it's an array (crossfade), pick the 'to' gradient (index 1 or 0 if only one)
            const actualUpdateData = Array.isArray(gradientUpdateForThisProp) ? (gradientUpdateForThisProp[1] || gradientUpdateForThisProp[0]) : gradientUpdateForThisProp;
            if (actualUpdateData) {
                sourceGradient = actualUpdateData.data;
            }
        }
    }
    
    // If still no gradient, use the base fill/stroke property from elementData
    if (!sourceGradient) {
        const propValue = elementData[type];
        if (typeof propValue === 'object' && propValue !== null && 'type' in (propValue as object) && 'stops' in (propValue as object)) {
            // The base property is a gradient object
            sourceGradient = propValue as AnySVGGradient;
        } else if (typeof propValue === 'string') {
            if (propValue.startsWith('url(#')) {
                const idFromUrl = propValue.substring(5, propValue.length - 1);
                // Try to find it in initial defs (static defs)
                sourceGradient = initialGradientDefs.find(def => def.id === idFromUrl) || null;
            } else if (propValue.toLowerCase() !== 'none' && propValue.trim() !== '') {
                // It's a solid color string
                colorString = propValue;
            }
        }
    }


    if (sourceGradient) {
        if (!sourceGradient.stops || !Array.isArray(sourceGradient.stops)) {
             attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = false;
        } else {
            const processedStops = sourceGradient.stops.map(stop => ({
                offset: Math.max(0, Math.min(1, typeof stop.offset === 'number' ? stop.offset : 0)),
                color: (typeof stop.color === 'string' && stop.color.trim()) ? stop.color : 'transparent', // Ensure color is a string
            })).sort((a, b) => a.offset - b.offset);
            
            if (processedStops.length === 0) {
                 attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = false;
            } else if (processedStops.length === 1) {
                // Single stop gradient: treat as solid color
                attrs[prefix] = processedStops[0].color;
                attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = !!attrs[prefix] && attrs[prefix] !== 'none';
            } else { 
                // Valid gradient with multiple stops
                const konvaColorStops = processedStops.flatMap(stop => [stop.offset, stop.color]);
                attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = true;
                attrs[prefix] = undefined; // Ensure solid color is not set

                let nodeWidth = 0, nodeHeight = 0, offsetX = 0, offsetY = 0;

                if (konvaNode instanceof Konva.Rect || konvaNode instanceof Konva.Image) { 
                    nodeWidth = konvaNode.width(); nodeHeight = konvaNode.height(); 
                } else if (konvaNode instanceof Konva.Circle) { 
                    nodeWidth = konvaNode.radius() * 2; nodeHeight = konvaNode.radius() * 2; 
                } else if (konvaNode instanceof Konva.Path) {
                    // For paths, Konva calculates bounding box based on data.
                    // The gradient should be relative to this bounding box if objectBoundingBox.
                    const pathData = konvaNode.data();
                    if (pathData) {
                        // Create a temporary path to measure if not already available
                        const tempMeasurePath = new Konva.Path({ data: pathData });
                        const selfRect = tempMeasurePath.getSelfRect(); // This is relative to the path's own (0,0)
                        nodeWidth = selfRect.width;
                        nodeHeight = selfRect.height;
                        offsetX = selfRect.x; // Offset of the path's content from its (0,0)
                        offsetY = selfRect.y;
                    }
                    if (nodeWidth === 0 && nodeHeight === 0) { nodeWidth = 100; nodeHeight = 100; } // Fallback for empty paths
                } else if (konvaNode instanceof Konva.Text) {
                    // For text, width/height might be auto or set.
                    nodeWidth = konvaNode.width(); nodeHeight = konvaNode.height();
                    if (nodeWidth === 0) nodeWidth = konvaNode.fontSize() * (elementData as TextElementProps).text.length * 0.6; // Rough estimate
                    if (nodeHeight === 0) nodeHeight = konvaNode.fontSize();
                } else {
                     // Fallback for other types if they have width/height methods
                     nodeWidth = konvaNode.width(); nodeHeight = konvaNode.height();
                     if (nodeWidth === 0 && nodeHeight === 0) { nodeWidth = 100; nodeHeight = 100; }
                }
                
                // If objectBoundingBox and dimensions are zero, gradient won't render correctly.
                if ((nodeWidth === 0 || nodeHeight === 0) && sourceGradient.gradientUnits !== 'userSpaceOnUse') {
                     attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = false;
                } else {
                    if (sourceGradient.type === 'linearGradient') {
                        const lg = sourceGradient as LinearSVGGradient;
                        const { startPoint, endPoint } = deriveKonvaLinearGradientPoints(lg.angle ?? DEFAULT_GRADIENT_ANGLE, nodeWidth, nodeHeight);
                        attrs[`${prefix}LinearGradientStartPoint`] = { x: startPoint.x + offsetX, y: startPoint.y + offsetY };
                        attrs[`${prefix}LinearGradientEndPoint`] = { x: endPoint.x + offsetX, y: endPoint.y + offsetY };
                        attrs[`${prefix}LinearGradientColorStops`] = konvaColorStops;
                    } else if (sourceGradient.type === 'radialGradient') {
                        const rg = sourceGradient as RadialSVGGradient;
                        const { startPoint, endPoint, startRadius, endRadius } = deriveKonvaRadialGradientParams(rg, nodeWidth, nodeHeight);
                        attrs[`${prefix}RadialGradientStartPoint`] = { x: startPoint.x + offsetX, y: startPoint.y + offsetY };
                        attrs[`${prefix}RadialGradientEndPoint`] = { x: endPoint.x + offsetX, y: endPoint.y + offsetY };
                        attrs[`${prefix}RadialGradientStartRadius`] = startRadius;
                        attrs[`${prefix}RadialGradientEndRadius`] = endRadius;
                        attrs[`${prefix}RadialGradientColorStops`] = konvaColorStops;
                    }
                }
            }
        }
    } else if (colorString) {
        attrs[prefix] = colorString;
        attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = colorString !== 'none';
    } else {
         // No gradient, no color string implies fill/stroke is disabled or transparent
         attrs[`${prefix}Enabled` as keyof Konva.ShapeConfig] = false;
    }
    return attrs;
}
