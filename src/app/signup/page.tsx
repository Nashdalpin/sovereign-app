'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm luxury-blur luxury-shadow rounded-3xl border border-border dark:border-white/10 p-8 bg-card/95 dark:bg-white/[0.04]">
        <div className="text-center mb-8">
          <p className="text-[9px] font-black uppercase tracking-[1em] opacity-40 gold-glow">Sovereign</p>
          <h1 className="mt-4 text-2xl font-light tracking-[0.4em] uppercase text-foreground luxury-text">Create account</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-4 py-2.5 font-bold uppercase tracking-wider">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="luxury-input w-full h-12"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-2">
              Password (min 6 characters)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="luxury-input w-full h-12"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-touch w-full h-14 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.8em] luxury-shadow hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
