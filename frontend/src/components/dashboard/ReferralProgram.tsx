import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { useAuth } from '@/context/AuthContext';

const ReferralProgram = () => {
    const { user, convertPrice } = useAuth();
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [referredFriends, setReferredFriends] = useState<any[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);

    const [inviteEmail, setInviteEmail] = useState('');
    const [shareLoading, setShareLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        
        if (!inviteEmail.trim()) {
            setErrorMessage('Please enter a recipient email address.');
            return;
        }

        setShareLoading(true);
        try {
            const { data } = await api.post('/auth/referrals/share', { email: inviteEmail });
            if (data.success) {
                setSuccessMessage('Invitation email sent successfully!');
                setInviteEmail('');
            } else {
                setErrorMessage(data.message || 'Failed to send invitation. Please try again.');
            }
        } catch (err: any) {
            console.error('Error sending invite:', err);
            setErrorMessage(err.response?.data?.message || 'Failed to send invitation. Please try again.');
        } finally {
            setShareLoading(false);
        }
    };

    const referralCode = user?._id ? user._id.substring(user._id.length - 8) : '';
    const referralLink = typeof window !== 'undefined' 
        ? `${window.location.origin}/?ref=${referralCode}`
        : `/?ref=${referralCode}`;

    useEffect(() => {
        fetchReferrals();
        fetchReferredFriends();
    }, []);

    const fetchReferrals = async () => {
        try {
            const { data } = await api.get('/auth/loyalty/transactions');
            // Filter only referral rewards
            const refs = (data || []).filter((tx: any) => tx.type === 'referral');
            setHistory(refs);
        } catch (err) {
            console.error('Error fetching referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReferredFriends = async () => {
        try {
            const { data } = await api.get('/auth/referrals');
            setReferredFriends(data || []);
        } catch (err) {
            console.error('Error fetching referred friends:', err);
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const totalReferrals = history.length;
    const totalPointsEarned = history.reduce((sum, tx) => sum + (tx.points || 0), 0);
    const discountEarned = totalPointsEarned / 100;

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'inherit' }}>
            
            {/* Header / Intro */}
            <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                borderRadius: '16px',
                padding: '30px',
                boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.3)',
                marginBottom: '24px',
                textAlign: 'left'
            }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Refer & Earn Free Shopping Credit!</h1>
                <p style={{ margin: '10px 0 20px 0', fontSize: '14px', color: '#e0e7ff', opacity: 0.9 }}>
                    Invite your friends to shop. When they make their first purchase, you'll earn 500 Loyalty Points ($5.00) and they'll get exclusive offers!
                </p>
                
                {/* Share URL Row */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '12px', backdropFilter: 'blur(10px)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', fontSize: '13px', fontWeight: '600', color: '#fff', wordBreak: 'break-all' }}>
                        {referralLink}
                    </div>
                    <button 
                        onClick={handleCopy}
                        style={{
                            background: copied ? '#10b981' : '#fff',
                            color: copied ? '#fff' : '#4f46e5',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>

            {/* Invite via Email Card */}
            <div style={{
                background: '#fff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'left',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                marginBottom: '24px'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                    Invite Friends via Email
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                    Enter your friend's email address below to send them an invitation link with your referral code.
                </p>

                <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                    <input 
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '240px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        disabled={shareLoading}
                    />
                    <button 
                        type="submit"
                        disabled={shareLoading}
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: shareLoading ? 'not-allowed' : 'pointer',
                            opacity: shareLoading ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.2)'
                        }}
                    >
                        {shareLoading ? 'Sending...' : 'Send Invitation'}
                    </button>
                </form>

                {successMessage && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: '#e6f4ea',
                        color: '#137333',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}>
                        ✓ {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: '#fce8e6',
                        color: '#c5221f',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}>
                        ⚠ {errorMessage}
                    </div>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: '12px', padding: '20px', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Friends Invited</span>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: '4px 0 0 0' }}>{totalReferrals}</h2>
                </div>
                <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: '12px', padding: '20px', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Points Credited</span>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ff6600', margin: '4px 0 0 0' }}>{totalPointsEarned} pts</h2>
                </div>
                <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: '12px', padding: '20px', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Discount Earned</span>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#10b981', margin: '4px 0 0 0' }}>{convertPrice(discountEarned).formatted}</h2>
                </div>
            </div>

            {/* How It Works */}
            <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: '12px', padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>How does it work?</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ background: '#eef2f6', color: '#4f46e5', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>1</span>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Share Link</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                            Copy your unique invite link and share it on WhatsApp, Telegram, or social media.
                        </p>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ background: '#eef2f6', color: '#4f46e5', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>2</span>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Friend Shops</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                            Your friend clicks the link, signs up, and places an order on our retail store.
                        </p>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ background: '#eef2f6', color: '#4f46e5', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>3</span>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Get Credited!</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                            Once their payment goes through, 500 bonus points ($5.00 discount) will be credited to your account!
                        </p>
                    </div>
                </div>
            </div>

            {/* Referrals List */}
            <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Your Referrals History</h3>
                
                {loading ? (
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Loading referral logs...</p>
                ) : history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎁</div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>You haven't referred any friends yet. Start sharing your link to get credit!</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #eef2f6', color: '#64748b', fontWeight: '700' }}>
                                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Referral Detail</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Bonus Awarded</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(item => (
                                    <tr key={item._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '12px 8px', color: '#1e293b', fontWeight: '600' }}>
                                            {item.description || 'Friend signup & order completion'}
                                        </td>
                                        <td style={{ padding: '12px 8px', color: '#64748b' }}>
                                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#10b981', fontWeight: '800' }}>
                                            +{item.points} pts
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Referred Friends Section */}
            <div style={{ background: '#fff', border: '1px solid #eef2f6', borderRadius: '12px', padding: '24px', textAlign: 'left', marginTop: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Referred Friends Status</h3>
                
                {friendsLoading ? (
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Loading referred friends...</p>
                ) : referredFriends.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>No friends have registered using your link yet.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #eef2f6', color: '#64748b', fontWeight: '700' }}>
                                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Friend Name</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Email</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Joined Date</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>First Purchase</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referredFriends.map(friend => (
                                    <tr key={friend._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '12px 8px', color: '#1e293b', fontWeight: '600' }}>
                                            {friend.name}
                                        </td>
                                        <td style={{ padding: '12px 8px', color: '#64748b' }}>
                                            {friend.email}
                                        </td>
                                        <td style={{ padding: '12px 8px', color: '#64748b' }}>
                                            {new Date(friend.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                background: friend.hasOrdered ? '#e6f4ea' : '#f1f3f4',
                                                color: friend.hasOrdered ? '#137333' : '#5f6368'
                                            }}>
                                                {friend.hasOrdered ? 'Completed' : 'Pending Order'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ReferralProgram;
