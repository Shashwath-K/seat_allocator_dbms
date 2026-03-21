import React, { useState, useEffect } from 'react';
import { CalendarPlus, Calendar, Search, Trash2, RotateCcw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Allotment = () => {
    const [activeTab, setActiveTab] = useState('view');
    const [allocations, setAllocations] = useState([]);
    const [roomGrids, setRoomGrids] = useState([]);
    const navigate = useNavigate();

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

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

    const handleResetAllocations = () => {
        if (!window.confirm('⚠️ This will DELETE all allocations and sessions. This action cannot be undone. Proceed?')) return;
        fetch('http://127.0.0.1:8000/reset-allocation/', { method: 'POST' })
            .then(r => r.json())
            .then(data => { alert(data.message || data.error); fetchAllocations(); })
            .catch(console.error);
    };

    return (
        <div className="fade-in">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Classroom Allotment</h1>
                    <p className="page-subtitle">Schedule batches to designated rooms and map visual layouts.</p>
                </div>
                <button
                    onClick={handleResetAllocations}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', marginTop: 4 }}
                >
                    <RotateCcw size={15} /> Reset All Allocations
                </button>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1', minWidth: '250px', marginBottom: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search scheduled facility..."
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
                        {roomGrids.filter(rg => {
                            const matchesSearch = rg.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = filterType === 'all' || rg.type === filterType;
                            return matchesSearch && matchesType;
                        }).map(rg => (
                            <div key={rg.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.2s', border: '1px solid transparent', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.border = '1px solid var(--primary-color)'}
                                onMouseOut={(e) => e.currentTarget.style.border = '1px solid transparent'}
                                onClick={() => navigate(`/allotment/${rg.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-color)' }}>{rg.name}</h3>
                                        <span className={`badge ${rg.type === 'regular' ? 'badge-blue' : rg.type === 'conference' ? 'badge-purple' : 'badge-green'}`} style={{ textTransform: 'capitalize' }}>
                                            {rg.type}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                            Generated: {rg.seats_generated} / {rg.capacity}
                                        </div>
                                        {rg.seats_generated === 0 && (
                                            <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleGenerateSeats(rg.id)}>
                                                Generate
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ flex: '1' }}>
                                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {rg.type === 'regular' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rows:</span> <strong>{rg.num_rows}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tables per Row:</span> <strong>{rg.tables_per_row}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Seats per Table:</span> <strong>{rg.seats_per_table}</strong></div>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)' }}><span>Est Capacity:</span> <strong>{rg.capacity}</strong></div>
                                            </div>
                                        )}
                                        {rg.type === 'lab' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Lab Systems:</span> <strong>{rg.num_systems}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Capacity Limit:</span> <strong>{rg.seats_per_batch} per batch</strong></div>
                                            </div>
                                        )}
                                        {rg.type === 'conference' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>Layout Pattern:</span>
                                                    <div style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', letterSpacing: '1px' }}>{rg.conference_layout}</div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)' }}><span>Est Capacity:</span> <strong>{rg.capacity}</strong></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                    <span style={{ color: 'var(--primary-color)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        View Live Map <ArrowRight size={14} />
                                    </span>
                                </div>
                            </div>
                        ))}
                        {roomGrids.filter(rg => {
                            const matchesSearch = rg.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = filterType === 'all' || rg.type === filterType;
                            return matchesSearch && matchesType;
                        }).length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    {roomGrids.length === 0 ? "No rooms configured for layout matrix display." : "No scheduled facilities match your search criteria."}
                                </div>
                            )}
                    </div>
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
