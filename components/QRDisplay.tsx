'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QR_REFRESH_MS = 15_000; // 15 seconds

interface QRDisplayProps {
  shiftId: string;
  shiftName: string;
}

type QRState = 'loading' | 'active' | 'error';

export default function QRDisplay({ shiftId, shiftName }: QRDisplayProps) {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<QRState>('loading');
  const [countdown, setCountdown] = useState(QR_REFRESH_MS / 1000);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchToken = useCallback(async () => {
    setState('loading');
    setCountdown(QR_REFRESH_MS / 1000);

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
      setState('active');
    } catch (err: any) {
      setErrorMsg(err.message);
      setState('error');
    }
  }, [shiftId]);

  // Initial fetch + polling every 15s
  useEffect(() => {
    fetchToken();
    intervalRef.current = setInterval(fetchToken, QR_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchToken]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'active') return;
    setCountdown(QR_REFRESH_MS / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [state, token]);

  const checkInUrl = token
    ? `${window.location.origin}/check-in?token=${token}`
    : '';

  const circumference = 2 * Math.PI * 20; // r=20
  const strokeDashoffset =
    circumference - (countdown / (QR_REFRESH_MS / 1000)) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-white font-bold text-xl">{shiftName}</h2>
        <p className="text-slate-400 text-sm">Scan to check in · Refreshes every 15 seconds</p>
      </div>

      {/* QR Code card */}
      <div className="relative bg-white rounded-2xl p-6 shadow-2xl shadow-blue-500/20">
        {state === 'active' && token ? (
          <QRCodeSVG
            value={checkInUrl}
            size={400}             // 1. Make it much bigger
            level="H"
            includeMargin={true}   // 2. Add the mandatory white border
            // 3. Temporarily comment out the imageSettings to ensure the logo isn't breaking it
            /* imageSettings={{
              src: '/ist-logo.png',
              height: 48,
              width: 48,
              excavate: true,
            }} */
          />
        ) : state === 'loading' ? (
          <div className="w-[280px] h-[280px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">⚠️</span>
            <p className="text-red-500 font-medium text-center text-sm">{errorMsg}</p>
            <button
              onClick={fetchToken}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-500"
            >
              Retry
            </button>
          </div>
        )}

        {/* Countdown overlay ring — top-right corner */}
        {state === 'active' && (
          <div className="absolute -top-4 -right-4 bg-slate-800 rounded-full p-1 shadow-lg">
            <svg width="52" height="52" viewBox="0 0 52 52">
              {/* Track */}
              <circle
                cx="26" cy="26" r="20"
                fill="none" stroke="#334155"
                strokeWidth="4"
              />
              {/* Progress */}
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
              <text
                x="26" y="31"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                fontFamily="monospace"
              >
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
          state === 'loading' ? 'bg-yellow-400 animate-pulse' :
          'bg-red-400'
        }`} />
        <span className="text-slate-400">
          {state === 'active' ? `Next refresh in ${countdown}s` :
           state === 'loading' ? 'Generating new code...' :
           'Error generating code'}
        </span>
      </div>
    </div>
  );
}