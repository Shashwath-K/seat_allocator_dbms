import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, UserPlus, Monitor, Calendar,
    DatabaseZap, GraduationCap, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!isCollapsed && (
                    <div className="header-brand">
                        <Monitor className="sidebar-logo" size={28} />
                        <h2>Seat Allocator</h2>
                    </div>
                )}
                {isCollapsed && <Monitor className="sidebar-logo compact" size={28} />}
                <button
                    className="collapse-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    {!isCollapsed && <span>Dashboard</span>}
                </NavLink>

                <NavLink to="/batches" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Users size={20} />
                    {!isCollapsed && <span>Batches</span>}
                </NavLink>

                <NavLink to="/students" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <UserPlus size={20} />
                    {!isCollapsed && <span>Students</span>}
                </NavLink>

                <NavLink to="/mentors" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <GraduationCap size={20} />
                    {!isCollapsed && <span>Mentors</span>}
                </NavLink>

                <NavLink to="/rooms" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Monitor size={20} />
                    {!isCollapsed && <span>Rooms</span>}
                </NavLink>

                <NavLink to="/allotment" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Calendar size={20} />
                    {!isCollapsed && <span>Allotment</span>}
                </NavLink>

                <NavLink to="/database" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <DatabaseZap size={20} />
                    {!isCollapsed && <span>Database</span>}
                </NavLink>

                <NavLink to="/ai" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Sparkles size={20} />
                    {!isCollapsed && <span>AI (Preview)</span>}
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">AD</div>
                    {!isCollapsed && (
                        <div className="user-details">
                            <span className="user-name">Admin</span>
                            <span className="user-role">Administrator</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
