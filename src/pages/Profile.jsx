import db from '@/api/db';

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, locked: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await db.auth.me();
        setUser(u);
        setWallet(await db.wallet.get());
        setGoals(await db.entities.Goal.filter({ user_id: u.id }));
        setPayouts(await db.entities.Payout.filter({ to_user_id: u.id }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink" />
      </div>
    );
  }

  const totalEarned = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  const succeeded = goals.filter(g => g.status === "succeeded").length;
  const failed = goals.filter(g => g.status === "failed").length;
  const lostAmount = goals.filter(g => g.status === "failed").reduce((s, g) => s + (g.stake_amount || 0), 0);
  const netPL = totalEarned - lostAmount;

  const stats = [
    { label: "goals set", value: goals.length },
    { label: "succeeded", value: succeeded },
    { label: "failed", value: failed },
    { label: "net p/l 🪙", value: `${netPL >= 0 ? "+" : ""}${netPL}` },
  ];

  return (
    <div className="space-y-8">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center border-2 border-ink bg-acid">
          <span className="font-display text-2xl font-black text-night">{(user?.full_name || user?.email || "?")[0].toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="eyebrow">// player</p>
          <h1 className="truncate font-display text-2xl font-black uppercase tracking-tight">{user?.full_name || "Player"}</h1>
          <p className="truncate font-mono text-xs text-ink/55">{user?.email}</p>
        </div>
      </div>

      {/* Wallet block */}
      <div className="flex items-end justify-between border-2 border-ink bg-night p-5 text-cream shadow-hard">
        <div>
          <p className="eyebrow text-acid">// wallet</p>
          <p className="mt-1 font-display text-5xl font-black leading-none">{wallet.balance}</p>
        </div>
        <p className="font-mono text-xs text-cream/60">{wallet.locked} in play</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className="tile">
            <p className="eyebrow">// {s.label}</p>
            <p className="mt-1 font-display text-3xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Earnings */}
      <div>
        <p className="eyebrow mb-3">// recent earnings</p>
        {payouts.length === 0 ? (
          <div className="border-2 border-dashed border-ink/40 py-6 text-center font-mono text-sm text-ink/50">No earnings yet.</div>
        ) : (
          <div className="space-y-2">
            {payouts.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between border-2 border-ink bg-card p-3">
                <p className="font-mono text-xs text-ink/70">{p.reason}</p>
                <span className="font-mono text-sm font-bold">+{p.amount} 🪙</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
