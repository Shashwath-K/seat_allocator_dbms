import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, MonitorPlay, CalendarPlus, GraduationCap, ArrowUpRight } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({
        total_batches: 0,
        active_batches: 0,
        total_students: 0,
        total_rooms: 0,
        total_allocated: 0,
        total_mentors: 0
    });

    useEffect(() => {
        fetch('http://127.0.0.1:8000/')
            .then(res => res.json())
            .then(json => { if (!json.error) setData(json); })
            .catch(err => console.error("Error fetching dashboard:", err));
    }, []);

    const stats = [
        { label: "Total Batches",   value: data.total_batches,   icon: Users,        color: "var(--primary)",  glow: "rgba(249,115,22,0.3)",    link: '/batches' },
        { label: "Active Students", value: data.total_students,  icon: UserCheck,    color: "var(--success)",  glow: "rgba(63,185,80,0.3)",     link: '/students' },
        { label: "Classrooms",      value: data.total_rooms,     icon: MonitorPlay,  color: "var(--accent)",   glow: "rgba(56,189,248,0.3)",    link: '/rooms' },
        { label: "Allocated Seats", value: data.total_allocated, icon: CalendarPlus, color: "var(--warning)",  glow: "rgba(210,153,34,0.3)",    link: '/allotment' },
        { label: "Mentors",         value: data.total_mentors,   icon: GraduationCap,color: "#c084fc",         glow: "rgba(192,132,252,0.3)",   link: '/mentors' },
    ];

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Dashboard Overview</h1>
                <p className="page-subtitle">Real-time statistics of classroom allocations and resource utilization.</p>
            </header>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={i}
                            className="card stat-card-shimmer"
                            onClick={() => navigate(stat.link)}
                            style={{ cursor: 'pointer', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}
                        >
                            {/* Top row: icon + arrow */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: `${stat.color}18`,
                                    border: `1px solid ${stat.color}30`,
                                    boxShadow: `0 0 16px ${stat.glow}`,
                                    color: stat.color,
                                    transition: 'var(--transition)'
                                }}>
                                    <Icon size={22} />
                                </div>
                                <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                            </div>

                            {/* Value */}
                            <div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>
                                    {stat.label}
                                </div>
                            </div>

                            {/* Bottom color bar */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${stat.color}80, transparent)` }} />
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Quick Actions</h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>Jump to common operations</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/batches')} className="btn btn-primary">
                        <Users size={16} /> Create Batch
                    </button>
                    <button onClick={() => navigate('/rooms')} className="btn btn-outline">
                        <MonitorPlay size={16} /> Add Room
                    </button>
                    <button onClick={() => navigate('/allotment')} className="btn btn-success">
                        <CalendarPlus size={16} /> New Allotment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
