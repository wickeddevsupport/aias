
// utils/svgGenerationUtils.ts

import { SVGElementData, Artboard, RectElementProps, CircleElementProps, PathElementProps, GroupElementProps, TextElementProps, ImageElementProps, AnySVGGradient, LinearSVGGradient, RadialSVGGradient, BezierPoint, SVGFilterDef, SVGClipPathDef } from '../types';
import { DEFAULT_RADIAL_CX, DEFAULT_RADIAL_CY, DEFAULT_RADIAL_R, DEFAULT_GRADIENT_ANGLE, DEFAULT_RADIAL_FX, DEFAULT_RADIAL_FY, DEFAULT_RADIAL_FR, DEFAULT_TEXT_CONTENT, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_IMAGE_HREF, DEFAULT_CIRCLE_R } from '../constants';
import { buildPathDFromStructuredPoints } from './pathUtils'; 

const escapeXml = (unsafe: string): string => {
    if (typeof unsafe !== 'string') {
        return '';
    }
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
};

const generateElementMarkupForEditorRecursive = (
    elementId: string,
    allElements: SVGElementData[],
    artboardId: string,
    forExportContext: boolean 
): string => {
    const element = allElements.find(el => el.id === elementId && el.artboardId === artboardId);
    if (!element) return '';

    let localTransformParts: string[] = [];
    const elX = element.x ?? 0;
    const elY = element.y ?? 0;
    const elRot = element.rotation ?? 0;
    const elScale = element.scale ?? 1;

    let baseAttrs = `id="${escapeXml(element.id)}"`;
    if (!forExportContext && element.name) {
      baseAttrs += ` data-name="${escapeXml(element.name)}"`;
    }
    
    let fillValue = element.fill;
    if (typeof fillValue === 'object' && fillValue !== null && 'id' in fillValue) {
        fillValue = `url(#${escapeXml((fillValue as AnySVGGradient).id)})`;
    }
    if (fillValue !== undefined) baseAttrs += ` fill="${escapeXml(String(fillValue))}"`;

    let strokeValue = element.stroke;
    if (typeof strokeValue === 'object' && strokeValue !== null && 'id' in strokeValue) {
        strokeValue = `url(#${escapeXml((strokeValue as AnySVGGradient).id)})`;
    }
    if (strokeValue !== undefined) baseAttrs += ` stroke="${escapeXml(String(strokeValue))}"`;

    if (element.strokeWidth !== undefined) baseAttrs += ` stroke-width="${element.strokeWidth}"`;
    if (element.opacity !== undefined) baseAttrs += ` opacity="${element.opacity}"`;

    if (element.filter) baseAttrs += ` filter="${escapeXml(element.filter)}"`;
    if (element.clipPath) baseAttrs += ` clip-path="${escapeXml(element.clipPath)}"`;
    if (element.mask) baseAttrs += ` mask="${escapeXml(element.mask)}"`;


    if (element.type === 'path' || element.type === 'rect' || element.type === 'circle') {
        const pathLikeEl = element as PathElementProps | RectElementProps | CircleElementProps;
        if (pathLikeEl.strokeDasharray !== undefined) baseAttrs += ` stroke-dasharray="${escapeXml(pathLikeEl.strokeDasharray)}"`;
        if (pathLikeEl.strokeDashoffset !== undefined) baseAttrs += ` stroke-dashoffset="${pathLikeEl.strokeDashoffset}"`;
        if (!forExportContext && pathLikeEl.drawStartPercent !== undefined) baseAttrs += ` data-draw-start-percent="${pathLikeEl.drawStartPercent}"`;
        if (!forExportContext && pathLikeEl.drawEndPercent !== undefined) baseAttrs += ` data-draw-end-percent="${pathLikeEl.drawEndPercent}"`;
    }
    
    if (!forExportContext && element.motionPathId) baseAttrs += ` data-motion-path-id="${escapeXml(element.motionPathId)}"`;
    if (!forExportContext && element.alignToPath) baseAttrs += ` data-align-to-path="${element.alignToPath}"`;

    // Handle transform differently for text/image vs other shapes
    if (element.type === 'text' || element.type === 'image') {
        if (elRot !== 0) localTransformParts.push(`rotate(${elRot})`);
        if (elScale !== 1) localTransformParts.push(`scale(${elScale})`);
        // x and y are direct attributes for text/image, not part of transform translate
    } else if (element.type === 'rect') {
        const rectEl = element as RectElementProps;
        const centerX = rectEl.width / 2;
        const centerY = rectEl.height / 2;
        if (elX !== 0 || elY !== 0) localTransformParts.push(`translate(${elX}, ${elY})`);
        if (elRot !== 0 || elScale !== 1) {
            localTransformParts.push(`translate(${centerX}, ${centerY})`);
            if (elRot !== 0) localTransformParts.push(`rotate(${elRot})`);
            if (elScale !== 1) localTransformParts.push(`scale(${elScale})`);
            localTransformParts.push(`translate(${-centerX}, ${-centerY})`);
        }
    } else { // Circle, Path, Group
        if (elX !== 0 || elY !== 0) localTransformParts.push(`translate(${elX}, ${elY})`);
        if (elRot !== 0) localTransformParts.push(`rotate(${elRot})`);
        if (elScale !== 1) localTransformParts.push(`scale(${elScale})`);
    }
    const localTransformString = localTransformParts.join(' ').trim();
    const transformAttr = localTransformString ? ` transform="${escapeXml(localTransformString)}"` : '';


    if (element.type === 'group') {
        const group = element as GroupElementProps;
        const childrenMarkup = allElements
            .filter(child => child.parentId === group.id)
            .sort((a,b) => a.order - b.order)
            .map(child => generateElementMarkupForEditorRecursive(child.id, allElements, artboardId, forExportContext))
            .join('');
        return `  <g ${baseAttrs}${transformAttr}>\n${childrenMarkup}  </g>\n`;
    }

    switch (element.type) {
        case 'rect':
            const rect = element as RectElementProps;
            // For rect, x/y in transform is relative to parent.
            // Actual rect x/y attributes are 0 in its local coordinate system.
            return `    <rect x="0" y="0" width="${rect.width}" height="${rect.height}" ${baseAttrs}${transformAttr}/>\n`;
        case 'circle':
            const circle = element as CircleElementProps;
            const rxVal = Number.isFinite(circle.rx) ? circle.rx! : (Number.isFinite(circle.r) ? circle.r! : DEFAULT_CIRCLE_R);
            const ryVal = Number.isFinite(circle.ry) ? circle.ry! : (Number.isFinite(circle.r) ? circle.r! : DEFAULT_CIRCLE_R);
            // Ellipse is centered at its local origin (0,0) for transform purposes.
            return `    <ellipse cx="0" cy="0" rx="${rxVal}" ry="${ryVal}" ${baseAttrs}${transformAttr}/>\n`;
        case 'path':
            const path = element as PathElementProps;
            if (!forExportContext && path.isRendered === false) {
                 baseAttrs += ' data-is-rendered="false"'; 
            }
            if (forExportContext && path.isRendered === false) return ''; 
            
            let dString: string;
            if (path.structuredPoints && path.structuredPoints.length > 0) {
                dString = buildPathDFromStructuredPoints(path.structuredPoints, path.closedByJoining);
            } else if (Array.isArray(path.d)) {
                dString = buildPathDFromStructuredPoints(path.d, path.closedByJoining);
            } else if (typeof path.d === 'string') {
                dString = path.d;
            } else {
                dString = ""; 
            }
            return `    <path d="${escapeXml(dString)}" ${baseAttrs}${transformAttr}/>\n`;
        case 'text':
            const text = element as TextElementProps;
            let textElementAttrs = baseAttrs;
            textElementAttrs += ` x="${elX}" y="${elY}"`; // Use element's x,y as direct attributes
            if (text.fontFamily) textElementAttrs += ` font-family="${escapeXml(text.fontFamily)}"`;
            if (text.fontSize) textElementAttrs += ` font-size="${text.fontSize}px"`;
            if (text.fontWeight) textElementAttrs += ` font-weight="${escapeXml(text.fontWeight)}"`;
            if (text.fontStyle) textElementAttrs += ` font-style="${escapeXml(text.fontStyle)}"`;
            if (text.textAnchor) textElementAttrs += ` text-anchor="${escapeXml(text.textAnchor)}"`;
            // Note: verticalAlign (dominant-baseline) is complex to map directly for simple SVG, often handled by text y position.
            return `    <text ${textElementAttrs}${transformAttr}>${escapeXml(text.text || DEFAULT_TEXT_CONTENT)}</text>\n`;
        case 'image':
            const image = element as ImageElementProps;
            let imageElementAttrs = baseAttrs;
            imageElementAttrs += ` x="${elX}" y="${elY}"`; // Use element's x,y as direct attributes
            if (image.width !== undefined) imageElementAttrs += ` width="${image.width}"`;
            if (image.height !== undefined) imageElementAttrs += ` height="${image.height}"`;
            imageElementAttrs += ` href="${escapeXml(image.href || DEFAULT_IMAGE_HREF)}"`;
            if (image.preserveAspectRatio) imageElementAttrs += ` preserveAspectRatio="${escapeXml(image.preserveAspectRatio)}"`;
             // For xlink:href, ensure it's only added if href is present
            if (image.href || DEFAULT_IMAGE_HREF) {
                imageElementAttrs += ` xlink:href="${escapeXml(image.href || DEFAULT_IMAGE_HREF)}"`;
            }
            return `    <image ${imageElementAttrs}${transformAttr}/>\n`;
        default:
            return '';
    }
};

