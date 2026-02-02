
// utils/pathUtils.ts

import { RectElementProps, CircleElementProps, PathElementProps, BezierPoint, SVGElementData, ParsedDStringResult } from '../types';

/**
 * Calculates the angle (in degrees) of an SVG path's tangent at a given progress.
 * @param pathElementOrD The SVG path element, or its 'd' attribute string.
 * @param progress A number between 0 and 1, representing progress along the path.
 * @returns The angle in degrees (0-360), or 0 if calculation fails.
 */
export const getPathAngleAtProgress = (
  pathElementOrD: SVGPathElement | string,
  progress: number
): number => {
  let pathElement: SVGPathElement;

  if (typeof pathElementOrD === 'string') {
    if (typeof document === 'undefined') {
      // Cannot create DOM elements in non-browser environment
      return 0;
    }
    pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathElement.setAttribute("d", pathElementOrD);
  } else {
    pathElement = pathElementOrD;
  }

  if (!pathElement || typeof pathElement.getTotalLength !== 'function' || typeof pathElement.getPointAtLength !== 'function') {
    return 0;
  }

  const totalLength = pathElement.getTotalLength();
  if (totalLength === 0) {
    return 0;
  }

  // Ensure progress is within [0, 1]
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const currentDist = normalizedProgress * totalLength;
  const p_current = pathElement.getPointAtLength(currentDist);

  // To find the tangent, get a point slightly ahead or behind
  const smallDelta = Math.max(0.001, Math.min(totalLength * 0.01, 0.1)); // Adjust delta based on path length, but keep it small

  let p_other: DOMPoint;
  let dx: number, dy: number;

  // Try a point slightly ahead
  if (currentDist + smallDelta <= totalLength) {
    p_other = pathElement.getPointAtLength(currentDist + smallDelta);
    dx = p_other.x - p_current.x;
    dy = p_other.y - p_current.y;
    if (dx !== 0 || dy !== 0) {
      return Math.atan2(dy, dx) * (180 / Math.PI);
    }
  }

  // If at the end or ahead point failed, try a point slightly behind
  if (currentDist - smallDelta >= 0) {
    p_other = pathElement.getPointAtLength(currentDist - smallDelta);
    dx = p_current.x - p_other.x;
    dy = p_current.y - p_other.y;
    if (dx !== 0 || dy !== 0) {
      return Math.atan2(dy, dx) * (180 / Math.PI);
    }
  }
  // If path is extremely short or a point, default to 0 angle
  return 0;
};

/**
 * Converts RectElementProps to an SVG path 'd' string.
 * The path is defined relative to the rectangle's local origin (0,0).
 * @param rect The rectangle element properties.
 * @returns An SVG path 'd' string.
 */
export const getRectAsPathD = (rect: RectElementProps): string => {
  const { width, height } = rect;
  return `M0,0 L${width},0 L${width},${height} L0,${height} Z`;
};

/**
 * Converts CircleElementProps to an SVG path 'd' string.
 * The path is a circle centered at its local origin (0,0).
 * @param circle The circle element properties.
 * @returns An SVG path 'd' string.
 */
export const getCircleAsPathD = (circle: CircleElementProps): string => {
  const { r } = circle;
  // M x,y A rx,ry x-axis-rotation large-arc-flag sweep-flag dx,dy
  // To draw a full circle as two arcs:
  return `M0,${-r} A${r},${r} 0 1,0 0,${r} A${r},${r} 0 1,0 0,${-r} Z`;
};

/**
 * Calculates the total length of a shape (path, rect, or circle).
 * For rects and circles, it converts them to a path 'd' string first.
 * Uses a temporary SVG path element for calculation in a browser environment.
 * @param shape The SVG element data.
 * @returns The total length of the shape's path, or 0 if calculation is not possible.
 */
