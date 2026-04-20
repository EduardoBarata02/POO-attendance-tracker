'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import QRDisplay from '@/components/QRDisplay';
import AttendanceList from '@/components/AttendanceList';
import type { Shift } from '@/lib/supabase';

export default function TeacherPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [creating, setCreating] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (status === 'authenticated' && (session.user as any).role !== 'teacher') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

 // Load shifts safely
  useEffect(() => {
    // 1. Only fetch data if NextAuth confirms the user is fully logged in
    if (status === 'authenticated') {
      fetch('/api/shifts')
        .then((r) => r.json())
        .then((data) => {
          // 2. Prevent crashes by ensuring the server actually returned an array
          if (Array.isArray(data)) {
            setShifts(data);
          } else {
            console.error('Failed to load shifts. Server returned:', data);
          }
        })
        .catch((err) => console.error('Network error fetching shifts:', err));
    }
  }, [status]); // Re-run this effect when the authentication status changes

  const createShift = async () => {
    if (!newShiftName.trim()) return;
    setCreating(true);

    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newShiftName,
        start_time: now.toISOString(),
        end_time: end.toISOString(),
      }),
    });

    const shift = await res.json();
    setShifts((prev) => [shift, ...prev]);
    setSelectedShift(shift);
    setNewShiftName('');
    setCreating(false);
  };

  const toggleShift = async (shift: Shift) => {
    const res = await fetch('/api/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: shift.id, is_active: !shift.is_active }),
    });
    const updated = await res.json();
    setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (selectedShift?.id === updated.id) setSelectedShift(updated);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Top nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
            IST
          </div>
          <span className="font-semibold">Teacher Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Shift management */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">
              Create Shift
            </h2>
            <input
              type="text"
              placeholder="e.g. Lecture A · Week 5"
              value={newShiftName}
              onChange={(e) => setNewShiftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createShift()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={createShift}
              disabled={creating || !newShiftName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {creating ? 'Creating...' : '+ Create & Activate'}
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">
                All Shifts
              </h2>
            </div>
            <ul className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {shifts.map((shift) => (
                <li
                  key={shift.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between gap-2 ${
                    selectedShift?.id === shift.id ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedShift(shift)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{shift.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(shift.start_time).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleShift(shift); }}
                    className={`shrink-0 text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                      shift.is_active
                        ? 'bg-green-600/20 text-green-400 hover:bg-red-600/20 hover:text-red-400'
                        : 'bg-slate-700 text-slate-400 hover:bg-green-600/20 hover:text-green-400'
                    }`}
                  >
                    {shift.is_active ? 'Active' : 'Inactive'}
                  </button>
                </li>
              ))}
              {shifts.length === 0 && (
                <li className="px-4 py-8 text-center text-slate-500 text-sm">
                  No shifts yet. Create one above.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Center: QR Code */}
        <div className="flex flex-col items-center justify-start">
          {selectedShift?.is_active ? (
            <QRDisplay shiftId={selectedShift.id} shiftName={selectedShift.name} />
          ) : selectedShift ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <p className="text-slate-400">This shift is inactive.</p>
              <button
                onClick={() => toggleShift(selectedShift)}
                className="mt-4 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                Activate shift
              </button>
            </div>
          ) : (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-10 text-center">
              <p className="text-slate-500 text-sm">Select or create a shift to show the QR code.</p>
            </div>
          )}
        </div>

        {/* Right: Attendance list */}
        <div>
          {selectedShift ? (
            <AttendanceList shiftId={selectedShift.id} />
          ) : (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-10 text-center">
              <p className="text-slate-500 text-sm">Select a shift to see attendance.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}