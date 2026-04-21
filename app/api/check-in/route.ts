import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // 1. Must be logged in
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Please log in before checking in.' },
      { status: 401 }
    );
  }

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
  }

  // 2. Find shift by code
  const { data: shift, error: shiftError } = await supabaseAdmin
    .from('shifts')
    .select('id, name, is_active')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (shiftError || !shift) {
    return NextResponse.json(
      { error: 'Code not found. Double-check and try again.' },
      { status: 404 }
    );
  }

  // 3. Check shift is still accepting check-ins
  if (!shift.is_active) {
    return NextResponse.json(
      { error: 'This shift is no longer accepting check-ins.' },
      { status: 400 }
    );
  }

  const istId = (session.user as any).istId as string;

  // 4. Ensure student row exists (safe upsert in case auth callback missed it)
  await supabaseAdmin
    .from('students')
    .upsert(
      { ist_id: istId, name: session.user?.name ?? 'Unknown', photo_url: session.user?.image ?? null },
      { onConflict: 'ist_id' }
    );

  // 5. Insert attendance — unique constraint prevents double check-in
  const { error: insertError } = await supabaseAdmin
    .from('attendance')
    .insert({ shift_id: shift.id, ist_id: istId });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already checked in for this shift.' },
        { status: 409 }
      );
    }
    console.error('Attendance insert error:', insertError);
    return NextResponse.json(
      { error: 'Database error. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Attendance recorded for "${shift.name}".`,
    istId,
    shiftId: shift.id,
    timestamp: new Date().toISOString(),
  });
}