import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, MoreVertical } from 'lucide-react';
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
            .then(data => {
                if (data.batches) setBatches(data.batches);
            })
            .catch(err => console.error("Error fetching batches:", err));
    };

    useEffect(() => {
        fetchBatches();
    }, []);

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

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Batch Management</h1>
                <p className="page-subtitle">View and configure student cohorts.</p>
            </header>

            {/* Tabs separating CRUD operations */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    <Users size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    All Batches
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Create New Batch
                </button>
            </div>

            {activeTab === 'list' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search batches..."
                                style={{ paddingLeft: '38px' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                            <Plus size={16} /> New Batch
                        </button>
                    </div>

                    <div className="cards-grid">
                        {batches.filter(b =>
                            b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(b => (
                            <div
                                key={b.id}
                                className="card"
                                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                onClick={() => navigate(`/batches/${b.id}`)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)' }}>{b.batch_code}</h3>
                                    <span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`}>
                                        {b.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '12px', minHeight: '40px' }}>
                                    {b.batch_name}
                                </div>

                                <div style={{ marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                                        <span>Capacity</span>
                                        <strong>{b.student_count || 0} / {b.max_students}</strong>
                                    </div>
                                    <div style={{ width: '100%', background: '#edf2f7', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(((b.student_count || 0) / b.max_students) * 100, 100)}%`, background: 'var(--accent-color)', height: '100%' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {batches.filter(b =>
                        b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                No batches found matching your search.
                            </div>
                        )}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary-color)' }}>Batch Details</h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label className="form-label">Batch Name</label>
                            <input type="text" className="form-control" required value={formData.batch_name} onChange={e => setFormData({ ...formData, batch_name: e.target.value })} placeholder="e.g. Computer Science Section A" />
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Batch Code (Short)</label>
                                <input type="text" className="form-control" required value={formData.batch_code} onChange={e => setFormData({ ...formData, batch_code: e.target.value })} placeholder="e.g. CS-A-24" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Section</label>
                                <input type="text" className="form-control" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} placeholder="e.g. A" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Department</label>
                                <input type="text" className="form-control" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Computer Science" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Max Students</label>
                                <input type="number" className="form-control" required value={formData.max_students} onChange={e => setFormData({ ...formData, max_students: e.target.value })} placeholder="e.g. 60" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
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
                        <div style={{ display: 'flex', gap: '16px' }}>
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
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Batch Status</label>
                                <select className="form-control" value={formData.batch_status} onChange={e => setFormData({ ...formData, batch_status: e.target.value })}>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                    Is Active?
                                </label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description (Optional)</label>
                            <textarea className="form-control" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Internal notes..."></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