export const calculateShapePathLength = (shape: RectElementProps | CircleElementProps | PathElementProps): number => {
  if (typeof document === 'undefined') {
    // Cannot create DOM elements in non-browser environment
    return 0;
  }

  let dString: string;
  switch (shape.type) {
    case 'path':
      if (Array.isArray(shape.d)) {
        dString = buildPathDFromStructuredPoints(shape.d, shape.closedByJoining);
      } else {
        dString = shape.d;
      }
      break;
    case 'rect':
      dString = getRectAsPathD(shape);
      break;
    case 'circle':
      dString = getCircleAsPathD(shape);
      break;
    default:
      return 0;
  }

  if (!dString || typeof dString !== 'string' || dString.trim() === '') {
    return 0;
  }

  try {
    // Use a temporary path element to calculate length
    const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tempPath.setAttribute("d", dString);
    const length = tempPath.getTotalLength();
    return Number.isFinite(length) ? length : 0; // Ensure it's a valid number
  } catch (error) {
    // console.error("Error calculating path length:", error);
    return 0;
  }
};

/**
 * Builds an SVG path 'd' attribute string from an array of BezierPoint objects.
 * @param points Array of BezierPoint objects.
 * @param closedByJoining If true, a 'Z' command will be appended.
 * @returns The SVG path 'd' string.
 */
