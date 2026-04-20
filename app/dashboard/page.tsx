'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link'; // Added for fast client-side navigation

type AttendanceRecord = {
  id: string;
  timestamp: string;
  shift_id: string;
  shifts: { name: string; start_time: string } | null;
};

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (status === 'authenticated' && (session.user as any).role === 'teacher') {
      router.push('/teacher');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const istId = (session.user as any).istId;
    fetch(`/api/student/attendance/${istId}`)
      .then((r) => r.json())
      .then((data) => { setRecords(Array.isArray(data) ? data : []); setLoading(false); });
  }, [status, session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  const istId = (session?.user as any)?.istId ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">IST</div>
          <span className="font-semibold">My Attendance</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="text-xs text-slate-500 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Profile card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5">
          {session?.user?.image ? (
            <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/40" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600/30 border-2 border-blue-500/30 flex items-center justify-center text-blue-300 text-2xl font-bold">
              {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-lg">{session?.user?.name}</p>
            <p className="text-slate-400 text-sm font-mono">{istId}</p>
            <p className="text-slate-500 text-xs mt-1">{session?.user?.email}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-white">{records.length}</p>
            <p className="text-slate-400 text-xs">classes attended</p>
          </div>
        </div>

        {/* NEW: Action Card for Code Entry */}
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4 shadow-lg">
          <div className="flex items-center gap-4 flex-col sm:flex-row">
            <div className="text-4xl">⌨️</div>
            <div>
              <h2 className="text-white font-semibold text-lg">Ready for class?</h2>
              <p className="text-slate-300 text-sm mt-1">
                Check in using the 6-character code on the projector.
              </p>
            </div>
          </div>
          <Link
            href="/check-in"
            className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-md text-center w-full sm:w-auto"
          >
            Enter Class Code
          </Link>
        </div>

        {/* Attendance history */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">Attendance History</h2>
            <span className="bg-blue-600/30 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
              {records.length} records
            </span>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-4xl">📋</p>
              <p className="text-slate-400 text-sm">No attendance records yet.</p>
              <p className="text-slate-500 text-xs">Enter a class code to check in.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {records.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-green-600/20 border border-green-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{r.shifts?.name ?? 'Unknown shift'}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {r.shifts?.start_time
                          ? new Date(r.shifts.start_time).toLocaleDateString('pt-PT', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-xs font-mono">
                      {new Date(r.timestamp).toLocaleTimeString('pt-PT', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <span className="text-green-400 text-xs">Present</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}