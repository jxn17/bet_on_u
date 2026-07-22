import db from '@/api/db';

import React, { useState, useEffect } from "react";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, locked: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const u = await db.auth.me();
        setUser(u);
        setNameDraft(u.full_name || "");
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

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name) { toast({ title: "Name can't be empty", variant: "destructive" }); return; }
    setSavingName(true);
    try {
      await db.profile.updateName(name);
      setUser(u => ({ ...u, full_name: name }));
      setEditing(false);
      toast({ title: "Name updated" });
    } catch (e) {
      toast({ title: "Couldn't save name", description: e.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink" />
      </div>
    );
  }

  const history = [...payouts].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const totalEarned = payouts.filter(p => p.kind === "jackpot").reduce((s, p) => s + (p.amount || 0), 0);
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

  const displayName = user?.full_name || "Player";

  return (
    <div className="space-y-8">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center border-2 border-ink bg-acid">
          <span className="font-display text-2xl font-black text-night">{(displayName || "?")[0].toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">// player</p>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }}
                maxLength={40}
                placeholder="Your name"
                className="inp h-10 flex-1"
              />
              <button onClick={saveName} disabled={savingName} aria-label="Save name" className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-acid text-night disabled:opacity-40">
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button onClick={() => { setEditing(false); setNameDraft(user?.full_name || ""); }} aria-label="Cancel" className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-2xl font-black uppercase tracking-tight">{displayName}</h1>
              <button onClick={() => setEditing(true)} aria-label="Edit name" className="grid h-7 w-7 shrink-0 place-items-center border-2 border-ink text-ink transition-colors hover:bg-ink hover:text-paper">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-0.5 truncate font-mono text-xs text-ink/45">{user?.email}</p>
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

      {/* Ledger — wins and losses */}
      <div>
        <p className="eyebrow mb-3">// bet history</p>
        {history.length === 0 ? (
          <div className="border-2 border-dashed border-ink/40 py-6 text-center font-mono text-sm text-ink/50">
            No settled bets yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 12).map(p => {
              const lost = p.kind === "forfeit";
              return (
                <div key={p.id} className="flex items-center justify-between border-2 border-ink bg-card p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${lost ? "bg-flag text-cream" : "bg-acid text-night"}`}>
                      {lost ? "lost" : "won"}
                    </span>
                    <p className="truncate font-mono text-xs text-ink/60">{p.reason}</p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-bold ${lost ? "text-flag" : "text-ink"}`}>
                    {lost ? "−" : "+"}{p.amount} 🪙
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
