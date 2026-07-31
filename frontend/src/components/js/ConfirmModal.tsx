import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    type?: string;
}

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'danger' }: ConfirmModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                    <div className="modal-header border-0 pb-0">
                        <h5 className="modal-title fw-bold" style={{ color: '#111' }}>
                            {title || 'Confirmation Required'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>
                    <div className="modal-body py-4 text-center">
                        <p className="mb-0 text-secondary" style={{ fontSize: '15px', fontWeight: 500 }}>
                            {message || 'Are you sure you want to proceed?'}
                        </p>
                    </div>
                    <div className="modal-footer border-0 pt-0 flex-nowrap" style={{ gap: '10px' }}>
                        <button
                            type="button"
                            className="btn btn-light w-50 py-2 rounded-3 fw-bold"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`btn btn-${type} w-50 py-2 rounded-3 fw-bold`}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
