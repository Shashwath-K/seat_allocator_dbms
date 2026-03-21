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
        { label: "Total Batches", value: data.total_batches, icon: Users, color: "#5ea8e0" },
        { label: "Active Students", value: data.total_students, icon: UserCheck, color: "#27ae60" },
        { label: "Classrooms", value: data.total_rooms, icon: MonitorPlay, color: "#8e44ad" },
        { label: "Allocated Seats", value: data.total_allocated, icon: CalendarPlus, color: "#e67e22" },
        { label: "Mentors", value: data.total_mentors, icon: GraduationCap, color: "#e84393" },
    ];

    return (
        <div className="fade-in">
            <header className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of current classroom allocations and resources.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: `${stat.color}15`, color: stat.color, padding: '16px', borderRadius: '12px' }}>
                                <Icon size={28} />
                            </div>
                            <div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                                    {stat.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Quick Actions</h2>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="btn btn-primary"><Users size={16} /> Create Batch</button>
                    <button className="btn btn-outline"><MonitorPlay size={16} /> Add Room</button>
                    <button className="btn btn-success"><CalendarPlus size={16} /> New Allotment</button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
