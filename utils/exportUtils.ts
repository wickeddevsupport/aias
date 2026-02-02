

import { SVGElementData, Animation, Artboard, RectElementProps, CircleElementProps, PathElementProps, GroupElementProps, AnySVGGradient, LinearSVGGradient, RadialSVGGradient, BezierPoint, TextElementProps, ImageElementProps } from '../types';
import { DEFAULT_MOTION_PATH_START, DEFAULT_MOTION_PATH_END, DEFAULT_MOTION_PATH_OFFSET_X, DEFAULT_MOTION_PATH_OFFSET_Y, DEFAULT_RADIAL_CX, DEFAULT_RADIAL_CY, DEFAULT_RADIAL_R, DEFAULT_RADIAL_FX, DEFAULT_RADIAL_FY, DEFAULT_RADIAL_FR, DEFAULT_GRADIENT_ANGLE, DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_TEXT_CONTENT, DEFAULT_TEXT_ANCHOR, DEFAULT_IMAGE_HREF, DEFAULT_CIRCLE_R } from '../constants';
import { buildPathDFromStructuredPoints as buildPathDFromStructuredPointsTs } from './pathUtils'; // For static generation

const generateStaticElementMarkupRecursive = (
    elementId: string,
    allElements: SVGElementData[],
    artboardId: string
): string => {
    const element = allElements.find(el => el.id === elementId && el.artboardId === artboardId);
    if (!element) return '';

    let localTransformParts: string[] = [];
    const elX = element.x ?? 0;
    const elY = element.y ?? 0;
    const elRot = element.rotation ?? 0;
    const elScale = element.scale ?? 1;
    const elSkewX = element.skewX ?? 0;
    const elSkewY = element.skewY ?? 0;

    if (element.type === 'rect') {
        const rectEl = element as RectElementProps;
        const centerX = rectEl.width / 2;
        const centerY = rectEl.height / 2;
        if (elX !== 0 || elY !== 0) localTransformParts.push(`translate(${elX}, ${elY})`);
        if (elRot !== 0 || elScale !== 1 || elSkewX !== 0 || elSkewY !== 0) {
            localTransformParts.push(`translate(${centerX}, ${centerY})`);
            if (elRot !== 0) localTransformParts.push(`rotate(${elRot})`);
            if (elScale !== 1) localTransformParts.push(`scale(${elScale})`);
            if (elSkewX !== 0) localTransformParts.push(`skewX(${elSkewX})`);
            if (elSkewY !== 0) localTransformParts.push(`skewY(${elSkewY})`);
            localTransformParts.push(`translate(${-centerX}, ${-centerY})`);
        }
    } else { 
        if (elX !== 0 || elY !== 0) localTransformParts.push(`translate(${elX}, ${elY})`);
        if (elRot !== 0) localTransformParts.push(`rotate(${elRot})`);
        if (elScale !== 1) localTransformParts.push(`scale(${elScale})`);
        if (elSkewX !== 0) localTransformParts.push(`skewX(${elSkewX})`);
        if (elSkewY !== 0) localTransformParts.push(`skewY(${elSkewY})`);
    }
    
    const localTransformString = localTransformParts.join(' ').trim();
    const transformAttr = localTransformString ? ` transform="${localTransformString}"` : '';
    
    let baseAttrs = `id="${element.id}" data-name="${element.name || ''}"`;
    let fillValue = element.fill;
    if (typeof fillValue === 'object' && fillValue !== null && 'id' in fillValue) {
        fillValue = `url(#${(fillValue as AnySVGGradient).id})`;
    }
    if (fillValue !== undefined) baseAttrs += ` fill="${fillValue}"`;

    let strokeValue = element.stroke;
    if (typeof strokeValue === 'object' && strokeValue !== null && 'id' in strokeValue) {
        strokeValue = `url(#${(strokeValue as AnySVGGradient).id})`;
    }
    if (strokeValue !== undefined) baseAttrs += ` stroke="${strokeValue}"`;

    if (element.strokeWidth !== undefined) baseAttrs += ` stroke-width="${element.strokeWidth}"`;
    if (element.opacity !== undefined) baseAttrs += ` opacity="${element.opacity}"`;
    
    if (element.filter) baseAttrs += ` filter="${element.filter}"`;
    if (element.clipPath) baseAttrs += ` clip-path="${element.clipPath}"`;
    if (element.mask) baseAttrs += ` mask="${element.mask}"`;

    if (element.type === 'path' || element.type === 'rect' || element.type === 'circle') {
        const pathLikeEl = element as PathElementProps | RectElementProps | CircleElementProps;
        if (pathLikeEl.strokeDasharray !== undefined) baseAttrs += ` stroke-dasharray="${pathLikeEl.strokeDasharray}"`;
        if (pathLikeEl.strokeDashoffset !== undefined) baseAttrs += ` stroke-dashoffset="${pathLikeEl.strokeDashoffset}"`;
        if (pathLikeEl.drawStartPercent !== undefined) baseAttrs += ` data-draw-start-percent="${pathLikeEl.drawStartPercent}"`;
        if (pathLikeEl.drawEndPercent !== undefined) baseAttrs += ` data-draw-end-percent="${pathLikeEl.drawEndPercent}"`;
    }

    if (element.type === 'group') {
        const group = element as GroupElementProps;
        const childrenMarkup = allElements
            .filter(child => child.parentId === group.id)
            .sort((a,b) => a.order - b.order)
            .map(child => generateStaticElementMarkupRecursive(child.id, allElements, artboardId))
            .join('');
        return `  <g ${baseAttrs}${transformAttr}>\n${childrenMarkup}  </g>\n`;
    }
    
    switch (element.type) {
        case 'rect':
            const rect = element as RectElementProps;
            return `    <rect x="0" y="0" width="${rect.width}" height="${rect.height}" ${baseAttrs}${transformAttr}/>\n`;
        case 'circle':
            const circle = element as CircleElementProps;
            const rxVal = Number.isFinite(circle.rx) ? circle.rx! : (Number.isFinite(circle.r) ? circle.r! : DEFAULT_CIRCLE_R);
            const ryVal = Number.isFinite(circle.ry) ? circle.ry! : (Number.isFinite(circle.r) ? circle.r! : DEFAULT_CIRCLE_R);
            return `    <ellipse cx="0" cy="0" rx="${rxVal}" ry="${ryVal}" ${baseAttrs}${transformAttr}/>\n`;
        case 'path':
            const path = element as PathElementProps;
            let dString = path.d;
            if (Array.isArray(path.d) && path.structuredPoints) {
                 dString = buildPathDFromStructuredPointsTs(path.structuredPoints, path.closedByJoining);
            } else if (typeof path.d !== 'string') {
                 dString = ""; 
            }
            if ((path.isRendered === undefined || path.isRendered === true) && typeof dString === 'string') {
                return `    <path d="${dString}" ${baseAttrs}${transformAttr}/>\n`;
            }
            return '';
        case 'text':
            const text = element as TextElementProps;
            let textAttrs = baseAttrs;
            if (text.fontFamily) textAttrs += ` font-family="${text.fontFamily}"`;
            if (text.fontSize) textAttrs += ` font-size="${text.fontSize}px"`;
            if (text.fontWeight) textAttrs += ` font-weight="${text.fontWeight}"`;
            if (text.fontStyle) textAttrs += ` font-style="${text.fontStyle}"`;
            if (text.letterSpacing !== undefined) textAttrs += ` letter-spacing="${text.letterSpacing}"`;
            if (text.lineHeight !== undefined) textAttrs += ` style="line-height:${text.lineHeight}"`;
            if (text.textAnchor) textAttrs += ` text-anchor="${text.textAnchor}"`;
            // dominant-baseline is complex, Konva maps to verticalAlign, not directly set in SVG export here for simplicity
            return `    <text ${textAttrs}${transformAttr}>${text.text || DEFAULT_TEXT_CONTENT}</text>\n`;
        case 'image':
            const image = element as ImageElementProps;
            let imageAttrs = baseAttrs;
            if (image.width !== undefined) imageAttrs += ` width="${image.width}"`;
            if (image.height !== undefined) imageAttrs += ` height="${image.height}"`;
            if (image.preserveAspectRatio) imageAttrs += ` preserveAspectRatio="${image.preserveAspectRatio}"`;
            imageAttrs += ` href="${image.href || DEFAULT_IMAGE_HREF}" xlink:href="${image.href || DEFAULT_IMAGE_HREF}"`;
            return `    <image ${imageAttrs}${transformAttr}/>\n`;
        default:
            return '';
    }
};

