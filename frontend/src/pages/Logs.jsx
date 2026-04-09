import React, { useState, useEffect } from 'react';
import { History, Calendar, RefreshCw, Tag, User } from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    fetch('http://127.0.0.1:8000/system-logs/initialize/', { method: 'POST' });
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/system-logs/');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const actionMeta = {
    CREATE: { color: 'var(--success)',  bg: 'var(--success-subtle)',  border: 'rgba(63,185,80,0.2)' },
    UPDATE: { color: 'var(--accent)',   bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)' },
    DELETE: { color: 'var(--danger)',   bg: 'var(--danger-subtle)',  border: 'rgba(248,81,73,0.2)' },
    ALLOT:  { color: 'var(--warning)',  bg: 'var(--warning-subtle)', border: 'rgba(210,153,34,0.2)' },
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={26} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' }} />
            System Activity Logs
          </h1>
          <p className="page-subtitle">Real-time tracking of all database operations and allotments.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-outline" style={{ gap: 8 }}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </header>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Timestamp</th>
                <th>Action</th>
                <th>Model</th>
                <th>Entity</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Loading activity logs…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = actionMeta[log.action_type] || { color: 'var(--text-muted)', bg: 'rgba(139,148,158,0.08)', border: 'rgba(139,148,158,0.15)' };
                  return (
                    <tr key={log.id}>
                      <td style={{ paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          <Calendar size={13} />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 9px', borderRadius: 6,
                          fontSize: '0.7rem', fontWeight: 800,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: meta.color, background: meta.bg,
                          border: `1px solid ${meta.border}`,
                        }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          <Tag size={12} />
                          {log.model_name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {log.object_repr}
                        </div>
                        {log.details && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.details}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={12} style={{ color: 'var(--text-muted)' }} />
                          </div>
                          {log.user}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
