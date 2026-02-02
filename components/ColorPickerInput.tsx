
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { RgbaStringColorPicker } from 'react-colorful';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import lchPlugin from 'colord/plugins/lch';
import { AppContext } from '../contexts/AppContext';
import { GradientStop, LinearSVGGradient, RadialSVGGradient, AnySVGGradient, AnimatableProperty } from '../types';
import { DEFAULT_GRADIENT_STOPS, DEFAULT_GRADIENT_ANGLE, GRADIENT_ANGLE_CONFIG, DEFAULT_RADIAL_CX, DEFAULT_RADIAL_CY, DEFAULT_RADIAL_R, SLIDER_CONFIGS, DEFAULT_RADIAL_FX, DEFAULT_RADIAL_FY, DEFAULT_RADIAL_FR } from '../constants';
import { TrashIcon, ChevronDownIconSolid, RotateCwIcon, RepeatIcon } from './icons/EditorIcons';

extend([namesPlugin, lchPlugin]);

interface ColorPickerInputProps {
  value: string | AnySVGGradient;
  onChange: (newValue: string | AnySVGGradient) => void;
  editingProperty: AnimatableProperty; // 'fill' or 'stroke'
}

type EditorMode = 'solid' | 'gradient';
type GradientType = 'linear' | 'radial';

