

import { AppState, Asset, SvgAsset, ImageAsset, SubReducerResult, SVGElementData } from '../../types';
import { generateUniqueId, getNextOrderUtil } from '../appContextUtils';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';
import { DEFAULT_OPACITY, DEFAULT_ROTATION, DEFAULT_SCALE, DEFAULT_SKEW_X, DEFAULT_SKEW_Y } from '../../constants';

export function handleAddAsset(state: AppState, payload: Asset): SubReducerResult {
    const newAssets = [...state.assets, payload];
    return {
        updatedStateSlice: { assets: newAssets },
        skipHistoryRecording: true, // Asset management is not part of history
    };
}

export function handleDeleteAsset(state: AppState, payload: string): SubReducerResult {
    const assetIdToDelete = payload;
    const assetToDelete = state.assets.find(a => a.id === assetIdToDelete);
    if (!assetToDelete) {
        return { updatedStateSlice: {} }; // Asset not found, do nothing
    }

    const newAssets = state.assets.filter(asset => asset.id !== assetIdToDelete);
    
    // This action is purely for the asset library and doesn't affect the canvas history
    return {
        updatedStateSlice: { assets: newAssets },
        skipHistoryRecording: true,
    };
}

export function handleAddAssetFromLibrary(state: AppState, payload: { assetId: string, position: { x: number, y: number } }): SubReducerResult {
    const asset = state.assets.find(a => a.id === payload.assetId);
    if (!asset) return { updatedStateSlice: {} };

    if (asset.type === 'image') {
        const imageAsset = asset as ImageAsset;
        const newImageElement: SVGElementData = {
            id: generateUniqueId('image'),
            type: 'image',
            name: imageAsset.name,
            artboardId: state.artboard.id,
            parentId: null,
            order: getNextOrderUtil(state.elements, null, state.artboard.id),
            x: payload.position.x - imageAsset.width / 2, // Center on drop position
            y: payload.position.y - imageAsset.height / 2,
            width: imageAsset.width,
            height: imageAsset.height,
            href: imageAsset.dataUrl,
            opacity: DEFAULT_OPACITY,
            rotation: DEFAULT_ROTATION,
            scale: DEFAULT_SCALE,
            skewX: DEFAULT_SKEW_X,
            skewY: DEFAULT_SKEW_Y,
        };
        const newElements = [...state.elements, newImageElement];
        return {
            updatedStateSlice: { elements: newElements, selectedElementId: newImageElement.id },
            actionDescriptionForHistory: `Add Image Asset: ${imageAsset.name}`,
            newSvgCode: generateSvgStringForEditor(newElements, state.artboard),
        };
    }

    if (asset.type === 'svg') {
        const svgAsset = asset as SvgAsset;
        const { parsedElements, parsedArtboard } = svgAsset;

        const idMap = new Map<string, string>();
        
        // Generate new IDs for all imported elements
        parsedElements.forEach(el => idMap.set(el.id, generateUniqueId(el.type)));
        
        // Generate new IDs for defs
        const allDefs = [
            ...(parsedArtboard.defs?.gradients || []),
            ...(parsedArtboard.defs?.filters || []),
            ...(parsedArtboard.defs?.clipPaths || []),
            ...(parsedArtboard.defs?.masks || []),
        ];
        allDefs.forEach(def => idMap.set(def.id, generateUniqueId('def')));

        const wrapperGroupId = generateUniqueId('group');

        const newElements = parsedElements.map(el => {
            const newElement = JSON.parse(JSON.stringify(el));
            newElement.id = idMap.get(el.id)!;
            
            // Re-map parentId. If it's a top-level element in the SVG, its new parent is the wrapper group.
            if (el.parentId && idMap.has(el.parentId)) {
                newElement.parentId = idMap.get(el.parentId)!;
            } else {
                newElement.parentId = wrapperGroupId;
            }

            // Re-map any other ID references
            if (newElement.motionPathId && idMap.has(newElement.motionPathId)) {
                newElement.motionPathId = idMap.get(newElement.motionPathId)!;
            }
            if (newElement.clipPath && newElement.clipPath.startsWith('url(#')) {
                const oldId = newElement.clipPath.slice(5, -1);
                if (idMap.has(oldId)) newElement.clipPath = `url(#${idMap.get(oldId)!})`;
            }
            if (newElement.filter && newElement.filter.startsWith('url(#')) {
                const oldId = newElement.filter.slice(5, -1);
                if (idMap.has(oldId)) newElement.filter = `url(#${idMap.get(oldId)!})`;
            }
            if (newElement.mask && newElement.mask.startsWith('url(#')) {
                const oldId = newElement.mask.slice(5, -1);
                if (idMap.has(oldId)) newElement.mask = `url(#${idMap.get(oldId)!})`;
            }
             if (newElement.textPathId && idMap.has(newElement.textPathId)) {
                newElement.textPathId = idMap.get(newElement.textPathId)!;
            }

            return newElement;
        });

        // Create the wrapper group
        const wrapperGroup: SVGElementData = {
            id: wrapperGroupId,
            type: 'group',
            name: svgAsset.name,
            artboardId: state.artboard.id,
            parentId: null,
            order: getNextOrderUtil(state.elements, null, state.artboard.id),
            x: payload.position.x,
            y: payload.position.y,
            rotation: 0,
            scale: 1,
            opacity: 1,
            fill: 'none',
            skewX: DEFAULT_SKEW_X,
            skewY: DEFAULT_SKEW_Y,
        };

        // Re-map defs
        const remappedDefs = {
            gradients: (parsedArtboard.defs?.gradients || []).map(grad => ({ ...grad, id: idMap.get(grad.id)! })),
            filters: (parsedArtboard.defs?.filters || []).map(filter => ({ ...filter, id: idMap.get(filter.id)! })),
            clipPaths: (parsedArtboard.defs?.clipPaths || []).map(clip => ({ ...clip, id: idMap.get(clip.id)!, rawContent: clip.rawContent.replace(/url\(#([^)]+)\)/g, (match, oldId) => `url(#${idMap.get(oldId) || oldId})`) })),
            masks: (parsedArtboard.defs?.masks || []).map(mask => ({ ...mask, id: idMap.get(mask.id)! })),
        };
        
        // Deep merge new defs with existing defs, avoiding duplicates by ID
        const finalArtboard = { ...state.artboard, defs: {
            gradients: [...(state.artboard.defs?.gradients || []), ...remappedDefs.gradients],
            filters: [...(state.artboard.defs?.filters || []), ...remappedDefs.filters],
            clipPaths: [...(state.artboard.defs?.clipPaths || []), ...remappedDefs.clipPaths],
            masks: [...(state.artboard.defs?.masks || []), ...remappedDefs.masks],
        }};

        const finalElements = [...state.elements, wrapperGroup, ...newElements];
        
        return {
            updatedStateSlice: {
                elements: finalElements,
                artboard: finalArtboard,
                selectedElementId: wrapperGroupId,
            },
            actionDescriptionForHistory: `Add SVG Asset: ${svgAsset.name}`,
            newSvgCode: generateSvgStringForEditor(finalElements, finalArtboard),
        };
    }
    
    return { updatedStateSlice: {} };
}
