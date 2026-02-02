
import React from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, AnimationTrack, AnimatableProperty, AppAction, AnySVGGradient } from '../../../types';
import { SLIDER_CONFIGS } from '../../../constants';

interface AppearanceSectionProps {
  elementFromState: SVGElementData;
  animatedElementProps: SVGElementData;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (elementId: string, property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>;
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
}) => {
  const appearancePropsConfig: { key: AnimatableProperty, inputType: string, label: string }[] = [
    { key: 'fill', inputType: 'color', label: 'Fill' },
    { key: 'stroke', inputType: 'color', label: 'Stroke Color' },
    { key: 'strokeWidth', inputType: 'number', label: 'Stroke Width' },
    { key: 'opacity', inputType: 'number', label: 'Opacity' },
  ];

  return (
    <div className="space-y-1">
      {appearancePropsConfig.map(({ key: propKey, inputType, label }) => {
        const baseValue = (elementFromState as any)[propKey];
        const displayValue = (animatedElementProps as any)[propKey] !== undefined
                             ? (animatedElementProps as any)[propKey]
                             : baseValue;

        let valueForColorPickerInput: string | AnySVGGradient = displayValue;
        
        if (typeof displayValue === 'string' && displayValue.startsWith('url(#')) {
            valueForColorPickerInput = baseValue;
        } else if (typeof displayValue === 'object' && displayValue !== null && 'type' in displayValue) {
            valueForColorPickerInput = displayValue as AnySVGGradient;
        } else if (inputType === 'color' && displayValue === undefined && baseValue === undefined) {
             valueForColorPickerInput = 'none';
        } else if (inputType === 'color' && typeof displayValue !== 'object') {
            valueForColorPickerInput = String(displayValue);
        }

        const finalDisplayValue = (propKey === 'strokeWidth' || propKey === 'opacity') && displayValue === undefined
                                    ? (baseValue ?? (propKey === 'opacity' ? 1 : 0)) // Opacity defaults to 1, strokeWidth to 0 if undefined
                                    : valueForColorPickerInput;
        const finalBaseValue = (propKey === 'strokeWidth' || propKey === 'opacity') && baseValue === undefined
                                    ? (propKey === 'opacity' ? 1 : 0)
                                    : baseValue;

        return (
          <PropertyInput
            key={propKey}
            label={label}
            propKey={propKey}
            value={finalDisplayValue}
            baseValue={finalBaseValue}
            inputType={inputType}
            ownerId={elementFromState.id}
            onAddKeyframe={onAddKeyframe}
            track={animationTracksForSelected.find(t => t.property === propKey)}
            currentTime={currentTime}
            onRemoveKeyframe={onRemoveKeyframe}
            sliderConfig={SLIDER_CONFIGS[propKey as keyof typeof SLIDER_CONFIGS]}
          />
        );
      })}
    </div>
  );
};

export default AppearanceSection;