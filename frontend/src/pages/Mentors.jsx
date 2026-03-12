import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, User, Mail, Briefcase, GraduationCap, X } from 'lucide-react';

const Mentors = () => {
    const navigate = useNavigate();
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
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
        fetch('http://127.0.0.1:8000/mentors/', {
            method: 'POST',
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
                fetchData();
            }
        })
        .catch(err => alert('Failed to create mentor'));
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
            <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: 40 }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Filter size={18} color="var(--primary-color)" />
                        <select 
                            className="form-control" 
                            style={{ width: 180 }}
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Showing <strong>{filteredMentors.length}</strong> mentors
                    </div>
                </div>
            </div>

            {/* Mentors Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Mentor Name</th>
                            <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Code</th>
                            <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Department</th>
                            <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                            <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading mentors...</td>
                            </tr>
                        ) : filteredMentors.length > 0 ? (
                            filteredMentors.map(mentor => (
                                <tr 
                                    key={mentor.id} 
                                    className="table-row-hover"
                                    onClick={() => navigate(`/mentors/${mentor.id}`)}
                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                >
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                                                {mentor.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{mentor.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: 'var(--primary-color)' }}>{mentor.mentor_code}</code>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Briefcase size={14} color="var(--text-muted)" />
                                            {mentor.department || 'N/A'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Mail size={14} />
                                            {mentor.email || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                        <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>View Details</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No mentors found matching your criteria.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Mentor Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
                    <div className="card fade-in" style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <GraduationCap color="var(--primary-color)" /> Add New Mentor
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
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
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Mentor</button>
                                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mentors;
