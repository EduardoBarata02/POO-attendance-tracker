import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Optional but highly recommended: Force Next.js to never cache this route
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ istId: string }> } // 1. Set params to be a Promise
) {
  // 2. Await the params before trying to use them
  const params = await props.params;
  const urlIstId = params.istId;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionIstId = (session.user as any).istId as string;

  // Students can only query their own records; teachers can query anyone
  // 3. Compare using the awaited urlIstId
  if (sessionIstId !== urlIstId && (session.user as any).role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Fetch attendance rows for this student
  // 4. Query using the awaited urlIstId
  const { data: attendanceRows, error: attError } = await supabaseAdmin
    .from('attendance')
    .select('id, shift_id, ist_id, timestamp')
    .eq('ist_id', urlIstId) 
    .order('timestamp', { ascending: false });

  if (attError) {
    return NextResponse.json({ error: attError.message }, { status: 500 });
  }
  if (!attendanceRows || attendanceRows.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Collect all shift_ids and fetch matching shift rows
  const shiftIds = attendanceRows.map((r) => r.shift_id);
  const { data: shiftRows, error: shiftError } = await supabaseAdmin
    .from('shifts')
    .select('id, name, start_time, end_time, is_active')
    .in('id', shiftIds);

  if (shiftError) {
    console.error('Shift fetch error:', shiftError);
  }

  // 3. Build a lookup map
  const shiftMap = new Map(
    (shiftRows ?? []).map((s) => [s.id, s])
  );

  // 4. Merge and return
  const merged = attendanceRows.map((row) => ({
    ...row,
    shifts: shiftMap.get(row.shift_id) ?? {
      id: row.shift_id,
      name: 'Unknown shift',
      start_time: null,
      end_time: null,
      is_active: false,
    },
  }));

  return NextResponse.json(merged);
}