import db from '@/api/db';

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";

export default function Register() {
  const [step, setStep] = useState("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await db.auth.register({ email, password });
      if (data?.session) {
        window.location.href = "/";
        return;
      }
      setStep("otp");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const { access_token } = await db.auth.verifyOtp({ email, otpCode: otp });
      db.auth.setToken(access_token);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid code");
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

              <div className="my-6 flex items-center gap-3">
                <div className="h-0.5 flex-1 bg-ink/15" />
                <span className="eyebrow">// or</span>
                <div className="h-0.5 flex-1 bg-ink/15" />
              </div>

              <button type="button" onClick={() => db.auth.loginWithProvider("google", "/")} className="btn btn-line w-full">
                <GoogleIcon className="h-4 w-4" /> Continue with Google
              </button>

              <p className="mt-8 text-center font-mono text-xs text-ink/60">
                Already playing? <Link to="/login" className="font-bold text-ink hover:text-acid-deep">Sign in →</Link>
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow mb-3">// verify · code sent to {email}</p>
              <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
                check your <span className="mark">inbox.</span>
              </h1>

              <div className="mt-9 space-y-5">
                {error && (
                  <p className="border-2 border-flag bg-flag/10 px-3 py-2 font-mono text-xs text-flag">{error}</p>
                )}
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} className="h-12 w-11 border-2 border-ink font-mono text-lg" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <button onClick={handleVerify} disabled={loading || otp.length < 6} className="btn btn-ink w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Verify
                </button>
                <button onClick={handleResend} className="w-full text-center font-mono text-xs text-ink/60 underline decoration-2 underline-offset-4 hover:text-ink">
                  Resend code
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
