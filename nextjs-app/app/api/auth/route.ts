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

  const origin = request.headers.get('origin') ?? '';
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${origin}/` },
  });

  if (error) {
    const isEmailError = /sending|email/i.test(error.message);
    const message = isEmailError
      ? 'Could not send the login link. If you requested one recently, please wait a few minutes and try again.'
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ message: 'Check your email for a login link.' });
}

// DELETE /api/auth — signs the user out and clears the session cookie.
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return new NextResponse(null, { status: 204 });
}
