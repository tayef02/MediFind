'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getProfile, homeFor } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkLoggedIn() {
      const profile = await getProfile();
      if (profile) {
        router.push(homeFor(profile.role));
      }
    }
    checkLoggedIn();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const profile = await getProfile();
    if (!profile) {
      await supabase.auth.signOut();
      setError('Profile not found. Please register again.');
      setLoading(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      router.push(next);
    } else {
      router.push(homeFor(profile.role));
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand">MediFind</Link>
        <h1>Login</h1>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="muted center">
            New here? <Link href="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
