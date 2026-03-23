import React from 'react';

/**
 * A dedicated component for printing room allotment reports.
 * Designed for maximum reliability and professional look in PDF.
 */
const PrintableRoomReport = ({ 
    roomDetails, 
    effectiveOccupied, 
    activeSessionMentors, 
    filterDate, 
    filterTimeSlot 
}) => {
    if (!roomDetails) return null;

    // Prepare roster data
    const seatRows = Object.entries(effectiveOccupied)
        .map(([sn, occ]) => ({ seatNum: parseInt(sn, 10), ...occ }))
        .sort((a, b) => a.seatNum - b.seatNum);

    // Prepare Matrix rendering helper
    const renderPrintSeat = (sn, extraStyle = {}) => {
        const occ = effectiveOccupied[sn];
        return (
            <div key={sn} style={{
                width: 44, height: 44, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                background: occ ? '#4f46e5' : '#fff',
                color: occ ? '#fff' : '#64748b',
                border: '1px solid #cbd5e1',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                ...extraStyle
            }}>
                {sn}
                {occ && <div style={{ position: 'absolute', fontSize: '0.45rem', marginTop: 22, color: '#fff', opacity: 0.9 }}>{occ.usn.split('-').pop()}</div>}
            </div>
        );
    };

    return (
        <div className="printable-report" style={{ 
            padding: '40px', 
            background: '#fff', 
            minHeight: '100%',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '3px solid #4f46e5', paddingBottom: 20 }}>
                <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', color: '#4f46e5', fontWeight: 900 }}>Room Allocation Report</h1>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                    <span>Room: <strong>{roomDetails.name} ({roomDetails.type?.toUpperCase()})</strong></span>
                    <span>Date: <strong>{filterDate || 'All-time'}</strong></span>
                    <span>Session: <strong>{filterTimeSlot}</strong></span>
                </div>
                {activeSessionMentors.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: '1rem', color: '#4f46e5', fontWeight: 600 }}>
                        Allotted Mentor(s): {activeSessionMentors.map(m => `${m.name} (${m.mentor_code})`).join(', ')}
                    </div>
                )}
            </div>

            {/* Matrix Visual Section */}
            <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 15, borderBottom: '1px solid #e2e8f0', paddingBottom: 8, color: '#1e293b' }}>Visual Seat Matrix</h2>
                <div style={{ 
                    display: 'flex', flexWrap: 'wrap', gap: 10, padding: 20, 
                    background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
                    justifyContent: 'center'
                }}>
                    {/* Render Matrix based on type */}
                    {roomDetails.type === 'regular' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
                            {Array.from({ length: roomDetails.num_rows || 0 }).map((_, rIdx) => (
                                <div key={`r-${rIdx}`} style={{ display: 'flex', gap: 15 }}>
                                    {Array.from({ length: roomDetails.tables_per_row || 0 }).map((_, tIdx) => (
                                        <div key={`t-${tIdx}`} style={{ display: 'flex', gap: 4, padding: 6, background: '#f1f5f9', borderRadius: 4 }}>
                                            {Array.from({ length: roomDetails.seats_per_table || 0 }).map((_, sIdx) => {
                                                const sn = (rIdx * (roomDetails.tables_per_row * roomDetails.seats_per_table)) + (tIdx * roomDetails.seats_per_table) + sIdx + 1;
                                                return sn <= roomDetails.capacity ? renderPrintSeat(sn) : null;
                                            })}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                            {Array.from({ length: roomDetails.capacity }).map((_, i) => renderPrintSeat(i + 1))}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.75rem', color: '#64748b', justifyContent: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 12, height: 12, background: '#4f46e5', borderRadius: 2 }} /> Occupied
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 12, height: 12, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 2 }} /> Empty
                    </span>
                    <span>Total Students: <strong>{seatRows.length}</strong></span>
                </div>
            </div>

            {/* Table Section */}
            <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 15, borderBottom: '1px solid #e2e8f0', paddingBottom: 8, color: '#1e293b' }}>Student Allotment Details</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Seat</th>
                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Student Name</th>
                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #cbd5e1' }}>USN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {seatRows.map(row => (
                            <tr key={`${row.seatNum}-${row.slot}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, border: '1px solid #cbd5e1' }}>{row.seatNum}</td>
                                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.name}</td>
                                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{row.usn}</td>
                            </tr>
                        ))}
                        {seatRows.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No students allotted for this session.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div style={{ 
                marginTop: 'auto', paddingTop: 20, 
                borderTop: '1px solid #cbd5e1', color: '#64748b', 
                fontSize: '0.75rem', textAlign: 'center' 
            }}>
                Generated on {new Date().toLocaleString()} | Seat Allocation System — Allotment Transcript
            </div>
        </div>
    );
};

export default PrintableRoomReport;
