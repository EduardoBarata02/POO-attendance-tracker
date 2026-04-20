'use client';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

type CheckInStatus = 'idle' | 'loading' | 'success' | 'expired' | 'duplicate' | 'error';

function CheckInContent() {
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>('idle');
  const [message, setMessage] = useState('');
  const [hasAttempted, setHasAttempted] = useState(false);

  // Auto-trigger check-in once authenticated + token present
  useEffect(() => {
    if (authStatus === 'authenticated' && token && !hasAttempted) {
      setHasAttempted(true);
      performCheckIn();
    }
  }, [authStatus, token]);

  const performCheckIn = async () => {
    setCheckInStatus('loading');

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setCheckInStatus('success');
        setMessage(data.message);
      } else if (res.status === 410) {
        setCheckInStatus('expired');
        setMessage(data.error);
      } else if (res.status === 409) {
        setCheckInStatus('duplicate');
        setMessage(data.error);
      } else {
        setCheckInStatus('error');
        setMessage(data.error ?? 'Something went wrong.');
      }
    } catch {
      setCheckInStatus('error');
      setMessage('Network error. Please check your connection.');
    }
  };

  if (!token) {
    return (
      <StatusCard
        emoji="⚠️"
        title="Invalid Link"
        message="This QR code link is missing its token. Please scan again."
        color="yellow"
      />
    );
  }

  if (authStatus === 'loading' || checkInStatus === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent" />
        <p className="text-slate-400">
          {authStatus === 'loading' ? 'Verifying your identity...' : 'Recording attendance...'}
        </p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-6xl">🔐</div>
        <div>
          <h2 className="text-white text-xl font-bold">Login Required</h2>
          <p className="text-slate-400 mt-2 text-sm">
            You need to sign in with your IST account before checking in.
          </p>
        </div>
        <button
          onClick={() =>
            signIn('fenix', {
              callbackUrl: `/check-in?token=${token}`,
            })
          }
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl"
        >
          Sign in with FenixEdu
        </button>
      </div>
    );
  }

  const statusConfig: Record<CheckInStatus, { emoji: string; title: string; color: string }> = {
    idle: { emoji: '⏳', title: 'Processing...', color: 'blue' },
    loading: { emoji: '⏳', title: 'Processing...', color: 'blue' },
    success: { emoji: '✅', title: 'Checked In!', color: 'green' },
    expired: { emoji: '⏰', title: 'QR Code Expired', color: 'yellow' },
    duplicate: { emoji: '👍', title: 'Already Checked In', color: 'blue' },
    error: { emoji: '❌', title: 'Check-In Failed', color: 'red' },
  };

  const cfg = statusConfig[checkInStatus];

  return (
    <StatusCard
      emoji={cfg.emoji}
      title={cfg.title}
      message={message}
      color={cfg.color}
      studentName={session?.user?.name ?? undefined}
      onRetry={checkInStatus === 'error' ? () => {
        setHasAttempted(false);
        setCheckInStatus('idle');
      } : undefined}
    />
  );
}

interface StatusCardProps {
  emoji: string;
  title: string;
  message: string;
  color: string;
  studentName?: string;
  onRetry?: () => void;
}

function StatusCard({ emoji, title, message, color, studentName, onRetry }: StatusCardProps) {
  const borderColor = {
    green: 'border-green-500/30',
    yellow: 'border-yellow-500/30',
    red: 'border-red-500/30',
    blue: 'border-blue-500/30',
  }[color] ?? 'border-white/10';

  return (
    <div className={`bg-white/5 border ${borderColor} rounded-2xl p-8 text-center flex flex-col items-center gap-4 max-w-sm w-full`}>
      <div className="text-6xl">{emoji}</div>
      <div>
        <h2 className="text-white text-xl font-bold">{title}</h2>
        {studentName && (
          <p className="text-slate-400 text-sm mt-1">{studentName}</p>
        )}
      </div>
      <p className="text-slate-300 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm"
        >
          Try Again
        </button>
      )}
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
      <Suspense fallback={
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      }>
        <CheckInContent />
      </Suspense>
    </div>
  );
}