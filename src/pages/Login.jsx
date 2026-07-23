import db from '@/api/db';

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await db.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center bg-acid">
            <span className="font-mono text-sm font-bold text-night">BI</span>
          </div>
          <span className="font-display text-lg font-black uppercase tracking-tight">Bet It</span>
        </div>
        <span className="eyebrow hidden sm:block">// house money · real stakes</span>
      </header>

      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-3">// sign in</p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
            welcome<br />
            <span className="mark">back.</span>
          </h1>

          <form onSubmit={handleLogin} className="mt-9 space-y-5">
            {error && (
              <p className="border-2 border-flag bg-flag/10 px-3 py-2 font-mono text-xs text-flag">{error}</p>
            )}
            <div>
              <label className="eyebrow">// email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="inp mt-1.5"
                placeholder="you@email.com"
                required
              />
            </div>
            <div>
              <label className="eyebrow">// password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="inp mt-1.5"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-ink w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Sign In
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between font-mono text-xs text-ink/60">
            <Link to="/forgot-password" className="underline decoration-2 underline-offset-4 hover:text-ink">
              Forgot password?
            </Link>
            <Link to="/register" className="text-ink hover:text-acid-deep">
              No account? <span className="font-bold">Sign up →</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
