
import { AppState, AppAction, Artboard } from '../../types';
import { generateSvgStringForEditor } from '../../utils/svgGenerationUtils';

export interface SubReducerResult {
    updatedStateSlice: Partial<AppState>;
    actionDescriptionForHistory?: string;
    newSvgCode?: string;
    skipHistoryRecording?: boolean;
}

export function handleSetArtboardProps(state: AppState, payload: Partial<Artboard>): SubReducerResult {
    const nextArtboard = { ...state.artboard, ...payload };
    return {
        updatedStateSlice: { artboard: nextArtboard },
        actionDescriptionForHistory: `Update Artboard: ${Object.keys(payload).join(', ')}`,
        newSvgCode: generateSvgStringForEditor(state.elements, nextArtboard)
    };
}
