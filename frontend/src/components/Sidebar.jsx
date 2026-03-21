import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Monitor, Calendar, DatabaseZap, GraduationCap, Sparkles } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Monitor className="sidebar-logo" size={28} />
                <h2>Seat Allocator</h2>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/batches" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Users size={20} />
                    <span>Batches</span>
                </NavLink>

                <NavLink to="/students" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <UserPlus size={20} />
                    <span>Students</span>
                </NavLink>

                <NavLink to="/mentors" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <GraduationCap size={20} />
                    <span>Mentors</span>
                </NavLink>

                <NavLink to="/rooms" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Monitor size={20} />
                    <span>Rooms</span>
                </NavLink>

                <NavLink to="/allotment" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Calendar size={20} />
                    <span>Allotment</span>
                </NavLink>

                <NavLink to="/database" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <DatabaseZap size={20} />
                    <span>Database</span>
                </NavLink>

                <NavLink to="/ai" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Sparkles size={20} color="var(--primary-color)" />
                    <span>AI Allocator</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">AD</div>
                    <div className="user-details">
                        <span className="user-name">Admin</span>
                        <span className="user-role">Administrator</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
