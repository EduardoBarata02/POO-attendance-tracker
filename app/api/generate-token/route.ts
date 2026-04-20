import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Generates a 6-char alphanumeric code — uppercase only to avoid 0/O, 1/I confusion
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if ((session.user as any).role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden: teachers only' }, { status: 403 });
  }

  const { shiftId } = await req.json();
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId is required' }, { status: 400 });
  }

  const { data: shift, error } = await supabaseAdmin
    .from('shifts')
    .select('id, is_active')
    .eq('id', shiftId)
    .single();

  if (error || !shift) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
  }
  if (!shift.is_active) {
    return NextResponse.json({ error: 'Shift is not active' }, { status: 400 });
  }

  const code = generateShortCode();

  const token = jwt.sign(
    {
      shiftId,
      code,
      issuedBy: (session.user as any).istId,
      purpose: 'attendance-checkin',
    },
    process.env.QR_JWT_SECRET!,
    { expiresIn: '15s' }
  );

  // Save the code and token to Supabase for 15 seconds
  await supabaseAdmin.from('active_codes').upsert({
    code: code,
    token: token,
    expires_at: new Date(Date.now() + 15000).toISOString()
  });

  return NextResponse.json({ token, code });
}