import db from '@/api/db';

import React, { useState, useEffect } from "react";

import { Loader2, Trophy, Target, TrendingDown, Coins } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await db.auth.me();
        setUser(u);
        const g = await db.entities.Goal.filter({ user_id: u.id });
        setGoals(g);
        const p = await db.entities.Payout.filter({ to_user_id: u.id });
        setPayouts(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  const totalEarned = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  const succeeded = goals.filter(g => g.status === "succeeded").length;
  const failed = goals.filter(g => g.status === "failed").length;
  const lostAmount = goals.filter(g => g.status === "failed").reduce((s, g) => s + (g.stake_amount || 0), 0);
  const netPL = totalEarned - lostAmount;

  const stats = [
    { label: "Goals Set", value: goals.length, icon: Target, color: "text-violet-600 bg-violet-50" },
    { label: "Succeeded", value: succeeded, icon: Trophy, color: "text-emerald-600 bg-emerald-50" },
    { label: "Failed", value: failed, icon: TrendingDown, color: "text-red-600 bg-red-50" },
    { label: "Net P/L", value: `${netPL >= 0 ? "+" : ""}${netPL} 🪙`, icon: Coins, color: netPL >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
  ];

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center pt-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-2xl font-bold">
            {(user?.full_name || user?.email || "?")[0].toUpperCase()}
          </span>
        </div>
        <h1 className="text-xl font-heading font-bold text-slate-900">{user?.full_name || "User"}</h1>
        <p className="text-sm text-slate-400">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-heading font-semibold text-slate-900 mb-3">Recent Earnings</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No earnings yet.</p>
        ) : (
          <div className="space-y-2">
            {payouts.slice(0, 10).map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
                <p className="text-sm text-slate-600">{p.reason}</p>
                <span className="text-sm font-bold text-emerald-600">+{p.amount} 🪙</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}