'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AttendanceList from '@/components/AttendanceList';
import type { Shift } from '@/lib/supabase';

export default function TeacherPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selected, setSelected] = useState<Shift | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(false);
  
  // New state for the dropdown selector
  const [shiftFilter, setShiftFilter] = useState<'this_week' | 'archived' | 'all'>('this_week');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (status === 'authenticated' && (session.user as any).role !== 'teacher') router.push('/dashboard');
  }, [status, session, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/shifts')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setShifts(data);
      });
  }, [status]);

  const createShift = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), is_active: true }),
    });
    const shift = await res.json();
    setShifts((prev) => [shift, ...prev]);
    setSelected(shift);
    setNewName('');
    setCreating(false);
  };

  const toggleEnrollments = async () => {
    if (!selected || toggling) return;
    setToggling(true);
    const res = await fetch('/api/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, is_active: !selected.is_active }),
    });
    const updated = await res.json();
    setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelected(updated);
    setToggling(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  // --- Dynamic Filtering Logic ---
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay() || 7; 
  startOfWeek.setDate(now.getDate() - (day - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const filteredShifts = shifts.filter((s) => {
    const shiftDate = new Date(s.start_time || s.created_at);
    if (shiftFilter === 'this_week') {
      return s.is_active || shiftDate >= startOfWeek;
    }
    if (shiftFilter === 'archived') {
      return !s.is_active && shiftDate < startOfWeek;
    }
    return true; // 'all'
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">IST</div>
          <span className="font-semibold">Teacher Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="text-xs text-slate-500 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Back to a clean 3-column grid */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column — Create & List */}
        <div className="space-y-4">
          {/* Create */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">New Shift</h2>
            <input
              type="text"
              placeholder="e.g. Lab Fri 01/01 12:00"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createShift()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={createShift}
              disabled={creating || !newName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {creating ? 'Creating...' : '+ Create Shift'}
            </button>
          </div>

          {/* List with Selector */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Shifts</h2>
                <span className="bg-blue-600/30 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredShifts.length}
                </span>
              </div>
              
              {/* The Dropdown Selector */}
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as any)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="this_week">This Week & Active</option>
                <option value="archived">Archived (Past Weeks)</option>
                <option value="all">All Shifts</option>
              </select>
            </div>

            {filteredShifts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">No shifts match this filter.</p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {filteredShifts.map((shift) => (
                  <li
                    key={shift.id}
                    onClick={() => setSelected(shift)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors gap-3 ${
                      selected?.id === shift.id ? 'bg-blue-600/20 border-l-2 border-blue-500 pl-3.5' : ''
                    } ${!shift.is_active && shiftFilter === 'all' ? 'opacity-70' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{shift.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{(shift as any).code}</p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      shift.is_active
                        ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                        : 'bg-slate-700/50 text-slate-500 border border-white/5'
                    }`}>
                      {shift.is_active ? 'Open' : 'Closed'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Center Column — Selected shift detail */}
        <div className="space-y-4">
          {selected ? (
            <>
              {/* Code display */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Attendance Code</p>
                  <p className="text-white font-bold text-xl truncate">{selected.name}</p>
                </div>

                <div className={`bg-white rounded-2xl py-8 flex flex-col items-center justify-center w-full shadow-xl ${
                  !selected.is_active ? 'opacity-40 grayscale' : ''
                }`}>
                  <div className="flex items-center justify-center text-5xl font-mono font-bold text-slate-800 select-all">
                    <span className="tracking-[0.2em] pl-[0.2em]">
                      {((selected as any).code as string).slice(0, 3)}
                    </span> 
                    <span className="text-slate-300 mx-2 pb-1">·</span>
                    <span className="tracking-[0.2em] pl-[0.2em]">
                      {((selected as any).code as string).slice(3)}
                    </span>
                  </div>                  
                  <p className="text-slate-400 text-xs mt-4 text-center px-4">
                    {selected.is_active ? 'Students enter this code in the app' : 'Enrollments stopped — code is inactive'}
                  </p>
                </div>
                {/* Toggle button */}
                <button
                  onClick={toggleEnrollments}
                  disabled={toggling}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                    selected.is_active
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20'
                      : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/20'
                  }`}
                >
                  {toggling ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : selected.is_active ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Stop Accepting Enrollments
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Reopen Enrollments
                    </>
                  )}
                </button>
              </div>

              {/* Shift meta */}
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5">Created</p>
                  <p className="text-slate-300">{new Date((selected as any).created_at).toLocaleString('pt-PT')}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">Status</p>
                  <p className={selected.is_active ? 'text-green-400' : 'text-slate-400'}>
                    {selected.is_active ? 'Accepting check-ins' : 'Closed'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-12 text-center flex flex-col justify-center min-h-[300px]">
              <p className="text-slate-500 text-sm">Select a shift on the left to see its code.</p>
            </div>
          )}
        </div>

        {/* Right Column — Attendance list */}
        <div>
          {selected ? (
            <AttendanceList shiftId={selected.id} />
          ) : (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-12 text-center flex flex-col justify-center min-h-[300px]">
              <p className="text-slate-500 text-sm">Select a shift to see who checked in.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}