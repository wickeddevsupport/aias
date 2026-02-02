
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CustomBezierPoints, STANDARD_EASE_TO_BEZIER_MAP } from '../types'; 
import { applyEasing } from '../utils/animationUtils'; 

interface EasingCurvePreviewProps {
  easingFunction: string;
  customBezierPoints?: CustomBezierPoints | null;
  onCustomBezierChange?: (points: CustomBezierPoints) => void;
  width?: number;  
  height?: number; 
}

const EDITOR_VIEW_BOX_WIDTH = 100; 
const EDITOR_VIEW_BOX_HEIGHT = 100; 
const EDITOR_PADDING = 15; 
const HANDLE_RADIUS = 5;

// Updated colors for the futuristic theme
const LINE_COLOR = "var(--glass-border-color)"; 
const CURVE_COLOR = "var(--accent-color)"; 
const HANDLE_COLOR = "var(--accent-color)"; // Brighter handle
const HANDLE_LINE_COLOR = "rgba(var(--accent-rgb), 0.3)"; // Translucent accent line


const EasingCurvePreview: React.FC<EasingCurvePreviewProps> = ({
  easingFunction,
  customBezierPoints: customBezierPointsProp,
  onCustomBezierChange,
  width: containerWidth = 240, 
  height: containerHeight = 150, 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<'p1' | 'p2' | null>(null);
  
  const [internalP1, setInternalP1] = useState({ x: 0.25, y: 0.1 }); 
  const [internalP2, setInternalP2] = useState({ x: 0.75, y: 0.9 }); 

  const isCustomCubicBezierString = easingFunction.startsWith('cubic-bezier(');
  const isCustomKeyword = easingFunction === 'custom';
  const isPredefinedEase = !isCustomKeyword && !isCustomCubicBezierString;
  
  const isEditableContext = !!onCustomBezierChange;

  useEffect(() => {
    if (isCustomKeyword || isCustomCubicBezierString) {
      if (customBezierPointsProp) {
        setInternalP1({ x: customBezierPointsProp.p1x, y: customBezierPointsProp.p1y });
        setInternalP2({ x: customBezierPointsProp.p2x, y: customBezierPointsProp.p2y });
      } else if (isCustomCubicBezierString) {
        try {
          const paramsMatch = easingFunction.match(/cubic-bezier\(([^)]+)\)/);
          if (paramsMatch && paramsMatch[1]) {
            const params = paramsMatch[1].split(',').map(p => parseFloat(p.trim()));
            if (params.length === 4) {
              setInternalP1({ x: params[0], y: params[1] });
              setInternalP2({ x: params[2], y: params[3] });
              return;
            }
          }
        } catch (e) { console.error("Error parsing bezier string for preview:", e); }
        const defaultPoints = STANDARD_EASE_TO_BEZIER_MAP['linear'];
        setInternalP1({ x: defaultPoints.p1x, y: defaultPoints.p1y });
        setInternalP2({ x: defaultPoints.p2x, y: defaultPoints.p2y });
      } else { 
        const defaultPoints = STANDARD_EASE_TO_BEZIER_MAP['linear'];
        setInternalP1({ x: defaultPoints.p1x, y: defaultPoints.p1y });
        setInternalP2({ x: defaultPoints.p2x, y: defaultPoints.p2y });
      }
    } else { 
        const initialPoints = STANDARD_EASE_TO_BEZIER_MAP[easingFunction] || STANDARD_EASE_TO_BEZIER_MAP['easeInOutCubic'];
        setInternalP1({ x: initialPoints.p1x, y: initialPoints.p1y });
        setInternalP2({ x: initialPoints.p2x, y: initialPoints.p2y });
    }
  }, [easingFunction, customBezierPointsProp, isCustomKeyword, isCustomCubicBezierString]);


  const getSvgCoordinates = useCallback((normalizedX: number, normalizedY: number) => {
    return {
      x: normalizedX * EDITOR_VIEW_BOX_WIDTH,
      y: (1 - normalizedY) * EDITOR_VIEW_BOX_HEIGHT, 
    };
  }, []);
  
  const getNormalizedCoordinates = useCallback((svgX: number, svgY: number) => {
    return {
        x: Math.max(0, Math.min(1, svgX / EDITOR_VIEW_BOX_WIDTH)),
        y: Math.max(0, Math.min(1, 1 - (svgY / EDITOR_VIEW_BOX_HEIGHT))) 
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent, handleName: 'p1' | 'p2') => {
    if (!isEditableContext) return;
    e.preventDefault();
    
    if (isPredefinedEase && onCustomBezierChange) {
      const initialPoints = STANDARD_EASE_TO_BEZIER_MAP[easingFunction] || STANDARD_EASE_TO_BEZIER_MAP['easeInOutCubic'];
      onCustomBezierChange(initialPoints);
    }
    setDraggingHandle(handleName);
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!draggingHandle || !svgRef.current || !isEditableContext) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    
    const transformedSvgP = {
        x: svgP.x - EDITOR_PADDING,
        y: svgP.y - EDITOR_PADDING
    };

    const normalized = getNormalizedCoordinates(transformedSvgP.x, transformedSvgP.y);

    if (draggingHandle === 'p1') {
      setInternalP1(normalized);
    } else {
      setInternalP2(normalized);
    }
  }, [draggingHandle, isEditableContext, getNormalizedCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (draggingHandle && onCustomBezierChange) {
      if (isCustomKeyword || isCustomCubicBezierString) {
          onCustomBezierChange({ p1x: internalP1.x, p1y: internalP1.y, p2x: internalP2.x, p2y: internalP2.y });
      }
    }
    setDraggingHandle(null);
  }, [draggingHandle, onCustomBezierChange, internalP1, internalP2, isCustomKeyword, isCustomCubicBezierString]);

  useEffect(() => {
    if (draggingHandle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingHandle, handleMouseMove, handleMouseUp]);

  let pathD = "";
  const p0 = getSvgCoordinates(0, 0);
  const p3 = getSvgCoordinates(1, 1);

  if (isCustomKeyword || isCustomCubicBezierString) {
    const p1 = getSvgCoordinates(internalP1.x, internalP1.y);
    const p2 = getSvgCoordinates(internalP2.x, internalP2.y);
    pathD = `M ${p0.x},${p0.y} C ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
  } else {
    const points: string[] = [];
    const samples = 100; 
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const easedT = applyEasing(t, easingFunction);
      const pt = getSvgCoordinates(t, easedT);
      points.push(`${pt.x},${pt.y}`);
    }
    pathD = "M " + points.join(" L ");
  }
  
  const svgP1Visual = getSvgCoordinates(internalP1.x, internalP1.y);
  const svgP2Visual = getSvgCoordinates(internalP2.x, internalP2.y);

  return (
    <div className="bg-[rgba(var(--accent-rgb),0.02)] p-2 rounded-md border border-[var(--glass-border-color)] mt-1 touch-none select-none">
      <svg
        ref={svgRef}
        viewBox={`${-EDITOR_PADDING} ${-EDITOR_PADDING} ${EDITOR_VIEW_BOX_WIDTH + 2 * EDITOR_PADDING} ${EDITOR_VIEW_BOX_HEIGHT + 2 * EDITOR_PADDING}`}
        width={containerWidth}
        height={containerHeight}
        preserveAspectRatio="xMidYMid meet"
        aria-label={`Preview of ${easingFunction} easing curve`}
        className="w-full h-auto"
        onMouseMove={isEditableContext && draggingHandle ? (e) => handleMouseMove(e.nativeEvent) : undefined}
        onMouseUp={isEditableContext && draggingHandle ? handleMouseUp : undefined}
        onMouseLeave={isEditableContext && draggingHandle ? handleMouseUp : undefined}
      >
        {[0, 0.25, 0.5, 0.75, 1].map(val => (
          <React.Fragment key={`grid-${val}`}>
            <line x1="0" y1={getSvgCoordinates(0, val).y} x2={EDITOR_VIEW_BOX_WIDTH} y2={getSvgCoordinates(0, val).y} stroke={LINE_COLOR} strokeWidth="0.3" opacity={val === 0 || val === 1 ? 0.7 : 0.3} />
            <line x1={getSvgCoordinates(val, 0).x} y1="0" x2={getSvgCoordinates(val, 0).x} y2={EDITOR_VIEW_BOX_HEIGHT} stroke={LINE_COLOR} strokeWidth="0.3" opacity={val === 0 || val === 1 ? 0.7 : 0.3} />
          </React.Fragment>
        ))}
        
        <text x={EDITOR_VIEW_BOX_WIDTH/2} y={EDITOR_VIEW_BOX_HEIGHT + EDITOR_PADDING * 0.6} fontSize={EDITOR_PADDING * 0.4} fill="var(--text-secondary)" textAnchor="middle">Time</text>
        <text x={-EDITOR_PADDING * 0.6} y={EDITOR_VIEW_BOX_HEIGHT/2} fontSize={EDITOR_PADDING * 0.4} fill="var(--text-secondary)" textAnchor="middle" dominantBaseline="central" transform={`rotate(-90, ${-EDITOR_PADDING * 0.6}, ${EDITOR_VIEW_BOX_HEIGHT/2})`}>Value</text>

        <path d={pathD} stroke={CURVE_COLOR} strokeWidth="1.5" fill="none" />
        
        <circle cx={p0.x} cy={p0.y} r="2.5" fill={CURVE_COLOR} />
        <circle cx={p3.x} cy={p3.y} r="2.5" fill={CURVE_COLOR} />

        {isEditableContext && (
          <>
            <line x1={p0.x} y1={p0.y} x2={svgP1Visual.x} y2={svgP1Visual.y} stroke={HANDLE_LINE_COLOR} strokeWidth="1" strokeDasharray="2 2" />
            <line x1={p3.x} y1={p3.y} x2={svgP2Visual.x} y2={svgP2Visual.y} stroke={HANDLE_LINE_COLOR} strokeWidth="1" strokeDasharray="2 2" />

            <circle
              cx={svgP1Visual.x} cy={svgP1Visual.y} r={HANDLE_RADIUS} fill={HANDLE_COLOR}
              stroke="var(--text-primary)" strokeWidth="1" className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleMouseDown(e, 'p1')}
            />
            <circle
              cx={svgP2Visual.x} cy={svgP2Visual.y} r={HANDLE_RADIUS} fill={HANDLE_COLOR}
              stroke="var(--text-primary)" strokeWidth="1" className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleMouseDown(e, 'p2')}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default EasingCurvePreview;
