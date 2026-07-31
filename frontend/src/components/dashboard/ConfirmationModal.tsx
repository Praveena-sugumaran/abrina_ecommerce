import React from 'react';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: string;
}

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = "OK", 
    cancelText = "Cancel",
    variant = "primary"
}: ConfirmationModalProps) => {
    if (!isOpen) return null;

    return (
        <div className={styles['confirm-modal-overlay']}>
            <div className={styles['confirm-modal-content']}>
                <div className={styles['confirm-modal-header']}>
                    <h3>{title || "Confirm Action"}</h3>
                    <button className={styles['confirm-modal-close']} onClick={onClose}>&times;</button>
                </div>
                <div className={styles['confirm-modal-body']}>
                    <p>{message}</p>
                </div>
                <div className={styles['confirm-modal-footer']}>
                    <button className={styles['btn-confirm-cancel']} onClick={onClose}>
                        {cancelText}
                    </button>
                    <button 
                        className={`${styles['btn-confirm-ok']} ${styles[variant] || ''}`} 
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
