import db from '@/api/db';

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-slate-900">New Password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a new password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          <div>
            <Label>New Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 rounded-xl" required />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1.5 rounded-xl" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
}