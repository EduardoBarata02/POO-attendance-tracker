'use client';
import { useState, useEffect, useCallback } from 'react';

type AttendanceRecord = {
  id: string;
  ist_id: string;
  timestamp: string;
  students: {
    ist_id: string;
    name: string;
    photo_url: string | null;
  };
};

interface Props {
  shiftId: string;
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? '?';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-full object-cover border border-blue-500/20 shrink-0"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
      {initial}
    </div>
  );
}

export default function AttendanceList({ shiftId }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAttendance = useCallback(async () => {
    const res = await fetch(`/api/attendance/${shiftId}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    }
    setLoading(false);
  }, [shiftId]);

  useEffect(() => {
    setLoading(true);
    setRecords([]);
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 10_000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">Checked In</h3>
          <span className="bg-blue-600/30 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
            {records.length}
          </span>
        </div>
        <button
          onClick={fetchAttendance}
          title="Refresh now"
          className="text-slate-500 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      ) : records.length === 0 ? (
        <div className="p-10 text-center space-y-1">
          <p className="text-slate-500 text-sm">No check-ins yet.</p>
          <p className="text-slate-600 text-xs">Waiting for students to enter the code.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
              <Avatar name={r.students.name} photoUrl={r.students.photo_url} />

              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium leading-tight truncate">
                  {r.students.name}
                </p>
                <p className="text-slate-500 text-xs font-mono">
                  {r.students.ist_id}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-slate-300 text-xs font-mono">
                  {new Date(r.timestamp).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                <p className="text-green-500 text-xs">✓ Present</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      {lastRefresh && (
        <div className="px-5 py-2.5 border-t border-white/5">
          <p className="text-slate-600 text-xs">
            Updated {lastRefresh.toLocaleTimeString('pt-PT')} · refreshes every 10s
          </p>
        </div>
      )}
    </div>
  );
}