import React, { useState, useMemo } from 'react';
import { useBotLab } from '../context/BotLabContext';
import { ActionType } from '../types';
import { Search, Download, Trash2, CheckCircle, MessageSquare, ExternalLink } from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { activityLogs, bots } = useBotLab();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const label = `Account #${String(log.botId).padStart(2, '0')}`;
      const matchesSearch =
        label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.targetUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [activityLogs, searchTerm, actionFilter]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Account', 'Action', 'Target URL', 'Details'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `Account #${l.botId}`,
      l.action,
      `"${l.targetUrl}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: ActionType) => {
    switch (action) {
      case 'UPVOTE':
        return (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Upvoted</span>
          </span>
        );
      case 'COMMENT':
        return (
          <span className="text-blue-400 font-medium flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Commented</span>
          </span>
        );
      case 'NAVIGATION':
        return (
          <span className="text-neutral-400 font-medium flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Visited</span>
          </span>
        );
      case 'LOGIN':
      case 'LAUNCH_BROWSER':
        return (
          <span className="text-neutral-300 font-medium">
            Signed In
          </span>
        );
      default:
        return (
          <span className="text-neutral-400">
            {action.toLowerCase()}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Activity Log</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Audit history of visits, upvotes, and comments.
          </p>
        </div>

        <div>
          <button
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span>Filter:</span>
          <select
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-200 focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="UPVOTE">Upvotes</option>
            <option value="COMMENT">Comments</option>
            <option value="NAVIGATION">Visits</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search logs..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>
      </div>

      {/* Simple Log Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-medium">
              <tr>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Account</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {paginatedLogs.map(log => (
                <tr key={log.id} className="hover:bg-neutral-800/20 transition-colors">
                  <td className="py-2.5 px-4 text-neutral-400 whitespace-nowrap">
                    {log.timestamp.substring(11, 19)}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                    Account #{String(log.botId).padStart(2, '0')}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="text-neutral-200 line-clamp-1">{log.details}</div>
                    <div className="text-[11px] text-neutral-500 truncate max-w-sm">
                      {log.targetUrl}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-500">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/60 border-t border-neutral-800 text-xs text-neutral-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 rounded text-neutral-300"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 rounded text-neutral-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
