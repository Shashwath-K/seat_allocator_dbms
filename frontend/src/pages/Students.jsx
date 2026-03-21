import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, Search, MoreVertical } from 'lucide-react';

const Students = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        usn: '',
        email: '',
        phone: '',
        gender: 'M',
        batch_id: '',
        is_present: true
    });

    const fetchStudents = () => {
        fetch('http://127.0.0.1:8000/students/')
            .then(res => res.json())
            .then(data => {
                if (data.students) setStudents(data.students);
            })
            .catch(err => console.error("Error fetching students:", err));
    };

    const fetchBatches = () => {
        fetch('http://127.0.0.1:8000/batches/')
            .then(res => res.json())
            .then(data => {
                if (data.batches) {
                    const activeBatches = data.batches.filter(b => b.is_active);
                    setBatches(activeBatches);
                }
            })
            .catch(err => console.error("Error fetching batches:", err));
    };

    useEffect(() => {
        fetchStudents();
        fetchBatches();
    }, []);

    const handleCreate = (e) => {
        e.preventDefault();
        fetch('http://127.0.0.1:8000/students/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchStudents();
                    setActiveTab('list');
                    setFormData({ name: '', usn: '', email: '', phone: '', gender: 'M', batch_id: '', is_present: true });
                } else {
                    alert(data.error);
                }
            })
            .catch(err => console.error("Error creating student:", err));
    };

    const handleDeleteStudent = (id, name) => {
        if (!window.confirm(`Delete student "${name}"? This cannot be undone.`)) return;
        fetch(`http://127.0.0.1:8000/students/${id}/delete/`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => { if (!data.error) fetchStudents(); else alert(data.error); })
            .catch(err => console.error(err));
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Student Roster</h1>
                <p className="page-subtitle">Manage student enrollment and assignments.</p>
            </header>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    <UserCheck size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    All Students
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Register Student
                </button>
            </div>

            {activeTab === 'list' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '320px' }}>
                            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by USN or Name..."
                                style={{ paddingLeft: 48, background: 'white' }}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                            Total: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{students.length}</span> students
                        </div>
                    </div>
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Student USN</th>
                                    <th>Full Name</th>
                                    <th>Batch Code</th>
                                    <th>Gender</th>
                                    <th>Presence</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students
                                    .filter(s =>
                                        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.usn.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <code style={{ 
                                                background: 'rgba(79, 70, 229, 0.05)', 
                                                padding: '4px 8px', borderRadius: 6, 
                                                color: 'var(--primary)', fontWeight: 700,
                                                fontSize: '0.8125rem'
                                            }}>{s.usn}</code>
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                                {s.batch__batch_code || '—'}
                                            </div>
                                        </td>
                                        <td>{s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : 'Other'}</td>
                                        <td>
                                            <span className={`badge ${s.is_present ? 'badge-green' : 'badge-gray'}`}>
                                                {s.is_present ? 'Present' : 'Absent'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn btn-outline"
                                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                                style={{ 
                                                    padding: '6px 10px', fontSize: '0.75rem', height: 'auto',
                                                    borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)',
                                                    background: 'white'
                                                }}
                                                title="Delete student"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No students found in database.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary-color)' }}>Student Identity</h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" required className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">USN (University Seat Number)</label>
                            <input type="text" required className="form-control" value={formData.usn} onChange={e => setFormData({ ...formData, usn: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Phone</label>
                                <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Batch Assignment</label>
                                <select className="form-control" value={formData.batch_id} onChange={e => setFormData({ ...formData, batch_id: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.id}>{b.batch_code} - {b.batch_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Gender</label>
                                <select className="form-control" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                <input type="checkbox" checked={formData.is_present} onChange={e => setFormData({ ...formData, is_present: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                Is Present?
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button type="submit" className="btn btn-primary">Save Student</button>
                            <button type="button" className="btn btn-outline" onClick={() => setActiveTab('list')}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Students;
