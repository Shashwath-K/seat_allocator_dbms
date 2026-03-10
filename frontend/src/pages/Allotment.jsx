import React, { useState, useEffect } from 'react';
import { CalendarPlus, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Allotment = () => {
    const [activeTab, setActiveTab] = useState('view');
    const [allocations, setAllocations] = useState([]);
    const [roomGrids, setRoomGrids] = useState([]);
    const navigate = useNavigate();

    // Form Dropdown Data
    const [batches, setBatches] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [formData, setFormData] = useState({
        batch_id: '',
        room_id: '',
        start_date: '',
        end_date: '',
        days: []
    });

    const fetchDropdowns = () => {
        fetch('http://127.0.0.1:8000/batches/')
            .then(res => res.json())
            .then(data => setBatches(data.batches ? data.batches.filter(b => b.is_active) : []));

        fetch('http://127.0.0.1:8000/rooms/')
            .then(res => res.json())
            .then(data => setRooms(data.rooms || []));
    };

    const fetchAllocations = () => {
        fetch('http://127.0.0.1:8000/allocations/')
            .then(res => res.json())
            .then(data => {
                if (data.allocations) setAllocations(data.allocations);
                if (data.room_grids) setRoomGrids(data.room_grids);
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchAllocations();
        fetchDropdowns();
    }, []);

    const handleCreate = (e) => {
        e.preventDefault();
        fetch('http://127.0.0.1:8000/allocate/manual/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchAllocations();
                    setActiveTab('view');
                    setFormData({ batch_id: '', room_id: '', start_date: '', end_date: '', days: [] });
                } else {
                    alert(data.error);
                }
            });
    };

    const handleGenerateSeats = (roomId) => {
        fetch('http://127.0.0.1:8000/generate-seats/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: roomId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) alert(data.error);
                else fetchAllocations();
            });
    };

    const toggleDay = (day) => {
        const d = [...formData.days];
        if (d.includes(day)) d.splice(d.indexOf(day), 1);
        else d.push(day);
        setFormData({ ...formData, days: d });
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Classroom Allotment</h1>
                <p className="page-subtitle">Schedule batches to designated rooms and map visual layouts.</p>
            </header>

            <div className="tabs">
                <button className={`tab ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>
                    <Calendar size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Live Schedule map
                </button>
                <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                    <CalendarPlus size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Assign Batch
                </button>
            </div>

            {activeTab === 'view' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {roomGrids.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No rooms configured for layout matrix display.
                        </div>
                    ) : (
                        roomGrids.map(rg => (
                            <div key={rg.id} className="card" style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid transparent' }}
                                onMouseOver={(e) => e.currentTarget.style.border = '1px solid var(--primary-color)'}
                                onMouseOut={(e) => e.currentTarget.style.border = '1px solid transparent'}
                                onClick={() => navigate(`/allotment/${rg.id}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {rg.name} <span className="badge badge-blue">{rg.type}</span>
                                        <ArrowRight size={16} color="var(--text-muted)" />
                                    </h3>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }} onClick={(e) => e.stopPropagation()}>
                                        Seats Generated: {rg.seats_generated} / {rg.capacity}
                                        {rg.seats_generated === 0 && (
                                            <button className="btn btn-outline" style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => handleGenerateSeats(rg.id)}>
                                                Generate Seats
                                            </button>
                                        )}
                                    </span>
                                </div>

                                {/* Very simple layout representation */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                                    {Array.from({ length: rg.capacity }).map((_, i) => {
                                        const seatNum = i + 1;
                                        const occ = rg.occupied[seatNum];
                                        return (
                                            <div key={seatNum} title={occ ? `Seat ${seatNum}: ${occ.usn} - ${occ.name}` : `Seat ${seatNum} - Empty`}
                                                style={{
                                                    width: '40px', height: '40px', borderRadius: '4px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600,
                                                    background: occ ? 'var(--accent-color)' : '#e2e8f0', color: occ ? '#fff' : '#64748b',
                                                    cursor: 'pointer', transition: '0.2s'
                                                }}>
                                                {seatNum}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary-color)' }}>Manual Classroom Setup</h2>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Select Batch</label>
                                <select required className="form-control" value={formData.batch_id} onChange={e => setFormData({ ...formData, batch_id: e.target.value })}>
                                    <option value="">-- Choose Batch --</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.id}>{b.batch_code} ({b.max_students} capacity)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Select Facility (Room)</label>
                                <select required className="form-control" value={formData.room_id} onChange={e => setFormData({ ...formData, room_id: e.target.value })}>
                                    <option value="">-- Choose Room --</option>
                                    {rooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.room_name} ({r.capacity} seats limit)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Start Date</label>
                                <input type="date" required className="form-control" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">End Date</label>
                                <input type="date" required className="form-control" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Days of Week</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button key={day} type="button"
                                        onClick={() => toggleDay(day)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)',
                                            background: formData.days.includes(day) ? 'var(--primary-color)' : '#fff',
                                            color: formData.days.includes(day) ? '#fff' : 'var(--text-color)',
                                            cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem'
                                        }}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button type="submit" className="btn btn-primary">Schedule Allotment</button>
                            <button type="button" className="btn btn-outline" onClick={() => setActiveTab('view')}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Allotment;
