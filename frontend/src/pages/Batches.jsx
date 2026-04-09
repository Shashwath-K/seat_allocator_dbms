import React, { useState, useEffect } from 'react';
import { Plus, Users, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Batches = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('list');
    const [batches, setBatches] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        batch_name: '',
        batch_code: '',
        section: '',
        department: '',
        max_students: '',
        academic_year: '',
        semester: '1',
        start_date: '',
        end_date: '',
        extended_date: '',
        batch_status: 'upcoming',
        description: '',
        is_active: true
    });

    const fetchBatches = () => {
        fetch('http://127.0.0.1:8000/batches/')
            .then(res => res.json())
            .then(data => { if (data.batches) setBatches(data.batches); })
            .catch(err => console.error("Error fetching batches:", err));
    };

    useEffect(() => { fetchBatches(); }, []);

    const handleCreate = (e) => {
        e.preventDefault();
        fetch('http://127.0.0.1:8000/batches/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchBatches();
                    setActiveTab('list');
                    setFormData({
                        batch_name: '', batch_code: '', section: '', department: '',
                        max_students: '', academic_year: '', semester: '1',
                        start_date: '', end_date: '', extended_date: '',
                        batch_status: 'upcoming', description: '', is_active: true
                    });
                } else {
                    alert(data.error);
                }
            })
            .catch(err => console.error("Error creating batch:", err));
    };

    const statusColor = {
        ongoing:   { color: 'var(--success)', badge: 'badge-green' },
        upcoming:  { color: 'var(--accent)',  badge: 'badge-blue' },
        completed: { color: 'var(--text-muted)', badge: 'badge-gray' },
        suspended: { color: 'var(--danger)',  badge: 'badge-red' },
    };

    const filtered = batches.filter(b =>
        b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Batch Management</h1>
                <p className="page-subtitle">View and configure student cohorts.</p>
            </header>

            <div className="tabs">
                <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
                    <Users size={15} /> All Batches
                </button>
                <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                    <Plus size={15} /> Create New
                </button>
            </div>

            {activeTab === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Toolbar */}
                    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search batches…"
                                style={{ paddingLeft: 42 }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                            <Plus size={16} /> New Batch
                        </button>
                    </div>

                    {/* Batch Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {filtered.map(b => {
                            const sm = statusColor[b.batch_status] || statusColor.upcoming;
                            const pct = Math.min(((b.student_count || 0) / b.max_students) * 100, 100);
                            return (
                                <div
                                    key={b.id}
                                    className="card"
                                    onClick={() => navigate(`/batches/${b.id}`)}
                                    style={{ cursor: 'pointer', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: `3px solid ${sm.color}` }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.06em',
                                            color: 'var(--primary)', background: 'var(--primary-subtle)',
                                            padding: '4px 10px', borderRadius: 6,
                                            border: '1px solid rgba(249,115,22,0.2)'
                                        }}>
                                            {b.batch_code}
                                        </span>
                                        <span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`}>
                                            {b.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                                        {b.batch_name}
                                    </div>

                                    {b.department && (
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{b.department}</div>
                                    )}

                                    {/* Capacity bar */}
                                    <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            <span>Capacity</span>
                                            <span style={{ color: 'var(--text-sub)' }}>{b.student_count || 0} / {b.max_students}</span>
                                        </div>
                                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${pct}%`,
                                                background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                                                height: '100%',
                                                borderRadius: '3px',
                                                boxShadow: '0 0 8px rgba(249,115,22,0.4)',
                                                transition: 'width 0.8s ease'
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No batches found.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '620px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', color: 'var(--primary)' }}>Batch Details</h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label className="form-label">Batch Name</label>
                            <input type="text" className="form-control" required value={formData.batch_name} onChange={e => setFormData({ ...formData, batch_name: e.target.value })} placeholder="e.g. Computer Science Section A" />
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Batch Code</label>
                                <input type="text" className="form-control" required value={formData.batch_code} onChange={e => setFormData({ ...formData, batch_code: e.target.value })} placeholder="e.g. CS-A-24" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Section</label>
                                <input type="text" className="form-control" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} placeholder="e.g. A" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Department</label>
                                <input type="text" className="form-control" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Computer Science" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Max Students</label>
                                <input type="number" className="form-control" required value={formData.max_students} onChange={e => setFormData({ ...formData, max_students: e.target.value })} placeholder="e.g. 60" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Academic Year</label>
                                <input type="text" className="form-control" required value={formData.academic_year} onChange={e => setFormData({ ...formData, academic_year: e.target.value })} placeholder="e.g. 2024-25" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Semester</label>
                                <select className="form-control" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })}>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Start Date</label>
                                <input type="date" className="form-control" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">End Date</label>
                                <input type="date" className="form-control" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Extended Date</label>
                                <input type="date" className="form-control" value={formData.extended_date} onChange={e => setFormData({ ...formData, extended_date: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Batch Status</label>
                                <select className="form-control" value={formData.batch_status} onChange={e => setFormData({ ...formData, batch_status: e.target.value })}>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-sub)' }}>
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                                    Is Active
                                </label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description (Optional)</label>
                            <textarea className="form-control" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Internal notes…" style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button type="submit" className="btn btn-primary">Save Batch</button>
                            <button type="button" className="btn btn-outline" onClick={() => setActiveTab('list')}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Batches;
