
import React, { useContext } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import PropertyInput from '../../PropertyInput';
import { SVGElementData, PathElementProps, RectElementProps, CircleElementProps, TextElementProps, ImageElementProps, AppAction } from '../../../types';

interface ReadOnlyInfoFieldProps {
  label: string;
  value: string | number | undefined;
  title?: string; 
}

const ReadOnlyInfoField: React.FC<ReadOnlyInfoFieldProps> = ({ label, value, title }) => (
  <div className="grid grid-cols-3 gap-x-2 items-center py-1.5 text-xs">
    <span className="text-text-secondary col-span-1 truncate" title={title || label}>{label}:</span>
    <span className="text-text-primary col-span-2 truncate" title={String(value)}>
      {value === undefined || value === null || value === '' ? '-' : String(value)}
    </span>
  </div>
);

interface ElementInfoSectionProps {
  elementFromState: SVGElementData;
  animatedElementProps: SVGElementData;
  allContextElements: SVGElementData[]; 
  animatedArtboardRelX?: number; 
  animatedArtboardRelY?: number; 
  dispatch: React.Dispatch<AppAction>;
  shapePathLength?: number;
}

const ElementInfoSection: React.FC<ElementInfoSectionProps> = ({
  elementFromState,
  animatedElementProps,
  allContextElements,
  animatedArtboardRelX,
  animatedArtboardRelY,
  dispatch,
  shapePathLength,
}) => {

  let anchorDescription = "Top-Left";
  if (elementFromState.type === 'circle') anchorDescription = "Center";
  else if (['path', 'group', 'text', 'image'].includes(elementFromState.type)) anchorDescription = "Local Origin (0,0)";


  return (
    <div className="space-y-1">
      <PropertyInput
        key={`${elementFromState.id}-name`}
        label="Name"
        propKey="name"
        value={String(animatedElementProps.name || elementFromState.name || '')}
        baseValue={String(elementFromState.name || '')}
        inputType="text"
        ownerId={elementFromState.id}
      />
      <ReadOnlyInfoField label="ID" value={elementFromState.id} />
      <ReadOnlyInfoField label="Type" value={elementFromState.type.charAt(0).toUpperCase() + elementFromState.type.slice(1)} />
      
      <ReadOnlyInfoField 
        label="Artboard X (Anchor)" 
        value={animatedArtboardRelX !== undefined ? animatedArtboardRelX.toFixed(1) : '-'} 
        title={`Absolute X of element's anchor (${anchorDescription}) on artboard`}
      />
      <ReadOnlyInfoField 
        label="Artboard Y (Anchor)" 
        value={animatedArtboardRelY !== undefined ? animatedArtboardRelY.toFixed(1) : '-'} 
        title={`Absolute Y of element's anchor (${anchorDescription}) on artboard`}
      />

      <ReadOnlyInfoField label="Parent" value={elementFromState.parentId ? (allContextElements.find(el => el.id === elementFromState.parentId)?.name || elementFromState.parentId) : "Artboard Root"} />
      <ReadOnlyInfoField label="Order" value={elementFromState.order} />
      
      {elementFromState.type === 'group' && (
        <ReadOnlyInfoField label="Children" value={allContextElements.filter(el => el.parentId === elementFromState.id).length} />
      )}
      
      {elementFromState.type === 'rect' && (<>
        <ReadOnlyInfoField label="Width (current)" value={(animatedElementProps as RectElementProps).width?.toFixed(1)} />
        <ReadOnlyInfoField label="Height (current)" value={(animatedElementProps as RectElementProps).height?.toFixed(1)} /> 
      </>)}
      {elementFromState.type === 'circle' && (<ReadOnlyInfoField label="Radius (current)" value={(animatedElementProps as CircleElementProps).r?.toFixed(1)} />)}
      
      {elementFromState.type === 'path' && shapePathLength !== undefined && (
        <ReadOnlyInfoField label="Path Length" value={shapePathLength.toFixed(1)} />
      )}
      
      {elementFromState.type === 'path' && (
        <div className="mt-2 pt-2 border-t border-[var(--glass-border-color)]">
          <label htmlFor={`isRendered-${elementFromState.id}`} className="flex items-center space-x-2 cursor-pointer group">
            <input type="checkbox" id={`isRendered-${elementFromState.id}`}
              checked={(elementFromState as PathElementProps).isRendered === undefined ? true : (elementFromState as PathElementProps).isRendered}
              onChange={(e) => dispatch({ type: 'UPDATE_ELEMENT_PROPS', payload: { id: elementFromState.id, props: { isRendered: e.target.checked } } })}
              className="form-checkbox h-4 w-4 text-accent-color bg-dark-bg-tertiary border-[var(--glass-border-color)] rounded focus:ring-accent-color focus:ring-offset-[var(--dark-bg-primary)] transition-colors"
            />
            <span className="text-sm text-text-primary group-hover:text-accent-color">Render Path</span>
          </label>
          <p className="text-xs text-text-secondary mt-1">If unchecked, path is not drawn on export, but visible as a guide in editor.</p>
        </div>
      )}

      {elementFromState.type === 'text' && (
        <>
          <ReadOnlyInfoField label="Font Family" value={(elementFromState as TextElementProps).fontFamily} />
          <ReadOnlyInfoField label="Font Size (current)" value={(animatedElementProps as TextElementProps).fontSize?.toFixed(1)} />
          <ReadOnlyInfoField label="Font Weight" value={(elementFromState as TextElementProps).fontWeight} />
          <ReadOnlyInfoField label="Font Style" value={(elementFromState as TextElementProps).fontStyle} />
          <ReadOnlyInfoField label="Text Anchor" value={(elementFromState as TextElementProps).textAnchor} />
        </>
      )}
       {elementFromState.type === 'image' && (
        <>
          <ReadOnlyInfoField label="Width (current)" value={(animatedElementProps as ImageElementProps).width?.toFixed(1)} />
          <ReadOnlyInfoField label="Height (current)" value={(animatedElementProps as ImageElementProps).height?.toFixed(1)} />
          <ReadOnlyInfoField label="Source (href)" value={(elementFromState as ImageElementProps).href} />
        </>
      )}
    </div>
  );
};

export default ElementInfoSection;