
import React from 'react';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, TextElementProps, AnimationTrack, AnimatableProperty, AppAction } from '../../../types';
import { 
    SLIDER_CONFIGS, 
    DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_FONT_WEIGHT, DEFAULT_FONT_STYLE, 
    DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_VERTICAL_ALIGN, DEFAULT_TEXT_CONTENT,
    DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, DEFAULT_TEXT_DECORATION,
    FONT_WEIGHT_OPTIONS, FONT_STYLE_OPTIONS, TEXT_VERTICAL_ALIGN_OPTIONS, TEXT_ANCHOR_OPTIONS, // Added TEXT_ANCHOR_OPTIONS
    TEXT_WRAP_OPTIONS, TEXT_ALIGN_KONVA_OPTIONS, DEFAULT_TEXT_ALIGN_KONVA, DEFAULT_TEXT_WRAP
} from '../../../constants';
import { ChevronDownIconSolid, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon } from '../../icons/EditorIcons'; // Added AlignJustifyIcon
import FontFamilyPicker from './FontFamilyPicker';
// TextOnPathSection import removed as it's handled in PropertiesPanel via Accordion

interface TextPropertiesSectionProps {
  elementFromState: TextElementProps; 
  animatedElementProps: TextElementProps;
  animationTracksForSelected: AnimationTrack[];
  currentTime: number;
  onAddKeyframe: (elementId: string, property: AnimatableProperty, value: any) => void;
  onRemoveKeyframe: (elementId: string, property: AnimatableProperty, time: number) => void;
  dispatch: React.Dispatch<AppAction>;
  availablePathSources: SVGElementData[]; 
}

type SpecificTextPropKey = 
  | 'text' | 'fontSize' | 'fontFamily' | 'fontWeight' | 'fontStyle' 
  | 'textAnchor' | 'verticalAlign' | 'letterSpacing' | 'lineHeight' 
  | 'textPathId' | 'width' | 'height' | 'wrap' | 'align'; // Added wrap & align