export const buildPathDFromStructuredPoints = (points: BezierPoint[], closedByJoining?: boolean): string => {
  if (!points || points.length === 0) return "";

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i-1]; // Previous point
    const p1 = points[i];   // Current point

    // If handles are undefined, use the anchor point itself (effectively a line segment)
    const c1x = p0.h2x !== undefined ? p0.h2x : p0.x;
    const c1y = p0.h2y !== undefined ? p0.h2y : p0.y;
    const c2x = p1.h1x !== undefined ? p1.h1x : p1.x;
    const c2y = p1.h1y !== undefined ? p1.h1y : p1.y;
    
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  if (closedByJoining && points.length > 1) {
    // Curve from last point back to first point
    const pLast = points[points.length - 1];
    const pFirst = points[0];

    const c1x = pLast.h2x !== undefined ? pLast.h2x : pLast.x;
    const c1y = pLast.h2y !== undefined ? pLast.h2y : pLast.y;
    const c2x = pFirst.h1x !== undefined ? pFirst.h1x : pFirst.x;
    const c2y = pFirst.h1y !== undefined ? pFirst.h1y : pFirst.y;
    
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${pFirst.x.toFixed(1)} ${pFirst.y.toFixed(1)}`;
    // Z is not strictly needed if the curve perfectly closes, but good for explicit path closing
    // d += " Z"; // Let Konva handle visual closing based on closedByJoining, d might not need Z for structured points.
  }
  return d;
};


// Helper to generate unique IDs for Bezier points
export const generatePointId = () => `bp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

/**
 * Converts a RectElementProps to an array of BezierPoint objects for its outline.
 * Points are relative to the rectangle's (0,0) local origin.
 * Initially creates sharp corners (control handles co-located with anchors).
 */
export const rectToPathStructuredPoints = (rect: RectElementProps): BezierPoint[] => {
  const { width, height } = rect;
  // Order: Top-left, Top-right, Bottom-right, Bottom-left
  return [
    { id: generatePointId(), x: 0, y: 0, h1x: 0, h1y: 0, h2x: 0, h2y: 0, isSmooth: false },
    { id: generatePointId(), x: width, y: 0, h1x: width, h1y: 0, h2x: width, h2y: 0, isSmooth: false },
    { id: generatePointId(), x: width, y: height, h1x: width, h1y: height, h2x: width, h2y: height, isSmooth: false },
    { id: generatePointId(), x: 0, y: height, h1x: 0, h1y: height, h2x: 0, h2y: height, isSmooth: false },
  ];
};

/**
 * Converts a CircleElementProps to an array of BezierPoint objects approximating its outline.
 * Points are relative to the circle's (0,0) local origin (center).
 * Uses 4 Bezier segments.
 */
export const circleToPathStructuredPoints = (circle: CircleElementProps): BezierPoint[] => {
  const { r } = circle;
  const kappa = 0.5522847498; // Magic number for circle approximation
  const c = r * kappa; // Control point offset

  // Anchor points (A) and control points (C)
  // A0: (0, -r)  Top
  // A1: (r, 0)   Right
  // A2: (0, r)   Bottom
  // A3: (-r, 0)  Left
  return [
    { // Top point (A0)
      id: generatePointId(), x: 0, y: -r,
      h1x: -c, h1y: -r, // Control for curve from A3
      h2x: c, h2y: -r,  // Control for curve to A1
      isSmooth: true,
    },
    { // Right point (A1)
      id: generatePointId(), x: r, y: 0,
      h1x: r, h1y: -c, // Control for curve from A0
      h2x: r, h2y: c,  // Control for curve to A2
      isSmooth: true,
    },
    { // Bottom point (A2)
      id: generatePointId(), x: 0, y: r,
      h1x: c, h1y: r,  // Control for curve from A1
      h2x: -c, h2y: r, // Control for curve to A3
      isSmooth: true,
    },
    { // Left point (A3)
      id: generatePointId(), x: -r, y: 0,
      h1x: -r, h1y: c,  // Control for curve from A2
      h2x: -r, h2y: -c, // Control for curve to A0
      isSmooth: true,
    },
  ];
};


/**
 * Calculates the absolute X and Y coordinates of an element relative to the artboard's (0,0) origin.
 * This function correctly accounts for parent translations, rotations, and scales.
 * @param elementId The ID of the element.
 * @param allElements Array of all SVGElementData.
 * @returns Object with absolute x and y coordinates.
 */
export const getElementArtboardRelativePosition = (
  elementId: string,
  allElements: SVGElementData[]
): { x: number; y: number } => {
  const element = allElements.find(el => el.id === elementId);
  if (!element) {
    console.warn(`Element with id ${elementId} not found for getElementArtboardRelativePosition.`);
    return { x: 0, y: 0 };
  }

  let currentRelativeX = element.x || 0;
  let currentRelativeY = element.y || 0;
  let parentId = element.parentId;

  while (parentId) {
    const parentObject = allElements.find(el => el.id === parentId);
    if (!parentObject) {
      console.warn(`Parent element with id ${parentId} not found during transform calculation for ${element.id}. Breaking chain.`);
      break;
    }

    const parentScale = parentObject.scale ?? 1;
    const parentRotation = parentObject.rotation ?? 0; // degrees
    const parentX = parentObject.x || 0;
    const parentY = parentObject.y || 0;

    // 1. Apply parent's scale to current relative coordinates
    currentRelativeX *= parentScale;
    currentRelativeY *= parentScale;

    // 2. Apply parent's rotation (around parent's local origin 0,0)
    if (parentRotation !== 0) {
      const angleRad = parentRotation * (Math.PI / 180);
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const newX = currentRelativeX * cosA - currentRelativeY * sinA;
      const newY = currentRelativeX * sinA + currentRelativeY * cosA;
      currentRelativeX = newX;
      currentRelativeY = newY;
    }

    // 3. Add parent's translation
    currentRelativeX += parentX;
    currentRelativeY += parentY;

    parentId = parentObject.parentId;
  }

  return { x: currentRelativeX, y: currentRelativeY };
};

// De Casteljau's algorithm for splitting a single cubic Bezier segment
function deCasteljauSplit(p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, t: number) {
    const mt = 1 - t;
    
    const q0x = mt * p0x + t * p1x;
    const q0y = mt * p0y + t * p1y;
    const q1x = mt * p1x + t * p2x;
    const q1y = mt * p1y + t * p2y;
    const q2x = mt * p2x + t * p3x;
    const q2y = mt * p2y + t * p3y;

    const r0x = mt * q0x + t * q1x;
    const r0y = mt * q0y + t * q1y;
    const r1x = mt * q1x + t * q2x;
    const r1y = mt * q1y + t * q2y;
    
    const bX = mt * r0x + t * r1x; // Point on curve at t
    const bY = mt * r0y + t * r1y;

    return {
        // First curve segment: P0, Q0, R0, B
        seg1: { p0: {x: p0x, y:p0y}, p1: {x: q0x, y:q0y}, p2: {x: r0x, y:r0y}, p3: {x: bX, y:bY} },
        // Second curve segment: B, R1, Q2, P3
        seg2: { p0: {x: bX, y:bY}, p1: {x: r1x, y:r1y}, p2: {x: q2x, y:q2y}, p3: {x: p3x, y:p3y} },
        pointOnCurve: {x: bX, y: bY}
    };
}

/**
 * Finds the parameter 't' (0-1) on a cubic Bezier segment that is closest to a given point.
 * This is an approximation using a fixed number of samples.
 */
export function getClosestTOnBezierSegment(
    p0: { x: number; y: number }, // Start anchor
    p1: { x: number; y: number }, // Control point 1 (outgoing from p0)
    p2: { x: number; y: number }, // Control point 2 (incoming to p3)
    p3: { x: number; y: number }, // End anchor
    point: { x: number; y: number } // The point to find the closest t for
): number {
    let minDistanceSq = Infinity;
    let closestT = 0;
    const samples = 100; // Number of samples along the curve

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        const bx = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
        const by = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

        const dx = bx - point.x;
        const dy = by - point.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestT = t;
        }
    }
    return closestT;
}

