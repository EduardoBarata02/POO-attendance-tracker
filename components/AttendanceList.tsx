'use client';
import { useState, useEffect } from 'react';
import type { AttendanceRecord } from '@/lib/supabase';

interface AttendanceListProps {
  shiftId: string;
}

export default function AttendanceList({ shiftId }: AttendanceListProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    const res = await fetch(`/api/attendance/${shiftId}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
    // Refresh attendance list every 10 seconds
    const interval = setInterval(fetchAttendance, 10_000);
    return () => clearInterval(interval);
  }, [shiftId]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold">Checked In</h3>
        <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
          {records.length}
        </span>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      ) : records.length === 0 ? (
        <p className="text-slate-500 text-sm text-center p-8">
          No check-ins yet. Waiting for students to scan...
        </p>
      ) : (
        <ul className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold">
                  {r.students?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{r.students?.name}</p>
                  <p className="text-slate-500 text-xs">{r.students?.ist_id}</p>
                </div>
              </div>
              <span className="text-slate-500 text-xs">
                {new Date(r.timestamp).toLocaleTimeString('pt-PT', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}