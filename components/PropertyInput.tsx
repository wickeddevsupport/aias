
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext'; 
import { SVGElementData, AnimatableProperty, Artboard, AnySVGGradient, BezierPoint, RectElementProps, CircleElementProps, ImageElementProps } from '../types'; 
import { KeyframeIcon, TrashIcon, InformationCircleIcon } from './icons/EditorIcons'; 
import ColorPickerInput from './ColorPickerInput'; 
import { SLIDER_CONFIGS, SliderConfig } from '../constants'; 

export interface PropertyInputProps {
  label: string;
  propKey: AnimatableProperty | keyof Omit<Artboard, 'x' | 'y' | 'id'> | 'name' | keyof Omit<BezierPoint, 'id' | 'isSmooth' | 'isSelected'> | 'alignToPath';
  value: string | number | AnySVGGradient | BezierPoint[] | undefined; 
  baseValue: string | number | AnySVGGradient | BezierPoint[] | undefined; 
  inputType: string;
  ownerId: string;
  onAddKeyframe?: (elementId: string, property: AnimatableProperty, value: number | string | AnySVGGradient | BezierPoint[] | undefined) => void; 
  track?: { keyframes: { time: number; value: any }[] };
  currentTime?: number;
  onRemoveKeyframe?: (elementId: string, property: AnimatableProperty, time: number) => void;
  sliderConfig?: SliderConfig;
  isArtboardProperty?: boolean;
  isControlledBy?: 'motionPath' | 'alignToPath' | 'structuredPoints' | null;
  shapePathLength?: number;
  children?: React.ReactNode;
  isDisabledByParent?: boolean;
}