const TextPropertiesSection: React.FC<TextPropertiesSectionProps> = ({
  elementFromState,
  animatedElementProps,
  animationTracksForSelected,
  currentTime,
  onAddKeyframe,
  onRemoveKeyframe,
  dispatch,
  availablePathSources, 
}) => {
  const textElement = elementFromState; 
  const animatedTextTypedProps = animatedElementProps;

  const handleStaticPropChange = (propKey: SpecificTextPropKey, value: string | number | null | undefined) => {
    dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: { [propKey]: value } } });
  };

  const handleTextDecorationChange = (decorationPart: 'underline' | 'line-through', isChecked: boolean) => {
    const currentDecorations = (animatedTextTypedProps.textDecoration || DEFAULT_TEXT_DECORATION).split(' ').filter(d => d && d !== 'none');
    let newDecorations = [...currentDecorations];

    if (isChecked) {
      if (!newDecorations.includes(decorationPart)) {
        newDecorations.push(decorationPart);
      }
    } else {
      newDecorations = newDecorations.filter(d => d !== decorationPart);
    }

    const finalDecorationString = newDecorations.length > 0 ? newDecorations.join(' ') : 'none';
    dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: { textDecoration: finalDecorationString } } });
  };
  
  const textSpecificPropsConfig: {
    key: SpecificTextPropKey; 
    label: string;
    inputType: 'text' | 'number' | 'select' | 'textarea' | 'custom'; 
    options?: { value: string; label: string }[];
    animatable?: boolean;
    customRender?: () => React.ReactNode;
  }[] = [
    { key: 'text', label: 'Text Content', inputType: 'textarea', animatable: true },
    // Width and Height are now in GeometrySection
    { key: 'fontSize', label: 'Font Size', inputType: 'number', animatable: true },
    { key: 'fontFamily', label: 'Font Family', inputType: 'custom', animatable: false, customRender: () => (
        <FontFamilyPicker
            value={animatedTextTypedProps.fontFamily || DEFAULT_FONT_FAMILY}
            onChange={(newFont) => handleStaticPropChange('fontFamily', newFont)}
        />
    )},
    { key: 'fontWeight', label: 'Font Weight', inputType: 'select', options: FONT_WEIGHT_OPTIONS, animatable: false },
    { key: 'fontStyle', label: 'Font Style', inputType: 'select', options: FONT_STYLE_OPTIONS, animatable: false },
    { key: 'letterSpacing', label: 'Letter Spacing', inputType: 'number', animatable: true },
    { key: 'lineHeight', label: 'Line Height (multiplier)', inputType: 'number', animatable: true },
    { key: 'wrap', label: 'Wrap Mode (Konva)', inputType: 'select', options: TEXT_WRAP_OPTIONS, animatable: false },
    { key: 'align', label: 'Alignment (Konva)', inputType: 'custom', animatable: false, customRender: () => {
        const currentAlign = animatedTextTypedProps.align || DEFAULT_TEXT_ALIGN_KONVA;
        const iconButtonClass = (isActive: boolean) => 
            `p-2 rounded ${isActive ? 'bg-sky-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`;
        return (
            <div className="flex space-x-1">
                <button onClick={() => handleStaticPropChange('align', 'left')} className={iconButtonClass(currentAlign === 'left')} title="Align Left"> <AlignLeftIcon size={18}/> </button>
                <button onClick={() => handleStaticPropChange('align', 'center')} className={iconButtonClass(currentAlign === 'center')} title="Align Center"> <AlignCenterIcon size={18}/> </button>
                <button onClick={() => handleStaticPropChange('align', 'right')} className={iconButtonClass(currentAlign === 'right')} title="Align Right"> <AlignRightIcon size={18}/> </button>
                <button onClick={() => handleStaticPropChange('align', 'justify')} className={iconButtonClass(currentAlign === 'justify')} title="Align Justify"> <AlignJustifyIcon size={18}/> </button>
            </div>
        );
    }},
    { key: 'textAnchor', label: 'Text Anchor (SVG)', inputType: 'select', options: TEXT_ANCHOR_OPTIONS, animatable: false },
    { key: 'verticalAlign', label: 'Vertical Align (Konva)', inputType: 'select', options: TEXT_VERTICAL_ALIGN_OPTIONS, animatable: false },
  ];

  const currentDecorationValue = animatedTextTypedProps.textDecoration || DEFAULT_TEXT_DECORATION;
  const isUnderlineActive = currentDecorationValue.includes('underline');
  const isLineThroughActive = currentDecorationValue.includes('line-through');

  return (
    <div className="space-y-1">
      {textSpecificPropsConfig.map(({ key, label, inputType, options, animatable, customRender }) => {
        const baseValForKey = textElement[key];
        let defaultForBase: string | number | undefined;

        switch (key) {
            case 'fontSize': defaultForBase = DEFAULT_FONT_SIZE; break;
            case 'text': defaultForBase = DEFAULT_TEXT_CONTENT; break;
            case 'fontFamily': defaultForBase = DEFAULT_FONT_FAMILY; break;
            case 'fontWeight': defaultForBase = DEFAULT_FONT_WEIGHT; break;
            case 'fontStyle': defaultForBase = DEFAULT_FONT_STYLE; break;
            case 'textAnchor': defaultForBase = DEFAULT_TEXT_ANCHOR; break;
            case 'verticalAlign': defaultForBase = DEFAULT_TEXT_VERTICAL_ALIGN; break;
            case 'letterSpacing': defaultForBase = DEFAULT_LETTER_SPACING; break;
            case 'lineHeight': defaultForBase = DEFAULT_LINE_HEIGHT; break;
            case 'width': defaultForBase = undefined; break; 
            case 'height': defaultForBase = undefined; break; 
            case 'wrap': defaultForBase = DEFAULT_TEXT_WRAP; break;
            case 'align': defaultForBase = DEFAULT_TEXT_ALIGN_KONVA; break;
            default: defaultForBase = typeof baseValForKey === 'number' ? 0 : ''; break;
        }
        
        const baseValueProp = baseValForKey ?? defaultForBase;
        const displayValueFromAnimated = animatedTextTypedProps[key];
        const displayValueProp = displayValueFromAnimated ?? baseValueProp;

        if (customRender) {
             return (
                <div key={key} className="mb-2 p-2 border border-gray-700/80 bg-gray-750 rounded-md shadow">
                    <label className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
                    {customRender()}
                </div>
            );
        }
        
        if (inputType === 'select' && options) {
          return (
            <div key={key} className="mb-2 p-2 border border-gray-700/80 bg-gray-750 rounded-md shadow">
              <label htmlFor={`${elementFromState.id}-${key}`} className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
              <div className="relative">
                <select
                  id={`${elementFromState.id}-${key}`}
                  value={String(displayValueProp || '')}
                  onChange={(e) => handleStaticPropChange(key, e.target.value)}
                  className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded-md focus:ring-sky-500 focus:border-sky-500 text-sm text-gray-100 appearance-none pr-7 custom-scrollbar"
                >
                  {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <ChevronDownIconSolid size={16} className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          );
        }
        
        return (
          <PropertyInput
            key={key}
            label={label}
            propKey={key as AnimatableProperty} 
            value={displayValueProp}
            baseValue={baseValueProp}
            inputType={inputType as 'text' | 'number' | 'textarea'}
            ownerId={elementFromState.id}
            onAddKeyframe={animatable ? onAddKeyframe : undefined}
            track={animatable ? animationTracksForSelected.find(t => t.property === key) : undefined}
            currentTime={animatable ? currentTime : undefined}
            onRemoveKeyframe={animatable ? onRemoveKeyframe : undefined}
            sliderConfig={SLIDER_CONFIGS[key as keyof typeof SLIDER_CONFIGS]}
          />
        );
      })}

      <div className="mb-2 p-2 border border-gray-700/80 bg-gray-750 rounded-md shadow">
        <span className="block text-xs font-medium text-gray-300 mb-1.5">Text Decoration</span>
        <div className="space-y-1.5">
            <label htmlFor={`${elementFromState.id}-textDecoration-underline`} className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="checkbox"
                    id={`${elementFromState.id}-textDecoration-underline`}
                    checked={isUnderlineActive}
                    onChange={(e) => handleTextDecorationChange('underline', e.target.checked)}
                    className="form-checkbox h-3.5 w-3.5 text-sky-500 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-offset-gray-800/50"
                />
                <span className="text-sm text-gray-200">Underline</span>
            </label>
            <label htmlFor={`${elementFromState.id}-textDecoration-linethrough`} className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="checkbox"
                    id={`${elementFromState.id}-textDecoration-linethrough`}
                    checked={isLineThroughActive}
                    onChange={(e) => handleTextDecorationChange('line-through', e.target.checked)}
                    className="form-checkbox h-3.5 w-3.5 text-sky-500 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-offset-gray-800/50"
                />
                <span className="text-sm text-gray-200">Line-through</span>
            </label>
        </div>
      </div>
    </div>
  );
};

export default TextPropertiesSection;
