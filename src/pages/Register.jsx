import db from '@/api/db';

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
      // If the project auto-confirms emails, sign-up returns a session already.
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
    try {
      await db.auth.resendOtp(email);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">BI</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">
            {step === "register" ? "Create account" : "Verify email"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "register" ? "Join Bet It" : `We sent a code to ${email}`}
          </p>
        </div>

        {step === "register" ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 rounded-xl" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 rounded-xl" required />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1.5 rounded-xl" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Sign Up
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
            </div>
            <Button variant="outline" className="w-full rounded-xl h-11" type="button" onClick={() => db.auth.loginWithProvider("google", "/")}>
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-2" alt="" /> Continue with Google
            </Button>
            <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="text-violet-600 hover:underline">Sign in</Link></p>
          </form>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerify} disabled={loading || otp.length < 6} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Verify
            </Button>
            <button onClick={handleResend} className="text-sm text-violet-600 hover:underline w-full text-center">Resend code</button>
          </div>
        )}
      </div>
    </div>
  );
}