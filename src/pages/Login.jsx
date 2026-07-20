import db from '@/api/db';

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">BI</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to Bet It</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 rounded-xl" required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 rounded-xl" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Sign In
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
        </div>

        <Button
          variant="outline"
          className="w-full rounded-xl h-11"
          onClick={() => db.auth.loginWithProvider("google", "/")}
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 mr-2" alt="" />
          Continue with Google
        </Button>

        <div className="text-center text-sm text-slate-500 space-y-1">
          <Link to="/forgot-password" className="text-violet-600 hover:underline block">Forgot password?</Link>
          <p>Don't have an account? <Link to="/register" className="text-violet-600 hover:underline">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}