/**
 * Splits a BezierPoint segment at a given parameter 't' and returns the new point and modified original points.
 * This is intended for inserting a new point onto an existing path segment.
 */
export function splitBezierSegment(
  startPoint: BezierPoint,
  endPoint: BezierPoint,
  t: number // Parameter t (0-1) where to split the segment
): { newPoint: BezierPoint; updatedStartPoint: BezierPoint; updatedEndPoint: BezierPoint } {
  
  const p0 = { x: startPoint.x, y: startPoint.y };
  const p1 = { x: startPoint.h2x ?? startPoint.x, y: startPoint.h2y ?? startPoint.y }; // Outgoing from start
  const p2 = { x: endPoint.h1x ?? endPoint.x, y: endPoint.h1y ?? endPoint.y };     // Incoming to end
  const p3 = { x: endPoint.x, y: endPoint.y };

  const split = deCasteljauSplit(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, t);

  const newPoint: BezierPoint = {
    id: generatePointId(),
    x: split.pointOnCurve.x,
    y: split.pointOnCurve.y,
    h1x: split.seg1.p2.x, // R0.x from de Casteljau for first segment
    h1y: split.seg1.p2.y, // R0.y
    h2x: split.seg2.p1.x, // R1.x from de Casteljau for second segment
    h2y: split.seg2.p1.y, // R1.y
    isSmooth: true, // New point is initially smooth
    isSelected: true,
  };

  const updatedStartPoint: BezierPoint = {
    ...startPoint,
    h2x: split.seg1.p1.x, // Q0.x
    h2y: split.seg1.p1.y, // Q0.y
  };

  const updatedEndPoint: BezierPoint = {
    ...endPoint,
    h1x: split.seg2.p2.x, // Q2.x
    h1y: split.seg2.p2.y, // Q2.y
  };

  return { newPoint, updatedStartPoint, updatedEndPoint };
}

type PathParserContext = {
    currentX: number;
    currentY: number;
    currentPathStartX: number;
    currentPathStartY: number;
    lastCmd: string;
    // For C, S commands, this is the second control point (c2x, c2y)
    // For Q, T commands, this is the quadratic control point (qx, qy)
    lastControlX?: number;
    lastControlY?: number;
};

// Helper function to calculate angle between two vectors
// (ux, uy) and (vx, vy)
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const dotProduct = ux * vx + uy * vy;
  const magnitudeU = Math.sqrt(ux * ux + uy * uy);
  const magnitudeV = Math.sqrt(vx * vx + vy * vy);
  if (magnitudeU === 0 || magnitudeV === 0) return 0;
  let cosTheta = dotProduct / (magnitudeU * magnitudeV);
  // Clamp cosTheta to avoid floating point errors with Math.acos
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  const angle = Math.acos(cosTheta); // Angle in radians
  // Determine sign using cross product (ux * vy - uy * vx)
  return (ux * vy - uy * vx < 0) ? -angle : angle;
}

/**
 * Parses an SVG path 'd' string into an array of BezierPoint objects.
 * Handles M, L, H, V, C, S, Q, T, Z (absolute and relative commands).
 * Arc commands (A/a) are now converted to cubic Bezier segments.
 * @param dString The SVG path 'd' attribute string.
 * @returns ParsedDStringResult object containing points, closed status, and warnings.
 */
