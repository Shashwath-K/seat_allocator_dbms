import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CalendarPlus } from 'lucide-react';

const RoomAllotmentDetail = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [roomDetails, setRoomDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('map');
    const [isReallocating, setIsReallocating] = useState(false);

    // Assignment form state
    const [batches, setBatches] = useState([]);
    const [formData, setFormData] = useState({
        batch_id: '',
        room_id: roomId,
        start_date: '',
        end_date: '',
        days: [],
        strategy: 'sequential'
    });

    const fetchData = () => {
        // Fetch specific room's overall allocations (the map)
        fetch('http://127.0.0.1:8000/allocations/')
            .then(res => res.json())
            .then(data => {
                if (data.room_grids) {
                    const room = data.room_grids.find(r => r.id === parseInt(roomId, 10));
                    setRoomDetails(room);
                }
            })
            .catch(err => console.error(err));

        // Fetch duration history for this room
        fetch(`http://127.0.0.1:8000/room_allocations/${roomId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.history) setHistory(data.history);
            });

        // Fetch active batches for the assignment dropdown
        fetch('http://127.0.0.1:8000/batches/')
            .then(res => res.json())
            .then(data => setBatches(data.batches ? data.batches.filter(b => b.is_active) : []));
    };

    useEffect(() => {
        fetchData();
    }, [roomId]);

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
                    fetchData();
                    setActiveTab('map');
                    setFormData({ ...formData, batch_id: '', start_date: '', end_date: '', days: [], strategy: 'sequential' });
                } else {
                    alert(data.error);
                }
            });
    };

    const toggleDay = (day) => {
        const d = [...formData.days];
        if (d.includes(day)) d.splice(d.indexOf(day), 1);
        else d.push(day);
        setFormData({ ...formData, days: d });
    };

    const handleReallocate = (strategy) => {
        setIsReallocating(true);
        fetch(`http://127.0.0.1:8000/reallocate_room/${roomId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategy })
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    fetchData(); // Refresh the map
                } else {
                    alert(data.error);
                }
            })
            .finally(() => setIsReallocating(false));
    };

    if (!roomDetails) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading room data...</div>;
    }

    return (
        <div className="fade-in">
            <header className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => navigate('/allotment')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                    <ArrowLeft size={16} /> Back to Rooms
                </button>
                <div>
                    <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {roomDetails.name} <span className="badge badge-blue" style={{ fontSize: '0.9rem' }}>{roomDetails.type}</span>
                    </h1>
                    <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>Capacity: {roomDetails.capacity} seats ({roomDetails.seats_generated} formally generated)</p>
                </div>
            </header>

            <div className="tabs" style={{ marginBottom: '24px' }}>
                <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
                    Historical Durations & Map
                </button>
                <button className={`tab ${activeTab === 'assign' ? 'active' : ''}`} onClick={() => setActiveTab('assign')}>
                    Assign Batch
                </button>
            </div>

            {activeTab === 'map' && (
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

                    {/* Left Col: Duration History Table */}
                    <div className="card" style={{ flex: 1, minWidth: '100%', overflowX: 'auto', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} color="var(--primary-color)" /> Assignment History
                        </h2>
                        {history.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No batches are historically assigned here.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px' }}>Batch</th>
                                        <th style={{ padding: '12px 16px' }}>Duration</th>
                                        <th style={{ padding: '12px 16px' }}>Days</th>
                                        <th style={{ padding: '12px 16px' }}>Headcount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '12px 16px' }}><strong>{h.batch_code}</strong></td>
                                            <td style={{ padding: '12px 16px' }}>{h.start_date} <span style={{ color: 'var(--text-muted)' }}>to</span> {h.end_date}</td>
                                            <td style={{ padding: '12px 16px' }}>{h.days_of_week || 'Daily'}</td>
                                            <td style={{ padding: '12px 16px' }}>{h.student_count} slots</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Right Col: Live Matrix */}
                    <div className="card" style={{ flex: 1, minWidth: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--primary-color)' }}>
                                Live Seat Matrix Diagram
                            </h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline" disabled={isReallocating} onClick={() => handleReallocate('shuffle')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🔀 Shuffle</button>
                                <button className="btn btn-outline" disabled={isReallocating} onClick={() => handleReallocate('uneven')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>⚄ Uneven Spread</button>
                                <button className="btn btn-outline" disabled={isReallocating} onClick={() => handleReallocate('chaos')} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🌀 Chaos Mode</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '300px', alignContent: 'flex-start' }}>
                            {Array.from({ length: roomDetails.capacity }).map((_, i) => {
                                const seatNum = i + 1;
                                const occ = roomDetails.occupied[seatNum];
                                return (
                                    <div key={seatNum} title={occ ? `Seat ${seatNum}: ${occ.usn} - ${occ.name}` : `Seat ${seatNum} - Empty`}
                                        style={{
                                            width: '45px', height: '45px', borderRadius: '6px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600,
                                            background: occ ? 'var(--primary-color)' : '#fff', color: occ ? '#fff' : '#64748b',
                                            cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', border: occ ? '2px solid transparent' : '2px solid #cbd5e1',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {seatNum}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'assign' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '24px', color: 'var(--primary-color)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CalendarPlus size={18} /> New Allotment
                    </h2>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label className="form-label">Select Batch</label>
                            <select required className="form-control" value={formData.batch_id} onChange={e => setFormData({ ...formData, batch_id: e.target.value })}>
                                <option value="">-- Choose Batch --</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.batch_code} ({b.max_students} capacity)</option>
                                ))}
                            </select>
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

                        <div className="form-group" style={{ marginTop: '24px' }}>
                            <label className="form-label">Seating Distribution Strategy</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                                {[
                                    { id: 'sequential', label: 'Sequential', desc: 'Standard 1:1 fill' },
                                    { id: 'shuffle', label: 'Shuffle', desc: 'Randomized seat assignment' },
                                    { id: 'uneven', label: 'Uneven (Spread)', desc: 'Leaves alternating seats blank' },
                                    { id: 'chaos', label: 'Chaos (Interleaved)', desc: 'Prevents consecutive USNs sitting together' }
                                ].map(st => (
                                    <div key={st.id}
                                        onClick={() => setFormData({ ...formData, strategy: st.id })}
                                        style={{
                                            padding: '16px', border: formData.strategy === st.id ? '2px solid var(--primary-color)' : '2px solid var(--border-color)',
                                            borderRadius: '8px', cursor: 'pointer', background: formData.strategy === st.id ? '#f0f7ff' : '#fff',
                                            transition: '0.2s', display: 'flex', flexDirection: 'column', gap: '4px'
                                        }}>
                                        <div style={{ fontWeight: 600, color: formData.strategy === st.id ? 'var(--primary-color)' : 'var(--text-color)' }}>{st.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button type="submit" className="btn btn-primary">Schedule Allotment</button>
                            <button type="button" className="btn btn-outline" onClick={() => setActiveTab('map')}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default RoomAllotmentDetail;