export const generateSvgStringForEditor = (
  elements: SVGElementData[],
  artboard: Artboard,
  forExportContext: boolean = false 
): string => {
  const topLevelElements = elements
    .filter(el => el.parentId === null && el.artboardId === artboard.id)
    .sort((a, b) => a.order - b.order);

  const staticElementsContent = topLevelElements
    .map(el => generateElementMarkupForEditorRecursive(el.id, elements, artboard.id, forExportContext))
    .join('');

  const gradientDefs = (artboard.defs?.gradients || [])
    .map(gradient => {
      const stopsMarkup = gradient.stops
        .map(stop => `<stop offset="${escapeXml(String(stop.offset * 100))}%" stop-color="${escapeXml(stop.color)}" />`)
        .join('');
      if (gradient.type === 'linearGradient') {
        const lg = gradient as LinearSVGGradient;
        const angle = lg.angle ?? DEFAULT_GRADIENT_ANGLE;
        const angleRad = (angle - 90) * Math.PI / 180;
        let x1 = 0.5 - Math.cos(angleRad) * 0.5, y1 = 0.5 - Math.sin(angleRad) * 0.5;
        let x2 = 0.5 + Math.cos(angleRad) * 0.5, y2 = 0.5 + Math.sin(angleRad) * 0.5;
        x1 = Math.max(0, Math.min(1, x1)); y1 = Math.max(0, Math.min(1, y1));
        x2 = Math.max(0, Math.min(1, x2)); y2 = Math.max(0, Math.min(1, y2));
        
        let gradientAttributes = `id="${escapeXml(lg.id)}" gradientUnits="${lg.gradientUnits || 'objectBoundingBox'}"`;
        if (lg.gradientUnits === 'objectBoundingBox' || (!lg.x1 && !lg.x2 && !lg.y1 && !lg.y2)) {
            gradientAttributes += ` x1="${x1*100}%" y1="${y1*100}%" x2="${x2*100}%" y2="${y2*100}%"`;
        } else {
            if (lg.x1) gradientAttributes += ` x1="${escapeXml(lg.x1)}"`; else gradientAttributes += ` x1="${x1*100}%"`;
            if (lg.y1) gradientAttributes += ` y1="${escapeXml(lg.y1)}"`; else gradientAttributes += ` y1="${y1*100}%"`;
            if (lg.x2) gradientAttributes += ` x2="${escapeXml(lg.x2)}"`; else gradientAttributes += ` x2="${x2*100}%"`;
            if (lg.y2) gradientAttributes += ` y2="${escapeXml(lg.y2)}"`; else gradientAttributes += ` y2="${y2*100}%"`;
        }
        return `<linearGradient ${gradientAttributes}>${stopsMarkup}</linearGradient>`;

      } else if (gradient.type === 'radialGradient') {
        const rg = gradient as RadialSVGGradient;
        let gradientAttributes = `id="${escapeXml(rg.id)}" gradientUnits="${rg.gradientUnits || 'objectBoundingBox'}"`;
        gradientAttributes += ` cx="${rg.cx || DEFAULT_RADIAL_CX}"`;
        gradientAttributes += ` cy="${rg.cy || DEFAULT_RADIAL_CY}"`;
        gradientAttributes += ` r="${rg.r || DEFAULT_RADIAL_R}"`;
        if (rg.fx !== undefined) gradientAttributes += ` fx="${escapeXml(String(rg.fx))}"`; else gradientAttributes += ` fx="${DEFAULT_RADIAL_FX}"`;
        if (rg.fy !== undefined) gradientAttributes += ` fy="${escapeXml(String(rg.fy))}"`; else gradientAttributes += ` fy="${DEFAULT_RADIAL_FY}"`;
        if (rg.fr !== undefined) gradientAttributes += ` fr="${escapeXml(String(rg.fr))}"`; else gradientAttributes += ` fr="${DEFAULT_RADIAL_FR}"`;
        return `<radialGradient ${gradientAttributes}>${stopsMarkup}</radialGradient>`;
      }
      return '';
    })
    .join('\n    ');
  
  const filterDefs = (artboard.defs?.filters || [])
    .map(filter => `<filter id="${escapeXml(filter.id)}">${filter.rawContent}</filter>`)
    .join('\n    ');

  const clipPathDefs = (artboard.defs?.clipPaths || [])
    .map(clipPath => `<clipPath id="${escapeXml(clipPath.id)}">${clipPath.rawContent}</clipPath>`)
    .join('\n    ');

  const artboardAttributes = `width="${artboard.width}" height="${artboard.height}" viewBox="0 0 ${artboard.width} ${artboard.height}"`;
  const artboardBackgroundRect = `  <rect x="0" y="0" width="100%" height="100%" fill="${escapeXml(artboard.backgroundColor)}" />\n`;
  const dataAttributesForSvg = forExportContext ? '' : ` data-artboard-name="${escapeXml(artboard.name || '')}" data-artboard-x="${artboard.x}" data-artboard-y="${artboard.y}"`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg ${artboardAttributes}${dataAttributesForSvg} xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${gradientDefs}
    ${filterDefs}
    ${clipPathDefs}
  </defs>
${artboardBackgroundRect}
${staticElementsContent}
</svg>
`;
};
