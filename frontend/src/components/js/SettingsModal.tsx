import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const {
        language,
        currency,
        availableLanguages,
        availableCurrencies,
        updateUserSettings,
        t
    } = useAuth();

    const [tempLanguage, setTempLanguage] = useState(language);
    const [tempCurrency, setTempCurrency] = useState(currency);

    useEffect(() => {
        setTempLanguage(language);
        setTempCurrency(currency);
    }, [language, currency, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        await updateUserSettings(tempLanguage, tempCurrency);
        onClose();
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h3>{t('set_lang_curr') || 'Set language and currency'}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="settings-modal-body">
                    <p className="subtitle">{t('select_pref_lang_curr') || 'Select your preferred language and currency. You can update the settings at any time.'}</p>

                    <div className="form-group">
                        <label>{t('language') || 'Language'}</label>
                        <select
                            value={tempLanguage}
                            onChange={(e) => setTempLanguage(e.target.value)}
                            className="settings-select"
                        >
                            {availableLanguages.map(lang => (
                                <option key={lang.code} value={lang.name}>
                                    {lang.name} {lang.native_name && `(${lang.native_name})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>{t('currency') || 'Currency'}</label>
                        <select
                            value={tempCurrency}
                            onChange={(e) => setTempCurrency(e.target.value)}
                            className="settings-select"
                        >
                            {availableCurrencies.map(curr => (
                                <option key={curr.code} value={curr.code}>
                                    {curr.code} - {curr.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button className="btn-save-settings" onClick={handleSave}>{t('save') || 'Save'}</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
