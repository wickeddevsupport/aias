import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { SparklesIcon, UserIcon, BotIcon, CheckCircleIcon, XCircleIcon } from '../icons/EditorIcons';

interface MaestroPanelProps {
    onGenerateAiResponse: () => void;
}

const MaestroPanel: React.FC<MaestroPanelProps> = ({ onGenerateAiResponse }) => {
  const { state, dispatch } = useContext(AppContext);
  const { aiLogs, aiPrompt, isAiLoading, aiError, selectedElementId, elements, artboard, aiPlan, aiPlanProgress, aiAgentSettings, aiLiveActions, aiLiveTargets } = state;
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [aiLogs]);


  const getStatusIcon = (status: 'success' | 'error') => {
    if (status === 'success') {
      return <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />;
    }
    return <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />;
  };

  const handleAiPromptChange = (prompt: string) => {
    dispatch({ type: 'SET_AI_PROMPT', payload: prompt });
  };

  const updateAgentSettings = (payload: Partial<{ enabled: boolean; stepDelayMs: number; showTargets: boolean; showLiveActions: boolean }>) => {
    dispatch({ type: 'SET_AI_AGENT_SETTINGS', payload });
  };

  const clearLiveFeedback = () => {
    dispatch({ type: 'SET_AI_LIVE_ACTIONS', payload: [] });
    dispatch({ type: 'SET_AI_LIVE_TARGETS', payload: [] });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isAiLoading && aiPrompt.trim()) {
      e.preventDefault();
      onGenerateAiResponse();
    }
  };
  
  let selectedElementName = 'Artboard';
  if (selectedElementId && selectedElementId !== artboard.id) {
    const selectedElement = elements.find(el => el.id === selectedElementId);
    if (selectedElement) {
        selectedElementName = selectedElement.name || `Unnamed ${selectedElement.type}`;
    }
  }

  const agentSettings = aiAgentSettings || { enabled: true, stepDelayMs: 150, showTargets: true, showLiveActions: true };
  const currentPlanStepIndex = aiPlanProgress?.currentStepIndex ?? -1;
  const currentPlanStep = aiPlan?.steps?.[currentPlanStepIndex];
  const nextPlanStep = aiPlan?.steps?.[currentPlanStepIndex + 1];
  const currentActionTypes = currentPlanStep?.actions
    ? Array.from(new Set(currentPlanStep.actions.map(action => action.type))).slice(0, 5)
    : [];
  const liveActionCounts = aiLiveActions.reduce<Record<string, number>>((acc, action) => {
    acc[action.type] = (acc[action.type] || 0) + 1;
    return acc;
  }, {});
  const liveActionEntries = Object.entries(liveActionCounts).slice(0, 8);
  const liveTargetCount = aiLiveTargets.length;

  const toggleButtonClass = (isOn: boolean) =>
    `relative inline-flex items-center h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2 focus:ring-offset-[var(--dark-bg-secondary)] 
    ${isOn ? 'bg-[var(--glass-border-color)] border-b border-[var(--glass-border-color)] shadow-[0_0_10px_1px_rgba(var(--accent-rgb),0.7)]' : 'bg-gray-600 border-gray-500'}`;

  const toggleKnobClass = (isOn: boolean) =>
    `pointer-events-none inline-block h-4 w-4 transform rounded-full ${isOn ? 'bg-[var(--accent-color)]' : 'bg-gray-200'} shadow-lg ring-0 transition duration-200 ease-in-out ${isOn ? 'translate-x-4' : 'translate-x-0'}`;

  return (
    <div className="p-3 space-y-3 h-full max-h-[95%] flex flex-col bg-transparent">
      <h3 className="text-lg font-semibold text-text-primary flex items-center flex-shrink-0">
        <SparklesIcon size={22} className="mr-2 text-accent-color" />
        Vector Maestro
      </h3>
      <div className="flex-shrink-0 text-xs text-text-secondary border border-dashed border-[var(--glass-border-color)] p-2 rounded-md">
        <strong>Context:</strong> <span className="text-accent-color font-semibold">{selectedElementName}</span>
      </div>
      {/* Log Area */}
      <div ref={logContainerRef} className="flex-1 overflow-y-auto custom-scrollbar border-y border-[var(--glass-border-color)] py-2 space-y-4">
        {aiLogs.length === 0 ? (
          <div className="text-center text-sm text-text-secondary italic pt-8 px-4">
            Tell me what you want to create or animate! Try things like:
            <ul className="list-disc list-inside text-left mt-2 text-xs">
                <li>"create a bouncing red ball"</li>
                <li>"make a car drive across the screen"</li>
                <li>"change the animation duration to 20 seconds"</li>
            </ul>
          </div>
        ) : (
          aiLogs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className="space-y-3 animate-fade-in-up px-1">
              {/* User Prompt Bubble */}
              <div className="flex justify-end group">
                <div className="bg-[rgba(var(--accent-rgb),0.1)] text-text-primary p-2.5 rounded-lg rounded-br-none max-w-[85%] flex items-start space-x-2">
                    <p className="text-sm flex-grow">{log.prompt}</p>
                    <UserIcon className="w-4 h-4 text-accent-color flex-shrink-0 opacity-80 mt-0.5" />
                </div>
              </div>
              {/* AI Response Bubble */}
              <div className="flex justify-start group">
                <div className="bg-[rgba(var(--accent-rgb),0.03)] border border-[var(--glass-border-color)] p-2.5 rounded-lg rounded-bl-none max-w-[85%] flex items-start space-x-2">
                    <BotIcon className="w-5 h-5 text-accent-color flex-shrink-0 opacity-80" />
                    <div className="flex-grow">
                        <div className="flex items-center space-x-1.5 mb-1.5 text-text-placeholder text-xs">
                            {getStatusIcon(log.status)}
                            <span className={`font-semibold ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                Maestro {log.status === 'success' ? 'replied' : 'encountered an error'}
                            </span>
                            <span className="font-mono">at {log.timestamp}</span>
                        </div>
                        <p className={`text-sm ${log.status === 'error' ? 'text-red-300' : 'text-text-primary'}`}>{log.message}</p>
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Input Area */}
      <div className="flex-shrink-0 space-y-2">
        <textarea
          id="aiPromptPanel"
          value={aiPrompt}
          onChange={(e) => handleAiPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 'create a blue circle and make it bounce'"
          className="w-full p-2 glass-textarea min-h-[70px] custom-scrollbar"
          rows={3}
          disabled={isAiLoading}
          aria-describedby={aiError ? "ai-error-panel" : undefined}
        />
        <button
          onClick={onGenerateAiResponse}
          disabled={isAiLoading || !aiPrompt.trim()}
          className="w-full flex items-center justify-center glass-button !bg-[rgba(var(--accent-rgb),0.15)] hover:!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color font-semibold"
        >
          {isAiLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-color" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Thinking...
            </>
          ) : (
            <>
              <SparklesIcon size={20} className="mr-2" />
              Generate (Ctrl+Enter)
            </>
          )}
        </button>
        {aiError && (
          <p id="ai-error-panel" className="mt-2 text-sm text-red-300 bg-red-700/20 p-2 rounded-md border border-red-600/50" role="alert">
            {aiError}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 border border-[var(--glass-border-color)] rounded-md bg-[rgba(var(--accent-rgb),0.02)]">
        <button
          onClick={() => setIsToolsOpen(!isToolsOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
          type="button"
        >
          <span className="font-semibold text-accent-color">Agent Tools</span>
          <span className="text-[10px] text-text-placeholder">{isToolsOpen ? 'Hide' : 'Show'}</span>
        </button>
        {isToolsOpen && (
          <div className="px-3 pb-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold text-accent-color">Agent Controls</span>
              <button
                onClick={clearLiveFeedback}
                className="text-[10px] px-2 py-0.5 rounded border border-[var(--glass-border-color)] text-text-secondary hover:text-text-primary hover:border-[var(--glass-highlight-border)] transition-colors"
                type="button"
              >
                Clear Live
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Agent Mode</span>
                <button
                  onClick={() => updateAgentSettings({ enabled: !agentSettings.enabled })}
                  className={toggleButtonClass(agentSettings.enabled)}
                  role="switch"
                  aria-checked={agentSettings.enabled}
                  type="button"
                >
                  <span aria-hidden="true" className={toggleKnobClass(agentSettings.enabled)} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="ai-step-delay" className="text-text-secondary">Step Pace</label>
                <div className="flex items-center space-x-2">
                  <input
                    id="ai-step-delay"
                    type="range"
                    min={0}
                    max={800}
                    step={25}
                    value={agentSettings.stepDelayMs}
                    onChange={(e) => updateAgentSettings({ stepDelayMs: Number(e.target.value) })}
                    className="w-24 accent-accent-color"
                  />
                  <span className="text-[10px] text-text-placeholder">{agentSettings.stepDelayMs} ms</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Show Live Targets</span>
                <button
                  onClick={() => updateAgentSettings({ showTargets: !agentSettings.showTargets })}
                  className={toggleButtonClass(agentSettings.showTargets)}
                  role="switch"
                  aria-checked={agentSettings.showTargets}
                  type="button"
                >
                  <span aria-hidden="true" className={toggleKnobClass(agentSettings.showTargets)} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Show Live Actions</span>
                <button
                  onClick={() => updateAgentSettings({ showLiveActions: !agentSettings.showLiveActions })}
                  className={toggleButtonClass(agentSettings.showLiveActions)}
                  role="switch"
                  aria-checked={agentSettings.showLiveActions}
                  type="button"
                >
                  <span aria-hidden="true" className={toggleKnobClass(agentSettings.showLiveActions)} />
                </button>
              </div>
            </div>
            {aiPlan && (
              <div className="border border-[var(--glass-border-color)] rounded-md p-2 bg-[rgba(var(--accent-rgb),0.04)]">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold text-accent-color">Live Plan</span>
                  <div className="flex items-center space-x-2 text-[10px]">
                    {agentSettings.showTargets && (
                      <span className="text-text-placeholder">Targets: {liveTargetCount}</span>
                    )}
                    <span>{aiPlanProgress.status === 'running' ? 'Executing...' : aiPlanProgress.status === 'done' ? 'Done' : 'Idle'}</span>
                  </div>
                </div>
                <p className="text-xs text-text-primary mt-1">{aiPlan.summary}</p>
                <div className="mt-2 space-y-1">
                  {aiPlan.steps.map((step, index) => {
                    const isCurrent = index === currentPlanStepIndex;
                    const isCompleted = index < currentPlanStepIndex && aiPlanProgress.status !== 'error';
                    return (
                      <div key={step.id} className={`flex items-center justify-between text-xs p-1.5 rounded ${isCurrent ? 'bg-[rgba(var(--accent-rgb),0.12)] text-text-primary' : 'text-text-secondary'}`}>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex w-4 h-4 items-center justify-center rounded-full border ${isCompleted ? 'border-green-400 text-green-400' : isCurrent ? 'border-accent-color text-accent-color' : 'border-[var(--glass-border-color)] text-text-secondary'}`}>
                            {isCompleted ? 'OK' : index + 1}
                          </span>
                          <span className="font-medium">{step.title}</span>
                        </div>
                        <span className="text-[10px] text-text-placeholder">{step.actions?.length || 0} actions</span>
                      </div>
                    );
                  })}
                </div>
                {currentPlanStep && (
                  <div className="mt-2 text-xs text-text-secondary">
                    <strong>Now:</strong> {currentPlanStep.title}
                  </div>
                )}
                {currentActionTypes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {currentActionTypes.map(type => (
                      <span key={type} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(var(--accent-rgb),0.15)] text-accent-color">
                        {type}
                      </span>
                    ))}
                  </div>
                )}
                {nextPlanStep && (
                  <div className="text-xs text-text-placeholder">
                    <strong>Next:</strong> {nextPlanStep.title}
                  </div>
                )}
              </div>
            )}
            {agentSettings.showLiveActions && liveActionEntries.length > 0 && (
              <div className="border border-[var(--glass-border-color)] rounded-md p-2 bg-[rgba(var(--accent-rgb),0.03)]">
                <div className="text-xs text-text-secondary flex items-center justify-between">
                  <span className="font-semibold text-accent-color">Live Actions</span>
                  <span className="text-[10px] text-text-placeholder">{liveActionEntries.length} types</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {liveActionEntries.map(([type, count]) => (
                    <span key={type} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(var(--accent-rgb),0.12)] text-accent-color">
                      {type}{count > 1 ? ` x${count}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default MaestroPanel;
