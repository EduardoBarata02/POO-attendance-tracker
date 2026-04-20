import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// 1. Define the type to match your folder name [istId]
type RouteParams = {
  params: Promise<{ istId: string }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteParams // 2. Use the Promise type here
) {
  // 3. You MUST await the params before accessing istId
  const { istId } = await params;

  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select(`
      id,
      timestamp,
      shift_id,
      shifts ( name, start_time )
    `)
    .eq('ist_id', istId)
    .order('timestamp', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json(data);
}