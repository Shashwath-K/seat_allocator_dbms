import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Mail, Briefcase, GraduationCap, X, Pencil, Trash2 } from 'lucide-react';

const Mentors = () => {
    const navigate = useNavigate();
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMentor, setEditMentor] = useState(null); // null = create, object = edit
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        mentor_code: '',
        department: '',
        email: ''
    });

    const fetchData = () => {
        setLoading(true);
        fetch('http://127.0.0.1:8000/mentors/')
            .then(res => res.json())
            .then(data => {
                setMentors(data.mentors || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching mentors:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const departments = useMemo(() => {
        const depts = new Set(mentors.map(m => m.department).filter(Boolean));
        return ['All', ...Array.from(depts).sort()];
    }, [mentors]);

    const filteredMentors = useMemo(() => {
        return mentors.filter(m => {
            const matchesSearch = 
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.mentor_code.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesDept = deptFilter === 'All' || m.department === deptFilter;
            
            return matchesSearch && matchesDept;
        });
    }, [mentors, searchTerm, deptFilter]);

    const handleCreate = (e) => {
        e.preventDefault();
        const isEdit = !!editMentor;
        const url = isEdit ? `http://127.0.0.1:8000/mentors/${editMentor.id}/` : 'http://127.0.0.1:8000/mentors/';
        const method = isEdit ? 'PUT' : 'POST';
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                setFormData({ name: '', mentor_code: '', department: '', email: '' });
                setIsModalOpen(false);
                setEditMentor(null);
                fetchData();
            }
        })
        .catch(err => alert('Failed to save mentor'));
    };

    const openEdit = (mentor, e) => {
        e.stopPropagation();
        setEditMentor(mentor);
        setFormData({ name: mentor.name, mentor_code: mentor.mentor_code, department: mentor.department || '', email: mentor.email || '' });
        setIsModalOpen(true);
    };

    const handleDelete = (mentor, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete mentor "${mentor.name}"? Their sessions will be unlinked.`)) return;
        fetch(`http://127.0.0.1:8000/mentors/${mentor.id}/delete/`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => { if (!data.error) fetchData(); else alert(data.error); })
            .catch(console.error);
    };

    return (
        <div className="fade-in">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Mentors</h1>
                    <p className="page-subtitle">Manage instructors and view their assignment schedules.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={18} /> Add New Mentor
                </button>
            </header>

            {/* Filters Bar */}
            <div className="card" style={{ marginBottom: 32, padding: '20px 24px' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: 48, background: 'rgba(0,0,0,0.02)' }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Filter size={18} style={{ color: 'var(--primary)' }} />
                        <select 
                            className="form-control" 
                            style={{ width: 200, background: 'rgba(0,0,0,0.02)' }}
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                        Showing <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{filteredMentors.length}</span> mentors
                    </div>
                </div>
            </div>

            {/* Mentors Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Mentor Name</th>
                                <th>Code</th>
                                <th>Department</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div className="fade-in">Loading mentors...</div>
                                    </td>
                                </tr>
                            ) : filteredMentors.length > 0 ? (
                                filteredMentors.map(mentor => (
                                    <tr 
                                        key={mentor.id} 
                                        onClick={() => navigate(`/mentors/${mentor.id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{ 
                                                    width: 40, height: 40, borderRadius: '12px', 
                                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', 
                                                    color: '#fff', display: 'flex', alignItems: 'center', 
                                                    justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem',
                                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                                                }}>
                                                    {mentor.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{mentor.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <code style={{ 
                                                background: 'rgba(79, 70, 229, 0.05)', 
                                                padding: '4px 8px', borderRadius: 6, 
                                                color: 'var(--primary)', fontWeight: 700,
                                                fontSize: '0.8125rem', border: '1px solid rgba(79, 70, 229, 0.1)'
                                            }}>{mentor.mentor_code}</code>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', fontWeight: 500 }}>
                                                <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                                                {mentor.department || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                <Mail size={14} />
                                                {mentor.email || '—'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
                                                    onClick={e => openEdit(mentor, e)}
                                                >
                                                    <Pencil size={14} style={{ marginRight: 4 }} />Edit
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ 
                                                        padding: '6px 12px', fontSize: '0.75rem', height: 'auto',
                                                        borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)'
                                                    }}
                                                    onClick={e => handleDelete(mentor, e)}
                                                >
                                                    <Trash2 size={14} style={{ marginRight: 4 }} />Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>No mentors found matching your criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Mentor Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
                    <div className="card fade-in" style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <GraduationCap color="var(--primary-color)" /> {editMentor ? 'Edit Mentor' : 'Add New Mentor'}
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); setEditMentor(null); setFormData({ name: '', mentor_code: '', department: '', email: '' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreate} style={{ padding: 24 }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="form-control" 
                                    placeholder="e.g. Dr. John Smith"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Mentor Code (Unique)</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="form-control" 
                                    placeholder="e.g. CS-001"
                                    value={formData.mentor_code}
                                    onChange={(e) => setFormData({ ...formData, mentor_code: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 16 }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Department</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="e.g. Computer Science"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Contact Email</label>
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        placeholder="e.g. john@uni.edu"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editMentor ? 'Update Mentor' : 'Create Mentor'}</button>
                                <button type="button" className="btn btn-outline" onClick={() => { setIsModalOpen(false); setEditMentor(null); setFormData({ name: '', mentor_code: '', department: '', email: '' }); }} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mentors;
