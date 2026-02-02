import React from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, ImageElementProps, AnimationTrack, AnimatableProperty, AppAction } from '../../../types';
import { 
    DEFAULT_IMAGE_HREF, DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO,
    PRESERVE_ASPECT_RATIO_OPTIONS 
} from '../../../constants';
import { ChevronDownIconSolid } from '../../icons/EditorIcons';

interface ImagePropertiesSectionProps {
  elementFromState: SVGElementData; 
  animatedElementProps: SVGElementData; 
  animationTracksForSelected: AnimationTrack[]; 
  currentTime: number; 
  onAddKeyframe: (elementId: string, property: AnimatableProperty, value: any) => void; 
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void; 
  dispatch: React.Dispatch<AppAction>;
}

const ImagePropertiesSection: React.FC<ImagePropertiesSectionProps> = ({
  elementFromState,
  animatedElementProps, 
  dispatch,
}) => {
  const imageElement = elementFromState as ImageElementProps;

  const handleStaticPropChange = (propKey: keyof Pick<ImageElementProps, 'href' | 'preserveAspectRatio'>, value: string) => {
    dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: { [propKey]: value } } });
  };
  
  const imageSpecificProps: {
    key: keyof Pick<ImageElementProps, 'href' | 'preserveAspectRatio'>;
    label: string;
    inputType: 'text' | 'select'; 
    options?: { value: string; label: string }[];
  }[] = [
    { key: 'href', label: 'Image Source (URL)', inputType: 'text' },
    { key: 'preserveAspectRatio', label: 'Preserve Aspect Ratio', inputType: 'select', options: PRESERVE_ASPECT_RATIO_OPTIONS },
  ];

  return (
    <div className="space-y-1">
      {imageSpecificProps.map(({ key, label, inputType, options }) => {
        const baseValue = String(imageElement[key] ?? (key === 'href' ? DEFAULT_IMAGE_HREF : DEFAULT_IMAGE_PRESERVE_ASPECT_RATIO));
        
        if (inputType === 'select' && options) {
          return (
            <PropertyInput
                key={key}
                label={label}
                propKey={key as any}
                value={baseValue}
                baseValue={baseValue}
                inputType="custom"
                ownerId={elementFromState.id}
            >
              <div className="relative">
                <select
                  id={`${elementFromState.id}-${key}`}
                  value={baseValue} 
                  onChange={(e) => handleStaticPropChange(key, e.target.value)}
                  className="w-full glass-select"
                >
                  {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </PropertyInput>
          );
        }
        
        return (
            <PropertyInput
                key={key}
                label={label}
                propKey={key as any}
                value={baseValue}
                baseValue={baseValue}
                inputType="text"
                ownerId={elementFromState.id}
            />
        );
      })}
    </div>
  );
};

export default ImagePropertiesSection;
