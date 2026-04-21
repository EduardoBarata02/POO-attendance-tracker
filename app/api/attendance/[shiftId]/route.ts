import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Force Next.js to never cache this route so the teacher sees live updates
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ shiftId: string }> } // 1. Set params to be a Promise
) {
  // 2. Await the params before trying to use them
  const params = await props.params;
  const urlShiftId = params.shiftId;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if ((session?.user as any)?.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Fetch attendance rows for this shift
  // 3. Query using the awaited urlShiftId
  const { data: attendanceRows, error: attError } = await supabaseAdmin
    .from('attendance')
    .select('id, shift_id, ist_id, timestamp')
    .eq('shift_id', urlShiftId)
    .order('timestamp', { ascending: true });

  if (attError) {
    return NextResponse.json({ error: attError.message }, { status: 500 });
  }
  if (!attendanceRows || attendanceRows.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Collect all ist_ids and fetch matching student rows
  const istIds = attendanceRows.map((r) => r.ist_id);
  const { data: studentRows, error: stuError } = await supabaseAdmin
    .from('students')
    .select('ist_id, name, photo_url')
    .in('ist_id', istIds);

  if (stuError) {
    console.error('Student fetch error:', stuError);
  }

  // 3. Build a lookup map for O(1) access
  const studentMap = new Map(
    (studentRows ?? []).map((s) => [s.ist_id, s])
  );

  // 4. Merge attendance rows with student data and return
  const merged = attendanceRows.map((row) => ({
    ...row,
    students: studentMap.get(row.ist_id) ?? {
      ist_id: row.ist_id,
      name: row.ist_id, // fallback: show ist_id if student row is missing
      photo_url: null,
    },
  }));

  return NextResponse.json(merged);
}