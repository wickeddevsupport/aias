import React, { useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../contexts/AppContext';

const ConfirmationDialog: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const { confirmationDialog } = state;
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (confirmationDialog?.onConfirm) {
      confirmationDialog.onConfirm();
    }
    dispatch({ type: 'HIDE_CONFIRMATION_DIALOG' });
  };

  const handleCancel = () => {
    dispatch({ type: 'HIDE_CONFIRMATION_DIALOG' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    if (confirmationDialog?.isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      dialogRef.current?.focus();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmationDialog?.isVisible]);

  if (!confirmationDialog?.isVisible) {
    return null;
  }

  const dialog = (
    <div className="confirmation-overlay" onClick={handleCancel} role="presentation">
      <div 
        ref={dialogRef}
        className="confirmation-dialog glass-panel" 
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        tabIndex={-1}
      >
        <h3 id="dialog-title" className="dialog-title">Confirmation</h3>
        <p id="dialog-message" className="dialog-message">{confirmationDialog.message}</p>
        <div className="dialog-actions">
          <button onClick={handleCancel} className="dialog-button glass-button cancel">Cancel</button>
          <button onClick={handleConfirm} className="dialog-button glass-button confirm">{confirmationDialog.confirmButtonText}</button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default ConfirmationDialog;
