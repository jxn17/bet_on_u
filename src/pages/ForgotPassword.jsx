import db from '@/api/db';

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await db.auth.resetPasswordRequest(email); } catch (e) { /* ignore */ }
    setSent(true);
    setLoading(false);
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
      </header>

      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-3">// reset</p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
            forgot your <span className="mark">password?</span>
          </h1>

          {sent ? (
            <div className="mt-9 space-y-6">
              <p className="border-2 border-ink bg-acid/20 px-4 py-3 font-mono text-xs">
                If an account exists for that email, a reset link is on its way.
              </p>
              <Link to="/login" className="btn btn-line w-full">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <label className="eyebrow">// email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="inp mt-1.5" placeholder="you@email.com" required />
              </div>
              <button type="submit" disabled={loading} className="btn btn-ink w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Send reset link
              </button>
              <Link to="/login" className="flex items-center justify-center gap-1.5 font-mono text-xs text-ink/60 hover:text-ink">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
