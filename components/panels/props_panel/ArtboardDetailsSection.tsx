import React from 'react';
import PropertyInput from '../../PropertyInput';
import { Artboard, AppAction } from '../../../types';
import { InformationCircleIcon } from '../../icons/EditorIcons';
import { SLIDER_CONFIGS } from '../../../constants'; 

interface ReadOnlyInfoFieldProps {
  label: string;
  value: string | number | undefined;
}
const ReadOnlyInfoField: React.FC<ReadOnlyInfoFieldProps> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-x-2 items-center py-1.5 text-xs">
      <span className="text-text-secondary col-span-1 truncate">{label}:</span>
      <span className="text-text-primary col-span-2 truncate" title={String(value)}>
        {value === undefined || value === null || value === '' ? '-' : String(value)}
      </span>
    </div>
  );
  
interface ArtboardDetailsSectionProps {
  artboardFromState: Artboard;
  dispatch: React.Dispatch<AppAction>;
}

const ArtboardDetailsSection: React.FC<ArtboardDetailsSectionProps> = ({
  artboardFromState,
  dispatch,
}) => {
  const otherArtboardProperties: { key: 'backgroundColor'; label: string; inputType: string }[] = [
    { key: 'backgroundColor', label: 'Background Color', inputType: 'color' },
  ];

  return (
    <div className="space-y-4">
      
      {/* --- Info Section --- */}
      <div>
        <ReadOnlyInfoField label="ID" value={artboardFromState.id} />
        <PropertyInput
            key="name"
            label="Name"
            propKey="name"
            value={artboardFromState.name}
            baseValue={artboardFromState.name}
            inputType="text"
            ownerId={artboardFromState.id}
            isArtboardProperty={true}
        />
      </div>

      <hr className="border-[var(--glass-border-color)] opacity-50" />
      
      {/* --- Dimensions Section --- */}
      <div>
        <h4 className="text-xs text-text-secondary uppercase tracking-wider mb-2">Dimensions</h4>
        <div className="space-y-1">
            <PropertyInput
                label="Width"
                propKey="width"
                value={artboardFromState.width}
                baseValue={artboardFromState.width}
                inputType="number"
                ownerId={artboardFromState.id}
                isArtboardProperty={true}
                sliderConfig={{min:1, max: 8000, step: 1}}
            />
            <PropertyInput
                label="Height"
                propKey="height"
                value={artboardFromState.height}
                baseValue={artboardFromState.height}
                inputType="number"
                ownerId={artboardFromState.id}
                isArtboardProperty={true}
                sliderConfig={{min:1, max: 8000, step: 1}}
            />
        </div>
      </div>

      <hr className="border-[var(--glass-border-color)] opacity-50" />

      {/* --- Appearance Section --- */}
      <div>
         <h4 className="text-xs text-text-secondary uppercase tracking-wider mb-2">Appearance</h4>
        {otherArtboardProperties.map(({ key, label, inputType }) => (
            <PropertyInput
                key={key}
                label={label}
                propKey={key}
                value={artboardFromState[key]}
                baseValue={artboardFromState[key]} 
                inputType={inputType}
                ownerId={artboardFromState.id}
                isArtboardProperty={true}
                sliderConfig={SLIDER_CONFIGS[key as keyof typeof SLIDER_CONFIGS]}
            />
        ))}
      </div>
      
      <hr className="border-[var(--glass-border-color)] opacity-50" />

      {/* --- Canvas Position Section --- */}
      <div>
         <h4 className="text-xs text-text-secondary uppercase tracking-wider mb-2">Canvas Position</h4>
        <ReadOnlyInfoField label="Canvas X (Pan)" value={artboardFromState.x.toFixed(0)} />
        <ReadOnlyInfoField label="Canvas Y (Pan)" value={artboardFromState.y.toFixed(0)} />
        <div className="mt-2 text-xs text-text-secondary p-2 bg-[rgba(var(--accent-rgb),0.03)] rounded-md border border-[var(--glass-border-color)]">
           <InformationCircleIcon size={14} className="mr-1.5 inline-block align-middle text-accent-color opacity-80" />
            Pan with Spacebar + Drag. Zoom with mouse wheel.
        </div>
      </div>
    </div>
  );
};

export default ArtboardDetailsSection;
