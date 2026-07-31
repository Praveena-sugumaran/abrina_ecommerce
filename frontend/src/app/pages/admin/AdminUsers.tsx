import React, { useState, useEffect } from 'react';
import api from '@/services/axiosConfig';
import { getImgUrl, getFlagUrl } from '@/utils/imageConfig';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import styles from './AdminLayout.module.css';


// ─── TYPES ──────────────────────────────────────────────────
interface Country {
    _id: string;
    name: string;
    code: string;
    dial_code: string;
    flag: string;
}

interface CountrySelectProps {
    value: string;
    countries: Country[];
    onChange: (country: Country) => void;
}

interface User {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    roles?: string[];
    status: string;
    company_name?: string;
    phone_number?: string;
    country_code?: string;
    business_type?: string[];
    state?: string;
    createdAt?: string;
    is_phone_verified?: boolean;
}

interface Role {
    _id: string;
    name: string;
}

interface BusinessType {
    _id: string;
    name: string;
    status: string;
}

interface State {
    _id: string;
    name: string;
}

// ─── CUSTOM COUNTRY SELECT COMPONENT ────────────────────────
const CountrySelect: React.FC<CountrySelectProps> = ({ value, countries, onChange }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    const selectedCountry = countries.find((c: Country) => c.code === value);
    const filteredCountries = countries.filter((c: Country) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.dial_code.includes(search)
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !(dropdownRef.current as any).contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className={styles['admin-country-select-container']} style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
            <div
                className={styles['admin-form-input']}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedCountry && <img src={getFlagUrl(selectedCountry.code)} alt="" style={{ width: '16px', height: '11px', borderRadius: '1px' }} onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => (e.target as HTMLImageElement).style.display = 'none'} />}
                    {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.dial_code}` : 'Code'}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
            </div>

            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '250px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--admin-border-subtle)', position: 'sticky', top: 0, background: '#fff' }}>
                        <input
                            autoFocus
                            className={styles['admin-form-input']}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div style={{ overflowY: 'auto' }}>
                        {filteredCountries.length === 0 ? (
                            <div style={{ padding: '10px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No matches</div>
                        ) : (
                            filteredCountries.map((c: Country) => (
                                <div
                                    key={c._id}
                                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', background: value === c.code ? '#f1f5f9' : 'transparent' }}
                                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.target as HTMLDivElement).style.background = '#f8fafc'}
                                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.target as HTMLDivElement).style.background = value === c.code ? '#f1f5f9' : 'transparent'}
                                    onClick={() => {
                                        onChange(c);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <img src={getFlagUrl(c.code)} alt="" style={{ width: '16px', height: '11px', borderRadius: '1px' }} onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        <span style={{ fontWeight: 600 }}>{c.flag} {c.dial_code}</span>
                                    </div>
                                    <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '11px' }}>({c.code})</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface AdminUsersProps {
    roleFilter?: string;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ roleFilter }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const { siteSettings, t, user: authUser } = useAuth();

    const currentUserRoles = authUser?.roles || (authUser?.role ? [authUser?.role] : []);
    const isSuperAdmin = currentUserRoles.includes('admin') && !authUser?.role_id;
    const userPerms = authUser?.permissions || [];
    
    const canCreate = isSuperAdmin || userPerms.includes('users.create');
    const canEdit = isSuperAdmin || userPerms.includes('users.edit');
    const canDelete = isSuperAdmin || userPerms.includes('users.delete');

    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [showAddUserPassword, setShowAddUserPassword] = useState(false);
    const [showEditUserPassword, setShowEditUserPassword] = useState(false);
    const [roleDropdownValue, setRoleDropdownValue] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(siteSettings?.pagination_limit || 10);

    useEffect(() => {
        if (siteSettings?.pagination_limit) {
            setItemsPerPage(siteSettings.pagination_limit);
        }
    }, [siteSettings?.pagination_limit]);

    const [editFormData, setEditFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'buyer',
        status: 'active',
        company_name: '',
        phone_number: '',
        country_code: '',
        business_type: [] as string[],
        state: '',
        is_phone_verified: false
    });


    const [newUserData, setNewUserData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: roleFilter || 'buyer',
        status: 'active',
        company_name: '',
        phone_number: '',
        country_code: '',
        business_type: [] as string[],
        state: ''
    });

    const [roles, setRoles] = useState<Role[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [statesLoading, setStatesLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchCountries();
        fetchBusinessTypes();
    }, [roleFilter]);

    const fetchBusinessTypes = async () => {
        try {
            const { data } = await api.get('/admin/business-types');
            setBusinessTypes((data || []).filter((t: BusinessType) => t.status === 'Active'));
        } catch (err: any) {
            console.error('Failed to fetch business types:', err);
        }
    };

    const fetchCountries = async () => {
        try {
            const { data } = await api.get('/common/countries');
            setCountries(data || []);
        } catch (err: any) {
            console.error('Failed to fetch countries:', err);
        }
    };

    const fetchStates = async (countryCode: string) => {
        if (!countryCode) {
            setStates([]);
            return;
        }
        setStatesLoading(true);
        try {
            const { data } = await api.get(`/auth/states/${countryCode}`);
            setStates(data || []);
        } catch (err: any) {
            console.error('Failed to fetch states:', err);
        } finally {
            setStatesLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const { data } = await api.get('/admin/roles');
            setRoles(data || []);
        } catch (err: any) {
            console.error('Failed to fetch roles:', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/auth/admin/users');
            // Filter by role if roleFilter is provided
            const filtered = roleFilter ? data.filter((u: User) => (u.roles || [u.role]).includes(roleFilter)) : data;
            setUsers(filtered);
            setLoading(false);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to fetch users', 'error');
            setLoading(false);
        }
    };

    // Fetch states when editing user country changes
    useEffect(() => {
        if (editFormData.country_code) {
            fetchStates(editFormData.country_code);
        }
    }, [editFormData.country_code]);

    // Fetch states when new user country changes
    useEffect(() => {
        if (newUserData.country_code) {
            fetchStates(newUserData.country_code);
        }
    }, [newUserData.country_code]);

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'buyer',
            status: user.status || 'active',
            company_name: user.company_name || '',
            phone_number: user.phone_number || '',
            country_code: user.country_code || '',
            business_type: user.business_type || [],
            state: user.state || '',
            is_phone_verified: !!user.is_phone_verified
        });
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!editingUser) return;
            await api.put(`/auth/admin/users/${editingUser._id}/status`, editFormData);
            setEditingUser(null);
            fetchUsers();
            showToast('User updated successfully!', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update user', 'error');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/admin/users', newUserData);
            setIsAddingUser(false);
            setNewUserData({
                first_name: '',
                last_name: '',
                email: '',
                password: '',
                role: roleFilter || 'buyer',
                status: 'active',
                company_name: '',
                phone_number: '',
                country_code: '',
                business_type: [],
                state: ''
            });
            fetchUsers();
            showToast('User created successfully!', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to create user', 'error');
        }
    };

    // Export CSV Handler
    const handleExportCSV = () => {
        if (!filteredUsers || filteredUsers.length === 0) {
            showToast('No user records to export', 'error');
            return;
        }
        const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Phone Number', 'Company Name', 'Created At'];
        const rows = filteredUsers.map((u: User) => [
            `"${u._id || ''}"`,
            `"${u.first_name || ''}"`,
            `"${u.last_name || ''}"`,
            `"${u.email || ''}"`,
            `"${u.role || ''}"`,
            `"${u.status || ''}"`,
            `"${u.phone_number || ''}"`,
            `"${u.company_name || ''}"`,
            `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}"`
        ]);

        const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exported users successfully!', 'success');
    };

    // Filter Logic
    const filteredUsers = users.filter((u: User) => {
        const matchesSearch =
            !searchTerm ||
            u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.phone_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDropdown = roleFilter ? true : (
            roleDropdownValue === 'All' || (u.roles || [u.role]).some((r: string) => r.toLowerCase() === roleDropdownValue.toLowerCase())
        );

        const matchesStatus = statusFilter === 'All' || (u.status || 'active').toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesDropdown && matchesStatus;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const stats = [
        { label: t('total_users') || 'Total Users', value: users.length, iconBg: '#fff5ee', iconColor: '#ff6a00', trend: '↑ 12.5%', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        { label: t('active') || 'Active Users', value: users.filter((u: User) => u.status === 'active').length, iconBg: '#f0fdf4', iconColor: '#16a34a', trend: '↑ 8.3%', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
        { label: t('suppliers') || 'Sellers', value: users.filter((u: User) => (u.roles || [u.role]).includes('supplier')).length, iconBg: '#f3e8ff', iconColor: '#9333ea', trend: '↑ 3.1%', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
        { label: t('buyers') || 'Buyers', value: users.filter((u: User) => (u.roles || [u.role]).includes('buyer')).length, iconBg: '#fff7ed', iconColor: '#ea580c', trend: '↑ 7.6%', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
    ];

    const title = roleFilter ? (roleFilter.toLowerCase() === 'supplier' ? 'Sellers' : (t(roleFilter.toLowerCase() + 's') || `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}s`)) : (t('user_management') || 'User Management');

    return (
        <div className={styles['usr-page-container']}>
            {/* Page Header */}
            <div className={styles['usr-header-row']}>
                <div>
                    <h1 className={styles['usr-page-title']}>{title}</h1>
                    <div className={styles['usr-breadcrumbs']}>
                        <span>Dashboard</span>
                        <span>›</span>
                        <span>{title}</span>
                    </div>
                </div>
                <div className={styles['usr-header-actions']}>
                    <button className={styles['usr-export-btn']} onClick={handleExportCSV}>
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export
                    </button>
                    {canCreate && (
                        <button className={styles['usr-add-btn']} onClick={() => setIsAddingUser(true)}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Add New User
                        </button>
                    )}
                </div>
            </div>

            {/* Stat Cards Grid (Only visible on All Users page) */}
            {!roleFilter && (
                <div className={styles['usr-stats-grid']}>
                    {stats.map((s, i) => (
                        <div key={i} className={styles['usr-stat-card']}>
                            <div className={styles['usr-stat-card-top']}>
                                <div className={styles['usr-stat-card-left']}>
                                    <div className={styles['usr-stat-icon-wrap']} style={{ background: s.iconBg, color: s.iconColor }}>
                                        {s.icon}
                                    </div>
                                    <div className={styles['usr-stat-info']}>
                                        <span className={styles['usr-stat-label']}>{s.label}</span>
                                        <span className={styles['usr-stat-value']}>{s.value}</span>
                                    </div>
                                </div>
                                <svg className={styles['usr-stat-sparkline']} viewBox="0 0 100 40" fill="none">
                                    <path d="M0 30 Q 25 10, 50 25 T 100 5" stroke={s.iconColor} strokeWidth="3" fill="none" />
                                </svg>
                            </div>
                            <div className={styles['usr-stat-badge']}>
                                <span className={styles['usr-stat-badge-success']}>{s.trend}</span>
                                <span className={styles['usr-stat-badge-sub']}>from last month</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Data Card */}
            <div className={styles['usr-main-card']}>
                {/* Search & Filter Bar */}
                <div className={styles['usr-filter-bar']}>
                    <div className={styles['usr-search-wrap']}>
                        <svg className={styles['usr-search-icon']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            className={styles['usr-search-input']}
                            placeholder="Search users by name, email, phone or company..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    {!roleFilter && (
                        <select
                            className={styles['usr-filter-select']}
                            value={roleDropdownValue}
                            onChange={(e) => { setRoleDropdownValue(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="All">All Roles</option>
                            <option value="Buyer">Buyers</option>
                            <option value="Supplier">Sellers</option>
                            <option value="Admin">Admins</option>
                        </select>
                    )}
                    <select
                        className={styles['usr-filter-select']}
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button
                        className={styles['usr-filter-btn']}
                        onClick={() => {
                            setSearchTerm('');
                            setRoleDropdownValue('All');
                            setStatusFilter('All');
                            setCurrentPage(1);
                            showToast('Filters reset', 'info');
                        }}
                    >
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        Filters
                    </button>
                </div>

                {/* Result Bar */}
                <div className={styles['usr-result-bar']}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} users
                </div>

                {/* Table */}
                <div className={styles['usr-table-wrap']}>
                    <table className={styles['usr-table']}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Account Type</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th>Joined On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Fetching user records...</td>
                                </tr>
                            ) : currentUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No users found matching your search.</td>
                                </tr>
                            ) : (
                                currentUsers.map((user: User) => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className={styles['usr-cell']}>
                                                <div className={styles['usr-avatar']}>
                                                    {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className={styles['usr-name']}>{user.first_name || 'User'} {user.last_name || ''}</div>
                                                    <div className={styles['usr-id']}>ID: {user._id.slice(-6).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles['usr-type-badge']}>
                                                {user.role === 'supplier' ? 'Seller' : user.role === 'buyer' ? 'Buyer' : user.role}
                                            </div>
                                            {user.company_name && (
                                                <div className={styles['usr-type-subtext']}>
                                                    {user.company_name}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles['usr-contact-email']}>{user.email}</div>
                                            {user.phone_number && roleFilter !== 'buyer' && (
                                                <div className={styles['usr-contact-meta']}>
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.29-2.29a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                    <span>{user.phone_number}</span>
                                                    {user.is_phone_verified ? (
                                                        <span className={styles['usr-verified-pill']}>✓ Verified</span>
                                                    ) : (
                                                        <span className={styles['usr-unverified-pill']}>Unverified</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles['usr-status-active']}>
                                                <span className={styles['dot']}></span>
                                                {user.status || 'Active'}
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }) : 'May 29, 2026'}
                                        </td>
                                        <td>
                                            <div className={styles['usr-actions-cell']}>
                                                {canEdit && (
                                                    <button className={styles['usr-icon-btn']} title="Edit user" onClick={() => handleEditUser(user)}>
                                                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button className={`${styles['usr-icon-btn']} ${styles['usr-icon-btn-delete']}`} title="Delete user" onClick={async () => {
                                                        if (window.confirm('Delete this user? This cannot be undone.')) {
                                                            try {
                                                                await api.delete(`/auth/admin/users/${user._id}`);
                                                                fetchUsers();
                                                                showToast('User deleted successfully!', 'success');
                                                            } catch (err: any) {
                                                                showToast('Failed to delete user', 'error');
                                                            }
                                                        }
                                                    }}>
                                                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className={styles['usr-pagination-bar']}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} users
                    </span>
                    <div className={styles['usr-pagination-pages']}>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles['usr-page-arrow']}>
                            ‹
                        </button>
                        {Array.from({ length: totalPages || 1 }).map((_, idx) => (
                            <button
                                key={idx}
                                className={`${styles['usr-page-num']} ${currentPage === idx + 1 ? styles['usr-active'] : ''}`}
                                onClick={() => setCurrentPage(idx + 1)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles['usr-page-arrow']}>
                            ›
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '600px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3>{t('edit_profile') || 'Edit Profile'}: {editingUser.first_name} {editingUser.last_name}</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setEditingUser(null)}>&times;</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <form onSubmit={handleSaveUser} className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('first_name') || 'First Name'}</label>
                                    <input
                                        className={styles['admin-form-input']}
                                        value={editFormData.first_name}
                                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('last_name') || 'Last Name'}</label>
                                    <input
                                        className={styles['admin-form-input']}
                                        value={editFormData.last_name}
                                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>Email Address</label>
                                    <input
                                        type="email"
                                        className={styles['admin-form-input']}
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>{t('password') || 'New Password'}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showEditUserPassword ? 'text' : 'password'}
                                            className={styles['admin-form-input']}
                                            style={{ paddingRight: '40px' }}
                                            placeholder="Leave blank to keep current password"
                                            value={editFormData.password || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0
                                            }}
                                        >
                                            {showEditUserPassword ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>{t('phone_number') || 'Phone Number'}</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <CountrySelect
                                            value={editFormData.country_code}
                                            countries={countries}
                                            onChange={(country) => {
                                                const current = editFormData.phone_number.replace(/^\+\d+\s?/, '');
                                                setEditFormData({
                                                    ...editFormData,
                                                    country_code: country.code,
                                                    phone_number: `${country.dial_code} ${current}`
                                                });
                                            }}
                                        />
                                        <input
                                            className={styles['admin-form-input']}
                                            style={{ flex: 1 }}
                                            value={editFormData.phone_number.replace(/^\+\d+\s?/, '')}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const country = countries.find((c: Country) => c.code === editFormData.country_code);
                                                setEditFormData({ ...editFormData, phone_number: country ? `${country.dial_code} ${val}` : val });
                                            }}
                                            placeholder="123 456 789"
                                        />
                                    </div>
                                </div>

                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('account_status') || 'Account Status'}</label>
                                    <select
                                        className={styles['admin-form-select']}
                                        value={editFormData.status}
                                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                    >
                                        <option value="active">{t('active') || 'Active'}</option>
                                        <option value="pending">{t('pending') || 'Pending'}</option>
                                        <option value="inactive">{t('inactive') || 'Inactive'}</option>
                                    </select>
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>Phone Verification Status</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="admin-user-phone-verified"
                                            checked={editFormData.is_phone_verified}
                                            onChange={(e) => setEditFormData({ ...editFormData, is_phone_verified: e.target.checked })}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="admin-user-phone-verified" style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                                            {editFormData.is_phone_verified ? 'Verified' : 'Unverified (Requires verification on registration)'}
                                        </label>
                                    </div>
                                </div>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', width: '100%', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                    <button
                                        type="button"
                                        style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}
                                        onClick={() => setEditingUser(null)}
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ padding: '10px 24px', border: 'none', borderRadius: '12px', background: '#ff6a00', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 4px 14px rgba(255, 106, 0, 0.3)' }}
                                    >
                                        Update Profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddingUser && (
                <div className={styles['admin-modal-overlay']}>
                    <div className={styles['admin-modal']} style={{ maxWidth: '600px' }}>
                        <div className={styles['admin-modal-header']}>
                            <h3>{t('create_new_user') || `Create New ${roleFilter ? roleFilter : 'User'}`}</h3>
                            <button className={styles['admin-modal-close']} onClick={() => setIsAddingUser(false)}>&times;</button>
                        </div>
                        <div className={styles['admin-modal-body']}>
                            <form onSubmit={handleAddUser} className={styles['admin-form-grid']}>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('first_name') || 'First Name'}</label>
                                    <input
                                        className={styles['admin-form-input']}
                                        placeholder="John"
                                        value={newUserData.first_name}
                                        onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles['admin-form-group']}>
                                    <label className={styles['admin-form-label']}>{t('last_name') || 'Last Name'}</label>
                                    <input
                                        className={styles['admin-form-input']}
                                        placeholder="Doe"
                                        value={newUserData.last_name}
                                        onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>{t('email_address') || 'Email Address'}</label>
                                    <input
                                        type="email"
                                        className={styles['admin-form-input']}
                                        placeholder="user@example.com"
                                        value={newUserData.email}
                                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>{t('phone_number') || 'Phone Number'}</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <CountrySelect
                                            value={newUserData.country_code}
                                            countries={countries}
                                            onChange={(country) => {
                                                const current = newUserData.phone_number.replace(/^\+\d+\s?/, '');
                                                setNewUserData({
                                                    ...newUserData,
                                                    country_code: country.code,
                                                    phone_number: `${country.dial_code} ${current}`
                                                });
                                            }}
                                        />
                                        <input
                                            className={styles['admin-form-input']}
                                            style={{ flex: 1 }}
                                            value={newUserData.phone_number.replace(/^\+\d+\s?/, '')}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const country = countries.find((c: Country) => c.code === newUserData.country_code);
                                                setNewUserData({ ...newUserData, phone_number: country ? `${country.dial_code} ${val}` : val });
                                            }}
                                            placeholder="123 456 789"
                                        />
                                    </div>
                                </div>

                                {newUserData.role === 'supplier' && (
                                    <>
                                        <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                            <label className={styles['admin-form-label']}>{t('company_name') || 'Company Name'}</label>
                                            <input
                                                className={styles['admin-form-input']}
                                                value={newUserData.company_name}
                                                onChange={(e) => setNewUserData({ ...newUserData, company_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                            <label className={styles['admin-form-label']}>{t('state_region') || 'State/Region'}</label>
                                            <select
                                                className={styles['admin-form-select']}
                                                value={newUserData.state}
                                                onChange={(e) => setNewUserData({ ...newUserData, state: e.target.value })}
                                                disabled={statesLoading || !newUserData.country_code}
                                            >
                                                <option value="">{statesLoading ? 'Loading states...' : 'Select State/Region'}</option>
                                                {states.map((s: State) => (
                                                    <option key={s._id} value={s.name}>{s.name}</option>
                                                ))}
                                                {states.length === 0 && !statesLoading && newUserData.country_code && (
                                                    <option value="Other">Other / Not Listed</option>
                                                )}
                                            </select>
                                        </div>
                                        <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                            <label className={styles['admin-form-label']}>{t('business_type') || 'Business Type'}</label>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                {businessTypes.map((type: BusinessType) => (
                                                    <label key={type._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={newUserData.business_type.includes(type.name)}
                                                            onChange={(e) => {
                                                                const newTypes = e.target.checked
                                                                    ? [...newUserData.business_type, type.name]
                                                                    : newUserData.business_type.filter((t: string) => t !== type.name);
                                                                setNewUserData({ ...newUserData, business_type: newTypes });
                                                            }}
                                                        /> {type.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>{t('password') || 'Password'}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showAddUserPassword ? 'text' : 'password'}
                                            className={styles['admin-form-input']}
                                            style={{ paddingRight: '40px' }}
                                            placeholder="••••••••"
                                            value={newUserData.password}
                                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                            required
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAddUserPassword(!showAddUserPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0
                                            }}
                                        >
                                            {showAddUserPassword ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                {!roleFilter && (
                                    <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                        <label className={styles['admin-form-label']}>{t('role') || 'Role'}</label>
                                        <select
                                            className={styles['admin-form-select']}
                                            value={newUserData.role}
                                            onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                                        >
                                            <option value="buyer">Buyer</option>
                                            <option value="supplier">Seller</option>
                                        </select>
                                    </div>
                                )}
                                <div className={styles['admin-form-group'] + " " + styles['full-width']}>
                                    <label className={styles['admin-form-label']}>{t('account_status') || 'Account Status'}</label>
                                    <select
                                        className={styles['admin-form-select']}
                                        value={newUserData.status}
                                        onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', width: '100%', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                    <button
                                        type="button"
                                        style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}
                                        onClick={() => setIsAddingUser(false)}
                                    >
                                        {t('cancel') || 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ padding: '10px 24px', border: 'none', borderRadius: '12px', background: '#ff6a00', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 4px 14px rgba(255, 106, 0, 0.3)' }}
                                    >
                                        {t('create_account') || 'Create Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;


