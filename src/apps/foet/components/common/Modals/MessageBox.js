import React from 'react';
import './MessageBox.css';

const MessageBox = ({ show, title, message, type, onClose, onConfirm }) => {
  if (!show) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(true);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onConfirm) {
      onConfirm(false);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Determine title and styling based on type
  const getTitleAndStyle = () => {
    switch(type) {
      case 'error':
        return { title: title || 'Notification', className: 'messagebox-error' };
      case 'success':
        return { title: title || 'Notification', className: 'messagebox-success' };
      case 'warning':
        return { title: title || 'Notification', className: 'messagebox-warning' };
      case 'info':
        return { title: title || 'Notification', className: 'messagebox-info' };
      case 'confirm':
        return { title: title || 'Please Confirm', className: 'messagebox-default' };
      default:
        return { title: title || 'Notification', className: 'messagebox-default' };
    }
  };

  const { title: displayTitle, className } = getTitleAndStyle();

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`messagebox-modal-content ${className}`}>
        <h3 className="messagebox-title">{displayTitle}</h3>
        <p className="messagebox-message">{message}</p>
        
        <div className="messagebox-buttons">
          {type === 'confirm' ? (
            <>
              <button 
                onClick={handleCancel}
                className="messagebox-btn messagebox-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className="messagebox-btn messagebox-btn-confirm"
              >
                OK
              </button>
            </>
          ) : (
            <button 
              onClick={handleConfirm}
              className="messagebox-btn messagebox-btn-ok"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBox;