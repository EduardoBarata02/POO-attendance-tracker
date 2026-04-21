'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ShiftInfo = {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
};

type AttendanceRecord = {
  id: string;
  shift_id: string;
  ist_id: string;
  timestamp: string;
  shifts: ShiftInfo;
};

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
    if (status === 'authenticated' && (session.user as any).role === 'teacher') {
      router.push('/teacher');
    }
  }, [status, session, router]);

  // Fetch attendance history once authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;
    const istId = (session.user as any).istId as string;
    if (!istId) return;

    fetch(`/api/student/attendance/${istId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to load attendance');
        }
        return res.json();
      })
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [status, session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  const istId = (session?.user as any)?.istId ?? '';
  const userName = session?.user?.name ?? '';
  const userImage = session?.user?.image ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">

      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
            IST
          </div>
          <span className="font-semibold">My Attendance</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 hidden sm:block">{userName}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Profile card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-5">
          {userImage ? (
            <img
              src={userImage}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/40 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600/30 border-2 border-blue-500/30 flex items-center justify-center text-blue-300 text-2xl font-bold shrink-0">
              {userName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-white font-semibold text-lg truncate">{userName}</p>
            <p className="text-slate-400 text-sm font-mono">{istId}</p>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{session?.user?.email}</p>
          </div>

          <div className="ml-auto text-right shrink-0">
            <p className="text-3xl font-bold text-white">{records.length}</p>
            <p className="text-slate-400 text-xs">
              {records.length === 1 ? 'class attended' : 'classes attended'}
            </p>
          </div>
        </div>

        {/* Check-in CTA */}
        <a
          href="/check-in"
          className="block w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-center transition-colors shadow-lg shadow-blue-600/20"
        >
          + Enter Attendance Code
        </a>

        {/* Attendance history */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-sm text-slate-300 uppercase tracking-wider">
              Attendance History
            </h2>
            <span className="bg-blue-600/30 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
              {records.length} {records.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-red-400 text-sm font-medium">Failed to load records</p>
              <p className="text-slate-500 text-xs">{error}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto text-2xl">
                📋
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">No attendance records yet</p>
                <p className="text-slate-500 text-xs mt-1">
                  Enter a code from your teacher to check in.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  {/* Left — icon + shift info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-green-600/20 border border-green-500/20 flex items-center justify-center shrink-0">
                      <svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {r.shifts?.name ?? 'Unknown shift'}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {r.shifts?.start_time
                          ? new Date(r.shifts.start_time).toLocaleDateString('pt-PT', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Right — time + badge */}
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-slate-300 text-xs font-mono">
                      {new Date(r.timestamp).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
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