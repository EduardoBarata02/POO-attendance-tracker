'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const CODE_REFRESH_MS = 15_000;

interface CodeDisplayProps {
  shiftId: string;
  shiftName: string;
}

type DisplayState = 'loading' | 'active' | 'error';

export default function CodeDisplay({ shiftId, shiftName }: CodeDisplayProps) {
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [state, setState] = useState<DisplayState>('loading');
  const [countdown, setCountdown] = useState(CODE_REFRESH_MS / 1000);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchToken = useCallback(async () => {
    setState('loading');
    setCountdown(CODE_REFRESH_MS / 1000);
    try {
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to generate token');
      }
      const data = await res.json();
      setToken(data.token);
      setCode(data.code);   // short display code returned alongside the JWT
      setState('active');
    } catch (err: any) {
      setErrorMsg(err.message);
      setState('error');
    }
  }, [shiftId]);

  useEffect(() => {
    fetchToken();
    intervalRef.current = setInterval(fetchToken, CODE_REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchToken]);

  useEffect(() => {
    if (state !== 'active') return;
    setCountdown(CODE_REFRESH_MS / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [state, token]);

  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset =
    circumference - (countdown / (CODE_REFRESH_MS / 1000)) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-white font-bold text-xl">{shiftName}</h2>
        <p className="text-slate-400 text-sm">
          Type this code in the app · Refreshes every 15 seconds
        </p>
      </div>

      {/* Code card */}
      <div className="relative bg-white rounded-2xl px-12 py-10 shadow-2xl shadow-blue-500/20 flex flex-col items-center gap-4 min-w-[320px]">
        {state === 'active' ? (
          <>
            {/* Big display code — split into two groups of 3 for readability */}
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-5xl tracking-[0.18em] text-slate-800 select-all">
                {code.slice(0, 3)}
              </span>
              <span className="text-slate-300 text-3xl font-light">·</span>
              <span className="font-mono font-bold text-5xl tracking-[0.18em] text-slate-800 select-all">
                {code.slice(3)}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Students enter this code in the attendance app
            </p>
          </>
        ) : state === 'loading' ? (
          <div className="h-[80px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 h-[80px] justify-center">
            <p className="text-red-500 font-medium text-sm text-center">{errorMsg}</p>
            <button
              onClick={fetchToken}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-500"
            >
              Retry
            </button>
          </div>
        )}

        {/* Countdown ring — top-right */}
        {state === 'active' && (
          <div className="absolute -top-4 -right-4 bg-slate-800 rounded-full p-1 shadow-lg">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="#334155" strokeWidth="4" />
              <circle
                cx="26" cy="26" r="20"
                fill="none"
                stroke={countdown <= 5 ? '#ef4444' : '#3b82f6'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 26 26)"
                style={{ transition: 'stroke-dashoffset 0.95s linear, stroke 0.3s' }}
              />
              <text x="26" y="31" textAnchor="middle" fill="white" fontSize="14"
                fontWeight="bold" fontFamily="monospace">
                {countdown}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${
          state === 'active' ? 'bg-green-400 animate-pulse' :
          state === 'loading' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
        }`} />
        <span className="text-slate-400">
          {state === 'active' ? `Refreshes in ${countdown}s` :
           state === 'loading' ? 'Generating new code...' : 'Error generating code'}
        </span>
      </div>
    </div>
  );
}