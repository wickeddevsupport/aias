
import React, { useState, useEffect, useContext } from 'react';
import { CodeBracketSquareIcon, InformationCircleIcon } from '../icons/EditorIcons';
import { AppContext } from '../../contexts/AppContext';

interface SvgCodeEditorPanelProps {
  disabled?: boolean;
}

const SvgCodeEditorPanel: React.FC<SvgCodeEditorPanelProps> = ({
  disabled = false,
}) => {
  const { state, dispatch } = useContext(AppContext);
  const { svgCode, svgCodeError } = state;
  
  const [editorContent, setEditorContent] = useState(svgCode);

  useEffect(() => {
    setEditorContent(svgCode);
  }, [svgCode]);

  const handleApply = () => {
    dispatch({ type: 'IMPORT_SVG_STRING', payload: editorContent });
  };

  return (
    <div className="p-3 h-full flex flex-col bg-transparent"> {/* Parent uses glass-panel */}
      <h3 className="text-lg font-semibold mb-2 text-text-primary flex items-center">
        <CodeBracketSquareIcon size={24} className="mr-2 text-accent-color" />
        SVG Code Editor
      </h3>
      <div className="mb-2 p-2.5 text-xs text-text-secondary bg-[rgba(var(--accent-rgb),0.03)] rounded-lg border border-[var(--glass-border-color)] flex items-start">
        <InformationCircleIcon size={18} className="mr-2 mt-0.5 flex-shrink-0 text-accent-color opacity-80" />
        <span>
          Edit the SVG code directly. Changes applied will update the canvas.
          Pasting new SVG code will replace current elements.
        </span>
      </div>
      <textarea
        value={editorContent}
        onChange={(e) => setEditorContent(e.target.value)}
        placeholder="Paste or edit SVG code here..."
        className="flex-1 w-full p-2.5 glass-textarea bg-[var(--dark-bg-secondary)] border-[var(--glass-border-color)] font-mono text-sm custom-scrollbar resize-none"
        spellCheck="false"
        disabled={disabled}
        aria-label="SVG Code Editor"
      />
      {svgCodeError && (
        <div className="mt-2 p-2 text-xs text-red-300 bg-red-700/20 border border-red-600/50 rounded-md" role="alert">
          <strong>Error:</strong> {svgCodeError}
        </div>
      )}
      <button
        onClick={handleApply}
        disabled={disabled || editorContent === svgCode}
        className="mt-3 w-full glass-button !bg-[rgba(var(--accent-rgb),0.15)] hover:!bg-[rgba(var(--accent-rgb),0.25)] !text-accent-color font-semibold"
      >
        Apply Code to Canvas
      </button>
    </div>
  );
};

export default SvgCodeEditorPanel;