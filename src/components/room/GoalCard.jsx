import React from "react";
import { format } from "date-fns";

export default function GoalCard({ goal }) {
  const rate = goal.total_checkins_required > 0
    ? Math.round((goal.approved_checkins / goal.total_checkins_required) * 100)
    : 0;

  const stampClass = {
    active: "border-ink text-ink",
    succeeded: "border-ink bg-acid text-night",
    failed: "border-flag text-flag",
  }[goal.status] || "border-ink text-ink";

  return (
    <div className="border-2 border-ink bg-card">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h4 className="font-display text-lg font-black uppercase leading-tight tracking-tight">{goal.title}</h4>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-ink/55">// {goal.user_name}</p>
        </div>
        <span className={`stamp shrink-0 ${stampClass}`}>{goal.status}</span>
      </div>

      <div className="mx-4 border-t-2 border-dashed border-ink/25" />

      <div className="space-y-1.5 p-4 pt-3 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-ink/55">STAKE</span>
          <span className="font-bold">{goal.stake_amount} 🪙</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink/55">DEADLINE</span>
          <span className="font-bold">{goal.deadline ? format(new Date(goal.deadline), "MMM d, yyyy") : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink/55">CHECK-INS</span>
          <span className="font-bold">{goal.approved_checkins}/{goal.total_checkins_required} · {rate}%</span>
        </div>
      </div>

      {goal.status === "active" && goal.total_checkins_required > 0 && (
        <div className="mx-4 mb-4 h-3 border-2 border-ink">
          <div className="h-full bg-acid transition-all" style={{ width: `${Math.min(100, rate)}%` }} />
        </div>
      )}
    </div>
  );
}
