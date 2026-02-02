import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext'; 
import { SVGElementData, AnimatableProperty, Artboard, AnySVGGradient, BezierPoint, RectElementProps, CircleElementProps, ImageElementProps } from '../types'; 
import { KeyframeIcon, TrashIcon, InformationCircleIcon } from './icons/EditorIcons'; 
import ColorPickerInput from './ColorPickerInput'; 
import { SLIDER_CONFIGS, SliderConfig } from '../constants'; 
import DialInput from './DialInput';

export interface PropertyInputProps {
  label: string;
  propKey: AnimatableProperty | keyof Omit<Artboard, 'x' | 'y' | 'id'> | 'name' | keyof Omit<BezierPoint, 'id' | 'isSmooth' | 'isSelected'> | 'alignToPath';
  value: string | number | AnySVGGradient | BezierPoint[] | undefined; 
  baseValue: string | number | AnySVGGradient | BezierPoint[] | undefined; 
  inputType: string;
  ownerId: string;
  onAddKeyframe?: (property: AnimatableProperty, value: number | string | AnySVGGradient | BezierPoint[] | undefined) => void;
  track?: { keyframes: { time: number; value: any }[] };
  currentTime?: number;
  onRemoveKeyframe?: (elementId: string, property: AnimatableProperty, time: number) => void;
  sliderConfig?: SliderConfig;
  isArtboardProperty?: boolean;
  isControlledBy?: 'motionPath' | 'alignToPath' | 'structuredPoints' | 'drawEffect' | null;
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

  const displayValueForTextarea = useCallback((v: string | number | AnySVGGradient | BezierPoint[] | undefined): string => {
    if (v === undefined && inputType === 'number') return "Auto";
    if (Array.isArray(v)) return `[Path Data]`;
    if (typeof v === 'object' && v !== null) {
      if ('type' in v && 'id' in v) { 
        return `[${v.type === 'linearGradient' ? 'Linear' : 'Radial'} Gradient]`;
      }
      return '[Object]';
    }
    return String(v ?? (inputType === 'number' ? '0' : '')); 
  }, [inputType]);

  const [internalDisplayValue, setInternalDisplayValue] = useState<string>(() => {
    return displayValueForTextarea(propValue);
  });
  