export const exportToHtml = (elements: SVGElementData[], animation: Animation, artboard: Artboard, playbackSpeed: number): string => {
  if (!artboard) {
    console.error("No artboard data provided for export.");
    return "<!-- Error: No artboard data -->";
  }
  
  const elementsForExport = elements.filter(el => el.id !== 'background-main');

  const topLevelElements = elementsForExport
    .filter(el => el.parentId === null && el.artboardId === artboard.id)
    .sort((a,b) => a.order - b.order);
  
  const staticElementsContent = topLevelElements
    .map(el => generateStaticElementMarkupRecursive(el.id, elementsForExport, artboard.id))
    .join('');
  
  const animationData = {
    elements: elementsForExport,
    animation,
    artboard,
    playbackSpeed
  };

  const mainSvgWidth = artboard.width;
  const mainSvgHeight = artboard.height;

  const gradientDefsMarkup = (artboard.defs?.gradients || [])
    .map(gradient => {
      const stopsMarkup = gradient.stops
        .map(stop => `<stop offset="${(stop.offset * 100)}%" stop-color="${stop.color}" />`)
        .join('');
      if (gradient.type === 'linearGradient') {
        const lg = gradient as LinearSVGGradient;
        const angle = lg.angle ?? DEFAULT_GRADIENT_ANGLE;
        const angleRad = (angle - 90) * Math.PI / 180;
        let x1 = 0.5 - Math.cos(angleRad) * 0.5, y1 = 0.5 - Math.sin(angleRad) * 0.5;
        let x2 = 0.5 + Math.cos(angleRad) * 0.5, y2 = 0.5 + Math.sin(angleRad) * 0.5;
        x1 = Math.max(0,Math.min(1,x1)); y1 = Math.max(0,Math.min(1,y1));
        x2 = Math.max(0,Math.min(1,x2)); y2 = Math.max(0,Math.min(1,y2));
        let gradientAttributes = `id="${lg.id}" gradientUnits="${lg.gradientUnits || 'objectBoundingBox'}"`;
        if (lg.gradientUnits === 'objectBoundingBox' || (!lg.x1 && !lg.x2 && !lg.y1 && !lg.y2)) {
             gradientAttributes += ` x1="${x1*100}%" y1="${y1*100}%" x2="${x2*100}%" y2="${y2*100}%"`;
        } else {
            if(lg.x1) gradientAttributes += ` x1="${lg.x1}"`; else gradientAttributes += ` x1="${x1*100}%"`;
            if(lg.y1) gradientAttributes += ` y1="${lg.y1}"`; else gradientAttributes += ` y1="${y1*100}%"`;
            if(lg.x2) gradientAttributes += ` x2="${lg.x2}"`; else gradientAttributes += ` x2="${x2*100}%"`;
            if(lg.y2) gradientAttributes += ` y2="${lg.y2}"`; else gradientAttributes += ` y2="${y2*100}%"`;
        }
        return `<linearGradient ${gradientAttributes}>${stopsMarkup}</linearGradient>`;
      } else if (gradient.type === 'radialGradient') {
        const rg = gradient as RadialSVGGradient;
        let gradientAttributes = `id="${rg.id}" gradientUnits="${rg.gradientUnits || 'objectBoundingBox'}"`;
        gradientAttributes += ` cx="${rg.cx || DEFAULT_RADIAL_CX}" cy="${rg.cy || DEFAULT_RADIAL_CY}" r="${rg.r || DEFAULT_RADIAL_R}"`;
        if (rg.fx !== undefined) gradientAttributes += ` fx="${String(rg.fx)}"`; else gradientAttributes += ` fx="${DEFAULT_RADIAL_FX}"`;
        if (rg.fy !== undefined) gradientAttributes += ` fy="${String(rg.fy)}"`; else gradientAttributes += ` fy="${DEFAULT_RADIAL_FY}"`;
        if (rg.fr !== undefined) gradientAttributes += ` fr="${String(rg.fr)}"`; else gradientAttributes += ` fr="${DEFAULT_RADIAL_FR}"`;
        return `<radialGradient ${gradientAttributes}>${stopsMarkup}</radialGradient>`;
      }
      return '';
    }).join('\n    ');

  const filterDefsMarkup = (artboard.defs?.filters || [])
    .map(filter => `<filter id="${filter.id}">${filter.rawContent}</filter>`)
    .join('\n    ');
  
  const clipPathDefsMarkup = (artboard.defs?.clipPaths || [])
    .map(clipPath => `<clipPath id="${clipPath.id}">${clipPath.rawContent}</clipPath>`)
    .join('\n    ');

  const getRectAsPathDJS = `
      function getRectAsPathDJS(width, height) {
        return \`M0,0 L\${width},0 L\${width},\${height} L0,\${height} Z\`;
      };
    `;
  const getCircleAsPathDJS = `
      function getCircleAsPathDJS(rx, ry) { // Updated to use rx, ry
        return \`M0,\${-ry} A\${rx},\${ry} 0 1,0 0,\${ry} A\${rx},\${ry} 0 1,0 0,\${-ry} Z\`;
      };
    `;
  const calculateShapePathLengthJS = `
    function calculateShapePathLengthJS(shape) {
      if (!shape) return 0;
      let dString;
      if (shape.type === 'path') {
        if (Array.isArray(shape.d)) {
            dString = buildPathDFromStructuredPointsJS(shape.d, shape.closedByJoining);
        } else {
            dString = shape.d;
        }
      }
      else if (shape.type === 'rect') dString = getRectAsPathDJS(shape.width, shape.height);
      else if (shape.type === 'circle') { // Ellipse case
        const rx = shape.rx !== undefined ? shape.rx : (shape.r !== undefined ? shape.r : ${DEFAULT_CIRCLE_R});
        const ry = shape.ry !== undefined ? shape.ry : (shape.r !== undefined ? shape.r : ${DEFAULT_CIRCLE_R});
        dString = getCircleAsPathDJS(rx, ry);
      }
      else return 0;
      if (!dString || typeof dString !== 'string' || dString.trim() === '') return 0;
      try {
        const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tempPath.setAttribute("d", dString);
        const length = tempPath.getTotalLength();
        return Number.isFinite(length) ? length : 0;
      } catch (e) { return 0; }
    };
  `;

  const parseColorForExportJS = `
      function parseColorForExport(colorStr) {
        if (typeof colorStr !== 'string') return null;
        const s = colorStr.trim().toLowerCase();
        let match;
        if (s.startsWith('#')) {
            if (s.length === 9) { return { r: parseInt(s.slice(1,3),16), g: parseInt(s.slice(3,5),16), b: parseInt(s.slice(5,7),16), a: parseInt(s.slice(7,9),16)/255 }; }
            else if (s.length === 7) { return { r: parseInt(s.slice(1,3),16), g: parseInt(s.slice(3,5),16), b: parseInt(s.slice(5,7),16), a: 1 }; }
            else if (s.length === 5) { return { r: parseInt(s[1]+s[1],16), g: parseInt(s[2]+s[2],16), b: parseInt(s[3]+s[3],16), a: parseInt(s[4]+s[4],16)/255 }; }
            else if (s.length === 4) { return { r: parseInt(s[1]+s[1],16), g: parseInt(s[2]+s[2],16), b: parseInt(s[3]+s[3],16), a: 1 }; }
        }
        match = s.match(/^rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*(?:,\\s*([\\d.]+)\\s*)?\\)$/);
        if (match) { return { r: parseInt(match[2]), g: parseInt(match[3]), b: parseInt(match[4]), a: match[5] === undefined ? 1 : parseFloat(match[5]) }; }
        const namedColors = {"black": {r:0,g:0,b:0,a:1}, "white": {r:255,g:255,b:255,a:1}, "red": {r:255,g:0,b:0,a:1}, "green": {r:0,g:128,b:0,a:1}, "blue": {r:0,g:0,b:255,a:1}, "yellow": {r:255,g:255,b:0,a:1}, "cyan": {r:0,g:255,b:255,a:1}, "magenta": {r:255,g:0,b:255,a:1}, "transparent": {r:0,g:0,b:0,a:0}, "none": {r:0,g:0,b:0,a:0}};
        if (namedColors[s]) return namedColors[s];
        return null;
      };
    `;
  const generateGradientDefsJS = `
    let gradientDefsMap = new Map();
    function getGradientDef(gradientObj, currentTime) {
      if (!gradientObj || !gradientObj.id || typeof gradientObj !== 'object') return null;
      const baseId = gradientObj.id.startsWith('kf-grad-') || gradientObj.id.startsWith('temp-grad-') || gradientObj.id.startsWith('live-preview-') || gradientObj.id.startsWith('dummy-conv-') || gradientObj.id.startsWith('dummy-from-')
                     ? gradientObj.id.split('-').slice(0, -2).join('-') 
                     : gradientObj.id; 
      const uniqueIdForTime = baseId + '-' + currentTime.toFixed(3).replace('.', '_') + '-' + (gradientDefsMap.size % 1000);
      
      if (gradientDefsMap.has(uniqueIdForTime)) return gradientDefsMap.get(uniqueIdForTime);

      let defElement;
      if (gradientObj.type === 'linearGradient') {
        defElement = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        defElement.setAttribute('id', uniqueIdForTime);
        defElement.setAttribute('gradientUnits', gradientObj.gradientUnits || 'objectBoundingBox');
        const angle = gradientObj.angle !== undefined ? gradientObj.angle : ${DEFAULT_GRADIENT_ANGLE};
        const angleRad = (angle - 90) * Math.PI / 180;
        let x1 = 0.5 - Math.cos(angleRad) * 0.5, y1 = 0.5 - Math.sin(angleRad) * 0.5;
        let x2 = 0.5 + Math.cos(angleRad) * 0.5, y2 = 0.5 + Math.sin(angleRad) * 0.5;
        defElement.setAttribute('x1', \`\${Math.max(0, Math.min(1, x1)) * 100}%\`);
        defElement.setAttribute('y1', \`\${Math.max(0, Math.min(1, y1)) * 100}%\`);
        defElement.setAttribute('x2', \`\${Math.max(0, Math.min(1, x2)) * 100}%\`);
        defElement.setAttribute('y2', \`\${Math.max(0, Math.min(1, y2)) * 100}%\`);
      } else if (gradientObj.type === 'radialGradient') {
        defElement = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        defElement.setAttribute('id', uniqueIdForTime);
        defElement.setAttribute('gradientUnits', gradientObj.gradientUnits || 'objectBoundingBox');
        defElement.setAttribute('cx', gradientObj.cx || '${DEFAULT_RADIAL_CX}');
        defElement.setAttribute('cy', gradientObj.cy || '${DEFAULT_RADIAL_CY}');
        defElement.setAttribute('r', gradientObj.r || '${DEFAULT_RADIAL_R}');
        if (gradientObj.fx !== undefined) defElement.setAttribute('fx', gradientObj.fx); else defElement.setAttribute('fx', '${DEFAULT_RADIAL_FX}');
        if (gradientObj.fy !== undefined) defElement.setAttribute('fy', gradientObj.fy); else defElement.setAttribute('fy', '${DEFAULT_RADIAL_FY}');
        if (gradientObj.fr !== undefined) defElement.setAttribute('fr', gradientObj.fr); else defElement.setAttribute('fr', '${DEFAULT_RADIAL_FR}');
      } else {
        return null;
      }

      gradientObj.stops.forEach(stop => {
        const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stopEl.setAttribute('offset', \`\${stop.offset * 100}%\`);
        stopEl.setAttribute('stop-color', stop.color);
        defElement.appendChild(stopEl);
      });
      
      gradientDefsMap.set(uniqueIdForTime, {defElement, id: uniqueIdForTime});
      return {defElement, id: uniqueIdForTime};
    };
  `;

  const buildPathDFromStructuredPointsJS = `
    function buildPathDFromStructuredPointsJS(points, closedByJoining) {
      if (!points || points.length === 0) return "";
      let d = \`M \${points[0].x.toFixed(1)} \${points[0].y.toFixed(1)}\`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i-1]; const p1 = points[i];
        const c1x = p0.h2x !== undefined ? p0.h2x : p0.x;
        const c1y = p0.h2y !== undefined ? p0.h2y : p0.y;
        const c2x = p1.h1x !== undefined ? p1.h1x : p1.x;
        const c2y = p1.h1y !== undefined ? p1.h1y : p1.y;
        d += \` C \${c1x.toFixed(1)} \${c1y.toFixed(1)}, \${c2x.toFixed(1)} \${c2y.toFixed(1)}, \${p1.x.toFixed(1)} \${p1.y.toFixed(1)}\`;
      }
      if (closedByJoining && points.length > 1) {
        const pLast = points[points.length - 1]; const pFirst = points[0];
        const c1x = pLast.h2x !== undefined ? pLast.h2x : pLast.x;
        const c1y = pLast.h2y !== undefined ? pLast.h2y : pLast.y;
        const c2x = pFirst.h1x !== undefined ? pFirst.h1x : pFirst.x;
        const c2y = pFirst.h1y !== undefined ? pFirst.h1y : pFirst.y;
        d += \` C \${c1x.toFixed(1)} \${c1y.toFixed(1)}, \${c2x.toFixed(1)} \${c2y.toFixed(1)}, \${pFirst.x.toFixed(1)} \${pFirst.y.toFixed(1)}\`;
        d += " Z";
      }
      return d;
    };
  `;
  
  const interpolateBezierPointsJS = `
    function interpolateBezierPointsJS(points1, points2, p) {
      if (!points1 || !points2 || points1.length !== points2.length) {
        return p < 0.5 ? points1 : points2; 
      }
      return points1.map((pt1, i) => {
        const pt2 = points2[i];
        if (!pt2) return pt1;
        return {
          id: pt1.id, 
          x: interpolateNumeric(pt1.x, pt2.x, p),
          y: interpolateNumeric(pt1.y, pt2.y, p),
          h1x: (pt1.h1x !== undefined && pt2.h1x !== undefined) ? interpolateNumeric(pt1.h1x, pt2.h1x, p) : undefined,
          h1y: (pt1.h1y !== undefined && pt2.h1y !== undefined) ? interpolateNumeric(pt1.h1y, pt2.h1y, p) : undefined,
          h2x: (pt1.h2x !== undefined && pt2.h2x !== undefined) ? interpolateNumeric(pt1.h2x, pt2.h2x, p) : undefined,
          h2y: (pt1.h2y !== undefined && pt2.h2y !== undefined) ? interpolateNumeric(pt1.h2y, pt2.h2y, p) : undefined,
          isSmooth: pt1.isSmooth, 
        };
      });
    };
  `;


  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVG Animation Export</title>
  <style>
    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; padding: 20px; box-sizing: border-box; overflow: hidden; }
    svg.main-animation-svg { 
      border: 1px solid #444; 
      background-color: ${artboard.backgroundColor}; 
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      max-width: calc(100% - 40px); 
      max-height: calc(100vh - 40px); 
      width: auto;
      height: auto;
    }
  </style>
