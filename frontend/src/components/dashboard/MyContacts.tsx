import React from 'react';

const MyContacts = () => {
    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 120px)', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>

            {/* Left Pane */}
            <div style={{ width: '280px', borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    All contacts - 0 <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>

                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="Search your supplier contacts"
                        style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: '16px', border: '1px solid #e0e0e0', fontSize: '13px', background: 'transparent' }}
                    />
                    <svg style={{ position: 'absolute', right: '10px', top: '10px', color: '#999' }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '24px' }}>
                    Sort by contact time <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999', gap: '8px' }}>
                    <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="1.5"></circle><path strokeLinecap="round" strokeWidth="1.5" d="M12 16v-4m0-4h.01"></path></svg>
                    <span style={{ fontSize: '13px' }}>No Result</span>
                </div>
            </div>

            {/* Right Pane */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
                <p style={{ fontSize: '13px', color: '#666' }}>
                    Sorry, we could not find this contacts' information.
                </p>

                {/* Customer Service Button */}
                <button style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'var(--clr-accent)', color: 'white', border: 'none', borderRadius: '20px', padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(255, 106, 0, 0.3)' }}>
                    Customer service <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                </button>
            </div>
        </div>
    );
};

export default MyContacts;
