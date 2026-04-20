'use client';
import { useSession, signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';

type CheckInStatus = 'idle' | 'looking-up' | 'checking-in' | 'success' | 'expired' | 'duplicate' | 'error';

function CheckInContent() {
  const { data: session, status: authStatus } = useSession();
  const [codeInput, setCodeInput] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!codeInput.trim() || codeInput.trim().length < 6) return;
    setCheckInStatus('looking-up');
    setMessage('');

    try {
      const lookupRes = await fetch('/api/lookup-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok) {
        setCheckInStatus('expired');
        setMessage(lookupData.error ?? 'Code not found or expired.');
        return;
      }

      setCheckInStatus('checking-in');
      const checkInRes = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: lookupData.token }),
      });
      const checkInData = await checkInRes.json();

      if (checkInRes.ok) {
        setCheckInStatus('success');
        setMessage(checkInData.message);
        setCodeInput('');
      } else if (checkInRes.status === 410) {
        setCheckInStatus('expired');
        setMessage(checkInData.error);
      } else if (checkInRes.status === 409) {
        setCheckInStatus('duplicate');
        setMessage(checkInData.error);
      } else {
        setCheckInStatus('error');
        setMessage(checkInData.error ?? 'Something went wrong.');
      }
    } catch {
      setCheckInStatus('error');
      setMessage('Network error. Please check your connection.');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent" />
        <p className="text-slate-400">Verifying identity...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center gap-6 text-center bg-white/5 border border-white/10 rounded-2xl p-10 max-w-sm w-full shadow-xl">
        <div className="text-5xl">🔐</div>
        <div>
          <h2 className="text-white text-xl font-bold">Login Required</h2>
          <p className="text-slate-400 mt-2 text-sm">Sign in with your IST account to check in.</p>
        </div>
        <button
          onClick={() => signIn('fenix', { callbackUrl: '/check-in' })}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl"
        >
          Sign in with FenixEdu
        </button>
      </div>
    );
  }

  const isSubmitting = checkInStatus === 'looking-up' || checkInStatus === 'checking-in';

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5 shadow-xl">
        <div className="text-center">
          <p className="text-white font-semibold text-lg">Enter Attendance Code</p>
          <p className="text-slate-400 text-sm mt-1">
            Type the 6-character code shown on the projector
          </p>
        </div>

        <input
          type="text"
          value={codeInput}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            setCodeInput(val);
            if (checkInStatus !== 'idle') {
              setCheckInStatus('idle');
              setMessage('');
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="ABC·123"
          disabled={isSubmitting}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.3em] placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white/15 disabled:opacity-50 transition-colors uppercase"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < codeInput.length ? 'bg-blue-400' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || codeInput.length < 6}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              {checkInStatus === 'looking-up' ? 'Validating code...' : 'Checking in...'}
            </>
          ) : (
            'Check In'
          )}
        </button>
      </div>

      {checkInStatus !== 'idle' && !isSubmitting && message && (
        <div className={`w-full rounded-2xl p-5 flex items-start gap-4 border ${
          checkInStatus === 'success'
            ? 'bg-green-600/10 border-green-500/30'
            : checkInStatus === 'duplicate'
            ? 'bg-blue-600/10 border-blue-500/30'
            : 'bg-red-600/10 border-red-500/30'
        }`}>
          <span className="text-2xl shrink-0">
            {checkInStatus === 'success' ? '✅' :
             checkInStatus === 'duplicate' ? '👍' : '⚠️'}
          </span>
          <div>
            <p className={`font-semibold text-sm ${
              checkInStatus === 'success' ? 'text-green-300' :
              checkInStatus === 'duplicate' ? 'text-blue-300' : 'text-red-300'
            }`}>
              {checkInStatus === 'success' ? 'Attendance recorded!' :
               checkInStatus === 'duplicate' ? 'Already checked in' : 'Check-in failed'}
            </p>
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
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold mx-auto mb-3">
          IST
        </div>
        <p className="text-slate-400 text-sm">Attendance Check-In</p>
      </div>
      <Suspense fallback={<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />}>
        <CheckInContent />
      </Suspense>
    </div>
  );
}