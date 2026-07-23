import db from '@/api/db';

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight, MailCheck } from "lucide-react";

export default function Register() {
  const [step, setStep] = useState("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await db.auth.register({ email, password, full_name: name.trim() || undefined });
      if (data?.session) {
        window.location.href = "/";
        return;
      }
      setStep("sent");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try { await db.auth.resendOtp(email); } catch (e) { /* ignore */ }
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
        <span className="eyebrow hidden sm:block">// 1000 free coins</span>
      </header>

      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          {step === "register" ? (
            <>
              <p className="eyebrow mb-3">// new player</p>
              <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
                get in the <span className="mark">game.</span>
              </h1>

              <form onSubmit={handleRegister} className="mt-9 space-y-5">
                {error && (
                  <p className="border-2 border-flag bg-flag/10 px-3 py-2 font-mono text-xs text-flag">{error}</p>
                )}
                <div>
                  <label className="eyebrow">// display name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="inp mt-1.5" placeholder="what your crew calls you" maxLength={40} required />
                </div>
                <div>
                  <label className="eyebrow">// email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="inp mt-1.5" placeholder="you@email.com" required />
                </div>
                <div>
                  <label className="eyebrow">// password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="inp mt-1.5" placeholder="••••••••" required />
                </div>
                <div>
                  <label className="eyebrow">// confirm password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="inp mt-1.5" placeholder="••••••••" required />
                </div>
                <button type="submit" disabled={loading} className="btn btn-ink w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Create Account
                </button>
              </form>

              <p className="mt-8 text-center font-mono text-xs text-ink/60">
                Already playing? <Link to="/login" className="font-bold text-ink hover:text-acid-deep">Sign in →</Link>
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow mb-3">// almost in</p>
              <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
                check your <span className="mark">inbox.</span>
              </h1>

              <div className="mt-9 space-y-5">
                <div className="flex items-start gap-3 border-2 border-ink bg-card p-4">
                  <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-acid-deep" />
                  <p className="font-mono text-xs leading-relaxed text-ink/80">
                    We sent a confirmation link to <span className="font-bold text-ink">{email}</span>. Click it to activate your account, then come back and sign in.
                  </p>
                </div>
                <Link to="/login" className="btn btn-ink w-full">
                  <ArrowRight className="h-4 w-4" /> Go to sign in
                </Link>
                <button onClick={handleResend} className="w-full text-center font-mono text-xs text-ink/60 underline decoration-2 underline-offset-4 hover:text-ink">
                  Didn't get it? Resend email
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
