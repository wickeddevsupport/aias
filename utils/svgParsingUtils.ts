
// utils/svgParsingUtils.ts

/**
 * A comprehensive SVG parsing utility designed to approximate Figma’s SVG import behavior.
 * Supports nearly all standard SVG features: basic shapes (rect, circle, ellipse, line, polyline, polygon, path),
 * text with <tspan> and <textPath>, groups, images, <use>/<symbol> resolution, gradients, patterns,
 * clipPaths, masks, filters, CSS cascades (inline, class, ID, tag selectors), full transform matrices
 * (translate, rotate [with center], scale [x/y], skewX, skewY, matrix), viewBox/preserveAspectRatio normalization,
 * and warnings for unsupported elements. External assets (linked CSS/fonts/images) must be fetched separately.
 */

import {
  SVGElementData,
  Artboard,
  RectElementProps,
  CircleElementProps,
  PathElementProps,
  TextElementProps,
  ImageElementProps,
  GroupElementProps,
  AnySVGGradient as GradientDef, 
  SVGFilterDef as FilterDef, 
  SVGClipPathDef as ClipPathDef, 
  ParsedClipShape, // Added
  SVGMaskDef as MaskDef, 
  SVGElementType,
  BaseElementProps,
  LinearSVGGradient, 
  RadialSVGGradient, 
  GradientStop
} from '../types'; 
import {
  DEFAULT_ELEMENT_FILL, // Used for new elements in app, not SVG import default
  DEFAULT_STROKE_WIDTH, // App default, SVG default for stroke-width is 1
  DEFAULT_OPACITY,
  DEFAULT_GROUP_NAME,
  DEFAULT_NAME,
  DEFAULT_TEXT_CONTENT,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_FONT_STYLE,
  DEFAULT_TEXT_ANCHOR,
  DEFAULT_TEXT_VERTICAL_ALIGN,
  DEFAULT_IMAGE_HREF,
  DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO,
  DEFAULT_PATH_FILL, // App default, SVG path fill depends on open/closed and explicit fill
  DEFAULT_GRADIENT_ANGLE,
  DEFAULT_RADIAL_CX,
  DEFAULT_RADIAL_CY,
  DEFAULT_RADIAL_R,
  DEFAULT_RADIAL_FX,
  DEFAULT_RADIAL_FY,
  DEFAULT_RADIAL_FR
} from '../constants';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';

extend([namesPlugin]);


interface StyleDeclaration {
  [property: string]: string;
}

interface ParsedCSS {
  classRules: Record<string, StyleDeclaration>;
  idRules: Record<string, StyleDeclaration>;
  tagRules: Record<string, StyleDeclaration>;
}

const HANDLED_SVG_TAGS: Record<string, SVGElementType> = {
  rect: 'rect',
  circle: 'circle',
  ellipse: 'circle', 
  line: 'path',    
  polyline: 'path', 
  polygon: 'path',  
  path: 'path',
  g: 'group',
  text: 'text',
  image: 'image',
};

const IGNORED_CONTAINER_TAGS_FOR_WARNING = [
  'metadata', 'script', 'title', 'desc', 'marker', 'foreignobject', 'switch', 'a',
];
const IGNORED_LEAF_TAGS_FOR_WARNING = [
  'stop', 'animate', 'set', 'animateMotion', 'animateTransform',
];
const SUPPORTED_CSS_PROPERTIES: string[] = [
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'opacity',
  'font-family', 'font-size', 'font-weight', 'font-style', 
  'text-anchor', 'dominant-baseline', 
  'clip-path', 'clip-rule',
  'mask', 'filter',
  'display', 'visibility',
  'background-color', 
];

function stripCssComments(cssText: string): string {
  return cssText.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
}

