import React, { useState, useEffect } from 'react';
import { DatabaseZap, Trash2, AlertTriangle, Edit, RefreshCw } from 'lucide-react';

const Database = () => {
    const [activeView, setActiveView] = useState('batches');
    const [data, setData] = useState({ batches: [], students: [], rooms: [], allocations: [] });

    const [editingRecord, setEditingRecord] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const fetchData = () => {
        Promise.all([
            fetch('http://127.0.0.1:8000/batches/').then(r => r.json()),
            fetch('http://127.0.0.1:8000/students/').then(r => r.json()),
            fetch('http://127.0.0.1:8000/rooms/').then(r => r.json()),
            fetch('http://127.0.0.1:8000/allocations/').then(r => r.json())
        ]).then(([b, s, r, a]) => {
            setData({ batches: b.batches || [], students: s.students || [], rooms: r.rooms || [], allocations: a.allocations || [] });
        }).catch(err => console.error(err));
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}? This cannot be undone.`)) return;
        let endpoint = `http://127.0.0.1:8000/${type}/${id}/delete/`;
        if (type === 'reset_allocations') endpoint = 'http://127.0.0.1:8000/reset-allocation/';
        fetch(endpoint, { method: type === 'reset_allocations' ? 'POST' : 'DELETE' })
            .then(res => res.json())
            .then(resData => { if (resData.error) alert(resData.error); else fetchData(); })
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
        if (view === 'students' && payload.batch__id) { payload.batch_id = payload.batch__id; }
        fetch(`http://127.0.0.1:8000/${view}/${id}/edit/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => { if (data.error) alert(data.error); else { setEditingRecord(null); fetchData(); } });
    };

    const views = ['batches', 'students', 'rooms', 'allocations'];

    return (
        <div className="fade-in">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <DatabaseZap size={24} /> Database Management
                    </h1>
                    <p className="page-subtitle">Directly manage all SQL records and monitor data integrity.</p>
                </div>
                <button onClick={fetchData} className="btn btn-outline" style={{ gap: 7 }}>
                    <RefreshCw size={15} /> Refresh
                </button>
            </header>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.015)' }}>
                    {views.map(v => (
                        <button key={v} onClick={() => setActiveView(v)} style={{
                            flex: 1, padding: '14px 16px', background: 'transparent', border: 'none',
                            borderBottom: activeView === v ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeView === v ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeView === v ? 700 : 500,
                            cursor: 'pointer', textTransform: 'capitalize',
                            transition: 'var(--transition)', fontFamily: 'inherit',
                            fontSize: '0.875rem'
                        }}>
                            {v} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({data[v].length})</span>
                        </button>
                    ))}
                </div>

                <div style={{ padding: '20px 24px' }}>
                    {activeView === 'allocations' && data.allocations.length > 0 && (
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-danger" onClick={() => handleDelete('reset_allocations', 0)}>
                                <AlertTriangle size={15} /> Reset Entire Schedule Matrix
                            </button>
                        </div>
                    )}

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    {activeView === 'batches'     && <><th>Batch Code</th><th>Name</th></>}
                                    {activeView === 'students'    && <><th>USN</th><th>Name</th><th>Batch</th></>}
                                    {activeView === 'rooms'       && <><th>Room Name</th><th>Type</th><th>Capacity</th></>}
                                    {activeView === 'allocations' && <><th>Student</th><th>Room & Seat</th><th>Dates</th></>}
                                    <th style={{ textAlign: 'right', width: 90 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data[activeView].map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{item.id}</span>
                                        </td>

                                        {activeView === 'batches' && <>
                                            <td><strong style={{ color: 'var(--primary)' }}>{item.batch_code}</strong></td>
                                            <td>{item.batch_name}</td>
                                        </>}

                                        {activeView === 'students' && <>
                                            <td><strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{item.usn}</strong></td>
                                            <td>{item.name}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{item.batch__batch_code || 'Unassigned'}</td>
                                        </>}

                                        {activeView === 'rooms' && <>
                                            <td><strong style={{ color: 'var(--text-main)' }}>{item.room_name}</strong></td>
                                            <td><span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{item.room_type}</span></td>
                                            <td>{item.capacity}</td>
                                        </>}

                                        {activeView === 'allocations' && <>
                                            <td><strong style={{ color: 'var(--accent)' }}>{item.student_usn}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>({item.student_name})</span></td>
                                            <td>{item.room_name} — Seat {item.seat_number}</td>
                                            <td style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{item.start_date} → {item.end_date}</td>
                                        </>}

                                        <td style={{ textAlign: 'right' }}>
                                            {activeView !== 'allocations' && (
                                                <div style={{ display: 'inline-flex', gap: 8 }}>
                                                    <button
                                                        onClick={() => handleEditClick(activeView, item)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px 6px', borderRadius: 6, transition: 'var(--transition)' }}
                                                        title="Edit Record"
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-subtle)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(activeView, item.id)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 6, transition: 'var(--transition)' }}
                                                        title="Delete Record"
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-subtle)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {data[activeView].length === 0 && (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            No records found in this table.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingRecord && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card fade-in" style={{ width: '420px', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--primary)' }}>
                            Edit {editingRecord.view.slice(0, -1)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>#{editingRecord.id}</span>
                        </h2>
                        <form onSubmit={handleEditSubmit}>
                            {editingRecord.view === 'batches' && (<>
                                <div className="form-group"><label className="form-label">Batch Code</label><input type="text" className="form-control" value={editFormData.batch_code || ''} onChange={e => setEditFormData({ ...editFormData, batch_code: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Batch Name</label><input type="text" className="form-control" value={editFormData.batch_name || ''} onChange={e => setEditFormData({ ...editFormData, batch_name: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Capacity</label><input type="number" className="form-control" value={editFormData.max_students || ''} onChange={e => setEditFormData({ ...editFormData, max_students: parseInt(e.target.value, 10) })} required /></div>
                                <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-control" value={editFormData.start_date || ''} onChange={e => setEditFormData({ ...editFormData, start_date: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-control" value={editFormData.end_date || ''} onChange={e => setEditFormData({ ...editFormData, end_date: e.target.value })} /></div>
                            </>)}

                            {editingRecord.view === 'students' && (<>
                                <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-control" value={editFormData.name || ''} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">USN</label><input type="text" className="form-control" value={editFormData.usn || ''} onChange={e => setEditFormData({ ...editFormData, usn: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" value={editFormData.email || ''} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} required /></div>
                                <div className="form-group">
                                    <label className="form-label">Batch</label>
                                    <select className="form-control" value={editFormData.batch__id || ''} onChange={e => setEditFormData({ ...editFormData, batch__id: e.target.value })}>
                                        <option value="">None</option>
                                        {data.batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
                                    </select>
                                </div>
                            </>)}

                            {editingRecord.view === 'rooms' && (<>
                                <div className="form-group"><label className="form-label">Room Name</label><input type="text" className="form-control" value={editFormData.room_name || ''} onChange={e => setEditFormData({ ...editFormData, room_name: e.target.value })} required /></div>
                                <div className="form-group">
                                    <label className="form-label">Room Type</label>
                                    <select className="form-control" value={editFormData.room_type || ''} onChange={e => setEditFormData({ ...editFormData, room_type: e.target.value })} required>
                                        <option value="regular">Regular</option>
                                        <option value="lab">Lab</option>
                                        <option value="conference">Conference</option>
                                    </select>
                                </div>
                            </>)}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
