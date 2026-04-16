import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './DownloadSelectionModal.css';
import { X, Download, CheckSquare, List, Hash } from 'lucide-react';

const DownloadSelectionModal = ({ show, onClose, onDownload, totalRows, selectedCount = 0 }) => {
  const [rowCount, setRowCount] = useState(Math.min(10, totalRows));
  const [downloadType, setDownloadType] = useState(selectedCount > 0 ? 'selected' : 'all');

  // Update download type if selectedCount changes
  useEffect(() => {
    if (selectedCount > 0 && downloadType !== 'selected') {
      setDownloadType('selected');
    } else if (selectedCount === 0 && downloadType === 'selected') {
      setDownloadType('all');
    }
  }, [selectedCount]);

  if (!show) return null;

  const handleDownload = () => {
    if (downloadType === 'all') {
      onDownload('all');
    } else if (downloadType === 'selected') {
      onDownload('selected');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={handleOverlayClick} style={{ zIndex: 99999 }}>
      <div className="download-modal-content">
        <div className="download-modal-header">
          <div className="download-modal-title-container">
            <div className="download-icon-bg">
              <Download size={20} className="text-blue-600" />
            </div>
            <h3 className="download-modal-title">Download Options</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="download-modal-body">
          <p className="download-modal-description">
            Choose which rows you want to export to Excel.
          </p>

          <div className="download-options-container">
            {selectedCount > 0 && (
              <div
                className={`download-option-card ${downloadType === 'selected' ? 'active' : ''}`}
                onClick={() => setDownloadType('selected')}
              >
                <div className="option-icon">
                  <CheckSquare size={18} className={downloadType === 'selected' ? 'text-blue-600' : 'text-gray-400'} />
                </div>
                <div className="option-details">
                  <span className="option-label">Download Selected Rows</span>
                  <span className="option-sublabel">Export only the {selectedCount} rows you've selected</span>
                </div>
                <div className="option-radio">
                  <div className={`radio-circle ${downloadType === 'selected' ? 'checked' : ''}`}></div>
                </div>
              </div>
            )}

            <div
              className={`download-option-card ${downloadType === 'all' ? 'active' : ''}`}
              onClick={() => setDownloadType('all')}
            >
              <div className="option-icon">
                <List size={18} className={downloadType === 'all' ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              <div className="option-details">
                <span className="option-label">Download All Rows</span>
                <span className="option-sublabel">Export all {totalRows} records</span>
              </div>
              <div className="option-radio">
                <div className={`radio-circle ${downloadType === 'all' ? 'checked' : ''}`}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="download-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="download-confirm-btn" onClick={handleDownload}>
            <Download size={16} />
            Download Excel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DownloadSelectionModal;