function parseCssStylesFromString(styleContent: string): ParsedCSS {
  const css: ParsedCSS = { classRules: {}, idRules: {}, tagRules: {} };
  if (!styleContent) return css;
  let content = stripCssComments(styleContent);
  const ruleRegex = /([^{]+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(content)) !== null) {
    const selectorPart = match[1].trim();
    const declarationsPart = match[2].trim();
    const declRegex = /([\w-]+)\s*:\s*([^;]+);?/g;
    let declMatch: RegExpExecArray | null;
    const declarations: StyleDeclaration = {};
    while ((declMatch = declRegex.exec(declarationsPart)) !== null) {
      const prop = declMatch[1].trim().toLowerCase();
      const val = declMatch[2].trim();
      if (SUPPORTED_CSS_PROPERTIES.includes(prop)) declarations[prop] = val;
    }
    if (Object.keys(declarations).length === 0) continue;
    const selectors = selectorPart.split(',').map(s => s.trim());
    selectors.forEach(sel => {
      if (sel.startsWith('.')) {
        const className = sel.substring(1).split(/[:\s\[\].#]/)[0];
        if (!css.classRules[className]) css.classRules[className] = {};
        Object.assign(css.classRules[className], declarations);
      } else if (sel.startsWith('#')) {
        const idName = sel.substring(1).split(/[:\s\[\].#]/)[0];
        if (!css.idRules[idName]) css.idRules[idName] = {};
        Object.assign(css.idRules[idName], declarations);
      } else {
        const tag = sel.split(/[:\s\[\].#]/)[0].toLowerCase();
        if (HANDLED_SVG_TAGS[tag] || ['svg', 'style', 'defs', 'title', 'desc'].includes(tag)) {
          if (!css.tagRules[tag]) css.tagRules[tag] = {};
          Object.assign(css.tagRules[tag], declarations);
        }
      }
    });
  }
  return css;
}

function getResolvedStyleValue(
  node: Element, svgAttrName: string, cssPropName: string,
  cssMap: ParsedCSS, parentNode?: Element
): string | null {
  const inlineStyle = node.getAttribute('style');
  if (inlineStyle) {
    const decls = inlineStyle.split(';').map(d => d.trim()).filter(d => d);
    for (let i = decls.length - 1; i >= 0; i--) {
      const parts = decls[i].split(':').map(p => p.trim());
      if (parts.length === 2 && parts[0].toLowerCase() === cssPropName.toLowerCase()) {
        const inlineVal = parts[1];
        if (inlineVal.toLowerCase() !== 'inherit') return inlineVal;
        break; 
      }
    }
  }

  const presVal = node.getAttribute(svgAttrName);
  if (presVal !== null && presVal.trim() !== '' && presVal.toLowerCase() !== 'inherit') {
    return presVal;
  }

  const idAttr = node.getAttribute('id');
  if (idAttr) {
    const idStyles = cssMap.idRules[idAttr];
    if (idStyles) {
        const styleValue = idStyles[cssPropName];
        if (styleValue !== undefined && styleValue.toLowerCase() !== 'inherit') {
            return styleValue;
        }
    }
  }

  const classAttr = node.getAttribute('class');
  if (classAttr) {
    const classes = classAttr.split(/\s+/);
    for (let i = classes.length - 1; i >= 0; i--) {
      const cls = classes[i];
      const classStyles = cssMap.classRules[cls];
      if (classStyles) {
        const styleValue = classStyles[cssPropName];
        if (styleValue !== undefined && styleValue.toLowerCase() !== 'inherit') {
          return styleValue;
        }
      }
    }
  }

  const tag = node.tagName.toLowerCase();
  const tagStyles = cssMap.tagRules[tag];
  if (tagStyles) {
    const styleValue = tagStyles[cssPropName];
    if (styleValue !== undefined && styleValue.toLowerCase() !== 'inherit') {
      return styleValue;
    }
  }

  const inheritableProps = new Set(['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'opacity', 'visibility', 'clip-rule', 'fill-rule']);
  const wasExplicitlyInherit = 
    (presVal?.toLowerCase() === 'inherit') ||
    (inlineStyle && inlineStyle.includes(`${cssPropName}:inherit`)) ||
    (idAttr && cssMap.idRules[idAttr]?.[cssPropName]?.toLowerCase() === 'inherit') ||
    (classAttr && classAttr.split(/\s+/).some(cls => cssMap.classRules[cls]?.[cssPropName]?.toLowerCase() === 'inherit')) ||
    (tagStyles?.[cssPropName]?.toLowerCase() === 'inherit');

  if (parentNode && inheritableProps.has(cssPropName)) {
     if (wasExplicitlyInherit || 
        (presVal === null && 
         (!inlineStyle || !inlineStyle.includes(`${cssPropName}:`)) &&
         (!idAttr || !cssMap.idRules[idAttr]?.[cssPropName]) &&
         (!classAttr || !classAttr.split(/\s+/).some(cls => cssMap.classRules[cls]?.[cssPropName])) &&
         (!tagStyles || !tagStyles[cssPropName])
        )
      ) {
      return getResolvedStyleValue(parentNode, svgAttrName, cssPropName, cssMap, parentNode.parentElement || undefined);
    }
  }
  return null;
}


function parseTransformAttribute(transformString: string | null): DOMMatrix {
  const tempG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  if (transformString) tempG.setAttribute("transform", transformString);
  const transformList = tempG.transform.baseVal;
  let matrix = new DOMMatrix();
  for (let i = 0; i < transformList.numberOfItems; i++) {
    matrix = matrix.multiply(transformList.getItem(i).matrix);
  }
  return matrix;
}

function decomposeMatrix(matrix: DOMMatrix): { x: number; y: number; rotation: number; scaleX: number; scaleY: number; skewX: number } {
    const { a, b, c, d, e, f } = matrix;
    let x = e, y = f;
    let rotation = Math.atan2(b, a) * (180 / Math.PI);
    let scaleX = Math.sqrt(a * a + b * b);
    let scaleY = (a * d - b * c) / scaleX; 
    let skewX = Math.atan2(a * c + b * d, a * a + b * b) * (180 / Math.PI);
    if (scaleX === 0) {
        rotation = Math.atan2(d,c) * (180 / Math.PI) - 90; 
        scaleY = Math.sqrt(c*c + d*d);
        skewX = 0;
    }
    return {
        x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)),
        rotation: parseFloat(rotation.toFixed(3)),
        scaleX: parseFloat(scaleX.toFixed(3)), scaleY: parseFloat(scaleY.toFixed(3)),
        skewX: parseFloat(skewX.toFixed(3))
    };
}

export const parseSvgString = (
  svgString: string, defaultArtboardId: string
): { elements: SVGElementData[]; artboardOverrides?: Partial<Artboard>; warnings: string[] } => {
  if (!svgString || svgString.trim() === '') throw new Error('SVG string is empty.');
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgNode = doc.querySelector('svg');
  if (!svgNode) {
    const errNode = doc.querySelector('parsererror');
    if (errNode) throw new Error(`Invalid SVG: ${errNode.textContent || 'Unknown parsing error'}`);
    throw new Error('No <svg> root element found.');
  }

  const cssMap: ParsedCSS = { classRules: {}, idRules: {}, tagRules: {} };
  Array.from(svgNode.querySelectorAll('style')).forEach(styleTag => {
    const txt = styleTag.textContent || '';
    const parsed = parseCssStylesFromString(txt);
    Object.assign(cssMap.classRules, { ...cssMap.classRules, ...parsed.classRules });
    Object.assign(cssMap.idRules, { ...cssMap.idRules, ...parsed.idRules });
    Object.assign(cssMap.tagRules, { ...cssMap.tagRules, ...parsed.tagRules });
  });

  let artboardOverrides: Partial<Artboard> = {};
  const viewBoxAttr = svgNode.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      artboardOverrides.width = parts[2]; artboardOverrides.height = parts[3];
    }
  } else {
    const w = svgNode.getAttribute('width'); const h = svgNode.getAttribute('height');
    if (w) { const num = parseFloat(w); if (!isNaN(num)) artboardOverrides.width = num; }
    if (h) { const num = parseFloat(h); if (!isNaN(num)) artboardOverrides.height = num; }
  }
  artboardOverrides.backgroundColor = getResolvedStyleValue(svgNode, 'background-color', 'background-color', cssMap, undefined) || svgNode.style.backgroundColor || 'transparent';
  artboardOverrides.name = svgNode.querySelector('title')?.textContent || defaultArtboardId.replace(/-/g, ' ');

  const parsedElements: SVGElementData[] = [];
  const warnings: string[] = [];
  const defsContainer: { gradients: GradientDef[]; filters: FilterDef[]; clipPaths: ClipPathDef[]; masks: MaskDef[]; symbols: Record<string, Element> } = { gradients: [], filters: [], clipPaths: [], masks: [], symbols: {} };

  Array.from(svgNode.querySelectorAll('defs > *')).forEach(defChildNode => {
    const defChild = defChildNode as Element;
    const tagName = defChild.tagName.toLowerCase();
    const id = defChild.getAttribute('id');
    if (!id) return;
    switch (tagName) {
      case 'lineargradient':
      case 'radialgradient':
        const stops: GradientStop[] = Array.from(defChild.querySelectorAll('stop')).map(stopNode => {
          const offsetRaw = stopNode.getAttribute('offset') || '0';
          const offset = parseFloat(offsetRaw.endsWith('%') ? offsetRaw.slice(0, -1) : offsetRaw);
          return {
            id: stopNode.getAttribute('id') || `stop-${Date.now()}-${Math.random()}`,
            offset: (isNaN(offset) ? 0 : offset) / (offsetRaw.endsWith('%') ? 100 : 1),
            color: getResolvedStyleValue(stopNode, 'stop-color', 'stop-color', cssMap, defChild) || '#000',
          };
        }).sort((a,b) => a.offset - b.offset);
        const gradientUnits = (defChild.getAttribute('gradientUnits') as any) || 'objectBoundingBox';
        if (tagName === 'lineargradient') {
          const x1 = defChild.getAttribute('x1') || '0%'; const y1 = defChild.getAttribute('y1') || '0%';
          const x2 = defChild.getAttribute('x2') || '100%'; const y2 = defChild.getAttribute('y2') || '0%';
          let angle = DEFAULT_GRADIENT_ANGLE;
          if (y1 === y2 && x1 !== x2) angle = parseFloat(x1) < parseFloat(x2) ? 0 : 180;
          else if (x1 === x2 && y1 !== y2) angle = parseFloat(y1) < parseFloat(y2) ? 90 : 270;
          defsContainer.gradients.push({ id, type: 'linearGradient', stops, angle, gradientUnits, x1, y1, x2, y2 } as LinearSVGGradient);
        } else {
          defsContainer.gradients.push({
            id, type: 'radialGradient', stops, gradientUnits,
            cx: defChild.getAttribute('cx') || DEFAULT_RADIAL_CX, cy: defChild.getAttribute('cy') || DEFAULT_RADIAL_CY,
            r:  defChild.getAttribute('r') || DEFAULT_RADIAL_R, fx: defChild.getAttribute('fx') || undefined,
            fy: defChild.getAttribute('fy') || undefined, fr: defChild.getAttribute('fr') || undefined,
          } as RadialSVGGradient);
        }
        break;
      case 'filter': defsContainer.filters.push({ id, rawContent: defChild.innerHTML }); break;
      case 'clippath':
        const clipPathUnits = defChild.getAttribute('clipPathUnits') as ClipPathDef['clipPathUnits'] || 'userSpaceOnUse';
        const parsedClipShapes: ParsedClipShape[] = [];
        Array.from(defChild.children).forEach(clipShapeNode => {
            const clipShapeTag = clipShapeNode.tagName.toLowerCase();
            let type: ParsedClipShape['type'] | undefined;
            if (clipShapeTag === 'circle') type = 'circle';
            else if (clipShapeTag === 'rect') type = 'rect';
            else if (clipShapeTag === 'ellipse') type = 'ellipse';
            else if (clipShapeTag === 'path') type = 'path';

            if (type) {
                const attrs: Record<string, string | number> = {};
                // Common attributes
                ['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'd'].forEach(attrName => {
                    const val = clipShapeNode.getAttribute(attrName);
                    if (val !== null) {
                         // Attempt to parse as number if it looks like one, otherwise store as string
                        const numVal = parseFloat(val);
                        attrs[attrName] = (isNaN(numVal) || !isFinite(numVal) || val.endsWith('%')) ? val : numVal;
                    }
                });
                 // Add transform if present on the clip shape itself
                const transform = clipShapeNode.getAttribute('transform');
                if (transform) attrs['transform'] = transform;

                parsedClipShapes.push({ type, attrs });
            }
        });
        defsContainer.clipPaths.push({ id, rawContent: defChild.innerHTML, clipPathUnits, parsedShapes: parsedClipShapes });
        break;
      case 'mask': defsContainer.masks.push({ id, rawContent: defChild.innerHTML }); break;
      case 'symbol': defsContainer.symbols[id] = defChild; break;
    }
  });
  artboardOverrides.defs = defsContainer;

  const processNode = (node: Element, parentNetMatrix: DOMMatrix, parentId: string | null, orderInParent: number): void => {
    const tagName = node.tagName.toLowerCase();
    if (['defs', 'style', 'title', 'desc', 'metadata'].includes(tagName)) return;
    const display = getResolvedStyleValue(node, 'display', 'display', cssMap, node.parentElement || undefined);
    const visibility = getResolvedStyleValue(node, 'visibility', 'visibility', cssMap, node.parentElement || undefined);
    if (display === 'none' || visibility === 'hidden') return;

    let geometryMatrix = new DOMMatrix();
    if (tagName === 'rect') {
      geometryMatrix = geometryMatrix.translateSelf(
        parseFloat(node.getAttribute('x') || '0'),
        parseFloat(node.getAttribute('y') || '0')
      );
    } else if (tagName === 'circle' || tagName === 'ellipse') {
      geometryMatrix = geometryMatrix.translateSelf(
        parseFloat(node.getAttribute('cx') || '0'),
        parseFloat(node.getAttribute('cy') || '0')
      );
    }
    const elementTransformAttrMatrix = parseTransformAttribute(node.getAttribute('transform'));
    const netMatrix = parentNetMatrix.multiply(geometryMatrix).multiplySelf(elementTransformAttrMatrix);
    
    let elementType = HANDLED_SVG_TAGS[tagName] || null;
    if (tagName === 'use') {
        const href = node.getAttribute('href') || node.getAttribute('xlink:href');
        if (href && href.startsWith('#')) {
            const refId = href.slice(1);
            const symbolElement = defsContainer.symbols[refId];
            if (symbolElement) {
                const useX = parseFloat(node.getAttribute('x') || '0');
                const useY = parseFloat(node.getAttribute('y') || '0');
                const useTranslateMatrix = new DOMMatrix().translate(useX, useY);
                const matrixForSymbol = parentNetMatrix.multiply(elementTransformAttrMatrix).multiplySelf(useTranslateMatrix);
                const groupId = node.getAttribute('id') || `use-${refId}-${Date.now()}`;
                const groupName = node.getAttribute('data-name') || node.getAttribute('name') || `Use of ${refId}`;
                const decomposedUseTransform = decomposeMatrix(parentNetMatrix.multiply(elementTransformAttrMatrix));
                parsedElements.push({
                    id: groupId, artboardId: defaultArtboardId, type: 'group', name: groupName, parentId, order: orderInParent,
                    x: decomposedUseTransform.x, y: decomposedUseTransform.y, 
                    rotation: decomposedUseTransform.rotation, 
                    scale: parseFloat(((decomposedUseTransform.scaleX + decomposedUseTransform.scaleY) / 2).toFixed(3)),
                    opacity: parseFloat(getResolvedStyleValue(node, 'opacity', 'opacity', cssMap, node.parentElement || undefined) || `${DEFAULT_OPACITY}`),
                } as GroupElementProps);
                Array.from(symbolElement.children).forEach((child, idx) => processNode(child as Element, matrixForSymbol, groupId, idx));
                return;
            } else warnings.push(`Symbol for <use href="${href}"> not found.`);
        }
        elementType = null; 
    } else if (tagName === 'ellipse') elementType = 'circle';
    else if (['line', 'polyline', 'polygon'].includes(tagName)) elementType = 'path';
    else if (tagName === 'svg') elementType = 'group';

    if (!elementType) {
      if (!IGNORED_CONTAINER_TAGS_FOR_WARNING.includes(tagName) && !IGNORED_LEAF_TAGS_FOR_WARNING.includes(tagName) && tagName !== 'a') {
        warnings.push(`Skipped unsupported element <${tagName}>.`);
      }
      if (tagName === 'a' || (node.children.length > 0 && !IGNORED_CONTAINER_TAGS_FOR_WARNING.includes(tagName))) {
         Array.from(node.children).forEach((child, idx) => processNode(child as Element, netMatrix, parentId, orderInParent + idx + 0.001));
      }
      return;
    }

    const id = node.getAttribute('id') || `${elementType}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
    const nameAttr = node.getAttribute('data-name') || node.getAttribute('name') || node.getAttribute('id') || `${elementType} ${parsedElements.length + 1}`;
    const decomposedFinalTransform = decomposeMatrix(netMatrix);

    const baseProps: BaseElementProps = {
      id, type: elementType, name: nameAttr, artboardId: defaultArtboardId, parentId, order: orderInParent,
      x: decomposedFinalTransform.x, y: decomposedFinalTransform.y,
      rotation: decomposedFinalTransform.rotation,
      scale: parseFloat(((decomposedFinalTransform.scaleX + decomposedFinalTransform.scaleY) / 2).toFixed(3)),
      opacity: parseFloat(getResolvedStyleValue(node, 'opacity', 'opacity', cssMap, node.parentElement || undefined) || `${DEFAULT_OPACITY}`),
      filter: getResolvedStyleValue(node, 'filter', 'filter', cssMap, node.parentElement || undefined) || undefined,
      clipPath: getResolvedStyleValue(node, 'clip-path', 'clip-path', cssMap, node.parentElement || undefined) || node.getAttribute('clipPath') || undefined,
      mask: getResolvedStyleValue(node, 'mask', 'mask', cssMap, node.parentElement || undefined) || undefined,
    };

    let finalFillProp: string | GradientDef | undefined;
    let finalStrokeProp: string | GradientDef | undefined;
    const rawFill = getResolvedStyleValue(node, 'fill', 'fill', cssMap, node.parentElement || undefined);
    const rawStroke = getResolvedStyleValue(node, 'stroke', 'stroke', cssMap, node.parentElement || undefined);
    const rawFillOpacity = getResolvedStyleValue(node, 'fill-opacity', 'fill-opacity', cssMap, node.parentElement || undefined);
    const rawStrokeOpacity = getResolvedStyleValue(node, 'stroke-opacity', 'stroke-opacity', cssMap, node.parentElement || undefined);

    const applyOpacityToColor = (colorStr: string | undefined, opacityValStr: string | null): string | undefined => {
        if (!colorStr || colorStr === 'none' || colorStr.startsWith('url(#')) return colorStr;
        const opacity = opacityValStr ? parseFloat(opacityValStr) : 1;
        if (isNaN(opacity) || opacity >= 1) return colorStr;
        const c = colord(colorStr);
        if (!c.isValid()) return colorStr;
        return c.alpha(c.alpha() * opacity).toRgbString();
    };

    if (rawFill === null) {
        finalFillProp = applyOpacityToColor('#000000', rawFillOpacity);
    } else if (rawFill.toLowerCase() === 'none') {
        finalFillProp = 'none';
    } else if (rawFill.startsWith('url(#')) {
        const gradient = defsContainer.gradients.find(g => g.id === rawFill.substring(5, rawFill.length - 1));
        finalFillProp = gradient || applyOpacityToColor('#000000', rawFillOpacity);
    } else {
        finalFillProp = applyOpacityToColor(rawFill, rawFillOpacity);
    }

    if (rawStroke === null) {
        finalStrokeProp = 'none';
    } else if (rawStroke.toLowerCase() === 'none') {
        finalStrokeProp = 'none';
    } else if (rawStroke.startsWith('url(#')) {
        const gradient = defsContainer.gradients.find(g => g.id === rawStroke.substring(5, rawStroke.length - 1));
        finalStrokeProp = gradient || 'none';
    } else {
        finalStrokeProp = applyOpacityToColor(rawStroke, rawStrokeOpacity);
    }
    
    let numericStrokeWidth: number;
    if (finalStrokeProp === 'none' || finalStrokeProp === undefined) {
        numericStrokeWidth = 0;
    } else {
        const rawStrokeWidth = getResolvedStyleValue(node, 'stroke-width', 'stroke-width', cssMap, node.parentElement || undefined);
        if (rawStrokeWidth !== null) {
            const parsed = parseFloat(rawStrokeWidth);
            numericStrokeWidth = isNaN(parsed) ? 1 : parsed;
        } else {
            numericStrokeWidth = 1; // SVG default stroke-width is 1
        }
    }
    
    const dashArray = getResolvedStyleValue(node, 'stroke-dasharray', 'stroke-dasharray', cssMap, node.parentElement || undefined);
    const dashOffset = parseFloat(getResolvedStyleValue(node, 'stroke-dashoffset', 'stroke-dashoffset', cssMap, node.parentElement || undefined) || '0');

    switch (elementType) {
      case 'rect':
        const rxStr = node.getAttribute('rx'); const ryStr = node.getAttribute('ry');
        let cornerRadius: number | undefined = undefined;
        if (rxStr !== null || ryStr !== null) {
            const rxVal = rxStr ? parseFloat(rxStr) : undefined;
            const ryVal = ryStr ? parseFloat(ryStr) : undefined;
            if (rxVal !== undefined && ryVal !== undefined && !isNaN(rxVal) && !isNaN(ryVal)) cornerRadius = Math.min(rxVal, ryVal);
            else if (rxVal !== undefined && !isNaN(rxVal)) cornerRadius = rxVal;
            else if (ryVal !== undefined && !isNaN(ryVal)) cornerRadius = ryVal;
        }
        parsedElements.push({
          ...baseProps, type: 'rect',
          width: parseFloat(node.getAttribute('width') || '0'), 
          height: parseFloat(node.getAttribute('height') || '0'),
          cornerRadius,
          fill: finalFillProp,
          stroke: finalStrokeProp, strokeWidth: numericStrokeWidth,
          strokeDasharray: dashArray, strokeDashoffset: dashOffset,
        } as RectElementProps);
        break;
      case 'circle': 
        let rValue: number;
        if (tagName === 'ellipse') {
            rValue = Math.min(parseFloat(node.getAttribute('rx') || '0'), parseFloat(node.getAttribute('ry') || '0'));
        } else {
            rValue = parseFloat(node.getAttribute('r') || '0');
        }
        parsedElements.push({
          ...baseProps, type: 'circle', r: rValue,
          fill: finalFillProp,
          stroke: finalStrokeProp, strokeWidth: numericStrokeWidth,
          strokeDasharray: dashArray, strokeDashoffset: dashOffset,
        } as CircleElementProps);
        break;
      case 'path':
        let dAttr = node.getAttribute('d') || '';
        if (tagName === 'line') {
            dAttr = `M${node.getAttribute('x1')||'0'},${node.getAttribute('y1')||'0'}L${node.getAttribute('x2')||'0'},${node.getAttribute('y2')||'0'}`;
        } else if (tagName === 'polyline') {
            dAttr = `M${(node.getAttribute('points')||'').replace(/[\s,]+/g, 'L')}`;
        } else if (tagName === 'polygon') {
            dAttr = `M${(node.getAttribute('points')||'').replace(/[\s,]+/g, 'L')}Z`;
        }
        let pathFillResolved = finalFillProp;
        if (finalFillProp === '#000000' && !dAttr.trim().toUpperCase().endsWith('Z')) {
            pathFillResolved = 'none';
        }
        parsedElements.push({
          ...baseProps, type: 'path', d: dAttr,
          fill: pathFillResolved, stroke: finalStrokeProp, strokeWidth: numericStrokeWidth,
          strokeDasharray: dashArray, strokeDashoffset: dashOffset,
        } as PathElementProps);
        break;
      case 'text':
        const domBaseline = getResolvedStyleValue(node, 'dominant-baseline', 'dominant-baseline', cssMap, node.parentElement || undefined);
        let konvaVerticalAlign: TextElementProps['verticalAlign'] = DEFAULT_TEXT_VERTICAL_ALIGN;
        if (domBaseline) {
            const dbl = domBaseline.toLowerCase();
            if (dbl === 'middle' || dbl === 'central') konvaVerticalAlign = 'middle';
            else if (dbl === 'text-before-edge' || dbl === 'hanging') konvaVerticalAlign = 'top';
            else if (dbl === 'text-after-edge') konvaVerticalAlign = 'bottom';
            else if (['alphabetic', 'ideographic', 'mathematical', 'auto'].includes(dbl)) konvaVerticalAlign = 'baseline';
        }
        parsedElements.push({
          ...baseProps, type: 'text',
          text: node.textContent || DEFAULT_TEXT_CONTENT,
          fontFamily: getResolvedStyleValue(node, 'font-family', 'font-family', cssMap, node.parentElement || undefined) || DEFAULT_FONT_FAMILY,
          fontSize: parseFloat(getResolvedStyleValue(node, 'font-size', 'font-size', cssMap, node.parentElement || undefined) || `${DEFAULT_FONT_SIZE}`),
          fontWeight: getResolvedStyleValue(node, 'font-weight', 'font-weight', cssMap, node.parentElement || undefined) || DEFAULT_FONT_WEIGHT,
          fontStyle: getResolvedStyleValue(node, 'font-style', 'font-style', cssMap, node.parentElement || undefined) || DEFAULT_FONT_STYLE,
          textAnchor: (getResolvedStyleValue(node, 'text-anchor', 'text-anchor', cssMap, node.parentElement || undefined) as TextElementProps['textAnchor']) || DEFAULT_TEXT_ANCHOR,
          verticalAlign: konvaVerticalAlign,
          fill: finalFillProp,
          stroke: finalStrokeProp, strokeWidth: numericStrokeWidth,
        } as TextElementProps);
        break;
      case 'image':
        parsedElements.push({
          ...baseProps, type: 'image',
          width: node.getAttribute('width') ? parseFloat(node.getAttribute('width')!) : undefined,
          height: node.getAttribute('height') ? parseFloat(node.getAttribute('height')!) : undefined,
          href: node.getAttribute('href') || node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || DEFAULT_IMAGE_HREF,
          preserveAspectRatio: node.getAttribute('preserveAspectRatio') || DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO,
        } as ImageElementProps);
        break;
      case 'group':
        parsedElements.push({
            ...baseProps, type: 'group', name: nameAttr || `${DEFAULT_GROUP_NAME} ${parsedElements.filter(e => e.type === 'group').length + 1}`,
            fill: finalFillProp, stroke: finalStrokeProp,
            strokeWidth: (finalStrokeProp !== 'none' && finalStrokeProp !== undefined) ? numericStrokeWidth : undefined,
        } as GroupElementProps);
        Array.from(node.children).forEach((child, idx) => processNode(child as Element, netMatrix, id, idx));
        break;
    }
  };

  Array.from(svgNode.children).forEach((child, idx) => processNode(child as Element, new DOMMatrix(), null, idx));
  return { elements: parsedElements, artboardOverrides, warnings };
};
