import db from '@/api/db';

import React, { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError("");
    try {
      await db.auth.resetPassword({ resetToken: token, newPassword: password });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center bg-acid">
            <span className="font-mono text-sm font-bold text-night">BU</span>
          </div>
          <span className="font-display text-lg font-black uppercase tracking-tight">Bet on U</span>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-3">// new password</p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
            pick a new <span className="mark">one.</span>
          </h1>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            {error && (
              <p className="border-2 border-flag bg-flag/10 px-3 py-2 font-mono text-xs text-flag">{error}</p>
            )}
            <div>
              <label className="eyebrow">// new password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="inp mt-1.5" placeholder="••••••••" required />
            </div>
            <div>
              <label className="eyebrow">// confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="inp mt-1.5" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-ink w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Reset password
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
