import React, { useState, useEffect } from 'react';
import { Plus, Monitor, Search, MoreVertical } from 'lucide-react';

const Rooms = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [rooms, setRooms] = useState([]);
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
                <div className="card">
                    <table>
                        <thead>
                            <tr>
                                <th>Facility Name</th>
                                <th>Type</th>
                                <th>Config Info</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.map(r => (
                                <tr key={r.id}>
                                    <td><strong>{r.room_name}</strong></td>
                                    <td style={{ textTransform: 'capitalize' }}>{r.room_type}</td>
                                    <td>
                                        {r.room_type === 'regular' ? `Regular: ${r.num_rows} R x ${r.tables_per_row} T (C: ${r.seats_per_table})` : ''}
                                        {r.room_type === 'lab' ? `Lab: ${r.num_systems} Sys (C: ${r.seats_per_batch})` : ''}
                                        {r.room_type === 'conference' ? `Conf Layout: ${r.conference_layout}` : ''}
                                    </td>
                                    <td>
                                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rooms.length === 0 && (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No facilities found in database.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '600px' }}>
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
            )}
        </div>
    );
};

export default Rooms;
