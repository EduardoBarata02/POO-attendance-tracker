'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session.user as any).role;
      router.push(role === 'teacher' ? '/teacher' : '/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl max-w-sm w-full mx-4">
        {/* IST Logo placeholder */}
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
          IST
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Attendance System</h1>
          <p className="text-slate-400 mt-1 text-sm">Instituto Superior Técnico</p>
        </div>

        <button
          onClick={() => signIn('fenix', { callbackUrl: '/' })}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-150 shadow-md hover:shadow-blue-500/30 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Sign in with FenixEdu
        </button>

        <p className="text-xs text-slate-500 text-center">
          Use your IST credentials. Your ist-id will be used to record attendance.
        </p>
      </div>
    </div>
  );
}