const PropertyInput: React.FC<PropertyInputProps> = ({
  label, propKey, value: propValue, baseValue: propBaseValue, inputType, ownerId,
  onAddKeyframe,
  track, currentTime, onRemoveKeyframe,
  sliderConfig, isArtboardProperty = false, isControlledBy = null,
  shapePathLength,
  children,
  isDisabledByParent = false,
}) => {

  const { state: appState, dispatch } = useContext(AppContext); 

  const isEffectivelyAuto = inputType === 'number' && propValue === undefined;

  const displayValueForTextareaAndInput = useCallback((v: string | number | AnySVGGradient | BezierPoint[] | undefined): string => {
    if (v === undefined && inputType === 'number') return "Auto";
    if (Array.isArray(v)) return `[Path Data]`;
    if (typeof v === 'object' && v !== null) {
      if ('type' in v && 'id' in v) { 
        return `[${v.type === 'linearGradient' ? 'Linear' : 'Radial'} Gradient: ${String((v as AnySVGGradient).id).slice(0, 8)}...]`;
      }
      return '[Object Representation]';
    }
    return String(v ?? (inputType === 'number' ? '0' : '')); 
  }, [inputType]);


  const [internalDisplayValue, setInternalDisplayValue] = useState<string>(() => {
    return displayValueForTextareaAndInput(propValue);
  });

  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [isFocused, setIsFocused] = useState(false);


  useEffect(() => {
    if (!isDraggingRange && !isFocused) {
      const newDisplay = displayValueForTextareaAndInput(propValue);
      if (newDisplay !== internalDisplayValue) {
        setInternalDisplayValue(newDisplay);
      }
    }
  }, [propValue, isDraggingRange, isFocused, inputType, displayValueForTextareaAndInput, internalDisplayValue]);

  const handleGenericUpdate = (newValue: string | number | AnySVGGradient | BezierPoint[] | undefined, isContinuousUpdate: boolean = false) => {
    if (isControlledBy || isDisabledByParent) return;
    
    let finalValueToDispatch: any = newValue;

    if (propKey === 'strokeDasharray') {
        if (typeof newValue === 'number') finalValueToDispatch = `${newValue} ${newValue}`;
        else finalValueToDispatch = String(newValue);
    } else if (newValue === undefined && (propKey === 'width' || propKey === 'height')) { 
        finalValueToDispatch = undefined;
    } else if (inputType === 'number' || propKey === 'strokeDashoffset' || ['x','y','h1x','h1y','h2x','h2y'].includes(String(propKey))) {
        const parsedNum = parseFloat(String(newValue));
        if (!isNaN(parsedNum)) {
            finalValueToDispatch = parsedNum;
        } else {
            finalValueToDispatch = (propKey === 'scale') ? 1 : 0; 
        }
    }

    if (isArtboardProperty) {
      dispatch({ type: 'SET_ARTBOARD_PROPS', payload: { [propKey]: finalValueToDispatch } as Partial<Artboard> });
    } else {
      if (!['x','y','h1x','h1y','h2x','h2y'].includes(String(propKey)) || children === undefined) {
         dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: ownerId, props: { [propKey]: finalValueToDispatch } as Partial<SVGElementData>, skipHistory: isContinuousUpdate } });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (isControlledBy || isDisabledByParent) return;
    const rawValueFromInput = e.target.value;
    setInternalDisplayValue(rawValueFromInput); 

    if (e.target.type === 'range') {
      const numericValue = parseFloat(rawValueFromInput);
      if (!isNaN(numericValue)) {
        handleGenericUpdate(numericValue, true); 
      }
    } else if (inputType === 'number') { 
      const numericValue = parseFloat(rawValueFromInput);
      if (!isNaN(numericValue)) {
        handleGenericUpdate(numericValue, true); 
      }
    } else if (inputType === 'text' && propKey === 'name') {
      handleGenericUpdate(rawValueFromInput, true); 
    }
  };

  const handleInputCommit = () => {
    if (isControlledBy || isDisabledByParent || isEffectivelyAuto) { 
        setIsFocused(false);
        if (isEffectivelyAuto) setInternalDisplayValue("Auto");
        return;
    }
    setIsFocused(false);
    
    const propsToUpdate: Partial<SVGElementData> = {};
    const currentElementModel = appState.elements.find(el => el.id === ownerId);
    if (!currentElementModel && !isArtboardProperty) return;

    let parsedValue: string | number | AnySVGGradient | BezierPoint[] | undefined;

    if (propKey === 'd') {
        parsedValue = Array.isArray(propValue) ? propValue : internalDisplayValue;
    } else if (inputType === 'number' || propKey === 'strokeDashoffset' || (propKey === 'strokeDasharray' && !internalDisplayValue.includes(' '))) {
        let num = parseFloat(internalDisplayValue);
        if (isNaN(num)) {
            num = typeof propBaseValue === 'number' ? propBaseValue : (propKey === 'scale' ? 1 : 0);
        }
        parsedValue = num;
    } else if (propKey === 'strokeDasharray') {
        const parts = internalDisplayValue.trim().split(/\s+/).map(parseFloat);
        if (parts.length === 1 && !isNaN(parts[0])) parsedValue = `${parts[0]} ${parts[0]}`;
        else if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) parsedValue = `${parts[0]} ${parts[1]}`;
        else parsedValue = typeof propBaseValue === 'string' ? propBaseValue : "0 0";
    } else {
        parsedValue = internalDisplayValue;
    }
    
    setInternalDisplayValue(displayValueForTextareaAndInput(parsedValue)); 

    if (isArtboardProperty) {
        dispatch({ type: 'SET_ARTBOARD_PROPS', payload: { [propKey]: parsedValue } as Partial<Artboard> });
        return;
    }

    if (!currentElementModel) return;

    if (currentElementModel.type === 'rect' || currentElementModel.type === 'image') {
        const el = currentElementModel as RectElementProps | ImageElementProps;
        const currentModelX = el.x || 0;
        const currentModelY = el.y || 0;
        const currentModelScale = el.scale || 1;
        const currentModelWidth = el.width || 0;
        const currentModelHeight = el.height || 0;

        if (propKey === 'scale') {
            const newScaleInput = typeof parsedValue === 'number' ? parsedValue : currentModelScale;
            if (newScaleInput > 0) {
                const oldVisualWidth = currentModelWidth * currentModelScale;
                const oldVisualHeight = currentModelHeight * currentModelScale;
                const newVisualWidth = currentModelWidth * newScaleInput;
                const newVisualHeight = currentModelHeight * newScaleInput;
                const deltaVisualWidth = newVisualWidth - oldVisualWidth;
                const deltaVisualHeight = newVisualHeight - oldVisualHeight;
                propsToUpdate.x = currentModelX - deltaVisualWidth / 2;
                propsToUpdate.y = currentModelY - deltaVisualHeight / 2;
                propsToUpdate.scale = newScaleInput;
            }
        } else if (propKey === 'width') {
            const newIntrinsicWidth = typeof parsedValue === 'number' ? parsedValue : currentModelWidth;
            if (newIntrinsicWidth >= 0) {
                const oldVisualWidth = currentModelWidth * currentModelScale;
                const newVisualWidth = newIntrinsicWidth * currentModelScale;
                const deltaVisualWidth = newVisualWidth - oldVisualWidth;
                propsToUpdate.x = currentModelX - deltaVisualWidth / 2;
                (propsToUpdate as any).width = newIntrinsicWidth;
            }
        } else if (propKey === 'height') {
            const newIntrinsicHeight = typeof parsedValue === 'number' ? parsedValue : currentModelHeight;
            if (newIntrinsicHeight >= 0) {
                const oldVisualHeight = currentModelHeight * currentModelScale;
                const newVisualHeight = newIntrinsicHeight * currentModelScale;
                const deltaVisualHeight = newVisualHeight - oldVisualHeight;
                propsToUpdate.y = currentModelY - deltaVisualHeight / 2;
                (propsToUpdate as any).height = newIntrinsicHeight;
            }
        } else {
            (propsToUpdate as any)[propKey] = parsedValue;
        }
    } else if (currentElementModel.type === 'circle') {
        (propsToUpdate as any)[propKey] = parsedValue;
    } else {
        (propsToUpdate as any)[propKey] = parsedValue;
    }
    
    if (Object.keys(propsToUpdate).length > 0) {
      dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: ownerId, props: propsToUpdate, skipHistory: false } });
    } else if (propKey && parsedValue !== undefined && (currentElementModel as any)[propKey] !== parsedValue) {
      dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: ownerId, props: { [propKey]: parsedValue } as Partial<SVGElementData>, skipHistory: false } });
    }
  };


  const handleAddKeyframeClick = () => {
    if (isControlledBy || isDisabledByParent || !onAddKeyframe || isArtboardProperty || currentTime === undefined || propKey === 'name') return;
    
    let valueToKeyframe: string | number | AnySVGGradient | BezierPoint[] | undefined = propValue;

    if (isEffectivelyAuto) { 
        valueToKeyframe = undefined;
    } else if (typeof propValue === 'object' && propValue !== null) { 
      valueToKeyframe = JSON.parse(JSON.stringify(propValue)); 
    } else if (inputType === 'number' && typeof propValue !== 'number') {
      valueToKeyframe = parseFloat(String(propValue)) || (propKey === 'scale' ? 1 : 0);
    } else if ((propKey === 'fill' || propKey === 'stroke') && (propValue === undefined || propValue === null)) {
      valueToKeyframe = 'none';
    } else if (propValue === undefined && (propKey !== 'width' && propKey !== 'height')) { 
      valueToKeyframe = propKey === 'scale' ? 1 : (inputType === 'number' ? 0 : '');
    }
    onAddKeyframe(ownerId, propKey as AnimatableProperty, valueToKeyframe);
  };
  

  const currentKeyframe = !isArtboardProperty && track?.keyframes.find(kf => currentTime !== undefined && Math.abs(kf.time - currentTime) < 0.001);
  
  const inputFieldClasses = `w-full glass-input 
    ${isControlledBy || isDisabledByParent ? '!bg-dark-bg-tertiary !text-text-placeholder !cursor-not-allowed !placeholder-text-placeholder opacity-70' : ''}
    ${isEffectivelyAuto ? 'italic !text-text-placeholder' : ''}`; 
  
  const rangeSliderClasses = `w-full h-1.5 rounded-lg appearance-none accent-[var(--accent-color)] 
    ${isControlledBy || isDisabledByParent || isEffectivelyAuto ? '!cursor-not-allowed opacity-50 !accent-gray-500 !bg-dark-bg-tertiary' : 'cursor-pointer bg-[rgba(var(--accent-rgb),0.1)] hover:bg-[rgba(var(--accent-rgb),0.15)]'}`;

  let controlledByMessage = '';
  if (isControlledBy === 'motionPath') controlledByMessage = 'Motion Path Controlled';
  else if (isControlledBy === 'alignToPath') controlledByMessage = 'Align to Path Controlled';
  else if (isControlledBy === 'structuredPoints') controlledByMessage = 'Derived from Bezier points';

  let sliderThumbPos = parseFloat(internalDisplayValue);
  if (Number.isNaN(sliderThumbPos) || isEffectivelyAuto) { 
      sliderThumbPos = typeof propBaseValue === 'number' ? propBaseValue : parseFloat(String(propBaseValue)) || 0;
  }
  if (propKey === 'strokeDasharray') {
      const parts = internalDisplayValue.split(/\s+/);
      sliderThumbPos = parseFloat(parts[0]) || 0;
  }

  const finalDynamicSliderConfig = propKey === 'strokeDasharray'
    ? { min: 0, max: (shapePathLength !== undefined && shapePathLength > 0 ? Math.ceil(shapePathLength) + 2 : 100), step: 1 }
    : (propKey === 'strokeDashoffset' && shapePathLength !== undefined && shapePathLength > 0
        ? { min: -Math.ceil(shapePathLength * 1.5), max: Math.ceil(shapePathLength * 1.5), step: 1 }
        : sliderConfig);
  
  const valueForTextOrNumberInput = (isControlledBy && !isEffectivelyAuto) 
                                    ? displayValueForTextareaAndInput(propValue) 
                                    : String(internalDisplayValue);


  const rawValueForColorPicker = (isControlledBy || isDisabledByParent) ? propValue : propValue;
  const valueForColorPickerInput: string | AnySVGGradient = (typeof rawValueForColorPicker === 'number' || Array.isArray(rawValueForColorPicker))
    ? '#000000' 
    : rawValueForColorPicker as (string | AnySVGGradient);
  
  const canAddKeyframe = !isArtboardProperty && !!onAddKeyframe && currentTime !== undefined && propKey !== 'name' && !isControlledBy && !isDisabledByParent;
  const showKeyframeButton = !isArtboardProperty && propKey !== 'name' &&
                             (children === undefined || ['x','y','rotation','scale'].includes(String(propKey))) &&
                             !['h1x','h1y','h2x','h2y'].includes(String(propKey));


  return (
    <div className={`mb-2 p-2.5 border rounded-lg shadow-inner bg-[rgba(var(--accent-rgb),0.01)] ${isControlledBy || isDisabledByParent ? 'border-dashed border-[var(--glass-border-color)] opacity-70' : 'border-[var(--glass-border-color)]'}`}>
      <div className="flex justify-between items-center mb-1.5">
        <label className={`block text-xs font-medium capitalize ${isControlledBy || isDisabledByParent ? 'text-text-placeholder' : 'text-text-secondary group-hover:text-text-primary'}`}>{label}</label>
        {showKeyframeButton && (
          <button
            onClick={handleAddKeyframeClick}
            title={isControlledBy ? controlledByMessage : (isDisabledByParent ? (propKey === 'width' ? 'Auto Width is ON' : 'Auto Height is ON') : (canAddKeyframe ? `Add/Update Keyframe for ${label} at ${currentTime?.toFixed(2)}s` : `Cannot add keyframe for ${label}`))}
            className={`p-1 rounded-md transition-colors ${currentKeyframe && !isControlledBy && !isDisabledByParent ? 'bg-accent-color text-dark-bg-primary shadow-[var(--highlight-glow)]' : 'bg-[rgba(var(--accent-rgb),0.1)] hover:bg-[rgba(var(--accent-rgb),0.2)] text-accent-color'} ${!canAddKeyframe ? '!opacity-40 cursor-not-allowed !bg-transparent !shadow-none' : ''}`}
            aria-label={`Keyframe ${label}`}
            disabled={!canAddKeyframe}
          >
            <KeyframeIcon size={14} />
          </button>
        )}
      </div>
      {(controlledByMessage && !isDisabledByParent) && (
        <div className="text-xs text-[color:var(--accent-color)] opacity-80 mb-1.5 flex items-center">
          <InformationCircleIcon size={13} className="mr-1 flex-shrink-0" />
          {controlledByMessage}
        </div>
      )}
      {children ? children : ( 
        inputType === 'textarea' ? (
          <textarea value={valueForTextOrNumberInput} onChange={handleInputChange} onBlur={handleInputCommit} onFocus={() => setIsFocused(true)} className={`${inputFieldClasses} min-h-[50px] glass-textarea`} rows={2} disabled={!!isControlledBy || isDisabledByParent} />
        ) : inputType === 'color' ? (
          <ColorPickerInput
            value={valueForColorPickerInput}
            onChange={(newColorOrGradient) => {
                setInternalDisplayValue(displayValueForTextareaAndInput(newColorOrGradient)); 
                handleGenericUpdate(newColorOrGradient, false);
            }}
            editingProperty={propKey as AnimatableProperty}
          />
        ) : (
          <div className="flex flex-col space-y-2"> 
            {finalDynamicSliderConfig && !isEffectivelyAuto && (
              <input type="range" min={finalDynamicSliderConfig.min} max={finalDynamicSliderConfig.max} step={finalDynamicSliderConfig.step}
                value={sliderThumbPos}
                onTouchStart={() => setIsDraggingRange(true)}
                onMouseDown={() => setIsDraggingRange(true)} 
                onChange={handleInputChange} 
                onTouchEnd={() => { setIsDraggingRange(false); if (!isControlledBy && !isDisabledByParent) handleInputCommit(); }}
                onMouseUp={() => { setIsDraggingRange(false); if (!isControlledBy && !isDisabledByParent) handleInputCommit(); }}
                className={rangeSliderClasses}
                disabled={!!isControlledBy || isDisabledByParent || isEffectivelyAuto} />
            )}
            <input
              type={isEffectivelyAuto ? 'text' : (inputType === 'number' ? 'number' : 'text')}
              value={valueForTextOrNumberInput} 
              onChange={handleInputChange}
              onBlur={handleInputCommit}
              onFocus={() => { if(!isEffectivelyAuto) setIsFocused(true); }}
              onKeyDown={(e) => e.key === 'Enter' && handleInputCommit()}
              className={inputFieldClasses}
              step={finalDynamicSliderConfig?.step || (inputType === 'number' ? (propKey === 'opacity' || propKey === 'scale' || propKey === 'motionPathStart' || propKey === 'motionPathEnd' || propKey === 'drawStartPercent' || propKey === 'drawEndPercent' ? 0.01 : 1) : undefined)}
              min={finalDynamicSliderConfig?.min}
              max={finalDynamicSliderConfig?.max}
              placeholder={propKey === 'name' ? "Element Name" : (isEffectivelyAuto ? "Auto" : "")}
              disabled={!!isControlledBy || isDisabledByParent || isEffectivelyAuto}
              readOnly={isEffectivelyAuto} 
            />
          </div>
        )
      )}
      {!isArtboardProperty && track && track.keyframes.length > 0 && onRemoveKeyframe && !(isControlledBy || isDisabledByParent) && showKeyframeButton && (
        <div className="mt-2 space-y-1">
          {track.keyframes.map(kf => {
            let displayKfValue = String(kf.value);
            if (kf.value === undefined && (propKey === 'width' || propKey === 'height')) displayKfValue = "Auto";
            else if (Array.isArray(kf.value)) displayKfValue = `[Path Data]`;
            else if (typeof kf.value === 'object' && kf.value !== null) {
              const grad = kf.value as AnySVGGradient;
              displayKfValue = `[${grad.type === 'linearGradient' ? 'Lin' : 'Rad'}]`;
            } else if (typeof kf.value === 'string' && kf.value.length > 12) displayKfValue = kf.value.substring(0, 10) + '...';
            else if (typeof kf.value === 'number') displayKfValue = kf.value.toFixed(2);

            return (
              <div key={kf.time} className={`flex justify-between items-center text-xs p-1 rounded-md ${currentTime !== undefined && Math.abs(kf.time - currentTime) < 0.001 ? 'bg-[rgba(var(--accent-rgb),0.15)] text-accent-color' : 'bg-[rgba(var(--accent-rgb),0.03)] text-text-secondary'}`}>
                <span className="truncate">T: {kf.time.toFixed(1)}s, Val: {displayKfValue}</span>
                <button onClick={() => onRemoveKeyframe(ownerId, propKey as AnimatableProperty, kf.time)} className="ml-1 text-red-400 hover:text-red-300 transition-colors" aria-label={`Remove keyframe at ${kf.time.toFixed(1)}s`} >
                  <TrashIcon size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyInput;