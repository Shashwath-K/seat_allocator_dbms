import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Calendar, User } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];

/* Given the full allocations list and a date, return a seat→student map
   for the current room. Falls back to all-time map when no date filter. */
const buildOccupiedForDate = (allAllocations, roomId, filterDate) => {
    const roomAllocs = allAllocations.filter(
        a => String(a.room_id ?? a.room_name) && a.room_name !== undefined
            ? false // will use id-based filter below
            : false
    );
    // allAllocations come from /allocations/ which has room_name not room_id,
    // so we rely on roomDetails.occupied from room_grids for the base map.
    // This helper is used only when we have full allocation rows with room_id.
    if (!filterDate) return null; // signal: use roomDetails.occupied

    const map = {};
    allAllocations
        .filter(a => a.room_id === roomId && a.date === filterDate)
        .forEach(a => {
            map[a.seat_number] = { name: a.student_name, usn: a.student_usn, alloc_id: a.id };
        });
    return Object.keys(map).length > 0 ? map : null;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Seat tile — shared across all layout types
───────────────────────────────────────────────────────────────────────────── */
const SeatTile = ({ seatNum, occ, extraStyle = {}, onDragStart, onDrop }) => (
    <div
        title={occ ? `Seat ${seatNum}: ${occ.usn} — ${occ.name}` : `Seat ${seatNum} — Empty`}
        draggable={!!occ}
        onDragStart={onDragStart}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        style={{
            width: 44, height: 44, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.82rem', fontWeight: 600,
            background: occ ? 'var(--primary-color)' : '#fff',
            color: occ ? '#fff' : '#64748b',
            cursor: occ ? 'grab' : 'default',
            transition: 'transform 0.18s, box-shadow 0.18s',
            border: occ ? '2px solid transparent' : '2px solid #cbd5e1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            ...extraStyle,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = (extraStyle.transform || '') + ' translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = extraStyle.transform || ''; }}
    >
        {seatNum}
    </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────────────────── */
const RoomAllotmentDetail = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    /* ── Data state ── */
    const [roomDetails, setRoomDetails] = useState(null);
    const [allAllocations, setAllAllocations] = useState([]);   // full flat list
    const [activeTab, setActiveTab] = useState('map');
    const [isReallocating, setIsReallocating] = useState(false);
    const [mentors, setMentors] = useState([]);                 // ← New: mentors list

    /* ── Calendar filter ── */
    const [filterDate, setFilterDate] = useState('');     // '' = show all-time map

    /* ── Drag-and-drop local overrides ── */
    const [localOccupied, setLocalOccupied] = useState(null);

    /* ── Assign-batch form ── */
    const [batches, setBatches] = useState([]);
    const [formData, setFormData] = useState({
        batch_id: '', room_id: roomId,
        mentor_id: '',                          // ← New: mentor link
        start_date: '', end_date: '',
        date: '', time_slot: '',
        days: [], strategy: 'sequential',
    });

    /* ── Fetch ──────────────────────────────────────────────────────────── */
    const fetchData = () => {
        fetch('http://127.0.0.1:8000/allocations/')
            .then(r => r.json())
            .then(data => {
                if (data.room_grids) {
                    const room = data.room_grids.find(r => r.id === parseInt(roomId, 10));
                    setRoomDetails(room ?? null);
                }
                if (data.allocations) setAllAllocations(data.allocations);
            })
            .catch(console.error);

        fetch('http://127.0.0.1:8000/batches/')
            .then(r => r.json())
            .then(data => setBatches(data.batches ? data.batches.filter(b => b.is_active) : []));

        fetch('http://127.0.0.1:8000/mentors/')
            .then(r => r.json())
            .then(data => setMentors(data.mentors || []))
            .catch(console.error);
    };

    useEffect(() => { fetchData(); }, [roomId]);

    /* ── Derived occupied map ───────────────────────────────────────────── */
    // Priority: localOccupied (drag overrides) > date-filtered > roomDetails baseline
    const effectiveOccupied = useMemo(() => {
        if (localOccupied) return localOccupied;

        if (filterDate) {
            const roomName = roomDetails?.name;
            const filtered = {};
            allAllocations
                .filter(a => a.room_name === roomName && a.date === filterDate)
                .forEach(a => {
                    filtered[a.seat_number] = {
                        name: a.student_name,
                        usn: a.student_usn,
                        alloc_id: a.id,
                        mentor_code: a.mentor_code,     // ← New: mentor display
                    };
                });
            return filtered;
        }

        return roomDetails?.occupied ?? {};
    }, [localOccupied, filterDate, allAllocations, roomDetails]);

    /* ── Seat table rows (sorted by seat number) ────────────────────────── */
    const seatRows = useMemo(() => {
        const cap = roomDetails?.capacity ?? 0;
        return Array.from({ length: cap }, (_, i) => {
            const sn = i + 1;
            const occ = effectiveOccupied[sn];
            return { 
                seatNum: sn, 
                name: occ?.name ?? null, 
                usn: occ?.usn ?? null,
                mentor: occ?.mentor_code ?? null        // ← New: mentor link
            };
        });
    }, [effectiveOccupied, roomDetails]);

    /* ── Drag & drop handlers ───────────────────────────────────────────── */
    const handleDrop = (e, targetSeat) => {
        e.preventDefault();
        const src = e.dataTransfer.getData('text/plain');
        if (!src) return;
        const sourceSeat = parseInt(src, 10);
        if (sourceSeat === targetSeat) return;
        const base = localOccupied ?? { ...effectiveOccupied };
        const next = { ...base };
        const tmp = next[sourceSeat];
        next[sourceSeat] = next[targetSeat];
        next[targetSeat] = tmp;
        setLocalOccupied(next);
    };

    const saveSeatChanges = () => {
        if (!localOccupied) return;
        const base = roomDetails.occupied;
        const changes = [];
        Object.keys(localOccupied).forEach(sn => {
            const occ = localOccupied[sn];
            if (occ?.alloc_id) {
                const orig = base[sn];
                if (!orig || orig.alloc_id !== occ.alloc_id)
                    changes.push({ alloc_id: occ.alloc_id, new_seat_number: parseInt(sn, 10) });
            }
        });
        if (!changes.length) { setLocalOccupied(null); return; }
        fetch('http://127.0.0.1:8000/update_seats/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changes }),
        }).then(r => r.json()).then(d => {
            if (!d.error) { setLocalOccupied(null); fetchData(); }
            else alert(d.error);
        });
    };

    const handleReallocate = strategy => {
        setIsReallocating(true);
        fetch(`http://127.0.0.1:8000/reallocate_room/${roomId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strategy }),
        }).then(r => r.json()).then(d => {
            if (!d.error) fetchData(); else alert(d.error);
        }).finally(() => setIsReallocating(false));
    };

    /* ── Assign-batch form ── */
    const handleCreate = e => {
        e.preventDefault();
        fetch('http://127.0.0.1:8000/allocate/manual/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        }).then(r => r.json()).then(d => {
            if (!d.error) {
                fetchData();
                setActiveTab('map');
                setFormData({ ...formData, batch_id: '', mentor_id: '', start_date: '', end_date: '', date: '', time_slot: '', days: [], strategy: 'sequential' });
            } else alert(d.error);
        });
    };

    const toggleDay = day => {
        const d = [...formData.days];
        d.includes(day) ? d.splice(d.indexOf(day), 1) : d.push(day);
        setFormData({ ...formData, days: d });
    };

    /* ── Loading guard ── */
    if (!roomDetails) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading room data…
            </div>
        );
    }

    /* ── Shared seat tile factory ── */
    const makeSeat = (seatNum, extra = {}) => {
        const occ = effectiveOccupied[seatNum];
        return (
            <SeatTile
                key={`s-${seatNum}`}
                seatNum={seatNum}
                occ={occ}
                extraStyle={extra}
                onDragStart={e => { if (occ) e.dataTransfer.setData('text/plain', seatNum.toString()); }}
                onDrop={e => handleDrop(e, seatNum)}
            />
        );
    };

    /* ── Render ── */
    return (
        <div className="fade-in">

            {/* ── Header ── */}
            <header className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button
                    onClick={() => navigate('/allotment')}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', whiteSpace: 'nowrap' }}
                >
                    <ArrowLeft size={16} /> Back to Rooms
                </button>
                <div>
                    <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        {roomDetails.name}
                        <span className="badge badge-blue" style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                            {roomDetails.type}
                        </span>
                    </h1>
                    <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
                        Capacity: <strong>{roomDetails.capacity}</strong> seats &nbsp;·&nbsp;
                        <span style={{ color: 'var(--text-muted)' }}>{roomDetails.seats_generated} formally generated</span>
                    </p>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="tabs" style={{ marginBottom: 24 }}>
                <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
                    <Calendar size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                    Live Layout & Roster
                </button>
                <button className={`tab ${activeTab === 'assign' ? 'active' : ''}`} onClick={() => setActiveTab('assign')}>
                    <CalendarPlus size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                    Assign Batch
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════
                MAP TAB — split panel
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'map' && (
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

                    {/* ── LEFT: Calendar filter + layout grid ── */}
                    <div style={{ flex: '1 1 55%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Calendar filter card */}
                        <div className="card" style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Calendar size={18} color="var(--primary-color)" />
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Filter by Date</span>
                                </div>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filterDate}
                                    onChange={e => { setFilterDate(e.target.value); setLocalOccupied(null); }}
                                    style={{ width: 180, padding: '6px 10px' }}
                                />
                                {filterDate && (
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                                        onClick={() => { setFilterDate(''); setLocalOccupied(null); }}
                                    >
                                        Clear
                                    </button>
                                )}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                    {filterDate
                                        ? `Showing allocations for ${filterDate}`
                                        : 'Showing all-time current map'}
                                </span>
                            </div>
                        </div>

                        {/* Layout map card */}
                        <div className="card" style={{ padding: 20 }}>
                            {/* Toolbar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                                <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--primary-color)', fontWeight: 700 }}>
                                    Seat Layout Map
                                </h2>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {localOccupied && (
                                        <>
                                            <button className="btn btn-primary" onClick={saveSeatChanges} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>Save Changes</button>
                                            <button className="btn btn-outline" onClick={() => setLocalOccupied(null)} style={{ padding: '5px 12px', fontSize: '0.78rem', color: '#ef4444', borderColor: '#ef4444' }}>Discard</button>
                                        </>
                                    )}
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drag &amp; Drop to swap</span>
                                    <button className="btn btn-outline" disabled={isReallocating || !!localOccupied} onClick={() => handleReallocate('shuffle')} style={{ padding: '5px 10px', fontSize: '0.78rem' }}>🔀 Shuffle</button>
                                    <button className="btn btn-outline" disabled={isReallocating || !!localOccupied} onClick={() => handleReallocate('uneven')} style={{ padding: '5px 10px', fontSize: '0.78rem' }}>⚄ Spread</button>
                                    <button className="btn btn-outline" disabled={isReallocating || !!localOccupied} onClick={() => handleReallocate('chaos')} style={{ padding: '5px 10px', fontSize: '0.78rem' }}>🌀 Chaos</button>
                                </div>
                            </div>

                            {/* Grid canvas */}
                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: 14, padding: '28px 20px',
                                background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                                minHeight: 260, alignContent: 'flex-start', justifyContent: 'center',
                                overflowX: 'auto',
                            }}>

                                {/* Flat / Lab layout */}
                                {roomDetails.type !== 'regular' && roomDetails.type !== 'conference' && (
                                    Array.from({ length: roomDetails.capacity }).map((_, i) => makeSeat(i + 1))
                                )}

                                {/* Regular classroom */}
                                {roomDetails.type === 'regular' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', minWidth: 'max-content' }}>
                                        {Array.from({ length: roomDetails.num_rows || 0 }).map((_, rowIdx) => (
                                            <div key={`row-${rowIdx}`} style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                                                {Array.from({ length: roomDetails.tables_per_row || 0 }).map((_, tIdx) => (
                                                    <div key={`t-${rowIdx}-${tIdx}`} style={{ display: 'flex', gap: 6, padding: 10, background: '#e2e8f0', borderRadius: 8 }}>
                                                        {Array.from({ length: roomDetails.seats_per_table || 0 }).map((_, sIdx) => {
                                                            const sn = (rowIdx * (roomDetails.tables_per_row * roomDetails.seats_per_table)) + (tIdx * roomDetails.seats_per_table) + sIdx + 1;
                                                            if (sn > roomDetails.capacity) return null;
                                                            return makeSeat(sn);
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Conference room */}
                                {roomDetails.type === 'conference' && (() => {
                                    const layoutArr = (roomDetails.conference_layout || '')
                                        .split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                                    let cur = 1;
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', minWidth: 'max-content' }}>
                                            <div style={{ width: 110, height: 22, background: '#94a3b8', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700, marginBottom: 18 }}>STAGE</div>
                                            {layoutArr.map((count, rowIdx) => {
                                                const tiles = [];
                                                for (let i = 0; i < count; i++) {
                                                    if (cur > roomDetails.capacity) break;
                                                    const sn = cur++;
                                                    const ci = (count - 1) / 2;
                                                    const dist = Math.abs(i - ci);
                                                    const ty = Math.pow(dist, 2) * 1.5;
                                                    const rot = (i - ci) * 2;
                                                    tiles.push(makeSeat(sn, { transform: `translateY(${ty}px) rotate(${rot}deg)` }));
                                                }
                                                const maxTy = Math.pow((count - 1) / 2, 2) * 1.5;
                                                return (
                                                    <div key={`cr-${rowIdx}`} style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: Math.max(10, maxTy - 10) }}>
                                                        {tiles}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--primary-color)', display: 'inline-block' }} /> Occupied
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 3, background: '#fff', border: '2px solid #cbd5e1', display: 'inline-block' }} /> Empty
                                </span>
                                <span style={{ marginLeft: 'auto' }}>
                                    {Object.values(effectiveOccupied).filter(Boolean).length} / {roomDetails.capacity} occupied
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Seat → Student roster table ── */}
                    <div className="card" style={{ flex: '1 1 40%', minWidth: 0, maxHeight: 680, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                <User size={17} color="var(--primary-color)" />
                                Seat Roster
                                {filterDate && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>
                                        {filterDate}
                                    </span>
                                )}
                            </h2>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 70 }}>Seat</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Mentor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seatRows.map(({ seatNum, name, mentor }) => (
                                        <tr
                                            key={seatNum}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                background: name ? '#fff' : '#fafafa',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = name ? '#f0f7ff' : '#f1f5f9'}
                                            onMouseLeave={e => e.currentTarget.style.background = name ? '#fff' : '#fafafa'}
                                        >
                                            <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 30, height: 30, borderRadius: 6, fontSize: '0.8rem', fontWeight: 700,
                                                    background: name ? 'var(--primary-color)' : '#e2e8f0',
                                                    color: name ? '#fff' : '#94a3b8',
                                                }}>
                                                    {seatNum}
                                                </span>
                                            </td>
                                            <td style={{ padding: '9px 16px', color: name ? 'var(--text-color)' : 'var(--text-muted)', fontStyle: name ? 'normal' : 'italic' }}>
                                                {name ?? '— empty —'}
                                            </td>
                                            <td style={{ padding: '9px 16px' }}>
                                                {mentor ? (
                                                    <span className="badge" style={{ background: '#f1f5f9', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.72rem' }}>
                                                        {mentor}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {seatRows.length === 0 && (
                                        <tr>
                                            <td colSpan={2} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No seats generated for this room yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                ASSIGN BATCH TAB
            ════════════════════════════════════════════════════════════ */}
            {activeTab === 'assign' && (
                <div className="card" style={{ maxWidth: 620 }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: 24, color: 'var(--primary-color)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <CalendarPlus size={18} /> New Allotment for {roomDetails.name}
                    </h2>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Select Batch</label>
                                <select required className="form-control" value={formData.batch_id} onChange={e => setFormData({ ...formData, batch_id: e.target.value })}>
                                    <option value="">— Choose Batch —</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.id}>{b.batch_code} ({b.max_students} capacity)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Assign Mentor</label>
                                <select required className="form-control" value={formData.mentor_id} onChange={e => setFormData({ ...formData, mentor_id: e.target.value })}>
                                    <option value="">— Choose Mentor —</option>
                                    {mentors.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.mentor_code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Session date + time slot (new Rule 3 fields) */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Session Date</label>
                                <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Time Slot</label>
                                <input type="text" className="form-control" placeholder="e.g. FN, AN, 09:00-10:00" value={formData.time_slot} onChange={e => setFormData({ ...formData, time_slot: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Start Date (range)</label>
                                <input type="date" className="form-control" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">End Date (range)</label>
                                <input type="date" className="form-control" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Days of Week</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button key={day} type="button" onClick={() => toggleDay(day)}
                                        style={{
                                            padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border-color)',
                                            background: formData.days.includes(day) ? 'var(--primary-color)' : '#fff',
                                            color: formData.days.includes(day) ? '#fff' : 'var(--text-color)',
                                            cursor: 'pointer', transition: '0.18s', fontSize: '0.83rem',
                                        }}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 24 }}>
                            <label className="form-label">Seating Strategy</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                                {[
                                    { id: 'sequential', label: 'Sequential', desc: 'Standard 1:1 fill' },
                                    { id: 'shuffle', label: 'Shuffle', desc: 'Randomized seat assignment' },
                                    { id: 'uneven', label: 'Uneven (Spread)', desc: 'Leaves alternating seats blank' },
                                    { id: 'chaos', label: 'Chaos (Interleaved)', desc: 'Prevents consecutive USNs sitting together' },
                                ].map(st => (
                                    <div key={st.id} onClick={() => setFormData({ ...formData, strategy: st.id })}
                                        style={{
                                            padding: 14, border: formData.strategy === st.id ? '2px solid var(--primary-color)' : '2px solid var(--border-color)',
                                            borderRadius: 8, cursor: 'pointer', background: formData.strategy === st.id ? '#f0f7ff' : '#fff',
                                            transition: '0.18s',
                                        }}>
                                        <div style={{ fontWeight: 600, color: formData.strategy === st.id ? 'var(--primary-color)' : 'var(--text-color)' }}>{st.label}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>{st.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
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
