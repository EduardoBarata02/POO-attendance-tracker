import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ istId: string }> } // FIXED: Await the Promise
) {
  // Extract the ID from the Promise
  const params = await props.params;
  
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionIstId = (session.user as any).istId as string;

  // Security check
  if (sessionIstId !== params.istId && (session.user as any).role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch from Supabase
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('id, timestamp, shift_id, shifts(name, start_time)')
    .eq('ist_id', params.istId) // Safely use the awaited parameter
    .order('timestamp', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}