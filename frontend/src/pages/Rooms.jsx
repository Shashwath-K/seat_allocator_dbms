import React, { useState, useEffect } from 'react';
import { Plus, Monitor, Search, MoreVertical } from 'lucide-react';

const Rooms = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [rooms, setRooms] = useState([]);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    const [formData, setFormData] = useState({
        room_name: '',
        room_type: 'regular',
        num_rows: '',
        tables_per_row: '',
        seats_per_table: '',
        num_systems: '',
        seats_per_batch: '',
        conference_layout: ''
    });

    const fetchRooms = () => {
        fetch('http://127.0.0.1:8000/rooms/')
            .then(res => res.json())
            .then(data => {
                if (data.rooms) setRooms(data.rooms);
            })
            .catch(err => console.error("Error fetching rooms:", err));
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleGenerateSeats = (room, e) => {
        e.stopPropagation();
        fetch('http://127.0.0.1:8000/generate-seats/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: room.id })
        })
        .then(res => res.json())
        .then(data => { alert(data.message || data.error); fetchRooms(); })
        .catch(console.error);
    };

    const handleDeleteRoom = (room, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete room "${room.room_name}"? All its seat data will be removed.`)) return;
        fetch(`http://127.0.0.1:8000/rooms/${room.id}/delete/`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => { if (!data.error) fetchRooms(); else alert(data.error); })
        .catch(console.error);
    };

    const handleCreate = (e) => {
        e.preventDefault();

        // Submit formatting logic for capacity details based on type
        let payload = {
            room_name: formData.room_name,
            room_type: formData.room_type,
        };

        if (formData.room_type === 'regular') {
            payload.num_rows = formData.num_rows;
            payload.tables_per_row = formData.tables_per_row;
            payload.seats_per_table = formData.seats_per_table;
        } else if (formData.room_type === 'lab') {
            payload.num_systems = formData.num_systems;
            payload.seats_per_batch = formData.seats_per_batch;
        } else if (formData.room_type === 'conference') {
            payload.conference_layout = formData.conference_layout;
        }

        fetch('http://127.0.0.1:8000/rooms/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchRooms();
                    setActiveTab('list');
                    setFormData({ ...formData, room_name: '' });
                } else {
                    alert(data.error);
                }
            })
            .catch(err => console.error("Error creating room:", err));
    };

    const renderPreview = () => {
        if (formData.room_type === 'regular') {
            const rows = parseInt(formData.num_rows) || 0;
            const tables = parseInt(formData.tables_per_row) || 0;
            const seats = parseInt(formData.seats_per_table) || 0;
            const capacity = rows * tables * seats;

            if (rows === 0 || tables === 0 || seats === 0) {
                return <span style={{ color: 'var(--text-muted)' }}>Enter dimensions to see preview</span>;
            }

            if (capacity > 1000) {
                return <span style={{ color: 'var(--text-muted)' }}>Preview unavailable for &gt; 1000 seats</span>;
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from({ length: Math.min(rows, 30) }).map((_, rowIdx) => (
                        <div key={`prev-row-${rowIdx}`} style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            {Array.from({ length: Math.min(tables, 15) }).map((_, tableIdx) => (
                                <div key={`prev-table-${rowIdx}-${tableIdx}`} style={{ display: 'flex', gap: '4px', padding: '4px', background: '#e2e8f0', borderRadius: '4px' }}>
                                    {Array.from({ length: Math.min(seats, 10) }).map((_, seatIdx) => (
                                        <div key={`prev-seat-${seatIdx}`} style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#fff', border: '1px solid #cbd5e1' }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                    {(rows > 30 || tables > 15 || seats > 10) && (
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Preview truncated...</div>
                    )}
                </div>
            );
        } else if (formData.room_type === 'conference') {
            const layoutArr = formData.conference_layout ? formData.conference_layout.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)) : [];

            if (layoutArr.length === 0) {
                return <span style={{ color: 'var(--text-muted)' }}>Enter layout to see preview</span>;
            }

            const totalSeats = layoutArr.reduce((a, b) => a + b, 0);
            if (totalSeats > 1000) {
                return <span style={{ color: 'var(--text-muted)' }}>Preview unavailable for &gt; 1000 seats</span>;
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                    <div style={{ width: '30px', height: '8px', background: '#94a3b8', borderRadius: '2px', marginBottom: '8px', fontSize: '0.4rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>STAGE</div>
                    {layoutArr.slice(0, 30).map((seatsInRow, rowIdx) => {
                        const rowSeats = [];
                        for (let i = 0; i < Math.min(seatsInRow, 60); i++) {
                            const centerIdx = (seatsInRow - 1) / 2;
                            const distanceFromCenter = Math.abs(i - centerIdx);
                            const translateY = Math.pow(distanceFromCenter, 2) * 0.4;
                            const rotate = (i - centerIdx) * 2;

                            rowSeats.push(
                                <div key={`prev-conf-${rowIdx}-${i}`} style={{
                                    width: '12px', height: '12px', borderRadius: '2px', background: '#cbd5e1',
                                    transform: `translateY(${translateY}px) rotate(${rotate}deg)`
                                }} />
                            );
                        }

                        const maxTranslateY = Math.pow((Math.min(seatsInRow, 60) - 1) / 2, 2) * 0.4;
                        return (
                            <div key={`prev-conf-row-${rowIdx}`} style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: `${Math.max(4, maxTranslateY - 4)}px` }}>
                                {rowSeats}
                            </div>
                        );
                    })}
                </div>
            );
        } else if (formData.room_type === 'lab') {
            const systems = parseInt(formData.num_systems) || 0;
            if (systems === 0) {
                return <span style={{ color: 'var(--text-muted)' }}>Enter systems to see preview</span>;
            }

            return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', maxWidth: '100%' }}>
                    {Array.from({ length: Math.min(systems, 200) }).map((_, i) => (
                        <div key={`prev-lab-${i}`} style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#e2e8f0', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Monitor size={8} color="#64748b" />
                        </div>
                    ))}
                    {systems > 200 && <div style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>+ {systems - 200} more</div>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Facilities & Rooms</h1>
                <p className="page-subtitle">Configure spatial layouts and capacity limits.</p>
            </header>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    <Monitor size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Available Rooms
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Add Facility
                </button>
            </div>

            {activeTab === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1', minWidth: '250px', marginBottom: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search specific facility..."
                                    style={{ paddingLeft: '40px' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group" style={{ width: '200px', marginBottom: 0 }}>
                            <select className="form-control" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">All Room Types</option>
                                <option value="regular">Regular Classes</option>
                                <option value="lab">Laboratories</option>
                                <option value="conference">Conference Executives</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {rooms.filter(r => {
                            const matchesSearch = r.room_name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = filterType === 'all' || r.room_type === filterType;
                            return matchesSearch && matchesType;
                        }).map(r => (
                            <div key={r.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.2s', border: '1px solid transparent', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.border = '1px solid var(--primary-color)'}
                                onMouseOut={(e) => e.currentTarget.style.border = '1px solid transparent'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-color)' }}>{r.room_name}</h3>
                                        <span className={`badge ${r.room_type === 'regular' ? 'badge-blue' : r.room_type === 'conference' ? 'badge-purple' : 'badge-green'}`} style={{ textTransform: 'capitalize' }}>
                                            {r.room_type}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            onClick={e => handleGenerateSeats(r, e)}
                                            title="Generate Seats"
                                            style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#166534' }}
                                        >⚙ Gen Seats</button>
                                        <button
                                            onClick={e => handleDeleteRoom(r, e)}
                                            title="Delete Room"
                                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#991b1b' }}
                                        >✕ Delete</button>
                                    </div>
                                </div>
                                <div style={{ flex: '1' }}>
                                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {r.room_type === 'regular' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rows:</span> <strong>{r.num_rows}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tables per Row:</span> <strong>{r.tables_per_row}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Seats per Table:</span> <strong>{r.seats_per_table}</strong></div>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)' }}><span>Est Capacity:</span> <strong>{r.num_rows * r.tables_per_row * r.seats_per_table}</strong></div>
                                            </div>
                                        )}
                                        {r.room_type === 'lab' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Lab Systems:</span> <strong>{r.num_systems}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Capacity Limit:</span> <strong>{r.seats_per_batch} per batch</strong></div>
                                            </div>
                                        )}
                                        {r.room_type === 'conference' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>Layout Pattern:</span>
                                                    <div style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', letterSpacing: '1px' }}>{r.conference_layout}</div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)' }}><span>Est Capacity:</span> <strong>{r.conference_layout.split(',').reduce((a, b) => a + (parseInt(b) || 0), 0)}</strong></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {rooms.filter(r => (filterType === 'all' || r.room_type === filterType) && r.room_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                No facilities match your search criteria.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    <div className="card" style={{ flex: '1 1 500px', maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary-color)' }}>Facility Configuration</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Room Designation</label>
                                <input type="text" className="form-control" required value={formData.room_name} onChange={e => setFormData({ ...formData, room_name: e.target.value })} placeholder="e.g. LAB-01" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Room Type</label>
                                <select className="form-control" value={formData.room_type} onChange={e => setFormData({ ...formData, room_type: e.target.value })}>
                                    <option value="regular">Regular Class</option>
                                    <option value="lab">Lab</option>
                                    <option value="conference">Conference Executive</option>
                                </select>
                            </div>

                            {formData.room_type === 'regular' && (
                                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', background: '#f7fafc', padding: '16px', border: '1px dashed #cbd5e0', borderRadius: '8px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Rows</label>
                                        <input type="number" required className="form-control" value={formData.num_rows} onChange={e => setFormData({ ...formData, num_rows: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Tables/Row</label>
                                        <input type="number" required className="form-control" value={formData.tables_per_row} onChange={e => setFormData({ ...formData, tables_per_row: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Seats/Table</label>
                                        <input type="number" required className="form-control" value={formData.seats_per_table} onChange={e => setFormData({ ...formData, seats_per_table: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {formData.room_type === 'lab' && (
                                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', background: '#f7fafc', padding: '16px', border: '1px dashed #cbd5e0', borderRadius: '8px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Systems</label>
                                        <input type="number" required className="form-control" value={formData.num_systems} onChange={e => setFormData({ ...formData, num_systems: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Seats per Batch</label>
                                        <input type="number" required className="form-control" value={formData.seats_per_batch} onChange={e => setFormData({ ...formData, seats_per_batch: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {formData.room_type === 'conference' && (
                                <div style={{ marginTop: '16px', background: '#f7fafc', padding: '16px', border: '1px dashed #cbd5e0', borderRadius: '8px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Conference Layout (comma separated seats per row)</label>
                                        <input type="text" required className="form-control" placeholder="e.g. 10,15,20" value={formData.conference_layout} onChange={e => setFormData({ ...formData, conference_layout: e.target.value })} />
                                    </div>
                                </div>
                            )}


                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="submit" className="btn btn-primary">Save Facility</button>
                                <button type="button" className="btn btn-outline" onClick={() => setActiveTab('list')}>Cancel</button>
                            </div>
                        </form>
                    </div>

                    <div className="card" style={{ flex: '1 1 400px', minHeight: '300px', position: 'sticky', top: '24px' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary-color)' }}>Seating Preview</h2>
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', overflowX: 'auto', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {renderPreview()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rooms;