</head>
<body>
  <svg class="main-animation-svg" width="${mainSvgWidth}" height="${mainSvgHeight}" viewBox="0 0 ${mainSvgWidth} ${mainSvgHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>${artboard.name || 'SVG Animation'}</title>
    <defs id="dynamicDefs">
    ${gradientDefsMarkup}
    ${filterDefsMarkup}
    ${clipPathDefsMarkup}
    </defs>
    <g id="artboard-group" transform="translate(${artboard.x || 0}, ${artboard.y || 0})">
${staticElementsContent}
    </g>
  </svg>

  <script type="application/json" id="animationData">
    ${JSON.stringify(animationData)}
  </script>

  <script>
    (function() {
      const animationDataElement = document.getElementById('animationData');
      if (!animationDataElement || !animationDataElement.textContent) {
        console.error("Animation data not found.");
        return;
      }
      const { elements: allBaseElements, animation, artboard, playbackSpeed } = JSON.parse(animationDataElement.textContent);
      const svgRoot = document.querySelector('svg.main-animation-svg');
      if (!svgRoot) {
        console.error("SVG root element not found.");
        return;
      }
      const defsContainer = svgRoot.querySelector('#dynamicDefs');
      if (!defsContainer) {
        console.error("<defs id='dynamicDefs'> container not found.");
        return;
      }


      ${getRectAsPathDJS}
      ${getCircleAsPathDJS}
      ${calculateShapePathLengthJS}
      ${parseColorForExportJS}
      ${generateGradientDefsJS}
      ${buildPathDFromStructuredPointsJS}
      ${interpolateBezierPointsJS}

      const tempPathForCalculations = document.createElementNS("http://www.w3.org/2000/svg", "path");

      const interpolateNumeric = (v1, v2, p) => {
        if (v1 === undefined && v2 === undefined) return undefined;
        if (v1 === undefined) return p >= 0.5 ? v2 : undefined;
        if (v2 === undefined) return p < 0.5 ? v1 : undefined;
        return v1 + (v2 - v1) * p;
      };

      const parsePercentageStringToFloat = (percentString, defaultValue) => {
          if (typeof percentString === 'string' && percentString.endsWith('%')) {
              const num = parseFloat(percentString.slice(0, -1));
              return isNaN(num) ? defaultValue : num;
          }
          const num = parseFloat(String(percentString));
          return isNaN(num) ? defaultValue : num;
      };
      const parseFloatToPercentageString = (value) => \`\${value.toFixed(2)}%\`;

      const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
      const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
      const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
      const easeInQuad = (t) => t * t;
      const easeOutQuad = (t) => t * (2 - t);
      const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      const easeInCubic = (t) => t * t * t;
      const easeOutCubic = (t) => --t * t * t + 1;
      const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easeInQuart = (t) => t * t * t * t;
      const easeOutQuart = (t) => 1 - --t * t * t * t;
      const easeInOutQuart = (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
      const easeInQuint = (t) => t * t * t * t * t;
      const easeOutQuint = (t) => 1 + --t * t * t * t * t;
      const easeInOutQuint = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
      const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));
      const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
      const easeInOutExpo = (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
      const easeInCirc = (t) => 1 - Math.sqrt(1 - t * t);
      const easeOutCirc = (t) => Math.sqrt(1 - --t * t);
      const easeInOutCirc = (t) => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
      const easeInBack = (t, s = 1.70158) => t * t * ((s + 1) * t - s);
      const easeOutBack = (t, s = 1.70158) => --t * t * ((s + 1) * t + s) + 1;
      const easeInOutBack = (t, s = 1.70158) => (t /= 0.5) < 1 ? 0.5 * (t * t * (((s *= 1.525) + 1) * t - s)) : 0.5 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);
      const easeInElastic = (t, a = 1, period = 0.3) => t === 0 ? 0 : t === 1 ? 1 : -a * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period);
      const easeOutElastic = (t, a = 1, period = 0.3) => t === 0 ? 0 : t === 1 ? 1 : a * Math.pow(2, -10 * t) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period) + 1;
      const easeInOutElastic = (t, a = 1, period = 0.5) => t === 0 ? 0 : (t /= 0.5) === 2 ? 1 : t < 1 ? -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period)) : a * Math.pow(2, -10 * (t -= 1)) * Math.sin(((t - period / (2 * Math.PI) * Math.asin(1 / a)) * (2 * Math.PI)) / period) * 0.5 + 1;
      const easeOutBounce = (t) => {
        let val = t;
        if (val < 1 / 2.75) return 7.5625 * val * val;
        if (val < 2 / 2.75) { val -= 1.5 / 2.75; return 7.5625 * val * val + 0.75; }
        if (val < 2.5 / 2.75) { val -= 2.25 / 2.75; return 7.5625 * val * val + 0.9375; }
        val -= 2.625 / 2.75;
        return 7.5625 * val * val + 0.984375;
      };
      const easeInBounce = (t) => 1 - easeOutBounce(1 - t);
      const easeInOutBounce = (t) => t < 0.5 ? easeInBounce(t * 2) * 0.5 : easeOutBounce(t * 2 - 1) * 0.5 + 0.5;

      const cubicBezier = (p1x, p1y, p2x, p2y) => {
        const newtonRaphsonIterate = (aX, aGuessT) => {
          for (let i = 0; i < 4; ++i) {
            const currentSlope = 3 * (1 - aGuessT) * (1 - aGuessT) * p1x + 6 * (1 - aGuessT) * aGuessT * (p2x - p1x) + 3 * aGuessT * aGuessT * (1 - p2x);
            if (currentSlope === 0.0) return aGuessT;
            const currentX = (1 - aGuessT) * (1 - aGuessT) * (1 - aGuessT) * 0 + 3 * (1 - aGuessT) * (1 - aGuessT) * aGuessT * p1x + 3 * (1 - aGuessT) * aGuessT * aGuessT * p2x + aGuessT * aGuessT * aGuessT * 1;
            aGuessT -= (currentX - aX) / currentSlope;
          }
          return aGuessT;
        };
        return (t) => {
          if (t === 0 || t === 1) return t;
          const aGuessT = newtonRaphsonIterate(t, t);
          return (1 - aGuessT) * (1 - aGuessT) * (1 - aGuessT) * 0 + 3 * (1 - aGuessT) * (1 - aGuessT) * aGuessT * p1y + 3 * (1 - aGuessT) * aGuessT * aGuessT * p2y + aGuessT * aGuessT * aGuessT * 1;
        };
      };

      const applyEasing = (progress, easing) => {
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
                const paramsMatch = easing.match(/cubic-bezier\\(([^)]+)\\)/);
                if (paramsMatch && paramsMatch[1]) {
                  const params = paramsMatch[1].split(',').map(p => parseFloat(p.trim()));
                  if (params.length === 4) {
                    return cubicBezier(params[0], params[1], params[2], params[3])(progress);
                  }
                }
              } catch (e) {}
            }
            return progress;
        }
      };
      
      function interpolateStopsJS(stops1, stops2, progress) {
          if (stops1.length !== stops2.length) return progress < 1 ? stops1 : stops2;
          return stops1.map((stop1, i) => {
              const stop2 = stops2[i];
              const interpolatedColor = interpolateValue([ {time:0, value: stop1.color}, {time:1, value: stop2.color} ], progress, stop1.color);
              return {
                  id: stop1.id,
                  offset: interpolateNumeric(stop1.offset, stop2.offset, progress),
                  color: interpolatedColor,
              };
          });
      };

      function interpolateGradientJS(grad1, grad2, progress) {
          if (grad1.type !== grad2.type) return progress < 1 ? grad1 : grad2;
          const interpolatedStops = interpolateStopsJS(grad1.stops, grad2.stops, progress);
          let result = { type: grad1.type, stops: interpolatedStops, gradientUnits: grad1.gradientUnits || grad2.gradientUnits || 'objectBoundingBox' };
          
          if (grad1.type === 'linearGradient') {
              result.angle = interpolateNumeric((grad1.angle !== undefined ? grad1.angle : ${DEFAULT_GRADIENT_ANGLE}), (grad2.angle !== undefined ? grad2.angle : ${DEFAULT_GRADIENT_ANGLE}), progress);
          } else if (grad1.type === 'radialGradient') {
              result.cx = parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.cx, 50), parsePercentageStringToFloat(grad2.cx, 50), progress));
              result.cy = parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.cy, 50), parsePercentageStringToFloat(grad2.cy, 50), progress));
              result.r = parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.r, 50), parsePercentageStringToFloat(grad2.r, 50), progress));
              result.fx = parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.fx, parsePercentageStringToFloat(grad1.cx, 50)), parsePercentageStringToFloat(grad2.fx, parsePercentageStringToFloat(grad2.cx, 50)), progress));
              result.fy = parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.fy, parsePercentageStringToFloat(grad1.cy, 50)), parsePercentageStringToFloat(grad2.fy, parsePercentageStringToFloat(grad2.cy, 50)), progress));
              result.fr = parseFloatToPercentageString(interpolateNumeric(parsePercentageStringToFloat(grad1.fr, 0), parsePercentageStringToFloat(grad2.fr, 0), progress));
          }
          return result;
      };
      function interpolateValue(keyframes, time, defaultValue, property) {
        if (!keyframes || keyframes.length === 0) {
          if (defaultValue === undefined && property) {
            const numericProps = ['x', 'y', 'r', 'rx', 'ry', 'opacity', 'rotation', 'scale', 'strokeWidth', 'strokeDashoffset', 'motionPathStart', 'motionPathEnd', 'motionPathOffsetX', 'motionPathOffsetY', 'drawStartPercent', 'drawEndPercent', 'fontSize', 'letterSpacing', 'lineHeight', 'skewX', 'skewY'];
            if (numericProps.includes(property)) {
              if (property === 'opacity' || property === 'scale') return 1;
              if (property === 'drawEndPercent') return 1;
              if (property === 'fontSize') return 16;
              return 0;
            }
            if (property === 'width' || property === 'height') return undefined;
            if (property === 'text') return 'Hello';
            if (property === 'textPath') return null;
          }
          return defaultValue;
        }
        const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);
        if (time <= sortedKeyframes[0].time) return sortedKeyframes[0].value;
        if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) return sortedKeyframes[sortedKeyframes.length - 1].value;

        let prevKeyframe = sortedKeyframes[0];
        let nextKeyframe = sortedKeyframes[sortedKeyframes.length - 1];
        for (let i = 0; i < sortedKeyframes.length - 1; i++) {
          if (sortedKeyframes[i].time <= time && sortedKeyframes[i + 1].time >= time) {
            prevKeyframe = sortedKeyframes[i];
            nextKeyframe = sortedKeyframes[i + 1];
            break;
          }
        }
        if (time === prevKeyframe.time) return prevKeyframe.value;
        if (time === nextKeyframe.time) return nextKeyframe.value;
        if (prevKeyframe.freeze) return prevKeyframe.value;
        const timeDiff = nextKeyframe.time - prevKeyframe.time;
        if (timeDiff === 0) return prevKeyframe.value;
        let progress = (time - prevKeyframe.time) / timeDiff;
        progress = applyEasing(progress, prevKeyframe.easing || 'linear');

        const val1 = prevKeyframe.value;
        const val2 = nextKeyframe.value;

        if (Array.isArray(val1) && val1.every(item => typeof item === 'object' && 'x' in item && 'y' in item) &&
            Array.isArray(val2) && val2.every(item => typeof item === 'object' && 'x' in item && 'y' in item)) {
          return interpolateBezierPointsJS(val1, val2, progress);
        }

        const val1IsGradientObj = typeof val1 === 'object' && val1 !== null && 'type' in val1 && 'stops' in val1;
        const val2IsGradientObj = typeof val2 === 'object' && val2 !== null && 'type' in val2 && 'stops' in val2;
        const val1IsColorStr = typeof val1 === 'string' && !val1.startsWith('url(#') && parseColorForExport(val1);
        const val2IsColorStr = typeof val2 === 'string' && !val2.startsWith('url(#') && parseColorForExport(val2);

        if (val1IsGradientObj && val2IsGradientObj) {
            let g1 = val1;
            let g2 = val2;
            if (g1.type !== g2.type) { // Cross-fade gradients of different types
                if (g1.type === 'linearGradient' && g2.type === 'radialGradient') {
                    g1 = {
                        id: \`dummy-conv-\${g1.id || 'g1'}-\${Date.now() % 1000}\`, type: 'radialGradient', stops: g1.stops.map(s => ({...s})),
                        gradientUnits: g1.gradientUnits || g2.gradientUnits || 'objectBoundingBox',
                        cx: '${DEFAULT_RADIAL_CX}', cy: '${DEFAULT_RADIAL_CY}', r: '${DEFAULT_RADIAL_R}',
                        fx: '${DEFAULT_RADIAL_FX}', fy: '${DEFAULT_RADIAL_FY}', fr: '${DEFAULT_RADIAL_FR}',
                    };
                } else if (g1.type === 'radialGradient' && g2.type === 'linearGradient') {
                    g1 = {
                        id: \`dummy-conv-\${g1.id || 'g1'}-\${Date.now() % 1000}\`, type: 'linearGradient', stops: g1.stops.map(s => ({...s})),
                        gradientUnits: g1.gradientUnits || g2.gradientUnits || 'objectBoundingBox',
                        angle: ${DEFAULT_GRADIENT_ANGLE},
                    };
                }
            }
            return interpolateGradientJS(g1, g2, progress);
        } else if (val1IsColorStr && val2IsGradientObj) {
            const color1 = val1; const gradient2 = val2;
            const dummyGradient1 = {
                id: \`dummy-from-\${gradient2.id || 'g2'}-\${Date.now() % 1000}\`, type: gradient2.type,
                stops: gradient2.stops.map(s => ({...s, color: color1})),
                gradientUnits: gradient2.gradientUnits || 'objectBoundingBox',
                ...(gradient2.type === 'linearGradient' && { angle: gradient2.angle !== undefined ? gradient2.angle : ${DEFAULT_GRADIENT_ANGLE} }),
                ...(gradient2.type === 'radialGradient' && { 
                    cx: gradient2.cx || '${DEFAULT_RADIAL_CX}', cy: '${DEFAULT_RADIAL_CY}', r: gradient2.r || '${DEFAULT_RADIAL_R}',
                    fx: gradient2.fx || '${DEFAULT_RADIAL_FX}', fy: '${DEFAULT_RADIAL_FY}', fr: '${DEFAULT_RADIAL_FR}',
                }),
            };
            return interpolateGradientJS(dummyGradient1, gradient2, progress);
        } else if (val1IsGradientObj && val2IsColorStr) {
            const gradient1 = val1; const color2 = val2;
            const dummyGradient2 = {
                id: \`dummy-from-\${gradient1.id || 'g1'}-\${Date.now() % 1000}\`, type: gradient1.type,
                stops: gradient1.stops.map(s => ({...s, color: color2})),
                gradientUnits: gradient1.gradientUnits || 'objectBoundingBox',
                ...(gradient1.type === 'linearGradient' && { angle: gradient1.angle !== undefined ? gradient1.angle : ${DEFAULT_GRADIENT_ANGLE} }),
                ...(gradient1.type === 'radialGradient' && { 
                    cx: gradient1.cx || '${DEFAULT_RADIAL_CX}', cy: '${DEFAULT_RADIAL_CY}', r: gradient1.r || '${DEFAULT_RADIAL_R}',
                    fx: gradient1.fx || '${DEFAULT_RADIAL_FX}', fy: '${DEFAULT_RADIAL_FY}', fr: '${DEFAULT_RADIAL_FR}',
                }),
            };
            return interpolateGradientJS(gradient1, dummyGradient2, progress);
        }
        
        if ((typeof val1 === 'string' && val1.startsWith('url(#')) || (typeof val2 === 'string' && val2.startsWith('url(#'))) {
          if (val1IsGradientObj || val2IsGradientObj || typeof val1 !== typeof val2) return prevKeyframe.value;
          if (val1 !== val2) return prevKeyframe.value;
        }

        if (val1IsColorStr && val2IsColorStr) {
            const prevColor = parseColorForExport(val1);
            const nextColor = parseColorForExport(val2);
            if (prevColor && nextColor) {
                const r = interpolateNumeric(prevColor.r, nextColor.r, progress);
                const g = interpolateNumeric(prevColor.g, nextColor.g, progress);
                const b = interpolateNumeric(prevColor.b, nextColor.b, progress);
                const a = interpolateNumeric(prevColor.a, nextColor.a, progress);
                return \`rgba(\${Math.round(r)},\${Math.round(g)},\${Math.round(b)},\${parseFloat(a.toFixed(3))})\`;
            }
        }
        
        if ((property === 'width' || property === 'height') && (val1 === undefined || typeof val1 === 'number') && (val2 === undefined || typeof val2 === 'number')) {
          return interpolateNumeric(val1, val2, progress);
        }
        if (typeof val1 === 'number' && typeof val2 === 'number') {
          return interpolateNumeric(val1, val2, progress);
        }
        if (typeof val1 === 'string' && typeof val2 === 'string' && val1.startsWith('url(#') && val2.startsWith('url(#') && val1 === val2) {
          return val1;
        }
        if (property === 'text' && typeof val1 === 'string' && typeof val2 === 'string') {
          return progress < 1 ? val1 : val2;
        }
        if (typeof val1 === 'string' && typeof val2 === 'string') {
          return progress < 0.5 ? val1 : val2;
        }
        return prevKeyframe.value; 
      };


      function getPathAngleAtProgress(pathElement, progress) {
        if (!pathElement || typeof pathElement.getTotalLength !== 'function' || typeof pathElement.getPointAtLength !== 'function') return 0;
        const totalLength = pathElement.getTotalLength();
        if (totalLength === 0) return 0;
        const normalizedProgress = Math.max(0, Math.min(1, progress));
        const currentDist = normalizedProgress * totalLength;
        const p_current = pathElement.getPointAtLength(currentDist);
        const smallDelta = Math.max(0.001, Math.min(totalLength * 0.01, 0.1));
        let p_other, dx, dy;
        if (currentDist + smallDelta <= totalLength) {
          p_other = pathElement.getPointAtLength(currentDist + smallDelta);
          dx = p_other.x - p_current.x;
          dy = p_other.y - p_current.y;
          if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx) * (180 / Math.PI);
        }
        if (currentDist - smallDelta >= 0) {
          p_other = pathElement.getPointAtLength(currentDist - smallDelta);
          dx = p_current.x - p_other.x;
          dy = p_current.y - p_other.y;
          if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx) * (180 / Math.PI);
        }
        return 0;
      };

      const animatedElementPropsCache = new Map();

      function getAnimatedProps(elementId, currentTime) {
        if (animatedElementPropsCache.has(elementId) && animatedElementPropsCache.get(elementId)._time === currentTime) {
            return animatedElementPropsCache.get(elementId);
        }
        const baseEl = allBaseElements.find(el => el.id === elementId);
        if (!baseEl) return null;
        const props = { ...baseEl, _time: currentTime };
        animation.tracks.forEach(track => {
            if (track.elementId === elementId) {
                props[track.property] = interpolateValue(track.keyframes, currentTime, baseEl[track.property], track.property);
            }
        });
        animatedElementPropsCache.set(elementId, props);
        return props;
      };
      
      function getLocalTransformString(props, baseEl) {
        let elX = props.x !== undefined ? props.x : (baseEl.x !== undefined ? baseEl.x : 0);
        let elY = props.y !== undefined ? props.y : (baseEl.y !== undefined ? baseEl.y : 0);
        let elRotation = props.rotation !== undefined ? props.rotation : (baseEl.rotation !== undefined ? baseEl.rotation : 0);
        let elScale = props.scale !== undefined ? props.scale : (baseEl.scale !== undefined ? baseEl.scale : 1);
        let elSkewX = props.skewX !== undefined ? props.skewX : (baseEl.skewX !== undefined ? baseEl.skewX : 0);
        let elSkewY = props.skewY !== undefined ? props.skewY : (baseEl.skewY !== undefined ? baseEl.skewY : 0);
        let localTransformParts = [];

        if (baseEl.type === 'rect') {
            const rectWidth = props.width !== undefined ? props.width : baseEl.width;
            const rectHeight = props.height !== undefined ? props.height : baseEl.height;
            const centerX = rectWidth / 2;
            const centerY = rectHeight / 2;
            if (elX !== 0 || elY !== 0) localTransformParts.push(\`translate(\${elX}, \${elY})\`);
            if (elRotation !== 0 || elScale !== 1 || elSkewX !== 0 || elSkewY !== 0) {
                localTransformParts.push(\`translate(\${centerX}, \${centerY})\`);
                if (elRotation !== 0) localTransformParts.push(\`rotate(\${elRotation})\`);
                if (elScale !== 1) localTransformParts.push(\`scale(\${elScale})\`);
                if (elSkewX !== 0) localTransformParts.push(\`skewX(\${elSkewX})\`);
                if (elSkewY !== 0) localTransformParts.push(\`skewY(\${elSkewY})\`);
                localTransformParts.push(\`translate(\${-centerX}, \${-centerY})\`);
            }
        } else if (baseEl.type === 'text' || baseEl.type === 'image') { // Text/Image uses x, y as attributes
            if (elRotation !== 0 || elScale !== 1 || elSkewX !== 0 || elSkewY !== 0) { 
                if (elRotation !== 0) localTransformParts.push(\`rotate(\${elRotation})\`);
                if (elScale !== 1) localTransformParts.push(\`scale(\${elScale})\`);
                if (elSkewX !== 0) localTransformParts.push(\`skewX(\${elSkewX})\`);
                if (elSkewY !== 0) localTransformParts.push(\`skewY(\${elSkewY})\`);
            }
        } else { // Circle (Ellipse), Path, Group
            if (elX !== 0 || elY !== 0) localTransformParts.push(\`translate(\${elX}, \${elY})\`);
            if (elRotation !== 0) localTransformParts.push(\`rotate(\${elRotation})\`);
            if (elScale !== 1) localTransformParts.push(\`scale(\${elScale})\`);
            if (elSkewX !== 0) localTransformParts.push(\`skewX(\${elSkewX})\`);
            if (elSkewY !== 0) localTransformParts.push(\`skewY(\${elSkewY})\`);
        }
        return localTransformParts.join(' ').trim();
      };

      let animationStartTime = null;
      function animateFrame(timestamp) {
        if (animationStartTime === null) animationStartTime = timestamp;
        const elapsedMs = timestamp - animationStartTime;
        let currentTime = (elapsedMs / 1000) * (playbackSpeed || 1.0);
        
        if (animation.duration > 0) {
            const loopDurationMs = animation.duration * 1000 / (playbackSpeed || 1.0);
            const loopCount = Math.floor(elapsedMs / loopDurationMs);
            const timeInLoop = currentTime % animation.duration;
            if (loopCount > 0) {
                 animationStartTime += loopCount * loopDurationMs;
            }
            if (currentTime > 0 && timeInLoop < 0.000001) {
              currentTime = animation.duration; // ensure final keyframe is hit
            } else {
              currentTime = timeInLoop;
            }
        } else {
             currentTime = 0;
        }
        
        animatedElementPropsCache.clear(); 
        while (defsContainer.firstChild && defsContainer.firstChild.id && !defsContainer.firstChild.id.startsWith("static-")) {
            defsContainer.removeChild(defsContainer.firstChild);
        }


        allBaseElements.forEach(baseEl => {
          const domElement = svgRoot.getElementById(baseEl.id);
          if (!domElement) {
             if (baseEl.type !== 'path' || (baseEl.type === 'path' && (baseEl.isRendered === undefined || baseEl.isRendered === true))) {
                 // console.warn("DOM element not found for:", baseEl.id);
             }
             return;
          }
          
          let animatedProps = getAnimatedProps(baseEl.id, currentTime);
          if (!animatedProps) return;

          const motionPathIdValue = animatedProps.motionPath || animatedProps.motionPathId || baseEl.motionPathId;
          const motionPathActualElement = motionPathIdValue ? allBaseElements.find(e => e.id === motionPathIdValue) : null;
          let pathDForMotion = null;

          if (motionPathActualElement) {
            if (motionPathActualElement.type === 'path') {
                if (Array.isArray(animatedProps.d) && motionPathActualElement.id === baseEl.id) {
                    pathDForMotion = buildPathDFromStructuredPointsJS(animatedProps.d, baseEl.closedByJoining);
                } else if (Array.isArray(motionPathActualElement.d) && motionPathActualElement.structuredPoints) {
                    pathDForMotion = buildPathDFromStructuredPointsJS(motionPathActualElement.structuredPoints, motionPathActualElement.closedByJoining);
                } else if (typeof motionPathActualElement.d === 'string') {
                    pathDForMotion = motionPathActualElement.d;
                }
            }
            else if (motionPathActualElement.type === 'rect') pathDForMotion = getRectAsPathDJS(motionPathActualElement.width, motionPathActualElement.height);
            else if (motionPathActualElement.type === 'circle') { // Ellipse case for motion path
                const mpRx = motionPathActualElement.rx !== undefined ? motionPathActualElement.rx : (motionPathActualElement.r !== undefined ? motionPathActualElement.r : ${DEFAULT_CIRCLE_R});
                const mpRy = motionPathActualElement.ry !== undefined ? motionPathActualElement.ry : (motionPathActualElement.r !== undefined ? motionPathActualElement.r : ${DEFAULT_CIRCLE_R});
                pathDForMotion = getCircleAsPathDJS(mpRx, mpRy);
            }
          }
          
          if (pathDForMotion && motionPathActualElement) {
              tempPathForCalculations.setAttribute('d', pathDForMotion);
              const totalLength = tempPathForCalculations.getTotalLength();

              if (totalLength > 0) {
                const mpStart = animatedProps.motionPathStart !== undefined ? animatedProps.motionPathStart : ${DEFAULT_MOTION_PATH_START};
                const mpEnd = animatedProps.motionPathEnd !== undefined ? animatedProps.motionPathEnd : ${DEFAULT_MOTION_PATH_END};
                let mpOffsetX = animatedProps.motionPathOffsetX !== undefined ? animatedProps.motionPathOffsetX : ${DEFAULT_MOTION_PATH_OFFSET_X};
                let mpOffsetY = animatedProps.motionPathOffsetY !== undefined ? animatedProps.motionPathOffsetY : ${DEFAULT_MOTION_PATH_OFFSET_Y};
                const segmentLength = Math.max(0.0001, mpEnd - mpStart);
                
                const motionPathTrack = animation.tracks.find(t => t.elementId === baseEl.id && t.property === 'motionPath');
                const relevantMotionKeyframes = motionPathTrack 
                    ? motionPathTrack.keyframes.filter(kf => kf.value === motionPathIdValue)
                    : (motionPathIdValue === baseEl.motionPathId ? [{time:0, value:motionPathIdValue}, {time:animation.duration, value:motionPathIdValue}] : []);

                let pathActiveStartTime = 0;
                let pathActiveEndTime = animation.duration;

                if (relevantMotionKeyframes.length > 0) {
                    pathActiveStartTime = Math.min(...relevantMotionKeyframes.map(kf => kf.time));
                    const nextKeyframeForThisPath = motionPathTrack?.keyframes.find(kf => kf.time > pathActiveStartTime && kf.value !== motionPathIdValue);
                    pathActiveEndTime = nextKeyframeForThisPath ? nextKeyframeForThisPath.time : animation.duration;
                }


                const motionDuration = Math.max(0.001, pathActiveEndTime - pathActiveStartTime);
                const timeIntoMotion = Math.max(0, Math.min(motionDuration, currentTime - pathActiveStartTime));
                const baseProgress = (motionDuration === 0 || pathActiveEndTime <= pathActiveStartTime) ? 0 : (timeIntoMotion / motionDuration);
                const actualPathProgress = mpStart + (baseProgress * segmentLength);

                const rawPointOnPath = tempPathForCalculations.getPointAtLength(Math.max(0, Math.min(1, actualPathProgress)) * totalLength);
                
                const mpElBaseX = motionPathActualElement.x ?? 0;
                const mpElBaseY = motionPathActualElement.y ?? 0;
                const mpElBaseRotation = motionPathActualElement.rotation ?? 0;
                const mpElBaseScale = motionPathActualElement.scale ?? 1;

                let transformedPathPointX = rawPointOnPath.x * mpElBaseScale;
                let transformedPathPointY = rawPointOnPath.y * mpElBaseScale;

                if (mpElBaseRotation !== 0) {
                  const angleRad = mpElBaseRotation * (Math.PI / 180);
                  const cosA = Math.cos(angleRad);
                  const sinA = Math.sin(angleRad);
                  const rx = transformedPathPointX * cosA - transformedPathPointY * sinA;
                  const ry = transformedPathPointX * sinA + transformedPathPointY * cosA;
                  transformedPathPointX = rx;
                  transformedPathPointY = ry;
                }
                
                transformedPathPointX += mpElBaseX;
                transformedPathPointY += mpElBaseY;

                let finalX = transformedPathPointX;
                let finalY = transformedPathPointY;
                let finalAngleDegrees = animatedProps.rotation !== undefined ? animatedProps.rotation : (baseEl.rotation !== undefined ? baseEl.rotation : 0);

                if (baseEl.alignToPath || animatedProps.alignToPath) {
                  const angleFromDString = getPathAngleAtProgress(tempPathForCalculations, Math.max(0, Math.min(1, actualPathProgress)));
                  finalAngleDegrees = angleFromDString + mpElBaseRotation;
                  animatedProps.rotation = finalAngleDegrees;

                  const elementAngleRadians = finalAngleDegrees * (Math.PI / 180);
                  const cosElementAngle = Math.cos(elementAngleRadians);
                  const sinElementAngle = Math.sin(elementAngleRadians);
                  
                  finalX += (mpOffsetX * cosElementAngle - mpOffsetY * sinElementAngle);
                  finalY += (mpOffsetX * sinElementAngle + mpOffsetY * cosElementAngle);
                } else {
                  finalX += mpOffsetX;
                  finalY += mpOffsetY;
                }
                
                if (baseEl.type === 'rect') { 
                  const currentWidth = animatedProps.width !== undefined ? animatedProps.width : baseEl.width;
                  const currentHeight = animatedProps.height !== undefined ? animatedProps.height : baseEl.height;
                  animatedProps.x = finalX - currentWidth / 2;
                  animatedProps.y = finalY - currentHeight / 2;
                } else { 
                  animatedProps.x = finalX;
                  animatedProps.y = finalY;
                }
              }
          }

          if (animatedProps.x === undefined) animatedProps.x = baseEl.x ?? 0;
          if (animatedProps.y === undefined) animatedProps.y = baseEl.y ?? 0;
          if (animatedProps.rotation === undefined) animatedProps.rotation = baseEl.rotation ?? 0;


          const finalTransform = getLocalTransformString(animatedProps, baseEl);
          if (finalTransform) {
            domElement.setAttribute('transform', finalTransform);
          } else {
            domElement.removeAttribute('transform');
          }
          
          if (typeof animatedProps.fill === 'object' && animatedProps.fill !== null) {
            const gradInfo = getGradientDef(animatedProps.fill, currentTime);
            if (gradInfo) {
                defsContainer.appendChild(gradInfo.defElement);
                domElement.setAttribute('fill', \`url(#\${gradInfo.id})\`);
            }
          } else if (animatedProps.fill !== undefined) {
            domElement.setAttribute('fill', animatedProps.fill);
          } else if (baseEl.type === 'group') {
            domElement.removeAttribute('fill');
          }
          
          if (typeof animatedProps.stroke === 'object' && animatedProps.stroke !== null) {
            const gradInfo = getGradientDef(animatedProps.stroke, currentTime);
            if (gradInfo) {
                defsContainer.appendChild(gradInfo.defElement);
                domElement.setAttribute('stroke', \`url(#\${gradInfo.id})\`);
            }
          } else if (animatedProps.stroke !== undefined) {
             domElement.setAttribute('stroke', animatedProps.stroke);
          } else if (baseEl.type === 'group') {
             domElement.removeAttribute('stroke');
          }
          
          if (animatedProps.strokeWidth !== undefined) domElement.setAttribute('stroke-width', String(animatedProps.strokeWidth));
          else if (baseEl.type === 'group') domElement.removeAttribute('stroke-width');

          if (animatedProps.opacity !== undefined) domElement.setAttribute('opacity', String(animatedProps.opacity));
          else domElement.removeAttribute('opacity');
          
          if (animatedProps.filter) domElement.setAttribute('filter', animatedProps.filter); else domElement.removeAttribute('filter');
          if (animatedProps.clipPath) domElement.setAttribute('clip-path', animatedProps.clipPath); else domElement.removeAttribute('clip-path');
          if (animatedProps.mask) domElement.setAttribute('mask', animatedProps.mask); else domElement.removeAttribute('mask');


          if (baseEl.type === 'path' || baseEl.type === 'rect' || baseEl.type === 'circle') {
            const baseDrawStartPercentDefault = baseEl.drawStartPercent !== undefined ? baseEl.drawStartPercent : 0;
            const baseDrawEndPercentDefault = baseEl.drawEndPercent !== undefined ? baseEl.drawEndPercent : 1;
            const interpolatedDrawStartPercent = animatedProps.drawStartPercent !== undefined ? animatedProps.drawStartPercent : baseDrawStartPercentDefault;
            const interpolatedDrawEndPercent = animatedProps.drawEndPercent !== undefined ? animatedProps.drawEndPercent : baseDrawEndPercentDefault;
            const drawStartPercentTrack = animation.tracks.find(t => t.elementId === baseEl.id && t.property === 'drawStartPercent');
            const drawEndPercentTrack = animation.tracks.find(t => t.elementId === baseEl.id && t.property === 'drawEndPercent');
            const isPercentageDrawActive = (drawStartPercentTrack && drawStartPercentTrack.keyframes.length > 0) || (drawEndPercentTrack && drawEndPercentTrack.keyframes.length > 0) || interpolatedDrawStartPercent !== baseDrawStartPercentDefault || interpolatedDrawEndPercent !== baseDrawEndPercentDefault;
            let finalStrokeDasharray = animatedProps.strokeDasharray !== undefined ? animatedProps.strokeDasharray : baseEl.strokeDasharray;
            let finalStrokeDashoffset = animatedProps.strokeDashoffset !== undefined ? animatedProps.strokeDashoffset : baseEl.strokeDashoffset;
            if (isPercentageDrawActive) {
                const shapePathLen = calculateShapePathLengthJS(baseEl);
                if (shapePathLen > 0) {
                    const currentAnimatedStart = shapePathLen * interpolatedDrawStartPercent;
                    const currentAnimatedEnd = shapePathLen * interpolatedDrawEndPercent;
                    const effectiveDashLength = Math.max(0, currentAnimatedEnd - currentAnimatedStart);
                    finalStrokeDasharray = \`\${effectiveDashLength} \${shapePathLen || 1}\`;
                    finalStrokeDashoffset = -currentAnimatedStart;
                } else { finalStrokeDasharray = "0 1"; finalStrokeDashoffset = 0; }
            }
            if (finalStrokeDasharray !== undefined) domElement.setAttribute('stroke-dasharray', finalStrokeDasharray);
            else domElement.removeAttribute('stroke-dasharray');
            if (finalStrokeDashoffset !== undefined) domElement.setAttribute('stroke-dashoffset', String(finalStrokeDashoffset));
            else domElement.removeAttribute('stroke-dashoffset');
          }


          if (baseEl.type !== 'group') { 
            if (baseEl.type === 'rect') {
              if (animatedProps.width !== undefined) domElement.setAttribute('width', String(animatedProps.width));
              if (animatedProps.height !== undefined) domElement.setAttribute('height', String(animatedProps.height));
            } else if (baseEl.type === 'circle') {
              const rx = animatedProps.rx !== undefined ? animatedProps.rx : (animatedProps.r !== undefined ? animatedProps.r : (baseEl.rx !== undefined ? baseEl.rx : (baseEl.r !== undefined ? baseEl.r : ${DEFAULT_CIRCLE_R})));
              const ry = animatedProps.ry !== undefined ? animatedProps.ry : (animatedProps.r !== undefined ? animatedProps.r : (baseEl.ry !== undefined ? baseEl.ry : (baseEl.r !== undefined ? baseEl.r : ${DEFAULT_CIRCLE_R})));
              domElement.setAttribute('rx', String(rx));
              domElement.setAttribute('ry', String(ry));
              domElement.removeAttribute('r'); // Ensure 'r' is not present if rx/ry are used
            } else if (baseEl.type === 'path') {
              if (animatedProps.d !== undefined) {
                 if (Array.isArray(animatedProps.d)) {
                    domElement.setAttribute('d', buildPathDFromStructuredPointsJS(animatedProps.d, baseEl.closedByJoining));
                 } else {
                    domElement.setAttribute('d', String(animatedProps.d));
                 }
              }
            } else if (baseEl.type === 'text') {
                if (animatedProps.x !== undefined) domElement.setAttribute('x', String(animatedProps.x));
                if (animatedProps.y !== undefined) domElement.setAttribute('y', String(animatedProps.y));
                if (animatedProps.fontSize !== undefined) domElement.setAttribute('font-size', String(animatedProps.fontSize) + 'px');
                if (animatedProps.fontFamily !== undefined) domElement.setAttribute('font-family', String(animatedProps.fontFamily));
                if (animatedProps.fontWeight !== undefined) domElement.setAttribute('font-weight', String(animatedProps.fontWeight));
                if (animatedProps.fontStyle !== undefined) domElement.setAttribute('font-style', String(animatedProps.fontStyle));
                if (animatedProps.letterSpacing !== undefined) domElement.setAttribute('letter-spacing', String(animatedProps.letterSpacing));
                if (animatedProps.lineHeight !== undefined) domElement.style.lineHeight = String(animatedProps.lineHeight);
                if (animatedProps.textAnchor !== undefined) domElement.setAttribute('text-anchor', String(animatedProps.textAnchor));
                if (animatedProps.text !== undefined) domElement.textContent = String(animatedProps.text);
            } else if (baseEl.type === 'image') {
                if (animatedProps.x !== undefined) domElement.setAttribute('x', String(animatedProps.x));
                if (animatedProps.y !== undefined) domElement.setAttribute('y', String(animatedProps.y));
                if (animatedProps.width !== undefined) domElement.setAttribute('width', String(animatedProps.width));
                if (animatedProps.height !== undefined) domElement.setAttribute('height', String(animatedProps.height));
                if (animatedProps.href !== undefined) {
                    domElement.setAttribute('href', String(animatedProps.href));
                    domElement.setAttribute('xlink:href', String(animatedProps.href));
                }
                if (animatedProps.preserveAspectRatio !== undefined) domElement.setAttribute('preserveAspectRatio', String(animatedProps.preserveAspectRatio));
            }
          }
        });
        requestAnimationFrame(animateFrame);
      };
      requestAnimationFrame(animateFrame);
    })();
  </script>
</body>
</html>
`;
};
