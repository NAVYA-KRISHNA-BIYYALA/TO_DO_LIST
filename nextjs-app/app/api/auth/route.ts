import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/auth  — sends a magic-link OTP to the given email.
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { email } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Check your email for a login link.' });
}

// DELETE /api/auth — signs the user out and clears the session cookie.
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return new NextResponse(null, { status: 204 });
}
