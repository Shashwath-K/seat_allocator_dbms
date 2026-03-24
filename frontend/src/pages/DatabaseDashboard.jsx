import React, { useState, useEffect } from 'react';
import { DatabaseZap, Trash2, AlertTriangle, Edit } from 'lucide-react';

const Database = () => {
    const [activeView, setActiveView] = useState('batches');
    const [data, setData] = useState({ batches: [], students: [], rooms: [], allocations: [] });

    // Edit Modal State
    const [editingRecord, setEditingRecord] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const fetchData = () => {
        Promise.all([
            fetch('http://127.0.0.1:8000/batches/').then(r => r.json()),
            fetch('http://127.0.0.1:8000/students/').then(r => r.json()),
            fetch('http://127.0.0.1:8000/rooms/').then(r => r.json()),
            fetch('http://127.0.0.1:8000/allocations/').then(r => r.json())
        ]).then(([b, s, r, a]) => {
            setData({
                batches: b.batches || [],
                students: s.students || [],
                rooms: r.rooms || [],
                allocations: a.allocations || []
            });
        }).catch(err => console.error(err));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}? This cannot be undone.`)) return;

        let endpoint = `http://127.0.0.1:8000/${type}/${id}/delete/`;
        // Handle allocations reset if clearing all
        if (type === 'reset_allocations') endpoint = 'http://127.0.0.1:8000/reset-allocation/';

        fetch(endpoint, {
            method: type === 'reset_allocations' ? 'POST' : 'DELETE',
        })
            .then(res => res.json())
            .then(resData => {
                if (resData.error) alert(resData.error);
                else fetchData();
            })
            .catch(err => console.error(err));
    };

    const handleEditClick = (view, item) => {
        setEditingRecord({ view, id: item.id });
        setEditFormData(item);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const { view, id } = editingRecord;
        let payload = { ...editFormData };

        // Unmap the related fields back to foreign key IDs for typical Django updating if needed
        if (view === 'students' && payload.batch__id) {
            payload.batch_id = payload.batch__id;
        }

        fetch(`http://127.0.0.1:8000/${view}/${id}/edit/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else {
                    setEditingRecord(null);
                    fetchData();
                }
            });
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Database Management</h1>
                <p className="page-subtitle">Directly manage all SQL records and monitor data integrity.</p>
            </header>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
                    {['batches', 'students', 'rooms', 'allocations'].map(v => (
                        <button key={v} onClick={() => setActiveView(v)}
                            style={{
                                flex: 1, padding: '16px', background: 'transparent', border: 'none',
                                borderBottom: activeView === v ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeView === v ? 'var(--primary-color)' : 'var(--text-muted)',
                                fontWeight: activeView === v ? 600 : 500, cursor: 'pointer', textTransform: 'capitalize', transition: '0.2s'
                            }}>
                            {v} ({data[v].length})
                        </button>
                    ))}
                </div>

                <div style={{ padding: '24px' }}>
                    {activeView === 'allocations' && data.allocations.length > 0 && (
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" style={{ color: '#e53e3e', borderColor: '#e53e3e' }}
                                onClick={() => handleDelete('reset_allocations', 0)}>
                                <AlertTriangle size={16} style={{ marginRight: '8px' }} /> Reset Entire Schedule Matrix
                            </button>
                        </div>
                    )}

                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                {activeView === 'batches' && <><th>Batch Code</th><th>Name</th></>}
                                {activeView === 'students' && <><th>USN</th><th>Name</th><th>Batch Linked</th></>}
                                {activeView === 'rooms' && <><th>Room Name</th><th>Type</th><th>Capacity</th></>}
                                {activeView === 'allocations' && <><th>Student</th><th>Room & Seat</th><th>Dates</th></>}
                                <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data[activeView].map(item => (
                                <tr key={item.id}>
                                    <td>#{item.id}</td>

                                    {activeView === 'batches' && <>
                                        <td><strong>{item.batch_code}</strong></td>
                                        <td>{item.batch_name}</td>
                                    </>}

                                    {activeView === 'students' && <>
                                        <td><strong>{item.usn}</strong></td>
                                        <td>{item.name}</td>
                                        <td>{item.batch__batch_code || 'Unassigned'}</td>
                                    </>}

                                    {activeView === 'rooms' && <>
                                        <td><strong>{item.room_name}</strong></td>
                                        <td style={{ textTransform: 'capitalize' }}>{item.room_type}</td>
                                        <td>{item.capacity}</td>
                                    </>}

                                    {activeView === 'allocations' && <>
                                        <td><strong>{item.student_usn}</strong> ({item.student_name})</td>
                                        <td>{item.room_name} - Seat {item.seat_number}</td>
                                        <td>{item.start_date} to {item.end_date}</td>
                                    </>}

                                    <td style={{ textAlign: 'right' }}>
                                        {activeView !== 'allocations' && (
                                            <>
                                                <button onClick={() => handleEditClick(activeView, item)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', marginRight: '16px' }} title="Edit Record">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(activeView, item.id)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e53e3e' }} title="Delete Record">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data[activeView].length === 0 && (
                                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No records found in this table.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingRecord && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card fade-in" style={{ width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px' }}>Edit {editingRecord.view.slice(0, -1)} #{editingRecord.id}</h2>
                        <form onSubmit={handleEditSubmit}>
                            {editingRecord.view === 'batches' && (
                                <>
                                    <div className="form-group"><label className="form-label">Batch Code</label><input type="text" className="form-control" value={editFormData.batch_code || ''} onChange={e => setEditFormData({ ...editFormData, batch_code: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Batch Name</label><input type="text" className="form-control" value={editFormData.batch_name || ''} onChange={e => setEditFormData({ ...editFormData, batch_name: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Capacity</label><input type="number" className="form-control" value={editFormData.max_students || ''} onChange={e => setEditFormData({ ...editFormData, max_students: parseInt(e.target.value, 10) })} required /></div>
                                    <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-control" value={editFormData.start_date || ''} onChange={e => setEditFormData({ ...editFormData, start_date: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-control" value={editFormData.end_date || ''} onChange={e => setEditFormData({ ...editFormData, end_date: e.target.value })} /></div>
                                </>
                            )}

                            {editingRecord.view === 'students' && (
                                <>
                                    <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-control" value={editFormData.name || ''} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">USN</label><input type="text" className="form-control" value={editFormData.usn || ''} onChange={e => setEditFormData({ ...editFormData, usn: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={editFormData.email || ''} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} required /></div>
                                    <div className="form-group">
                                        <label className="form-label">Batch Linked</label>
                                        <select className="form-control" value={editFormData.batch__id || ''} onChange={e => setEditFormData({ ...editFormData, batch__id: e.target.value })}>
                                            <option value="">None</option>
                                            {data.batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {editingRecord.view === 'rooms' && (
                                <>
                                    <div className="form-group"><label className="form-label">Room Name</label><input type="text" className="form-control" value={editFormData.room_name || ''} onChange={e => setEditFormData({ ...editFormData, room_name: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Room Type</label>
                                        <select className="form-control" value={editFormData.room_type || ''} onChange={e => setEditFormData({ ...editFormData, room_type: e.target.value })} required>
                                            <option value="regular">Regular</option><option value="lab">Lab</option><option value="conference">Conference</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                                <button type="button" className="btn btn-outline" onClick={() => setEditingRecord(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Database;
