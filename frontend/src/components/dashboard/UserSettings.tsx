import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getImgUrl } from '@/utils/imageConfig';
import api from '@/services/axiosConfig';
import LogoutModal from '../js/LogoutModal';
import ConfirmModal from '../js/ConfirmModal';
import styles from './UserSettings.module.css';
import SecuritySettings from './SecuritySettings';

const UserSettings = () => {
    const { user, logout, login: authLogin, t } = useAuth();
    const navigate = useRouter();
    const [activeTab, setActiveTab] = useState('profile'); // profile, password, phone, security
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [countries, setCountries] = useState<any[]>([]);
    const [selectedCountry, setSelectedCountry] = useState('IN');

    // Form states
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        phone_number: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const EyeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    );

    const EyeOffIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
    );

    const maskEmail = (email: string) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        return `${name.substring(0, 3)}***@${domain}`;
    };

    useEffect(() => {
        if (user) {
            setProfileData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone_number: user.phone_number || ''
            });
        }
    }, [user]);

    useEffect(() => {
        api.get('/auth/countries').then(({ data }) => {
            setCountries(data);
            const userCountry = data.find((c: any) => user?.phone_number?.startsWith(c.dial_code));
            if (userCountry) setSelectedCountry(userCountry.code);
        }).catch(() => { });
    }, [user]);

    const handleSignOut = () => {
        logout();
        navigate.push('/login');
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await api.put('/auth/update-profile', profileData);
            if (data.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully' });
                // Update local context
                authLogin({ ...user, ...profileData });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return setMessage({ type: 'error', text: 'Passwords do not match' });
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ type: 'success', text: 'Password changed successfully' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Password change failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/auth/delete-account');
            setShowDeleteModal(false);
            logout();
            navigate.push('/');
        } catch (err) {
            alert('Failed to delete account');
        }
    };

    const handleImageUpload = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_image', file);

        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await api.put('/auth/update-profile-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (data.success) {
                authLogin({ ...user, profile_image: data.profile_image });
                setMessage({ type: 'success', text: 'Profile image updated!' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Upload failed' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className={styles['user-settings-container']} style={{ width: '100%', maxWidth: '100%' }}>
            <div className={styles['settings-profile-header']}>
                <div className={styles['profile-header-left']}>
                    <div className={styles['profile-avatar-large']}>
                        {user.profile_image ? (
                            <img 
                                src={getImgUrl(user.profile_image)} 
                                alt="Profile" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <>{user.first_name ? user.first_name[0].toUpperCase() : 'U'}</>
                        )}
                        <label className={styles['avatar-upload-overlay']}>
                            <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={loading} />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </label>
                    </div>
                    <div className={styles['profile-identity']}>
                        <h2 className={styles['user-full-name']}>{`${user.first_name || ''} ${user.last_name || ''}`}</h2>
                        <div className={styles['identity-details']}>
                            <div className={styles['id-item']}>
                                <span className={styles['id-label']}>{t('email')}</span>
                                <span className={styles['id-value']}>{maskEmail(user.email)}</span>
                            </div>
                            <div className={styles['id-item']}>
                                <span className={styles['id-label']}>{t('membership')}</span>
                                <span className={styles['id-value']} style={{ color: '#059669', fontWeight: 800 }}>{(user.roles?.includes('supplier') || user.role === 'supplier') ? t('verified_supplier') : t('verified_buyer')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles['profile-header-right']}>
                    <button className={styles['btn-settings-signout']} onClick={handleSignOut}>{t('sign_out')}</button>
                </div>
            </div>

            <div className={styles['settings-tabs-container']}>
                <button 
                    className={`${styles['tab-item']} ${activeTab === 'profile' ? styles['active'] : ''}`}
                    onClick={() => { setActiveTab('profile'); setMessage({type:'', text:''}); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>{t('edit_profile')}</span>
                </button>
                <button 
                    className={`${styles['tab-item']} ${activeTab === 'password' ? styles['active'] : ''}`}
                    onClick={() => { setActiveTab('password'); setMessage({type:'', text:''}); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span>{t('security_settings')}</span>
                </button>
                <button 
                    className={`${styles['tab-item']} ${activeTab === 'security' ? styles['active'] : ''}`}
                    onClick={() => { setActiveTab('security'); setMessage({type:'', text:''}); }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    <span>{t('account_access')}</span>
                </button>
            </div>

            <div className={styles['settings-content-container']}>
                <main className={styles['settings-content-area']}>
                    {activeTab === 'profile' && (
                        <div className={styles['settings-card'] + " " + styles['animate-fade-in']}>
                            <h3 className={styles['card-title']}>{t('personal_information')}</h3>
                            <p className={styles['card-subtitle']}>{t('personal_details_msg')}</p>
                            
                            <form className={styles['settings-form']} onSubmit={handleUpdateProfile}>
                                <div className={styles['form-row']}>
                                    <div className={styles['form-group']}>
                                        <label>{t('first_name')}</label>
                                        <input type="text" value={profileData.first_name} onChange={e => setProfileData({ ...profileData, first_name: e.target.value })} />
                                    </div>
                                    <div className={styles['form-group']}>
                                        <label>{t('last_name')}</label>
                                        <input type="text" value={profileData.last_name} onChange={e => setProfileData({ ...profileData, last_name: e.target.value })} />
                                    </div>
                                </div>
                                <div className={styles['form-group']}>
                                    <label>{t('phone_number')}</label>
                                    <div className={styles['form-group-phone']}>
                                        <select 
                                            value={selectedCountry} 
                                            onChange={e => setSelectedCountry(e.target.value)}
                                        >
                                            {countries.map(c => (
                                                <option key={c._id} value={c.code}>{c.dial_code} ({c.code})</option>
                                            ))}
                                            {countries.length === 0 && <><option value="IN">+91 (IN)</option><option value="US">+1 (US)</option></>}
                                        </select>
                                        <input 
                                            type="text" 
                                            value={profileData.phone_number} 
                                            onChange={e => setProfileData({ ...profileData, phone_number: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className={styles['form-actions']}>
                                    <button type="submit" className={styles['btn-save']} disabled={loading}>
                                        {loading ? t('loading') : t('save_changes')}
                                    </button>
                                </div>
                                {message.text && activeTab === 'profile' && <p className={`form-message ${message.type}`}>{message.text}</p>}
                            </form>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className={styles['settings-card'] + " " + styles['animate-fade-in']}>
                            <h3 className={styles['card-title']}>{t('security_credentials')}</h3>
                            <p className={styles['card-subtitle']}>{t('security_msg')}</p>
                            
                            <form className={styles['settings-form']} onSubmit={handleChangePassword}>
                                <div className={styles['form-group']} style={{ position: 'relative' }}>
                                    <label>{t('current_password')}</label>
                                    <input type={showCurrentPassword ? "text" : "password"} required value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
                                    <button type="button" className={styles['toggle-pw-settings']} onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                        {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                <div className={styles['form-group']} style={{ position: 'relative' }}>
                                    <label>{t('new_password')}</label>
                                    <input type={showNewPassword ? "text" : "password"} required value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                                    <button type="button" className={styles['toggle-pw-settings']} onClick={() => setShowNewPassword(!showNewPassword)}>
                                        {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                <div className={styles['form-group']} style={{ position: 'relative' }}>
                                    <label>{t('confirm_password')}</label>
                                    <input type={showConfirmPassword ? "text" : "password"} required value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                                    <button type="button" className={styles['toggle-pw-settings']} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                <div className={styles['form-actions']}>
                                    <button type="submit" className={styles['btn-save']} disabled={loading}>
                                        {loading ? t('loading') : t('update_password')}
                                    </button>
                                </div>
                                {message.text && activeTab === 'password' && <p className={`form-message ${message.type}`}>{message.text}</p>}
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className={styles['animate-fade-in']}>
                            <SecuritySettings />
                            
                            <div className={styles['settings-card']}>
                                <h3 className={styles['card-title']}>{t('account_management')}</h3>
                                <p className={styles['card-subtitle']}>{t('danger_zone_msg')}</p>
                                
                                <div className={styles['danger-zone']} style={{ marginTop: '20px', paddingTop: '20px' }}>
                                    <div className={styles['danger-item']}>
                                        <div className={styles['danger-info']} style={{ textAlign: 'left' }}>
                                            <h4>{t('delete_account')}</h4>
                                            <p>{t('delete_account_msg')}</p>
                                        </div>
                                        <button className={styles['btn-danger']} onClick={() => setShowDeleteModal(true)}>{t('delete_account')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <ConfirmModal 
                isOpen={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title="Delete Account"
                message="Are you sure you want to delete your account? This action cannot be undone and you will lose all your data."
                confirmText="Delete My Account"
                type="danger"
            />
        </div>
    );
};

export default UserSettings;
