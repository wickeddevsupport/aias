import React, { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../contexts/AppContext';

const NewProjectDialog: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { newProjectDialogVisible } = state;
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const widthInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (newProjectDialogVisible) {
      setWidth(500);
      setHeight(500);
      // Focus the width input when dialog opens
      setTimeout(() => widthInputRef.current?.focus(), 100);
    }
  }, [newProjectDialogVisible]);

  if (!newProjectDialogVisible) {
    return null;
  }

  const handleCreate = () => {
    if (width > 0 && height > 0) {
      dispatch({ type: 'NEW_PROJECT', payload: { width, height } });
      dispatch({ type: 'HIDE_NEW_PROJECT_DIALOG' });
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'HIDE_NEW_PROJECT_DIALOG' });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleCreate();
    } else if (e.key === 'Escape') {
        handleCancel();
    }
  };

  const dialog = (
    <div className="confirmation-overlay" onClick={handleCancel} role="presentation">
      <div 
        className="confirmation-dialog glass-panel" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h3 id="dialog-title" className="dialog-title">New Project</h3>
        <p id="dialog-message" className="dialog-message">Set the dimensions for your new artboard. All unsaved work will be lost.</p>
        <div className="space-y-4 my-6">
            <div className="flex items-center justify-center space-x-4">
                <div>
                    <label htmlFor="artboard-width" className="text-sm font-medium text-text-secondary block mb-1 text-left">Width</label>
                    <input
                        ref={widthInputRef}
                        id="artboard-width"
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                        className="glass-input w-32 text-center"
                        min="1"
                    />
                </div>
                <span className="text-text-secondary mt-6 font-thin">&times;</span>
                <div>
                    <label htmlFor="artboard-height" className="text-sm font-medium text-text-secondary block mb-1 text-left">Height</label>
                    <input
                        id="artboard-height"
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                        className="glass-input w-32 text-center"
                        min="1"
                    />
                </div>
            </div>
        </div>
        <div className="dialog-actions">
          <button onClick={handleCancel} className="dialog-button glass-button cancel">Cancel</button>
          <button onClick={handleCreate} className="dialog-button glass-button confirm">Create Project</button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default NewProjectDialog;