export const parseDStringToStructuredPoints = (dString: string): ParsedDStringResult => {
    const points: BezierPoint[] = [];
    const warnings: string[] = [];
    let closed = false;

    if (!dString || typeof dString !== 'string' || dString.trim() === '') {
        return { points, closed, warnings: ['Empty d-string provided.'] };
    }

    const pathContext: PathParserContext = {
        currentX: 0, currentY: 0,
        currentPathStartX: 0, currentPathStartY: 0,
        lastCmd: '',
    };

    const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
    let match: RegExpExecArray | null;

    const addPoint = (x: number, y: number, h1x?: number, h1y?: number, h2x?: number, h2y?: number, isSmooth: boolean = false) => {
        points.push({
            id: generatePointId(), x, y,
            h1x: h1x !== undefined ? h1x : x, h1y: h1y !== undefined ? h1y : y,
            h2x: h2x !== undefined ? h2x : x, h2y: h2y !== undefined ? h2y : y,
            isSmooth,
        });
    };
    
    const updateLastPointH2 = (h2x: number, h2y: number) => {
        if (points.length > 0) {
            const lastP = points[points.length - 1];
            lastP.h2x = h2x; lastP.h2y = h2y;
        }
    };

    while ((match = commandRegex.exec(dString)) !== null) {
        const command = match[1];
        const argsStr = match[2]?.trim() ?? "";
        let args = argsStr.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n) && isFinite(n));

        let isRelative = command === command.toLowerCase();
        const commandUpper = command.toUpperCase();
        
        let loopCount = 0;
        let argCountPerCommand: number; 
        
        do {
            switch (commandUpper) {
                case 'M': argCountPerCommand = 2; break;
                case 'L': argCountPerCommand = 2; break; 
                case 'H': case 'V': argCountPerCommand = 1; break;
                case 'T': argCountPerCommand = 2; break;
                case 'C': argCountPerCommand = 6; break;
                case 'S': case 'Q': argCountPerCommand = 4; break;
                case 'A': argCountPerCommand = 7; break;
                case 'Z': argCountPerCommand = 0; break;
                default: warnings.push(`Unknown command type: ${command}`); argCountPerCommand = -1; break;
            }
            if(argCountPerCommand === -1) break;


            let currentArgs: number[];
            if (args.length < argCountPerCommand) {
                if(args.length > 0 || (commandUpper !== 'Z' && args.length < argCountPerCommand)) warnings.push(`Insufficient arguments for command ${command}: ${argsStr}`);
                args = []; 
                break; 
            }
            currentArgs = args.splice(0, argCountPerCommand); 

            let newX = pathContext.currentX, newY = pathContext.currentY;
            let c1x: number | undefined, c1y: number | undefined, c2x: number | undefined, c2y: number | undefined;
            let qx: number | undefined, qy: number | undefined;

            switch (commandUpper) {
                case 'M':
                    newX = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    newY = isRelative ? pathContext.currentY + currentArgs[1] : currentArgs[1];
                    addPoint(newX, newY);
                    pathContext.currentPathStartX = newX; pathContext.currentPathStartY = newY;
                    pathContext.currentX = newX; pathContext.currentY = newY;
                    pathContext.lastCmd = 'M'; 
                    break;
                case 'L':
                    newX = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    newY = isRelative ? pathContext.currentY + currentArgs[1] : currentArgs[1];
                    addPoint(newX, newY);
                    pathContext.currentX = newX; pathContext.currentY = newY;
                    break;
                case 'H':
                    newX = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    newY = pathContext.currentY;
                    addPoint(newX, newY);
                    pathContext.currentX = newX;
                    break;
                case 'V':
                    newX = pathContext.currentX;
                    newY = isRelative ? pathContext.currentY + currentArgs[0] : currentArgs[0];
                    addPoint(newX, newY);
                    pathContext.currentY = newY;
                    break;
                case 'C':
                    c1x = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    c1y = isRelative ? pathContext.currentY + currentArgs[1] : currentArgs[1];
                    c2x = isRelative ? pathContext.currentX + currentArgs[2] : currentArgs[2];
                    c2y = isRelative ? pathContext.currentY + currentArgs[3] : currentArgs[3];
                    newX = isRelative ? pathContext.currentX + currentArgs[4] : currentArgs[4];
                    newY = isRelative ? pathContext.currentY + currentArgs[5] : currentArgs[5];
                    updateLastPointH2(c1x, c1y);
                    addPoint(newX, newY, c2x, c2y);
                    pathContext.currentX = newX; pathContext.currentY = newY;
                    pathContext.lastControlX = c2x; pathContext.lastControlY = c2y;
                    break;
                case 'S':
                    if (['C', 'S'].includes(pathContext.lastCmd.toUpperCase()) && pathContext.lastControlX !== undefined && pathContext.lastControlY !== undefined) {
                        c1x = pathContext.currentX + (pathContext.currentX - pathContext.lastControlX);
                        c1y = pathContext.currentY + (pathContext.currentY - pathContext.lastControlY);
                    } else { c1x = pathContext.currentX; c1y = pathContext.currentY; }
                    c2x = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    c2y = isRelative ? pathContext.currentY + currentArgs[1] : currentArgs[1];
                    newX = isRelative ? pathContext.currentX + currentArgs[2] : currentArgs[2];
                    newY = isRelative ? pathContext.currentY + currentArgs[3] : currentArgs[3];
                    updateLastPointH2(c1x, c1y);
                    addPoint(newX, newY, c2x, c2y, newX, newY, true);
                    pathContext.currentX = newX; pathContext.currentY = newY;
                    pathContext.lastControlX = c2x; pathContext.lastControlY = c2y;
                    break;
                case 'Q':
                    qx = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    qy = isRelative ? pathContext.currentY + currentArgs[1] : currentArgs[1];
                    newX = isRelative ? pathContext.currentX + currentArgs[2] : currentArgs[2];
                    newY = isRelative ? pathContext.currentY + currentArgs[3] : currentArgs[3];
                    c1x = pathContext.currentX + (2/3) * (qx - pathContext.currentX);
                    c1y = pathContext.currentY + (2/3) * (qy - pathContext.currentY);
                    c2x = newX + (2/3) * (qx - newX);
                    c2y = newY + (2/3) * (qy - newY);
                    updateLastPointH2(c1x, c1y);
                    addPoint(newX, newY, c2x, c2y);
                    pathContext.currentX = newX; pathContext.currentY = newY;
                    pathContext.lastControlX = qx; pathContext.lastControlY = qy;
                    break;
                case 'T':
                    if (['Q', 'T'].includes(pathContext.lastCmd.toUpperCase()) && pathContext.lastControlX !== undefined && pathContext.lastControlY !== undefined) {
                        qx = pathContext.currentX + (pathContext.currentX - pathContext.lastControlX);
                        qy = pathContext.currentY + (pathContext.currentY - pathContext.lastControlY);
                    } else { qx = pathContext.currentX; qy = pathContext.currentY; }
                    newX = isRelative ? pathContext.currentX + currentArgs[0] : currentArgs[0];
                    newY = isRelative ? pathContext.currentY + currentArgs[1] : currentArgs[1];
                    c1x = pathContext.currentX + (2/3) * (qx - pathContext.currentX);
                    c1y = pathContext.currentY + (2/3) * (qy - pathContext.currentY);
                    c2x = newX + (2/3) * (qx - newX);
                    c2y = newY + (2/3) * (qy - newY);
                    updateLastPointH2(c1x, c1y);
                    addPoint(newX, newY, c2x, c2y, newX, newY, true);
                    pathContext.currentX = newX; pathContext.currentY = newY;
                    pathContext.lastControlX = qx; pathContext.lastControlY = qy;
                    break;
                case 'A':
                    const arcResult = processArcCommand(pathContext, currentArgs, isRelative, points, warnings);
                    points.push(...arcResult.newBezierPoints);
                    pathContext.currentX = arcResult.endPoint.x;
                    pathContext.currentY = arcResult.endPoint.y;
                    pathContext.lastControlX = arcResult.lastControlX;
                    pathContext.lastControlY = arcResult.lastControlY;
                    break;
                case 'Z':
                    closed = true;
                    pathContext.currentX = pathContext.currentPathStartX;
                    pathContext.currentY = pathContext.currentPathStartY;
                    pathContext.lastControlX = undefined; pathContext.lastControlY = undefined;
                    break;
            }
            pathContext.lastCmd = commandUpper === 'M' ? 'L' : (commandUpper === 'A' ? 'C' : commandUpper);
            loopCount++;
        } while (args.length >= argCountPerCommand && argCountPerCommand > 0 && commandUpper !== 'Z'); 
    }
    
    if (points.length > 0 && !closed) {
        const lastP = points[points.length -1];
        if (lastP.h2x === undefined) { lastP.h2x = lastP.x; lastP.h2y = lastP.y; }
    }

    return { points, closed, warnings };
};


