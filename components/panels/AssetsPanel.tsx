

import React, { useRef, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { Asset, ImageAsset, SvgAsset } from '../../types';
import { ImageIcon, DocumentArrowUpIcon as FileUp, PlusIcon, TrashIcon } from '../icons/EditorIcons';
import { parseSvgString } from '../../utils/svgParsingUtils';
import { generateUniqueId } from '../../contexts/appContextUtils';

const AssetsPanel: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { assets } = state;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const fileName = file.name;

      if (file.type === 'image/svg+xml') {
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (!content) return;
          try {
            const { elements, artboardOverrides, warnings } = parseSvgString(content, 'imported-svg');
            if (warnings.length > 0) {
              console.warn(`SVG import warnings for ${fileName}:`, warnings);
            }

            const thumbnailSrc = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(content)))}`;

            const svgAsset: SvgAsset = {
              id: generateUniqueId('asset-svg'),
              type: 'svg',
              name: fileName.replace(/\.svg$/i, ''),
              thumbnailSrc,
              rawContent: content,
              parsedArtboard: artboardOverrides,
              parsedElements: elements,
            };
            dispatch({ type: 'ADD_ASSET', payload: svgAsset });

          } catch (error) {
            console.error(`Failed to parse SVG ${fileName}:`, error);
          }
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) return;

          const img = new Image();
          img.onload = () => {
            const imageAsset: ImageAsset = {
              id: generateUniqueId('asset-img'),
              type: 'image',
              name: fileName,
              thumbnailSrc: dataUrl,
              dataUrl,
              width: img.width,
              height: img.height,
            };
            dispatch({ type: 'ADD_ASSET', payload: imageAsset });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddToCanvas = (assetId: string) => {
    dispatch({ type: 'ADD_ASSET_FROM_LIBRARY', payload: { assetId, position: { x: state.artboard.width / 2, y: state.artboard.height / 2 } } });
  };
  
  const handleDeleteAsset = (asset: Asset) => {
    dispatch({
        type: 'SHOW_CONFIRMATION_DIALOG',
        payload: {
            message: `Are you sure you want to delete the asset "${asset.name}"? This action cannot be undone.`,
            confirmButtonText: 'Delete Asset',
            onConfirm: () => {
                dispatch({ type: 'DELETE_ASSET', payload: asset.id });
                dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Asset "${asset.name}" deleted.`, type: 'info' } });
            },
        },
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ assetId: asset.id }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-3 space-y-3 h-full flex flex-col bg-transparent">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="text-lg font-semibold text-text-primary flex items-center">
          <ImageIcon size={22} className="mr-2 text-accent-color" />
          Assets
        </h3>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center glass-button !text-accent-color !bg-[rgba(var(--accent-rgb),0.1)] text-xs px-3 py-1.5">
          <FileUp size={14} className="mr-1.5" />
          Import
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileImport} multiple accept="image/*,.svg" className="hidden" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-[var(--glass-border-color)] pt-2">
        {assets.length === 0 ? (
          <div className="text-center text-sm text-text-secondary italic pt-8 px-4">
            Import images or SVGs to use in your project.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {assets.map(asset => (
              <div
                key={asset.id}
                className="group relative glass-panel !p-2 !rounded-lg overflow-hidden cursor-grab"
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                <div className="aspect-square bg-[rgba(var(--accent-rgb),0.02)] flex items-center justify-center rounded-md overflow-hidden">
                  <img src={asset.thumbnailSrc} alt={asset.name} className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-xs text-text-primary truncate mt-1.5 px-1" title={asset.name}>{asset.name}</p>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handleAddToCanvas(asset.id)}
                    className="p-2 rounded-full bg-[rgba(var(--accent-rgb),0.8)] text-dark-bg-primary hover:scale-110 transition-transform"
                    title="Add to Canvas"
                  >
                    <PlusIcon size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset)}
                    className="p-2 rounded-full bg-red-600/80 text-white hover:bg-red-500 hover:scale-110 transition-all"
                    title="Delete Asset"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetsPanel;
