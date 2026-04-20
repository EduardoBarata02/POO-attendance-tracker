import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

declare global {
  // eslint-disable-next-line no-var
  var __activeTokens: Map<string, { token: string; expiresAt: number }> | undefined;
}
globalThis.__activeTokens ??= new Map();

export function registerToken(code: string, token: string) {
  globalThis.__activeTokens!.set(code.toUpperCase(), {
    token,
    expiresAt: Date.now() + 15_000,
  });
  
  for (const [k, v] of globalThis.__activeTokens!.entries()) {
    if (v.expiresAt < Date.now()) globalThis.__activeTokens!.delete(k);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Please log in first.' }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
  }

  const entry = globalThis.__activeTokens!.get(code.toUpperCase().trim());
  if (!entry || entry.expiresAt < Date.now()) {
    return NextResponse.json(
      { error: 'Code not found or expired. Please check the code on the projector and try again.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ token: entry.token });
}