function processArcCommand(
    ctx: PathParserContext,
    args: number[],
    isRelative: boolean,
    existingPoints: BezierPoint[], 
    warnings: string[]
): { newBezierPoints: BezierPoint[]; endPoint: { x: number; y: number }; lastControlX?: number; lastControlY?: number } {
    let [rx_orig, ry_orig, xAxisRotation, largeArcFlag, sweepFlag, x2_rel, y2_rel] = args;
    
    let rx = Math.abs(rx_orig);
    let ry = Math.abs(ry_orig);

    const x1 = ctx.currentX;
    const y1 = ctx.currentY;
    let x2 = isRelative ? x1 + x2_rel : x2_rel;
    let y2 = isRelative ? y1 + y2_rel : y2_rel;

    if (rx <= 0 || ry <= 0) { 
        warnings.push(`Arc command with zero/negative radius (rx=${rx}, ry=${ry}) treated as Lineto.`);
        const newBezierPoint: BezierPoint = { id: generatePointId(), x: x2, y: y2, h1x: x2, h1y: y2, h2x: x2, h2y: y2, isSmooth: false };
        if (existingPoints.length > 0) {
            const lastP = existingPoints[existingPoints.length - 1];
            lastP.h2x = lastP.x; 
            lastP.h2y = lastP.y;
        }
        return { newBezierPoints: [newBezierPoint], endPoint: { x: x2, y: y2 }, lastControlX: x2, lastControlY: y2 };
    }
    if (x1 === x2 && y1 === y2) return { newBezierPoints: [], endPoint: { x: x1, y: y1 } }; 

    const phi = xAxisRotation * Math.PI / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const x1p = cosPhi * (x1 - x2) / 2 + sinPhi * (y1 - y2) / 2;
    const y1p = -sinPhi * (x1 - x2) / 2 + cosPhi * (y1 - y2) / 2;

    let rx_sq = rx * rx;
    let ry_sq = ry * ry;
    const x1p_sq = x1p * x1p;
    const y1p_sq = y1p * y1p;

    let lambda = (x1p_sq / rx_sq) + (y1p_sq / ry_sq);
    if (lambda > 1) {
        const lambda_sqrt = Math.sqrt(lambda);
        rx *= lambda_sqrt;
        ry *= lambda_sqrt;
        rx_sq = rx * rx;
        ry_sq = ry * ry;
    }
    
    const sNumerator = rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq;
    const sDenominator = rx_sq * y1p_sq + ry_sq * x1p_sq;
    const sRoot = sDenominator === 0 ? 0 : Math.sqrt(Math.max(0, sNumerator / sDenominator));
    const s = (largeArcFlag === sweepFlag ? -1 : 1) * sRoot;
    const cx_prime = s * rx * y1p / ry;
    const cy_prime = s * -ry * x1p / rx;

    const cx = cosPhi * cx_prime - sinPhi * cy_prime + (x1 + x2) / 2;
    const cy = sinPhi * cx_prime + cosPhi * cy_prime + (y1 + y2) / 2;

    const ux = (x1p - cx_prime) / rx;
    const uy = (y1p - cy_prime) / ry;
    const vx = (-x1p - cx_prime) / rx;
    const vy = (-y1p - cy_prime) / ry;

    const startAngle = vectorAngle(1, 0, ux, uy);
    let deltaAngle = vectorAngle(ux, uy, vx, vy); // angle in (-PI, PI]

    // Correct deltaAngle based on sweepFlag and largeArcFlag
    if (sweepFlag === 0 && deltaAngle < 0) { // SVG sweep-flag 0 is CCW. vectorAngle gives negative for CW.
        deltaAngle += 2 * Math.PI;
    } else if (sweepFlag === 1 && deltaAngle > 0) { // SVG sweep-flag 1 is CW. vectorAngle gives positive for CCW.
        deltaAngle -= 2 * Math.PI;
    }
    // At this point, deltaAngle is the sweep in the direction of sweepFlag, could be small or large variant.
    // Now, ensure it matches largeArcFlag
    if (largeArcFlag === 0 && Math.abs(deltaAngle) > Math.PI) { // We want the small arc, but current deltaAngle is large
        deltaAngle += (deltaAngle > 0 ? -2 * Math.PI : 2 * Math.PI);
    } else if (largeArcFlag === 1 && Math.abs(deltaAngle) < Math.PI) { // We want the large arc, but current deltaAngle is small
         deltaAngle += (deltaAngle > 0 ? 2 * Math.PI : -2 * Math.PI); // This was wrong in thought, fixed
    }
    // Ensure deltaAngle is not exactly 0 if start/end points differ, can happen with full 360 deg sweeps.
    if (deltaAngle === 0 && (ux !== vx || uy !== vy)) {
       deltaAngle = sweepFlag === 1 ? -2*Math.PI : 2*Math.PI; // Full circle in specified direction
    }


    const numSegments = Math.max(1, Math.ceil(Math.abs(deltaAngle) / (Math.PI / 2)));
    const angleIncrement = deltaAngle / numSegments;
    const newPointsFromArc: BezierPoint[] = [];
    
    for (let i = 0; i < numSegments; i++) {
        const ang1 = startAngle + i * angleIncrement;
        const ang2 = startAngle + (i + 1) * angleIncrement;

        const t_angle_half = (ang2 - ang1) / 2;
        const tan_t_angle_half = Math.tan(t_angle_half);
        const alpha = Math.sin(ang2 - ang1) * (Math.sqrt(4 + 3 * tan_t_angle_half * tan_t_angle_half) - 1) / 3;

        const cosPhi_seg = Math.cos(phi); const sinPhi_seg = Math.sin(phi);
        const cosAngle1 = Math.cos(ang1); const sinAngle1 = Math.sin(ang1);
        const cosAngle2 = Math.cos(ang2); const sinAngle2 = Math.sin(ang2);

        const p0x_arc_seg = cx + rx * cosAngle1 * cosPhi_seg - ry * sinAngle1 * sinPhi_seg;
        const p0y_arc_seg = cy + rx * cosAngle1 * sinPhi_seg + ry * sinAngle1 * cosPhi_seg;
        const p3x_arc_seg = cx + rx * cosAngle2 * cosPhi_seg - ry * sinAngle2 * sinPhi_seg;
        const p3y_arc_seg = cy + rx * cosAngle2 * sinPhi_seg + ry * sinAngle2 * cosPhi_seg;
        
        const T0x = -rx * sinAngle1 * cosPhi_seg - ry * cosAngle1 * sinPhi_seg;
        const T0y = -rx * sinAngle1 * sinPhi_seg + ry * cosAngle1 * cosPhi_seg;
        const T3x = -rx * sinAngle2 * cosPhi_seg - ry * cosAngle2 * sinPhi_seg;
        const T3y = -rx * sinAngle2 * sinPhi_seg + ry * cosAngle2 * cosPhi_seg;

        const p1x_arc_seg = p0x_arc_seg + alpha * T0x;
        const p1y_arc_seg = p0y_arc_seg + alpha * T0y;
        const p2x_arc_seg = p3x_arc_seg - alpha * T3x;
        const p2y_arc_seg = p3y_arc_seg - alpha * T3y;
        
        if (i === 0) {
            if (existingPoints.length > 0) {
                const prevPoint = existingPoints[existingPoints.length - 1];
                prevPoint.h2x = p1x_arc_seg;
                prevPoint.h2y = p1y_arc_seg;
            }
        } else {
            const lastAddedPoint = newPointsFromArc[newPointsFromArc.length - 1];
            lastAddedPoint.h2x = p1x_arc_seg;
            lastAddedPoint.h2y = p1y_arc_seg;
        }

        const newAnchor: BezierPoint = {
            id: generatePointId(),
            x: p3x_arc_seg, y: p3y_arc_seg,
            h1x: p2x_arc_seg, h1y: p2y_arc_seg,
            h2x: p3x_arc_seg, h2y: p3y_arc_seg, // Default, will be updated by next segment if any
            isSmooth: true, 
        };
        newPointsFromArc.push(newAnchor);
    }
        
    let finalLastControlX = ctx.currentX; 
    let finalLastControlY = ctx.currentY;
    if (newPointsFromArc.length > 0) {
        const lastAddedPointByArc = newPointsFromArc[newPointsFromArc.length - 1];
        finalLastControlX = lastAddedPointByArc.h1x ?? lastAddedPointByArc.x;
        finalLastControlY = lastAddedPointByArc.h1y ?? lastAddedPointByArc.y;
        lastAddedPointByArc.isSmooth = false; 
    }
    
    return { newBezierPoints: newPointsFromArc, endPoint: { x: x2, y: y2 }, lastControlX: finalLastControlX, lastControlY: finalLastControlY };
}
