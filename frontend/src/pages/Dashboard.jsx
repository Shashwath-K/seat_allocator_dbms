import React, { useState, useEffect } from 'react';
import { Users, UserCheck, MonitorPlay, CalendarPlus, GraduationCap } from 'lucide-react';

const Dashboard = () => {
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
            .then(json => {
                if (!json.error) setData(json);
            })
            .catch(err => console.error("Error fetching dashboard:", err));
    }, []);

    const stats = [
        { label: "Total Batches", value: data.total_batches, icon: Users, color: "var(--primary)" },
        { label: "Active Students", value: data.total_students, icon: UserCheck, color: "var(--success)" },
        { label: "Classrooms", value: data.total_rooms, icon: MonitorPlay, color: "var(--accent)" },
        { label: "Allocated Seats", value: data.total_allocated, icon: CalendarPlus, color: "var(--warning)" },
        { label: "Mentors", value: data.total_mentors, icon: GraduationCap, color: "#e84393" },
    ];

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Dashboard Overview</h1>
                <p className="page-subtitle">Real-time statistics of classroom allocations and resource utilization.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ 
                                position: 'absolute', 
                                right: '-10px', 
                                top: '-10px', 
                                opacity: 0.05, 
                                transform: 'rotate(-15deg)' 
                            }}>
                                <Icon size={80} />
                            </div>
                            <div style={{ 
                                background: stat.color.startsWith('var') ? `rgba(var(--primary-rgb), 0.1)` : `${stat.color}15`, 
                                color: stat.color, 
                                width: '48px', 
                                height: '48px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderRadius: '12px',
                                background: `${stat.color}15`
                            }}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                    {stat.label}
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                                    {stat.value}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Quick System Actions</h2>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" style={{ minWidth: '160px' }}><Users size={18} /> Create Batch</button>
                    <button className="btn btn-outline" style={{ minWidth: '160px' }}><MonitorPlay size={18} /> Add Room</button>
                    <button className="btn btn-success" style={{ minWidth: '160px' }}><CalendarPlus size={18} /> New Allotment</button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
