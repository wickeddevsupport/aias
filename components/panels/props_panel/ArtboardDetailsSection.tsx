
import React from 'react';
import PropertyInput from '../../PropertyInput';
import { Artboard, AppAction } from '../../../types';
import { InformationCircleIcon } from '../../icons/EditorIcons';
import { SLIDER_CONFIGS } from '../../../constants'; 

type ArtboardEditablePropName = 'name' | 'width' | 'height' | 'backgroundColor';

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
  const artboardProperties: { key: ArtboardEditablePropName; label: string; inputType: string }[] = [
    { key: 'name', label: 'Name', inputType: 'text' },
    { key: 'width', label: 'Width (px)', inputType: 'number' },
    { key: 'height', label: 'Height (px)', inputType: 'number' },
    { key: 'backgroundColor', label: 'Background Color', inputType: 'color' },
  ];

  return (
    <div className="space-y-1">
        <ReadOnlyInfoField label="ID" value={artboardFromState.id} />
        {artboardProperties.map(({ key, label, inputType }) => {
            const currentValue = artboardFromState[key];
            return (
            <PropertyInput
                key={key}
                label={label}
                propKey={key}
                value={currentValue}
                baseValue={currentValue} 
                inputType={inputType}
                ownerId={artboardFromState.id}
                isArtboardProperty={true}
                sliderConfig={SLIDER_CONFIGS[key as keyof typeof SLIDER_CONFIGS]}
            />
            );
        })}
        <ReadOnlyInfoField label="Canvas X (Pan)" value={artboardFromState.x.toFixed(0)} />
        <ReadOnlyInfoField label="Canvas Y (Pan)" value={artboardFromState.y.toFixed(0)} />

        <div className="mt-3 p-2.5 text-xs text-text-secondary bg-[rgba(var(--accent-rgb),0.03)] rounded-lg border border-[var(--glass-border-color)]">
           <InformationCircleIcon size={14} className="mr-1.5 inline-block align-middle text-accent-color opacity-80" />
            Artboard X/Y control its canvas pan. Elements are relative to Artboard's top-left.
            Use mouse wheel to zoom, Spacebar + Drag to pan.
        </div>
    </div>
  );
};

export default ArtboardDetailsSection;