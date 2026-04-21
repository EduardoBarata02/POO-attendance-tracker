'use client';
import { useSession, signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'closed' | 'duplicate' | 'notfound' | 'error';

function CheckInContent() {
  const { data: session, status: authStatus } = useSession();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (code.trim().length < 6) return;
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
        setCode('');
        return;
      }

      if (res.status === 400) { setStatus('closed'); }
      else if (res.status === 404) { setStatus('notfound'); }
      else if (res.status === 409) { setStatus('duplicate'); }
      else { setStatus('error'); }
      setMessage(data.error ?? 'Something went wrong.');
    } catch {
      setStatus('error');
      setMessage('Network error. Check your connection and try again.');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <p className="text-slate-400 text-sm">Verifying identity...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">🔐</div>
        <div>
          <h2 className="text-white text-xl font-bold">Login Required</h2>
          <p className="text-slate-400 text-sm mt-1">Sign in with your IST account to check in.</p>
        </div>
        <button
          onClick={() => signIn('fenix', { callbackUrl: '/check-in' })}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Sign in with FenixEdu
        </button>
      </div>
    );
  }

  const feedback: Record<Exclude<Status, 'idle' | 'loading'>, { emoji: string; label: string; color: string }> = {
    success:   { emoji: '✅', label: 'Attendance recorded!', color: 'green' },
    duplicate: { emoji: '👍', label: 'Already checked in',   color: 'blue'  },
    closed:    { emoji: '🔒', label: 'Shift closed',         color: 'amber' },
    notfound:  { emoji: '❓', label: 'Code not found',       color: 'red'   },
    error:     { emoji: '⚠️', label: 'Something went wrong', color: 'red'   },
  };

  const colorMap: Record<string, string> = {
    green: 'bg-green-600/10 border-green-500/30 text-green-300',
    blue:  'bg-blue-600/10  border-blue-500/30  text-blue-300',
    amber: 'bg-amber-600/10 border-amber-500/30 text-amber-300',
    red:   'bg-red-600/10   border-red-500/30   text-red-300',
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5">
        <div className="text-center">
          <p className="text-white font-semibold text-lg">Enter Attendance Code</p>
          <p className="text-slate-400 text-sm mt-1">Type the code shown by your teacher</p>
        </div>

        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
            if (status !== 'idle') { setStatus('idle'); setMessage(''); }
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="XXXXXX"
          disabled={status === 'loading'}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.3em] placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white/15 disabled:opacity-50 transition-colors uppercase"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-150 ${i < code.length ? 'bg-blue-400' : 'bg-slate-700'}`} />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={status === 'loading' || code.length < 6}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Checking in...
            </>
          ) : 'Check In'}
        </button>
      </div>

      {status !== 'idle' && status !== 'loading' && (
        <div className={`w-full rounded-2xl p-5 flex items-start gap-4 border ${colorMap[feedback[status].color]}`}>
          <span className="text-2xl shrink-0">{feedback[status].emoji}</span>
          <div>
            <p className="font-semibold text-sm">{feedback[status].label}</p>
            <p className="text-slate-400 text-xs mt-1">{message}</p>
          </div>
        </div>
      )}

      <p className="text-slate-600 text-xs">
        Signed in as <span className="text-slate-400 font-mono">{(session?.user as any)?.istId}</span>
      </p>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold mx-auto mb-3">IST</div>
        <p className="text-slate-400 text-sm">Attendance Check-In</p>
      </div>
      <Suspense fallback={<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />}>
        <CheckInContent />
      </Suspense>
    </div>
  );
}