import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Edit2, Check, X } from 'lucide-react';

const BatchDetail = () => {
    const { batchId } = useParams();
    const navigate = useNavigate();

    const [batch, setBatch] = useState(null);
    const [students, setStudents] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);

    // Add/Edit Student form state
    const [isAdding, setIsAdding] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        usn: '',
        gender: 'M',
        phone: '',
        email: '',
        is_present: true
    });

    const fetchData = () => {
        fetch(`http://127.0.0.1:8000/batches/${batchId}/`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setBatch(data.batch);
                    setStudents(data.students || []);
                } else {
                    console.error(data.error);
                }
            })
            .catch(err => console.error(err));
            
        fetch('http://127.0.0.1:8000/students/unassigned/')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setUnassignedStudents(data.students || []);
                }
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchData();
    }, [batchId]);

    const handleSaveStudent = (e) => {
        e.preventDefault();

        let url = 'http://127.0.0.1:8000/students/';
        let bodyPayload = { ...formData, batch_id: batchId };

        if (editingId) {
            url = `http://127.0.0.1:8000/students/${editingId}/edit/`;
        }

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchData();
                    setIsAdding(false);
                    setEditingId(null);
                    setFormData({ name: '', usn: '', gender: 'M', phone: '', email: '', is_present: true });
                } else {
                    alert(data.error);
                }
            });
    };

    const handleAssignExistingStudent = (studentId) => {
        fetch('http://127.0.0.1:8000/students/assign-to-batch/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, batch_id: batchId })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.error) {
                fetchData();
                setIsAssigning(false);
                setSearchQuery('');
            } else {
                alert(data.error);
            }
        });
    };

    const handleDeleteStudent = (studentId) => {
        if (!window.confirm("Are you sure you want to remove this student?")) return;

        // Use URL trailing slash matching standard Django conventions
        fetch(`http://127.0.0.1:8000/students/${studentId}/delete/`, {
            method: 'POST',
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchData();
                } else {
                    alert(data.error);
                }
            });
    };

    const startEdit = (student) => {
        setEditingId(student.id);
        setFormData({
            name: student.name,
            usn: student.usn,
            gender: student.gender,
            phone: student.phone || '',
            email: student.email || '',
            is_present: student.is_present
        });
        setIsAdding(true);
    };

    const cancelForm = () => {
        setIsAdding(false);
        setIsAssigning(false);
        setEditingId(null);
        setSearchQuery('');
        setFormData({ name: '', usn: '', gender: 'M', phone: '', email: '', is_present: true });
    };

    const filteredUnassigned = unassignedStudents.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.usn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!batch) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading batch details...</div>;
    }

    return (
        <div className="fade-in">
            <header className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => navigate('/batches')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>
                        {batch.batch_code} <span className="badge badge-gray" style={{ verticalAlign: 'middle', marginLeft: '8px' }}>{batch.department}</span>
                    </h1>
                    <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>{batch.batch_name}</p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <span className={`badge ${batch.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {batch.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Capacity: {batch.student_count || 0} / {batch.max_students}
                    </div>
                </div>
            </header>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>Assigned Students</h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {!isAssigning && !isAdding && (
                            <button className="btn btn-outline" onClick={() => setIsAssigning(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Assign Existing Student
                            </button>
                        )}
                        {!isAdding && !isAssigning && (
                            <button className="btn btn-primary" onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserPlus size={16} /> Create New Student
                            </button>
                        )}
                    </div>
                </div>

                {isAssigning && (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Assign Unassigned Student</h3>
                            <button className="btn btn-outline" onClick={cancelForm} style={{ padding: '4px 8px' }}><X size={16} /></button>
                        </div>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Type to search by Name or USN..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ marginBottom: '12px' }}
                            autoFocus
                        />
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--surface-border)', borderRadius: '6px', background: 'var(--surface-2)' }}>
                            {filteredUnassigned.length > 0 ? (
                                filteredUnassigned.map(s => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.usn}</div>
                                        </div>
                                        <button className="btn btn-primary" onClick={() => handleAssignExistingStudent(s.id)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                            Assign
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {unassignedStudents.length === 0 ? "No unassigned students found globally." : "No matching students found."}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isAdding && (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.05rem' }}>{editingId ? 'Edit Student' : 'Add New Student'}</h3>
                        <form onSubmit={handleSaveStudent}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-control" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Jane Doe" />
                                </div>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="form-label">USN</label>
                                    <input type="text" className="form-control" required value={formData.usn} onChange={e => setFormData({ ...formData, usn: e.target.value })} placeholder="e.g. 1AB23CS001" />
                                </div>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="form-label">Gender</label>
                                    <select className="form-control" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="e.g. jane@example.com" />
                                </div>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label className="form-label">Phone</label>
                                    <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="e.g. +1234567890" />
                                </div>
                                <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '12px', marginBottom: 0 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                        <input type="checkbox" checked={formData.is_present} onChange={e => setFormData({ ...formData, is_present: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                        Present for Allotment?
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Check size={16} /> Save Student
                                </button>
                                <button type="button" className="btn btn-outline" onClick={cancelForm} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <X size={16} /> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <table>
                    <thead>
                        <tr>
                            <th>USN</th>
                            <th>Name</th>
                            <th>Gender</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(s => (
                            <tr key={s.id}>
                                <td><strong>{s.usn}</strong></td>
                                <td>{s.name}</td>
                                <td>{s.gender}</td>
                                <td>
                                    <span className={`badge ${s.is_present ? 'badge-green' : 'badge-gray'}`}>
                                        {s.is_present ? 'Present' : 'Absent'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '6px', marginRight: '8px', color: 'var(--primary-color)' }}
                                        onClick={() => startEdit(s)}
                                        title="Edit Student"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '6px', color: 'red', borderColor: '#fecaca' }}
                                        onClick={() => handleDeleteStudent(s.id)}
                                        title="Remove Student"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No students have been assigned to this batch yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchDetail;
