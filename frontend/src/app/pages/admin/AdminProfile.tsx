import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';
import { getImgUrl } from '@/utils/imageConfig';
import { useToast } from '@/context/ToastContext';
import styles from './AdminProfile.module.css';

const AdminProfile = () => {
    const {  user, login , t } = useAuth();
    const { showToast } = useToast();
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        company_name: '',
        language: 'English',
        currency: 'USD'
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone_number: user.phone_number || '',
                company_name: user.company_name || '',
                language: user.language || 'English',
                currency: user.currency || 'USD'
            });
        }
    }, [user]);

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const { data } = await api.put('/auth/update-profile', formData);
            if (data.success) {
                login(data.user);
                showToast('Profile updated successfully!', 'success');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        setPasswordLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            showToast('Password changed successfully!', 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to change password', 'error');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_image', file);

        setImageLoading(true);
        try {
            const { data } = await api.put('/auth/update-profile-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (data.success) {
                login({ ...user, profile_image: data.profile_image });
                showToast('Profile image updated!', 'success');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload image', 'error');
        } finally {
            setImageLoading(false);
        }
    };

    return (
        <div className={styles['admin-profile-container']}>
            <div className={styles['profile-header-banner']}>
                <div className={styles['profile-cover']}></div>
                <div className={styles['profile-identity']}>
                    <div className={styles['profile-avatar-wrapper']}>
                        <div className={styles['profile-avatar-main']} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user?.profile_image ? (
                                <img 
                                    src={getImgUrl(user.profile_image)} 
                                    alt="Avatar" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <>{user?.first_name?.[0]}{user?.last_name?.[0]}</>
                            )}
                        </div>
                        <label className={styles['avatar-edit-btn']} style={{ cursor: 'pointer' }}>
                            <input 
                                type="file" 
                                hidden 
                                accept="image/*" 
                                onChange={handleImageUpload}
                                disabled={imageLoading}
                            />
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </label>
                    </div>
                    <div className={styles['profile-titles']}>
                        <h1>{user?.first_name} {user?.last_name}</h1>
                        <p className={styles['role-tag']}>
                            {user?.role_id ? (user.role_id.name || 'Sub Admin') : 'Super Administrator'}
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles['profile-content-grid']}>
                <div className={styles['profile-main-card']}>
                    <div className={styles['card-header']}>
                        <h2>Personal Information</h2>
                        <p>General account details and security settings</p>
                    </div>

                    <form onSubmit={handleProfileSubmit} className={styles['premium-form-grid']}>
                        <div className={styles['form-row']}>
                            <div className={styles['form-group']}>
                                <label>First Name</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} placeholder="John" required />
                            </div>
                            <div className={styles['form-group']}>
                                <label>Last Name</label>
                                <input type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} placeholder="Doe" required />
                            </div>
                        </div>

                        <div className={styles['form-group']}>
                            <label>Email Address</label>
                            <input type="email" name="email" value={formData.email} disabled className={styles['disabled-input']} />
                            <small>Account email cannot be changed manually for security reasons.</small>
                        </div>

                        <div className={styles['form-row']}>
                            <div className={styles['form-group']}>
                                <label>Phone Number</label>
                                <input type="text" name="phone_number" value={formData.phone_number} onChange={handleFormChange} placeholder="+1 (555) 000-0000" />
                            </div>
                            <div className={styles['form-group']}>
                                <label>Company / Organization</label>
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleFormChange} placeholder="Admin Corp" />
                            </div>
                        </div>

                        <div className={styles['form-actions']}>
                            <button type="submit" className={styles['save-btn']} disabled={profileLoading}>
                                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles['profile-side-stack']}>
                    <div className={styles['profile-main-card']}>
                        <div className={styles['card-header']}>
                            <h2>Security</h2>
                            <p>Update your account password</p>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className={styles['stack-form']}>
                            <div className={styles['form-group']}>
                                <label>Current Password</label>
                                <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required />
                            </div>
                            <div className={styles['form-group']}>
                                <label>New Password</label>
                                <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                            </div>
                            <div className={styles['form-group']}>
                                <label>Confirm New Password</label>
                                <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                            </div>
                            <button type="submit" className={styles['password-btn']} disabled={passwordLoading}>
                                {passwordLoading ? 'Updating...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    <div className={styles['profile-main-card'] + " " + styles['meta-info']}>
                        <h3>Account Presence</h3>
                        <div className={styles['meta-list']}>
                            <div className={styles['meta-item']}>
                                <span>Role</span>
                                <span className={styles['font-bold'] + " " + styles['text-slate-800'] + " " + styles['capitalize']}>
                                    {user?.role_id ? (user.role_id.name || 'Sub Admin') : (user?.role || 'admin')}
                                </span>
                            </div>
                            <div className={styles['meta-item']}>
                                <span>Status</span>
                                <span className={styles['status-indicator'] + " " + styles['active']}>Active</span>
                            </div>
                            <div className={styles['meta-item']}>
                                <span>Member Since</span>
                                <span className={styles['font-bold'] + " " + styles['text-slate-800']}>{new Date(user?.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
