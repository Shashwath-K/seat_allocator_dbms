import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Briefcase, Mail, CheckCircle, XCircle, Filter } from 'lucide-react';

const MentorDetail = () => {
    const { mentorId } = useParams();
    const navigate = useNavigate();
    
    const [mentor, setMentor] = useState(null);
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('All');

    const fetchData = () => {
        setLoading(true);
        // Fetch specific mentor
        fetch(`http://127.0.0.1:8000/mentors/${mentorId}/`)
            .then(res => res.json())
            .then(data => setMentor(data.mentor))
            .catch(console.error);

        // Fetch all allocations to filter locally
        fetch('http://127.0.0.1:8000/allocations/')
            .then(res => res.json())
            .then(data => {
                setAllocations(data.allocations || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [mentorId]);

    // Group allocations into sessions for this mentor
    const mySessions = useMemo(() => {
        if (!mentor) return [];
        
        // Filter by this mentor's ID or code
        const mentorAllocations = allocations.filter(a => a.mentor_id === parseInt(mentorId, 10));
        
        // Group by Session (Room + Date + TimeSlot + Batch)
        const sessionMap = {};
        mentorAllocations.forEach(a => {
            const key = `${a.room_name}|${a.date}|${a.time_slot}|${a.batch_code}`;
            if (!sessionMap[key]) {
                sessionMap[key] = {
                    room: a.room_name,
                    date: a.date,
                    time_slot: a.time_slot,
                    batch: a.batch_code,
                    studentCount: 0,
                    id: a.id // Reference id
                };
            }
            sessionMap[key].studentCount++;
        });
        
        return Object.values(sessionMap).sort((a, b) => {
            // Sort by date descending
            return new Date(b.date) - new Date(a.date);
        });
    }, [allocations, mentor, mentorId]);

    const filteredSessions = useMemo(() => {
        return mySessions.filter(s => {
            const matchesDate = !dateFilter || s.date === dateFilter;
            const matchesBatch = batchFilter === 'All' || s.batch === batchFilter;
            return matchesDate && matchesBatch;
        });
    }, [mySessions, dateFilter, batchFilter]);

    const batches = useMemo(() => {
        const unique = new Set(mySessions.map(s => s.batch));
        return ['All', ...Array.from(unique).sort()];
    }, [mySessions]);

    // Availability Check for the next 7 days
    const availability = useMemo(() => {
        const days = [];
        const slots = ['FN', 'AN']; // Common slots
        const start = new Date();
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            const dayAvailability = {
                date: dateStr,
                label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                slots: slots.map(slot => {
                    const isBusy = mySessions.some(s => s.date === dateStr && s.time_slot === slot);
                    return { slot, isBusy };
                })
            };
            days.push(dayAvailability);
        }
        return days;
    }, [mySessions]);

    if (loading && !mentor) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Loading mentor profile...</div>;
    }

    if (!mentor && !loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Mentor not found.</div>;
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <header className="page-header" style={{ marginBottom: 24 }}>
                <button 
                    onClick={() => navigate('/mentors')} 
                    className="btn btn-outline" 
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '6px 12px', fontSize: '0.85rem' }}
                >
                    <ArrowLeft size={16} /> Back to Mentors
                </button>
                
                <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24, borderLeft: '4px solid var(--primary-color)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 16, background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700 }}>
                        {mentor?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{mentor?.name}</h1>
                        <div style={{ display: 'flex', gap: 20, marginTop: 8, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Briefcase size={16} /> {mentor?.department || 'Faculty'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={16} /> Code: <strong>{mentor?.mentor_code}</strong>
                            </span>
                            {mentor?.email && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Mail size={16} /> {mentor?.email}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                
                {/* Left: Sessions Table */}
                <div>
                    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Calendar color="var(--primary-color)" size={20} /> Assigned Sessions
                            </h2>
                            
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    style={{ padding: '4px 10px', fontSize: '0.85rem', width: 140 }}
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                />
                                <select 
                                    className="form-control" 
                                    style={{ padding: '4px 10px', fontSize: '0.85rem', width: 120 }}
                                    value={batchFilter}
                                    onChange={e => setBatchFilter(e.target.value)}
                                >
                                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date & Time</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Classroom / Room</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Batch</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Students</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSessions.length > 0 ? (
                                        filteredSessions.map((session, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 600 }}>{session.date}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 700 }}>{session.time_slot}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <MapPin size={14} color="var(--text-muted)" />
                                                        {session.room}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span className="badge badge-blue">{session.batch}</span>
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{session.studentCount}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No sessions found for the current criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Availability Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 20 }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Clock color="var(--primary-color)" size={20} /> Next 7 Days Availability
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {availability.map((day, idx) => (
                                <div key={idx} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{day.label}</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {day.slots.map((slot, sIdx) => (
                                            <div 
                                                key={sIdx} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 4, 
                                                    padding: '3px 8px', 
                                                    borderRadius: 4, 
                                                    fontSize: '0.75rem',
                                                    background: slot.isBusy ? '#fee2e2' : '#dcfce7',
                                                    color: slot.isBusy ? '#991b1b' : '#166534',
                                                    border: `1px solid ${slot.isBusy ? '#fecaca' : '#bbf7d0'}`
                                                }}
                                                title={slot.isBusy ? 'Busy' : 'Available'}
                                            >
                                                {slot.isBusy ? <XCircle size={12} /> : <CheckCircle size={12} />}
                                                {slot.slot}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }}></div>
                                Available for new sessions
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
                                Already assigned (Busy)
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 20, background: 'var(--primary-light)', borderColor: 'var(--primary-color)', borderOpacity: 0.1 }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--primary-color)' }}>Quick Stats</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.9rem' }}>Total Sessions</span>
                                <span style={{ fontWeight: 700 }}>{mySessions.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.9rem' }}>Active Batches</span>
                                <span style={{ fontWeight: 700 }}>{batches.length - 1}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MentorDetail;