  const handleGenericUpdate = (newValue: string | number | AnySVGGradient | BezierPoint[] | undefined, isContinuousUpdate: boolean = false) => {
    if (isControlledBy || isDisabledByParent) return;

    if (isArtboardProperty) {
      const payload = { [propKey]: newValue };
      if(isContinuousUpdate) {
        dispatch({ type: 'UPDATE_ARTBOARD_PROPS_CONTINUOUS', payload });
      } else {
        dispatch({ type: 'SET_ARTBOARD_PROPS', payload });
      }
    } else {
      dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: ownerId, props: { [propKey]: newValue }, skipHistory: isContinuousUpdate } });
    }
  };
  
  useEffect(() => {
    if (inputType !== 'number') {
      setInternalDisplayValue(displayValueForTextarea(propValue));
    }
  }, [propValue, inputType, displayValueForTextarea]);

  const handleAddKeyframeClick = () => {
    if (isControlledBy || isDisabledByParent || !onAddKeyframe || isArtboardProperty || currentTime === undefined || propKey === 'name') return;
    
    let valueToKeyframe: any = propValue;
    if (isEffectivelyAuto) { 
        valueToKeyframe = undefined;
    } else if (typeof propValue === 'object' && propValue !== null) { 
      valueToKeyframe = JSON.parse(JSON.stringify(propValue)); 
    } else if (inputType === 'number' && typeof propValue !== 'number') {
      valueToKeyframe = parseFloat(String(propValue)) || (propKey === 'scale' ? 1 : 0);
    }
    onAddKeyframe(propKey as AnimatableProperty, valueToKeyframe);
  };

  const currentKeyframe = !isArtboardProperty && track?.keyframes.find(kf => currentTime !== undefined && Math.abs(kf.time - currentTime) < 0.001);
  let controlledByMessage = '';
  if (isControlledBy === 'motionPath') controlledByMessage = 'Motion Path Controlled';
  else if (isControlledBy === 'alignToPath') controlledByMessage = 'Align to Path Controlled';
  else if (isControlledBy === 'structuredPoints') controlledByMessage = 'Derived from Bezier points';
  else if (isControlledBy === 'drawEffect') controlledByMessage = 'Controlled by Draw % Effect';

  const canAddKeyframe = !isArtboardProperty && !!onAddKeyframe && currentTime !== undefined && propKey !== 'name' && !isControlledBy && !isDisabledByParent;
  const showKeyframeButton = !isArtboardProperty && propKey !== 'name' && (children === undefined || ['x', 'y', 'rotation', 'scale'].includes(String(propKey))) && !['h1x', 'h1y', 'h2x', 'h2y'].includes(String(propKey));

  const renderInputControl = () => {
    if (inputType === 'number') {
      const isPercentage = ['drawStartPercent', 'drawEndPercent', 'motionPathStart', 'motionPathEnd'].includes(String(propKey));
      const isUnitless = ['opacity', 'scale', 'lineHeight'].includes(String(propKey));
      const numericPropValue = typeof propValue === 'number' ? propValue : (typeof propBaseValue === 'number' ? propBaseValue : 0);

      const handleDialUpdate = (newDialValue: number, isContinuous: boolean) => {
        const finalValue = isPercentage ? newDialValue / 100 : newDialValue;
        handleGenericUpdate(finalValue, isContinuous);
      };

      const valueForDial = isPercentage ? numericPropValue * 100 : numericPropValue;
      const min = isPercentage ? 0 : sliderConfig?.min ?? -1000;
      const max = isPercentage ? 100 : sliderConfig?.max ?? 1000;
      const step = isPercentage ? 1 : sliderConfig?.step ?? 1;
      
      let unit = '';
      if (isPercentage) unit = '%';
      else if (propKey === 'rotation') unit = '°';
      else if (!isUnitless) unit = 'px';

      if (isEffectivelyAuto) {
        return <div className="p-2 text-center text-text-placeholder italic bg-dark-bg-tertiary rounded-md">Auto</div>;
      }

      return (
        <DialInput
          value={valueForDial}
          onUpdate={handleDialUpdate}
          min={min}
          max={max}
          step={step}
          unit={unit}
          sensitivity={propKey === 'opacity' || propKey === 'scale' || isPercentage ? 0.05 : 0.5}
          isDisabled={!!isControlledBy || isDisabledByParent}
        />
      );
    }
    
    if(inputType === 'color') {
        const valueForColorPickerInput: string | AnySVGGradient = (typeof propValue === 'number' || Array.isArray(propValue)) ? '#000000' : propValue as (string | AnySVGGradient);
        return (
            <div className="p-2 glass-panel bg-[rgba(var(--accent-rgb),0.02)]">
                <ColorPickerInput
                  value={valueForColorPickerInput}
                  onChange={(newColor) => handleGenericUpdate(newColor, false)}
                  editingProperty={propKey as AnimatableProperty}
                />
            </div>
        );
    }
    
    return <textarea value={displayValueForTextarea(propValue)} onChange={(e) => handleGenericUpdate(e.target.value)} onBlur={(e) => handleGenericUpdate(e.target.value, false)} className="w-full glass-textarea min-h-[50px] custom-scrollbar" rows={2} disabled={!!isControlledBy || isDisabledByParent} />;
  };

  return (
    <div className={`mb-2 p-2.5 border rounded-lg shadow-inner bg-[rgba(var(--accent-rgb),0.01)] ${isControlledBy || isDisabledByParent ? 'border-dashed border-[var(--glass-border-color)] opacity-70' : 'border-[var(--glass-border-color)]'}`}>
      <div className="flex justify-between items-center mb-1.5">
        <label className={`block text-xs font-medium capitalize ${isControlledBy || isDisabledByParent ? 'text-text-placeholder' : 'text-text-secondary group-hover:text-text-primary'}`}>{label}</label>
        {showKeyframeButton && (
          <button
            onClick={handleAddKeyframeClick}
            title={isControlledBy ? controlledByMessage : (isDisabledByParent ? 'Controlled by Auto Size' : (canAddKeyframe ? `Add/Update Keyframe for ${label} at ${currentTime?.toFixed(2)}s` : `Cannot add keyframe for ${label}`))}
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
      {children ? children : renderInputControl()}
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