const generateStopId = () => `stop-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 600; 
const STOP_MARKER_SIZE = 14;
const PREVIEW_SWATCH_SIZE = 24;
const PANEL_OFFSET = 10; // Added missing constant


interface GradientStopEditorProps {
  stops: GradientStop[];
  onStopsChange: (newStops: GradientStop[]) => void;
  gradientType: GradientType;
  onAddStop: (offset: number) => void;
  selectedStopId: string | null;
  onSelectStopId: (id: string | null) => void;
  onIndividualStopColorChange: (stopId: string, newColor: string) => void;
}

const GradientStopEditor: React.FC<GradientStopEditorProps> = ({
  stops, onStopsChange, gradientType, onAddStop, selectedStopId, onSelectStopId, onIndividualStopColorChange
}) => {
  const previewBarRef = useRef<HTMLDivElement>(null);
  const [draggingStopInfo, setDraggingStopInfo] = useState<{ id: string, initialMouseX: number, initialOffset: number } | null>(null);
  const [stopColorPickerOpenForId, setStopColorPickerOpenForId] = useState<string | null>(null);
  const stopColorPickerRef = useRef<HTMLDivElement>(null);
  const stopButtonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());


  const handlePreviewBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewBarRef.current) return;
    const rect = previewBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newOffset = Math.max(0, Math.min(1, clickX / rect.width));
    
    let onMarker = false;
    stops.forEach(stop => {
        const markerLeft = stop.offset * rect.width - STOP_MARKER_SIZE / 2;
        const markerRight = stop.offset * rect.width + STOP_MARKER_SIZE / 2;
        if (clickX >= markerLeft && clickX <= markerRight) {
            onMarker = true;
        }
    });
    if (!onMarker) {
         onAddStop(newOffset);
    }
  };

  const handleStopMouseDown = (e: React.MouseEvent<HTMLButtonElement>, stop: GradientStop) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectStopId(stop.id);
    setDraggingStopInfo({ id: stop.id, initialMouseX: e.clientX, initialOffset: stop.offset });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingStopInfo || !previewBarRef.current) return;
      const barRect = previewBarRef.current.getBoundingClientRect();
      const deltaX = e.clientX - draggingStopInfo.initialMouseX;
      let newOffset = draggingStopInfo.initialOffset + (deltaX / barRect.width);
      newOffset = Math.max(0, Math.min(1, newOffset));
      
      onStopsChange(stops.map(s => s.id === draggingStopInfo.id ? { ...s, offset: newOffset } : s).sort((a, b) => a.offset - b.offset));
    };

    const handleMouseUp = () => {
      if (draggingStopInfo) {
         onStopsChange(stops.sort((a,b) => a.offset - b.offset)); 
      }
      setDraggingStopInfo(null);
    };

    if (draggingStopInfo) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingStopInfo, stops, onStopsChange]);


  const handleInternalStopColorChange = (stopId: string, newColor: string) => {
    onIndividualStopColorChange(stopId, newColor); // Notify parent for live preview and latestEditedStopRef
  };
  
  const handleRemoveStop = (stopIdToRemove: string) => {
    if (stops.length <= 2) return;
    onStopsChange(stops.filter(s => s.id !== stopIdToRemove));
    if (selectedStopId === stopIdToRemove) onSelectStopId(null);
    if (stopColorPickerOpenForId === stopIdToRemove) setStopColorPickerOpenForId(null);
  };
  
  const toggleStopColorPicker = (stopId: string) => {
    setStopColorPickerOpenForId(prevId => (prevId === stopId ? null : stopId));
    onSelectStopId(stopId);
  };

  const handleReverseStops = () => {
    const reversedColorsStops = [...stops].map((stop, index, arr) => ({
      ...stop,
      color: arr[arr.length - 1 - index].color,
    }));
    onStopsChange(reversedColorsStops);
  };

  const previewBarGradientBackground = gradientType === 'linear' 
    ? `linear-gradient(90deg, ${stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`
    : `radial-gradient(circle, ${stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`;

  const selectedStopForEditing = stops.find(s => s.id === selectedStopId);

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div 
          ref={previewBarRef}
          className="h-6 flex-grow rounded border border-gray-600 relative cursor-crosshair"
          style={{ background: stops.length > 0 ? previewBarGradientBackground : 'gray' }}
          onClick={handlePreviewBarClick}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Gradient stop editor track"
        >
          {stops.map(stop => (
            <button
              key={stop.id}
              ref={el => { stopButtonRefs.current.set(stop.id, el); }}
              className={`absolute top-1/2 -translate-y-1/2 w-${STOP_MARKER_SIZE/4} h-${STOP_MARKER_SIZE/4} rounded-full border-2 cursor-grab shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-700
                          ${selectedStopId === stop.id ? 'ring-sky-400 border-white' : 'border-gray-300 hover:border-white'}`}
              style={{ 
                  left: `${stop.offset * 100}%`, 
                  transform: `translate(-50%, -50%)`,
                  backgroundColor: stop.color,
                  width: `${STOP_MARKER_SIZE}px`,
                  height: `${STOP_MARKER_SIZE}px`,
              }}
              onMouseDown={(e) => handleStopMouseDown(e, stop)}
              onClick={(e) => { e.stopPropagation(); toggleStopColorPicker(stop.id); }}
              aria-label={`Color stop at ${Math.round(stop.offset*100)}%, color ${stop.color}. Press to edit.`}
            />
          ))}
        </div>
        <button 
            onClick={handleReverseStops} 
            title="Reverse gradient colors"
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
            aria-label="Reverse gradient colors"
        >
            <RepeatIcon size={16} />
        </button>
      </div>
      {selectedStopId && selectedStopForEditing && (
         <div className="p-2 bg-gray-700/40 rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-300">Editing Stop: <span className="font-semibold" style={{color: selectedStopForEditing.color || '#fff'}}>{selectedStopForEditing.color}</span> at {Math.round((selectedStopForEditing.offset || 0) * 100)}%</p>
              <button onClick={() => handleRemoveStop(selectedStopId)} disabled={stops.length <= 2}
                  className="p-1 text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                  aria-label={`Remove selected stop`}>
                <TrashIcon size={16} />
              </button>
            </div>
            {stopColorPickerOpenForId === selectedStopId && (
                 <div ref={stopColorPickerRef} className="bg-gray-800 p-2 rounded shadow-lg border border-gray-600 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                 >
                    <RgbaStringColorPicker 
                        color={selectedStopForEditing.color || 'rgba(0,0,0,1)'} 
                        onChange={(newColor) => handleInternalStopColorChange(selectedStopId, newColor)} 
                        className="w-full"
                    />
                    <div className="flex items-center space-x-1 mt-2">
                        <label htmlFor={`stop-hex-${selectedStopId}`} className="text-xs text-gray-400">Hex</label>
                        <input
                            id={`stop-hex-${selectedStopId}`} type="text"
                            value={colord(selectedStopForEditing.color).toHex().substring(0,7)}
                            onChange={(e) => {
                            const c = colord(e.target.value);
                            if (c.isValid()) {
                                handleInternalStopColorChange(selectedStopId!, c.alpha(colord(selectedStopForEditing.color).alpha()).toRgbString());
                            }
                            }}
                            className="flex-grow min-w-0 p-1 bg-gray-900 border border-gray-600 rounded-md text-xs text-gray-200"
                            maxLength={7}
                        />
                    </div>
                    <div>
                        <label htmlFor={`stop-alpha-slider-${selectedStopId}`} className="block text-xs text-gray-300 mt-1 mb-0.5">Alpha</label>
                        <div className="flex items-center space-x-1">
                        <input id={`stop-alpha-slider-${selectedStopId}`} type="range" min="0" max="1" step="0.01"
                                value={colord(selectedStopForEditing.color).alpha()}
                                onChange={(e) => {
                                    const newAlpha = parseFloat(e.target.value);
                                    handleInternalStopColorChange(selectedStopId!, colord(selectedStopForEditing.color).alpha(newAlpha).toRgbString());
                                }}
                                className="flex-grow h-1.5 bg-gray-600 rounded-lg appearance-none accent-sky-500 cursor-pointer" />
                        <input type="number" min="0" max="1" step="0.01"
                                value={colord(selectedStopForEditing.color).alpha().toFixed(2)}
                                onChange={(e) => {
                                    const newAlpha = parseFloat(e.target.value);
                                    if (!isNaN(newAlpha)) {
                                        handleInternalStopColorChange(selectedStopId!, colord(selectedStopForEditing.color).alpha(Math.max(0, Math.min(1,newAlpha))).toRgbString());
                                    }
                                }}
                                className="w-12 p-1 bg-gray-900 border border-gray-600 rounded-md text-xs text-gray-200"
                        />
                        </div>
                    </div>
                 </div>
            )}
        </div>
      )}
    </div>
  );
};


const ColorPickerInput: React.FC<ColorPickerInputProps> = ({ value: propValue, onChange: propOnChange, editingProperty }) => {
  const { state: appState, dispatch: appContextDispatch } = useContext(AppContext);
  const { artboard, selectedElementId } = appState;

  const [mainPopoverOpen, setMainPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number, left: number } | null>(null);
  
  const mainPopoverRef = useRef<HTMLDivElement>(null);
  const swatchButtonRef = useRef<HTMLButtonElement>(null);
  const latestEditedStopRef = useRef<{ stopId: string, color: string } | null>(null);


  const [currentEditorMode, setCurrentEditorMode] = useState<EditorMode>('solid');
  const [currentGradientType, setCurrentGradientType] = useState<GradientType>('linear');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  
  const [solidHexInput, setSolidHexInput] = useState('#000000');
  const [solidAlphaInput, setSolidAlphaInput] = useState(1);
  const [solidPickerColor, setSolidPickerColor] = useState('rgba(0,0,0,1)');

  const [gradientStops, setGradientStops] = useState<GradientStop[]>(() => 
    DEFAULT_GRADIENT_STOPS.map(s => ({...s, id: generateStopId() }))
  );
  const [linearAngle, setLinearAngle] = useState(DEFAULT_GRADIENT_ANGLE);
  const [radialCx, setRadialCx] = useState(parseFloat(DEFAULT_RADIAL_CX));
  const [radialCy, setRadialCy] = useState(parseFloat(DEFAULT_RADIAL_CY));
  const [radialR, setRadialR] = useState(parseFloat(DEFAULT_RADIAL_R));
  const [radialFx, setRadialFx] = useState(DEFAULT_RADIAL_FX);
  const [radialFy, setRadialFy] = useState(DEFAULT_RADIAL_FY);
  const [radialFr, setRadialFr] = useState(DEFAULT_RADIAL_FR);

  const [showOutsideClickConfirm, setShowOutsideClickConfirm] = useState(false);
  
  const parsePercentageStringToFloatWithDefault = (percentString: string | undefined, defaultValue: number): number => {
    if (typeof percentString === 'string' && percentString.endsWith('%')) {
      const num = parseFloat(percentString.slice(0, -1));
      return isNaN(num) ? defaultValue : num;
    }
    const num = parseFloat(String(percentString));
    return isNaN(num) ? defaultValue : num;
  };

  const parseFloatToStringPerc = (value: number): string => `${value}%`;

  const parsePropValueAndSetState = useCallback(() => {
    let activeGradientSource: AnySVGGradient | undefined = undefined;

    if (typeof propValue === 'object' && propValue !== null && 'type' in propValue && ('stops' in propValue)) {
      activeGradientSource = propValue as AnySVGGradient;
    } else if (typeof propValue === 'string' && propValue.startsWith('url(#') && propValue.endsWith(')')) {
      const id = propValue.substring(5, propValue.length - 1);
      activeGradientSource = appState.artboard.defs?.gradients?.find(g => g.id === id);
    }

    if (activeGradientSource) {
      setCurrentEditorMode('gradient');
      setCurrentGradientType(activeGradientSource.type === 'linearGradient' ? 'linear' : 'radial');
      setGradientStops(activeGradientSource.stops.map(s => ({ ...s, id: s.id || generateStopId() })).sort((a,b) => a.offset - b.offset));
      if (activeGradientSource.type === 'linearGradient') {
        setLinearAngle((activeGradientSource as LinearSVGGradient).angle ?? DEFAULT_GRADIENT_ANGLE);
      } else if (activeGradientSource.type === 'radialGradient') {
        const radGrad = activeGradientSource as RadialSVGGradient;
        setRadialCx(parsePercentageStringToFloatWithDefault(radGrad.cx, parseFloat(DEFAULT_RADIAL_CX)));
        setRadialCy(parsePercentageStringToFloatWithDefault(radGrad.cy, parseFloat(DEFAULT_RADIAL_CY)));
        setRadialR(parsePercentageStringToFloatWithDefault(radGrad.r, parseFloat(DEFAULT_RADIAL_R)));
        setRadialFx(radGrad.fx ?? DEFAULT_RADIAL_FX);
        setRadialFy(radGrad.fy ?? DEFAULT_RADIAL_FY);
        setRadialFr(radGrad.fr ?? DEFAULT_RADIAL_FR);
      }
      return;
    }
    
    setCurrentEditorMode('solid');
    const colorString = typeof propValue === 'string' ? propValue : '#000000';
    const c = colord(colorString);
    if (c.isValid()) {
      setSolidHexInput(c.toHex().substring(0, 7));
      setSolidAlphaInput(parseFloat(c.alpha().toFixed(2)));
      setSolidPickerColor(c.toRgbString());
    } else {
      setSolidHexInput('#000000');
      setSolidAlphaInput(1);
      setSolidPickerColor('rgba(0,0,0,1)');
    }
  }, [propValue, appState.artboard.defs?.gradients]);

  useEffect(() => {
    if (mainPopoverOpen) { 
      parsePropValueAndSetState();
      latestEditedStopRef.current = null; 
    }
  }, [mainPopoverOpen, parsePropValueAndSetState, propValue]);


  const dispatchPreviewUpdate = useCallback(() => {
    if (!selectedElementId || (editingProperty !== 'fill' && editingProperty !== 'stroke')) return;

    if (currentEditorMode === 'solid') {
      appContextDispatch({ type: 'START_SOLID_COLOR_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, color: solidPickerColor } });
    } else {
      const gradientToPreview = getCurrentConfiguredGradient();
      if (gradientToPreview) {
        appContextDispatch({ type: 'START_GRADIENT_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, gradient: gradientToPreview } });
      }
    }
  }, [selectedElementId, editingProperty, currentEditorMode, solidPickerColor, appContextDispatch]);

  const stopPreview = useCallback(() => {
    if (appState.previewTarget) {
        if (appState.previewGradient) appContextDispatch({ type: 'STOP_GRADIENT_PREVIEW' });
        if (appState.previewSolidColor) appContextDispatch({ type: 'STOP_SOLID_COLOR_PREVIEW' });
    }
  }, [appState.previewTarget, appState.previewGradient, appState.previewSolidColor, appContextDispatch]);


  const handleSolidHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setSolidHexInput(newHex);
    const c = colord(newHex);
    if (c.isValid()) {
        const newPickerColor = c.alpha(solidAlphaInput).toRgbString();
        setSolidPickerColor(newPickerColor);
        if (selectedElementId && (editingProperty === 'fill' || editingProperty === 'stroke')) {
            appContextDispatch({ type: 'START_SOLID_COLOR_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, color: newPickerColor } });
        }
    }
  };

  const handleSolidAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newAlpha = parseFloat(e.target.value);
    if (isNaN(newAlpha)) newAlpha = 1;
    newAlpha = Math.max(0, Math.min(1, newAlpha));
    setSolidAlphaInput(newAlpha);
    const c = colord(solidHexInput);
    if (c.isValid()) {
        const newPickerColor = c.alpha(newAlpha).toRgbString();
        setSolidPickerColor(newPickerColor);
        if (selectedElementId && (editingProperty === 'fill' || editingProperty === 'stroke')) {
            appContextDispatch({ type: 'START_SOLID_COLOR_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, color: newPickerColor } });
        }
    }
  };
  
  const handleSolidAlphaSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAlpha = parseFloat(e.target.value);
    setSolidAlphaInput(newAlpha);
    const c = colord(solidHexInput);
    if (c.isValid()) {
        const newPickerColor = c.alpha(newAlpha).toRgbString();
        setSolidPickerColor(newPickerColor);
         if (selectedElementId && (editingProperty === 'fill' || editingProperty === 'stroke')) {
            appContextDispatch({ type: 'START_SOLID_COLOR_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, color: newPickerColor } });
        }
    }
  };


  const handleSolidPickerChange = useCallback((colorFromPicker: string) => {
    setSolidPickerColor(colorFromPicker);
    const c = colord(colorFromPicker);
    if (c.isValid()) {
      setSolidHexInput(c.toHex().substring(0,7));
      setSolidAlphaInput(parseFloat(c.alpha().toFixed(2)));
    }
    if (selectedElementId && (editingProperty === 'fill' || editingProperty === 'stroke')) {
        appContextDispatch({ type: 'START_SOLID_COLOR_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, color: colorFromPicker } });
    }
  }, [selectedElementId, editingProperty, appContextDispatch]);
  
  const getCurrentConfiguredGradient = useCallback((): AnySVGGradient | null => {
    if (currentEditorMode !== 'gradient') return null;

    let baseStops: GradientStop[];
    let baseGradientUnits: 'userSpaceOnUse' | 'objectBoundingBox' | undefined = 'objectBoundingBox';
    
    let resolvedPropGradient: AnySVGGradient | undefined = undefined;
    if (typeof propValue === 'object' && propValue !== null && 'type' in propValue && 'stops' in propValue) {
        resolvedPropGradient = propValue as AnySVGGradient;
    } else if (typeof propValue === 'string' && propValue.startsWith('url(#') && propValue.endsWith(')')) {
        const id = propValue.substring(5, propValue.length - 1);
        resolvedPropGradient = appState.artboard.defs?.gradients?.find(g => g.id === id);
    }

    if (resolvedPropGradient) {
        baseStops = resolvedPropGradient.stops.map(s => ({ ...s, id: s.id || generateStopId() }));
        baseGradientUnits = resolvedPropGradient.gradientUnits;
    } else {
        baseStops = gradientStops.map(s => ({ ...s }));
    }

    if (latestEditedStopRef.current) {
        baseStops = baseStops.map(stop =>
            stop.id === latestEditedStopRef.current!.stopId
                ? { ...stop, color: latestEditedStopRef.current!.color }
                : stop
        );
    } else { 
        const propStopsString = JSON.stringify(resolvedPropGradient?.stops.map(s => ({offset: s.offset, color: s.color})) || []);
        const localStopsString = JSON.stringify(gradientStops.map(s => ({offset: s.offset, color: s.color})));
        if (propStopsString !== localStopsString) {
            baseStops = gradientStops.map(s => ({...s}));
        }
    }
    
    const tempGradientId = `live-preview-${Date.now()}`;

    if (currentGradientType === 'linear') {
        return {
            id: tempGradientId, type: 'linearGradient', stops: baseStops,
            angle: linearAngle, 
            gradientUnits: baseGradientUnits,
        } as LinearSVGGradient;
    } else { 
        return {
            id: tempGradientId, type: 'radialGradient', stops: baseStops,
            cx: parseFloatToStringPerc(radialCx), 
            cy: parseFloatToStringPerc(radialCy),
            r: parseFloatToStringPerc(radialR),
            fx: radialFx, fy: radialFy, fr: radialFr,
            gradientUnits: baseGradientUnits,
        } as RadialSVGGradient;
    }
  }, [
    currentEditorMode, currentGradientType, gradientStops, linearAngle,
    radialCx, radialCy, radialR, radialFx, radialFy, radialFr,
    propValue, appState.artboard.defs?.gradients
  ]);

  // Effect for live gradient preview when its properties change
  useEffect(() => {
    if (mainPopoverOpen && currentEditorMode === 'gradient' && selectedElementId && (editingProperty === 'fill' || editingProperty === 'stroke')) {
      const gradientToPreview = getCurrentConfiguredGradient();
      if (gradientToPreview) {
        appContextDispatch({ type: 'START_GRADIENT_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, gradient: gradientToPreview } });
      }
    }
  }, [mainPopoverOpen, currentEditorMode, gradientStops, linearAngle, radialCx, radialCy, radialR, radialFx, radialFy, radialFr, getCurrentConfiguredGradient, selectedElementId, editingProperty, appContextDispatch]);


  const applyCurrentSelection = useCallback(() => {
    let newValueForProp: string | AnySVGGradient;
    if (currentEditorMode === 'solid') {
      const c = colord(solidHexInput).alpha(solidAlphaInput);
      newValueForProp = c.alpha() === 1 ? c.toHex().substring(0,7) : c.toRgbString();
    } else { 
      const configuredGradient = getCurrentConfiguredGradient();
      if (configuredGradient) {
        newValueForProp = configuredGradient;
      } else { 
        newValueForProp = DEFAULT_GRADIENT_STOPS[0].color;
      }
    }
    propOnChange(newValueForProp);
    latestEditedStopRef.current = null; 
  }, [currentEditorMode, solidHexInput, solidAlphaInput, getCurrentConfiguredGradient, propOnChange]);


  const handleAddGradientStop = (offset: number) => {
    const newStopId = generateStopId();
    let newColor = 'rgba(128,128,128,1)';
    if (gradientStops.length >= 1) {
        const sorted = [...gradientStops].sort((a, b) => a.offset - b.offset);
        let prevStop = null, nextStop = null;
        for (const stop of sorted) {
            if (stop.offset <= offset) prevStop = stop;
            if (stop.offset >= offset && !nextStop) nextStop = stop;
        }
        if (prevStop && nextStop) {
             const progress = prevStop.offset === nextStop.offset ? 0.5 : (offset - prevStop.offset) / (nextStop.offset - prevStop.offset);
             const c1 = colord(prevStop.color);
             const c2 = colord(nextStop.color);
             if(c1.isValid() && c2.isValid()){
                newColor = colord({
                    r: c1.rgba.r + (c2.rgba.r - c1.rgba.r) * progress,
                    g: c1.rgba.g + (c2.rgba.g - c1.rgba.g) * progress,
                    b: c1.rgba.b + (c2.rgba.b - c1.rgba.b) * progress,
                    a: c1.rgba.a + (c2.rgba.a - c1.rgba.a) * progress,
                }).toRgbString();
             }
        } else if (prevStop) newColor = prevStop.color;
        else if (nextStop) newColor = nextStop.color;
    }
    const newStops = [...gradientStops, { id: newStopId, offset: offset, color: newColor }].sort((a,b) => a.offset - b.offset)
    setGradientStops(newStops);
    setSelectedStopId(newStopId);
    latestEditedStopRef.current = { stopId: newStopId, color: newColor };
  };

  const handleStopsChange = (newStops: GradientStop[]) => {
    setGradientStops(newStops);
    if (latestEditedStopRef.current && !newStops.find(s => s.id === latestEditedStopRef.current!.stopId)) {
        latestEditedStopRef.current = null;
    }
  };

  const handleIndividualStopColorChange = (stopId: string, newColor: string) => {
    setGradientStops(prevStops => prevStops.map(s => s.id === stopId ? { ...s, color: newColor } : s));
    latestEditedStopRef.current = { stopId, color: newColor };
  };
  
  const handleEditorModeChange = (newMode: EditorMode) => {
    if (newMode === currentEditorMode) return;
    setCurrentEditorMode(newMode);
    setSelectedStopId(null); 
    latestEditedStopRef.current = null;
    if (newMode === 'solid' && currentEditorMode === 'gradient') {
        if (gradientStops.length > 0) {
            const firstStopColor = colord(gradientStops[0].color);
            if (firstStopColor.isValid()) {
                setSolidHexInput(firstStopColor.toHex().substring(0,7));
                setSolidAlphaInput(parseFloat(firstStopColor.alpha().toFixed(2)));
                setSolidPickerColor(firstStopColor.toRgbString());
            }
        }
    } else if (newMode === 'gradient' && currentEditorMode === 'solid') {
        const solidC = colord(solidPickerColor);
        if (solidC.isValid()) {
            setGradientStops([
                { id: generateStopId(), offset: 0, color: solidC.toRgbString() },
                { id: generateStopId(), offset: 1, color: solidC.toRgbString() }
            ]);
        }
    }
    // Dispatch preview update after mode change
    if (selectedElementId && (editingProperty === 'fill' || editingProperty === 'stroke')) {
        if (newMode === 'solid') {
            const c = colord(solidPickerColor); // Use current solidPickerColor
            appContextDispatch({ type: 'START_SOLID_COLOR_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, color: c.toRgbString() } });
        } else { // gradient mode
             const gradientTypeForDispatch = currentGradientType;
             const initialGradient = gradientTypeForDispatch === 'linear' 
                ? { id: `live-preview-${Date.now()}`, type: 'linearGradient', stops: gradientStops, angle: linearAngle } 
                : { id: `live-preview-${Date.now()}`, type: 'radialGradient', stops: gradientStops, cx: parseFloatToStringPerc(radialCx), cy: parseFloatToStringPerc(radialCy), r: parseFloatToStringPerc(radialR), fx: radialFx, fy:radialFy, fr:radialFr };
             appContextDispatch({ type: 'START_GRADIENT_PREVIEW', payload: { elementId: selectedElementId, property: editingProperty, gradient: initialGradient as AnySVGGradient } });
        }
    }
  };

  useEffect(() => {
    if (mainPopoverOpen && swatchButtonRef.current) {
        const rect = swatchButtonRef.current.getBoundingClientRect();
        let left = rect.left - POPOVER_WIDTH - PANEL_OFFSET; 
        let top = rect.top;
        if (left < PANEL_OFFSET) left = rect.right + PANEL_OFFSET;
        if (left + POPOVER_WIDTH > window.innerWidth - PANEL_OFFSET) left = window.innerWidth - POPOVER_WIDTH - PANEL_OFFSET;
        if (top + POPOVER_MAX_HEIGHT > window.innerHeight - PANEL_OFFSET) top = Math.max(PANEL_OFFSET, window.innerHeight - POPOVER_MAX_HEIGHT - PANEL_OFFSET);
        if (top < PANEL_OFFSET) top = PANEL_OFFSET;
        setPopoverPosition({ top, left });
    } else if (!mainPopoverOpen) {
        setPopoverPosition(null);
    }
  }, [mainPopoverOpen]);

  const handleToggleMainPopover = useCallback(() => {
    setMainPopoverOpen(prevOpen => {
      const newOpenState = !prevOpen;
      if (!newOpenState) { // If closing
        stopPreview();
        setSelectedStopId(null);
        setShowOutsideClickConfirm(false);
        latestEditedStopRef.current = null;
      }
      return newOpenState;
    });
  }, [stopPreview]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (mainPopoverOpen && 
            mainPopoverRef.current && 
            !mainPopoverRef.current.contains(event.target as Node) &&
            swatchButtonRef.current && 
            !swatchButtonRef.current.contains(event.target as Node)
        ) {
            if (!showOutsideClickConfirm) {
                setShowOutsideClickConfirm(true);
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mainPopoverOpen, showOutsideClickConfirm]);

  const handleRotateAngle90Deg = () => {
    const steps = [0, 90, 180, 270];
    let currentAngleIsStep = steps.includes(linearAngle);
    let nextAngle;

    if (currentAngleIsStep) {
        const currentIndex = steps.indexOf(linearAngle);
        nextAngle = steps[(currentIndex + 1) % steps.length];
    } else {
        nextAngle = steps.find(step => step > linearAngle);
        if (nextAngle === undefined) { 
            nextAngle = 0;
        }
    }
    setLinearAngle(nextAngle);
  };
  
  const handleApplyAndStayOpen = () => {
    applyCurrentSelection();
    stopPreview(); // Clear preview as change is now permanent
  };

  const handleCloseAndDiscard = () => {
    stopPreview(); // Revert any live preview
    setMainPopoverOpen(false);
    setSelectedStopId(null);
    setShowOutsideClickConfirm(false);
    latestEditedStopRef.current = null;
  };


  let currentDisplayValueForSwatch: string;
  let displayTextForInput: string;

  if (typeof propValue === 'object' && propValue !== null && 'type' in propValue) { 
    const grad = propValue as AnySVGGradient;
    const gradTypeDisplay = grad.type === 'linearGradient' ? 'Linear' : 'Radial';
    if (grad.stops.length > 0) {
      const stopsString = grad.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
      currentDisplayValueForSwatch = grad.type === 'linearGradient' 
        ? `linear-gradient(${(grad as LinearSVGGradient).angle || 0}deg, ${stopsString})`
        : `radial-gradient(circle at ${ (grad as RadialSVGGradient).cx || DEFAULT_RADIAL_CX } ${ (grad as RadialSVGGradient).cy || DEFAULT_RADIAL_CY }, ${stopsString})`;
      displayTextForInput = `${gradTypeDisplay} Gradient: ${grad.id.startsWith('kf-grad-') || grad.id.startsWith('temp-grad-') || grad.id.startsWith('live-preview-') ? grad.id.substring(0,12) + '...' : grad.id}`;
    } else {
      currentDisplayValueForSwatch = 'rgba(128,128,128,1)';
      displayTextForInput = `${gradTypeDisplay} Gradient (no stops)`;
    }
  } else if (typeof propValue === 'string' && propValue.startsWith('url(#')) { 
    const id = propValue.substring(5, propValue.length - 1);
    const defGrad = appState.artboard.defs?.gradients?.find(g => g.id === id);
    if (defGrad && defGrad.stops.length > 0) {
        const stopsString = defGrad.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
        currentDisplayValueForSwatch = defGrad.type === 'linearGradient'
            ? `linear-gradient(${(defGrad as LinearSVGGradient).angle || 0}deg, ${stopsString})`
            : `radial-gradient(circle at ${ (defGrad as RadialSVGGradient).cx || DEFAULT_RADIAL_CX } ${ (defGrad as RadialSVGGradient).cy || DEFAULT_RADIAL_CY }, ${stopsString})`;
    } else {
        currentDisplayValueForSwatch = 'rgba(128,128,128,1)';
    }
    displayTextForInput = `Gradient Ref: ${id}`;
  } else { 
    currentDisplayValueForSwatch = colord(propValue as string).isValid() ? colord(propValue as string).toRgbString() : 'rgba(0,0,0,1)';
    displayTextForInput = typeof propValue === 'string' && colord(propValue as string).isValid() ? colord(propValue as string).toHex() : '#000000';
  }
  
  const tabButtonClass = (mode: EditorMode) => 
    `px-3 py-1.5 text-xs rounded-t-md transition-colors focus:outline-none border-b-2
     ${currentEditorMode === mode 
        ? 'bg-gray-700 border-sky-500 text-sky-400' 
        : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750 hover:text-gray-200'}`;

  const livePreviewSwatchInPopover = currentEditorMode === 'gradient' 
    ? (currentGradientType === 'linear' 
        ? `linear-gradient(${linearAngle}deg, ${gradientStops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`
        : `radial-gradient(circle at ${radialCx}% ${radialCy}%, ${gradientStops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`)
    : solidPickerColor;


  const inputControls = (
      <div className="flex items-center space-x-2">
        <button
          type="button"
          ref={swatchButtonRef}
          className="w-7 h-7 rounded border border-gray-600 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          style={{ background: currentDisplayValueForSwatch }}
          onClick={handleToggleMainPopover}
          aria-label="Toggle color/gradient picker"
          aria-expanded={mainPopoverOpen}
        />
        <div 
            className="flex-grow p-1.5 bg-gray-700 border border-gray-600 rounded-md text-xs text-gray-300 truncate cursor-pointer" 
            onClick={handleToggleMainPopover} 
            role="button" 
            tabIndex={0} 
            onKeyDown={(e) => e.key === 'Enter' && handleToggleMainPopover()}
            title={displayTextForInput}
        >
          {displayTextForInput}
        </div>
      </div>
  );

  const radialPropertyInput = (
    label: string,
    idSuffix: string,
    value: number,
    setter: (val: number) => void,
    configKey: 'cx' | 'cy' | 'r_radial' | 'fx' | 'fy' | 'fr_radial'
  ) => {
    const config = SLIDER_CONFIGS[configKey]!;
    return (
      <div>
        <label htmlFor={`gradient-${idSuffix}-input`} className="block text-xs font-medium text-gray-300 mb-1">{label} (%)</label>
        <div className="flex items-center space-x-2">
          <input type="range" id={`gradient-${idSuffix}-slider`} aria-labelledby={`gradient-${idSuffix}-input`}
                 min={config.min} max={config.max} step={config.step}
                 value={value} onChange={(e) => setter(parseFloat(e.target.value))}
                 className="flex-grow h-2 bg-gray-600 rounded-lg appearance-none accent-sky-500 cursor-pointer" />
          <input type="number" id={`gradient-${idSuffix}-input`} value={value} onChange={(e) => setter(parseFloat(e.target.value))}
                 className="w-16 p-1 bg-gray-700 border border-gray-600 rounded-md text-xs text-gray-100"
                 min={config.min} max={config.max} step={config.step} />
        </div>
      </div>
    );
  };
  
  const popoverJSX = (
      <div 
          ref={mainPopoverRef} 
          className="p-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl" 
          style={{ position: 'fixed', top: `${popoverPosition?.top || 0}px`, left: `${popoverPosition?.left || 0}px`, width: `${POPOVER_WIDTH}px`, maxHeight: `${POPOVER_MAX_HEIGHT}px`, zIndex: 50, display: 'flex', flexDirection: 'column' }} 
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          >
        
        {showOutsideClickConfirm && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-[60]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-gray-750 rounded-lg shadow-xl border border-gray-600 space-y-3 text-center">
                <p className="text-sm text-gray-200">Apply changes before closing?</p>
                <div className="flex space-x-2 justify-center">
                    <button onClick={() => { applyCurrentSelection(); handleToggleMainPopover(); }} className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-md">Apply & Close</button>
                    <button onClick={handleCloseAndDiscard} className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md">Discard & Close</button>
                </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-700 flex-shrink-0">
          <button onClick={() => handleEditorModeChange('solid')} className={tabButtonClass('solid')}>Solid Color</button>
          <button onClick={() => handleEditorModeChange('gradient')} className={tabButtonClass('gradient')}>Gradient</button>
        </div>

        {/* Content Area */}
        <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-grow">
          {currentEditorMode === 'solid' ? (
            <>
              <RgbaStringColorPicker color={solidPickerColor} onChange={handleSolidPickerChange} className="w-full"/>
              <div className="flex items-center space-x-1 mt-2">
                  <label htmlFor="solid-hex" className="text-xs text-gray-400">Hex</label>
                  <input
                      id="solid-hex" type="text" value={solidHexInput} onChange={handleSolidHexChange}
                      className="flex-grow min-w-0 p-1 bg-gray-900 border border-gray-600 rounded-md text-xs text-gray-200"
                      maxLength={7}
                  />
              </div>
              <div>
                  <label htmlFor="solid-alpha-slider" className="block text-xs text-gray-300 mt-1 mb-0.5">Alpha</label>
                  <div className="flex items-center space-x-1">
                  <input id="solid-alpha-slider" type="range" min="0" max="1" step="0.01" value={solidAlphaInput} onChange={handleSolidAlphaSliderChange}
                          className="flex-grow h-1.5 bg-gray-600 rounded-lg appearance-none accent-sky-500 cursor-pointer" />
                  <input type="number" min="0" max="1" step="0.01" value={solidAlphaInput.toFixed(2)} onChange={handleSolidAlphaChange}
                          className="w-12 p-1 bg-gray-900 border border-gray-600 rounded-md text-xs text-gray-200" />
                  </div>
              </div>
            </>
          ) : ( // Gradient Mode
            <>
              <div className="flex items-center space-x-2">
                <button onClick={() => setCurrentGradientType('linear')} className={`flex-1 text-xs py-1 rounded-md ${currentGradientType === 'linear' ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>Linear</button>
                <button onClick={() => setCurrentGradientType('radial')} className={`flex-1 text-xs py-1 rounded-md ${currentGradientType === 'radial' ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>Radial</button>
              </div>
              
              <GradientStopEditor
                stops={gradientStops}
                onStopsChange={handleStopsChange}
                gradientType={currentGradientType}
                onAddStop={handleAddGradientStop}
                selectedStopId={selectedStopId}
                onSelectStopId={setSelectedStopId}
                onIndividualStopColorChange={handleIndividualStopColorChange}
              />
              
              {currentGradientType === 'linear' && (
                <div>
                  <label htmlFor="gradient-angle-input" className="block text-xs font-medium text-gray-300 mb-1">Angle (&deg;)</label>
                  <div className="flex items-center space-x-2">
                    <input type="range" id="gradient-angle-slider" min={GRADIENT_ANGLE_CONFIG.min} max={GRADIENT_ANGLE_CONFIG.max} step={GRADIENT_ANGLE_CONFIG.step}
                           value={linearAngle} onChange={(e) => setLinearAngle(parseFloat(e.target.value))}
                           className="flex-grow h-2 bg-gray-600 rounded-lg appearance-none accent-sky-500 cursor-pointer" />
                    <input type="number" id="gradient-angle-input" value={linearAngle} onChange={(e) => setLinearAngle(parseFloat(e.target.value))}
                           className="w-16 p-1 bg-gray-700 border border-gray-600 rounded-md text-xs text-gray-100"
                           min={GRADIENT_ANGLE_CONFIG.min} max={GRADIENT_ANGLE_CONFIG.max} step={GRADIENT_ANGLE_CONFIG.step}/>
                    <button onClick={handleRotateAngle90Deg} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md" title="Rotate 90&deg;"><RotateCwIcon size={16} /></button>
                  </div>
                </div>
              )}

              {currentGradientType === 'radial' && (
                <div className="space-y-2">
                  {radialPropertyInput('Center X', 'cx', radialCx, setRadialCx, 'cx')}
                  {radialPropertyInput('Center Y', 'cy', radialCy, setRadialCy, 'cy')}
                  {radialPropertyInput('Radius', 'r', radialR, setRadialR, 'r_radial')}
                  <div>
                    <label htmlFor="radial-fx" className="block text-xs font-medium text-gray-300 mb-1">Focal X (%)</label>
                    <input type="text" id="radial-fx" value={radialFx} onChange={(e) => setRadialFx(e.target.value)} placeholder="e.g. 50%"
                           className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100"/>
                  </div>
                   <div>
                    <label htmlFor="radial-fy" className="block text-xs font-medium text-gray-300 mb-1">Focal Y (%)</label>
                    <input type="text" id="radial-fy" value={radialFy} onChange={(e) => setRadialFy(e.target.value)} placeholder="e.g. 50%"
                           className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100"/>
                  </div>
                   <div>
                    <label htmlFor="radial-fr" className="block text-xs font-medium text-gray-300 mb-1">Focal Radius (%)</label>
                    <input type="text" id="radial-fr" value={radialFr} onChange={(e) => setRadialFr(e.target.value)} placeholder="e.g. 0%"
                           className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100"/>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-2 border-t border-gray-700 flex-shrink-0 flex items-center space-x-2">
          <div className="w-6 h-6 rounded border border-gray-600 flex-shrink-0" style={{background: livePreviewSwatchInPopover }}></div>
          <button onClick={handleApplyAndStayOpen} className="flex-1 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-md">Apply</button>
          <button onClick={handleToggleMainPopover} className="flex-1 px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md">Done</button>
        </div>
      </div>
  );

  return (
    <>
      {inputControls}
      {mainPopoverOpen && popoverPosition && createPortal(popoverJSX, document.body)}
    </>
  );
};

export default ColorPickerInput;
