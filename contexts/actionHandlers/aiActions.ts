

import { AppState, AILogEntry, AppAction, SubReducerResult } from '../../types';

export function handleAddAiLog(state: AppState, payload: AILogEntry): SubReducerResult {
    // Append the new log and keep the last 100 entries for performance.
    const newLogs = [...state.aiLogs, payload].slice(-100); 
    return {
        updatedStateSlice: { aiLogs: newLogs },
        skipHistoryRecording: true,
    };
}
