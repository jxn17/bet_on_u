import db from '@/api/db';

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.auth.resetPasswordRequest(email);
    } catch (e) {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-slate-900">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1">We'll send you a reset link</p>
        </div>
        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-slate-600 bg-emerald-50 p-4 rounded-xl">If an account exists with that email, we've sent a reset link.</p>
            <Link to="/login" className="text-sm text-violet-600 hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 rounded-xl" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Send Reset Link
            </Button>
            <Link to="/login" className="text-sm text-violet-600 hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}