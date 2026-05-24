'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function AuthForm({ user }: { user: User | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    if (!email.trim()) return;
    setBusy(true);
    setStatus(null);

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    setStatus(res.ok ? json.message : json.error);
    setBusy(false);
  }

  async function signOut() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.refresh();
  }

  if (user) {
    return (
      <div id="user-info">
        <span id="user-email">{user.email}</span>
        <button type="button" id="sign-out" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div id="auth-form">
      <input
        id="auth-email"
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="button" id="send-link" onClick={sendLink} disabled={busy}>
        {busy ? 'Sending…' : 'Send login link'}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
