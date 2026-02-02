
import React, { useState, useContext } from 'react';
import { SparklesIcon, ChatBubbleOvalLeftEllipsisIcon } from './icons/EditorIcons';
import { AppContext } from '../contexts/AppContext';

interface AiChatBubbleProps {
  onGenerateAiAnimation: () => void; 
}

const AiChatBubble: React.FC<AiChatBubbleProps> = ({
  onGenerateAiAnimation,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { aiPrompt, isAiLoading, aiError, selectedElementId, elements } = state;
  const selectedElement = elements.find(el => el.id === selectedElementId);

  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleAiPromptChange = (prompt: string) => {
    dispatch({ type: 'SET_AI_PROMPT', payload: prompt });
  };

  return (
    <>
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 p-3.5 bg-gradient-to-br from-[rgba(var(--accent-rgb),0.3)] to-[rgba(var(--accent-rgb),0.1)] text-[var(--accent-color)] rounded-full shadow-xl hover:from-[rgba(var(--accent-rgb),0.4)] hover:to-[rgba(var(--accent-rgb),0.2)] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--accent-rgb),0.5)] transition-all duration-200 ease-in-out transform hover:scale-110 z-50 glass-button !border-[var(--accent-color)] !shadow-[var(--highlight-glow)]`}
        title="AI Animation Copilot"
        aria-label="Toggle AI Animation Copilot"
        aria-expanded={isOpen}
      >
        <ChatBubbleOvalLeftEllipsisIcon size={28} />
        {aiError && !isOpen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
      </button>

      {isOpen && (
        <div 
            className="fixed bottom-24 right-6 w-80 md:w-96 glass-panel p-4 space-y-3 z-40 transform transition-all duration-300 ease-out origin-bottom-right animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-copilot-title"
        >
          <div className="flex justify-between items-center">
            <h4 id="ai-copilot-title" className="text-md font-semibold text-accent-color flex items-center">
              <SparklesIcon size={20} className="mr-2" />
              AI Animation Copilot
            </h4>
            <button onClick={toggleChat} className="text-text-secondary hover:text-text-primary p-1" aria-label="Close AI Copilot">&times;</button>
          </div>

          {!selectedElement ? (
            <p className="text-sm text-text-secondary">Select an element on the canvas to animate it with AI.</p>
          ) : (
            <>
              <label htmlFor="aiPromptBubble" className="block text-sm font-medium text-text-primary">
                Animate '{selectedElement.name || selectedElement.id.substring(0,15)}{selectedElement.id.length > 15 && !selectedElement.name ? '...' : ''}' ({selectedElement.type}):
              </label>
              <textarea
                id="aiPromptBubble"
                value={aiPrompt}
                onChange={(e) => handleAiPromptChange(e.target.value)}
                placeholder="e.g., 'spin 360 degrees, then fade out'"
                className="w-full p-2 glass-textarea min-h-[70px] custom-scrollbar"
                rows={3}
                disabled={isAiLoading}
                aria-describedby={aiError ? "ai-error-bubble" : undefined}
              />
              <button
                onClick={onGenerateAiAnimation}
                disabled={isAiLoading || !aiPrompt.trim() || !selectedElement}
                className="w-full flex items-center justify-center glass-button !bg-[rgba(var(--accent-rgb),0.15)] hover:!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color font-semibold"
              >
                {isAiLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-color" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon size={20} className="mr-2" />
                    Generate with AI
                  </>
                )}
              </button>
              {aiError && (
                <p id="ai-error-bubble" className="mt-2 text-sm text-red-300 bg-red-700/20 p-2 rounded-md border border-red-600/50" role="alert">
                  Error: {aiError}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AiChatBubble;