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
            </div>            {activeTab === 'view' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '20px 24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search scheduled facility..."
                                style={{ paddingLeft: 48, background: 'rgba(0,0,0,0.02)' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ width: '220px' }}>
                            <select className="form-control" style={{ background: 'rgba(0,0,0,0.02)' }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">All Room Types</option>
                                <option value="regular">Regular Classes</option>
                                <option value="lab">Laboratories</option>
                                <option value="conference">Conference Executives</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                        {roomGrids.filter(rg => {
                            const matchesSearch = rg.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = filterType === 'all' || rg.type === filterType;
                            return matchesSearch && matchesType;
                        }).map(rg => (
                            <div key={rg.id} className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'pointer' }}
                                onClick={() => navigate(`/allotment/${rg.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{rg.name}</h3>
                                        <span className={`badge ${rg.type === 'regular' ? 'badge-blue' : rg.type === 'conference' ? 'badge-purple' : 'badge-green'}`} style={{ textTransform: 'capitalize', padding: '4px 10px' }}>
                                            {rg.type}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                                            LAYOUT STATUS
                                        </div>
                                        {rg.seats_generated > 0 ? (
                                            <div className="badge badge-green" style={{ fontSize: '0.75rem' }}>Mapped</div>
                                        ) : (
                                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }} onClick={() => handleGenerateSeats(rg.id)}>
                                                Generate
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ flex: '1' }}>
                                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--surface-border)', fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                                        {rg.type === 'regular' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Structure:</span> <span style={{ fontWeight: 600 }}>{rg.num_rows} × {rg.tables_per_row} × {rg.seats_per_table}</span></div>
                                                <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '4px 0' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 700 }}><span>Map Capacity:</span> <span>{rg.capacity} Seats</span></div>
                                            </div>
                                        )}
                                        {rg.type === 'lab' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Systems count:</span> <span style={{ fontWeight: 600 }}>{rg.num_systems}</span></div>
                                                <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '4px 0' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 700 }}><span>Batch Limit:</span> <span>{rg.seats_per_batch}</span></div>
                                            </div>
                                        )}
                                        {rg.type === 'conference' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>Pattern:</span>
                                                    <code style={{ background: 'rgba(79, 70, 229, 0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--primary)', fontWeight: 700 }}>{rg.conference_layout}</code>
                                                </div>
                                                <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '4px 0' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 700 }}><span>Map Capacity:</span> <span>{rg.capacity} Seats</span></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '16px', textAlign: 'center' }}>
                                    <span style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        Open Seat Matrix <ArrowRight size={16} />
                                    </span>
                                </div>
                            </div>
                        ))}
                        {roomGrids.filter(rg => {
                            const matchesSearch = rg.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = filterType === 'all' || rg.type === filterType;
                            return matchesSearch && matchesType;
                        }).length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '2px dashed var(--surface-border)', color: 'var(--text-muted)' }}>
                                <div style={{ marginBottom: '16px' }}><Calendar size={48} style={{ opacity: 0.2 }} /></div>
                                <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No rooms configured for layout matrix display.</p>
                                <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/rooms')}>Configure Rooms</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary)' }}>Manual Classroom Setup</h2>
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
                                            background: formData.days.includes(day) ? 'var(--primary)' : '#fff',
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
