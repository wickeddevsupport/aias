

import { AppState, AILogEntry, AppAction, SubReducerResult, AiPlan, AiPlanProgress, AiAgentSettings } from '../../types';

export function handleAddAiLog(state: AppState, payload: AILogEntry): SubReducerResult {
    // Append the new log and keep the last 100 entries for performance.
    const newLogs = [...state.aiLogs, payload].slice(-100); 
    return {
        updatedStateSlice: { aiLogs: newLogs },
        skipHistoryRecording: true,
    };
}

export function handleSetAiPlan(state: AppState, payload: AiPlan | null): SubReducerResult {
    return { updatedStateSlice: { aiPlan: payload }, skipHistoryRecording: true };
}

export function handleSetAiPlanProgress(state: AppState, payload: AiPlanProgress): SubReducerResult {
    return { updatedStateSlice: { aiPlanProgress: payload }, skipHistoryRecording: true };
}

export function handleClearAiPlan(state: AppState): SubReducerResult {
    return { updatedStateSlice: { aiPlan: null, aiPlanProgress: { status: 'idle', currentStepIndex: -1 }, aiLiveTargets: [], aiLiveActions: [] }, skipHistoryRecording: true };
}

export function handleSetAiAgentSettings(state: AppState, payload: Partial<AiAgentSettings>): SubReducerResult {
    return {
        updatedStateSlice: { aiAgentSettings: { ...state.aiAgentSettings, ...payload } },
        skipHistoryRecording: true,
    };
}

export function handleSetAiLiveTargets(state: AppState, payload: string[]): SubReducerResult {
    return { updatedStateSlice: { aiLiveTargets: payload }, skipHistoryRecording: true };
}

export function handleSetAiLiveActions(state: AppState, payload: AppAction[]): SubReducerResult {
    return { updatedStateSlice: { aiLiveActions: payload }, skipHistoryRecording: true };
}
