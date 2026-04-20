import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
  }

  const cleanCode = code.toUpperCase().trim();

  // Look for the code in Supabase
  const { data: entry, error } = await supabaseAdmin
    .from('active_codes')
    .select('token, expires_at')
    .eq('code', cleanCode)
    .single();

  // Check if it exists and hasn't expired
  if (error || !entry || new Date(entry.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'Code not found or expired. Please check the code on the projector.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ token: entry.token });
}