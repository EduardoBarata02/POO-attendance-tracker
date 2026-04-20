import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Only teachers can generate tokens
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

  // Verify shift exists and is active
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

  // Sign a short-lived JWT — expires in exactly 15 seconds
  const token = jwt.sign(
    {
      shiftId,
      issuedBy: (session.user as any).istId,
      purpose: 'attendance-checkin', // Extra claim to prevent token reuse from other endpoints
    },
    process.env.QR_JWT_SECRET!,
    { expiresIn: '15s' }
  );

  return NextResponse.json({ token });
}