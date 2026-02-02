

import { AppState, AppAction, Artboard, SubReducerResult } from '../../types';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';

export function handleSetArtboardProps(state: AppState, payload: Partial<Artboard>): SubReducerResult {
    const nextArtboard = { ...state.artboard, ...payload };
    return {
        updatedStateSlice: { artboard: nextArtboard },
        actionDescriptionForHistory: `Update Artboard: ${Object.keys(payload).join(', ')}`,
        newSvgCode: generateSvgStringForEditor(state.elements, nextArtboard)
    };
}

export function handleUpdateArtboardPropsContinuous(state: AppState, payload: Partial<Artboard>): SubReducerResult {
    const nextArtboard = { ...state.artboard, ...payload };
    return {
        updatedStateSlice: { artboard: nextArtboard },
        newSvgCode: generateSvgStringForEditor(state.elements, nextArtboard),
        skipHistoryRecording: true
    };
}
