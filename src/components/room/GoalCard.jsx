import React from "react";
import { Target, Calendar, Coins, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function GoalCard({ goal, onClick }) {
  const successRate = goal.total_checkins_required > 0
    ? Math.round((goal.approved_checkins / goal.total_checkins_required) * 100)
    : 0;

  const statusColors = {
    active: "bg-violet-50 text-violet-600",
    succeeded: "bg-emerald-50 text-emerald-600",
    failed: "bg-red-50 text-red-600",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 hover:border-violet-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Target className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">{goal.title}</h4>
            <p className="text-xs text-slate-400">{goal.user_name}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColors[goal.status]}`}>
          {goal.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Coins className="w-3 h-3 text-amber-500" />{goal.stake_amount}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />{goal.deadline ? format(new Date(goal.deadline), "MMM d") : "—"}
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />{successRate}%
        </span>
      </div>

      {goal.status === "active" && goal.total_checkins_required > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {goal.approved_checkins}/{goal.total_checkins_required} check-ins approved
          </p>
        </div>
      )}
    </button>
  );
}