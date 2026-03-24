import React, { useState, useEffect } from 'react';
import { History, Calendar, User, Tag, Info } from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    // Initialize requested seed logs on first load if they don't exist
    fetch('http://127.0.0.1:8000/system-logs/initialize/', { method: 'POST' });
  }, []);

  const fetchLogs = async () => {
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

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'UPDATE': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'DELETE': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'ALLOT': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-primary-color" />
            System Activity Logs
          </h1>
          <p className="text-slate-400 mt-1">Real-time tracking of all database operations and allotments.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all"
        >
          Refresh Logs
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Model</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    Loading activity logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getActionColor(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" />
                        {log.model_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white group-hover:text-primary-color transition-colors">
                        {log.object_repr}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <User className="w-3.5 h-3.5 rounded-full bg-white/5 p-0.5" />
                        {log.user}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
