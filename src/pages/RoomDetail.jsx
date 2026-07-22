import db from '@/api/db';

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Check, Loader2, Target, Upload, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays } from "date-fns";
import GoalCard from "@/components/room/GoalCard";
import CheckInCard from "@/components/room/CheckInCard";

const selectCls = "mt-1.5 h-12 rounded-none border-2 border-ink bg-paper/50 px-3.5 font-mono text-sm";

export default function RoomDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [settling, setSettling] = useState(false);

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", description: "", stake_amount: "", deadline: "", checkin_frequency: "weekly" });
  const [creatingGoal, setCreatingGoal] = useState(false);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInGoalId, setCheckInGoalId] = useState("");
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInFile, setCheckInFile] = useState(null);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  useEffect(() => { loadAll(); }, [roomId]);

  const loadAll = async () => {
    try {
      await db.checkins.resolveDue(roomId).catch(() => {});
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setRoom(await db.entities.Room.get(roomId));
      setMembers(await db.entities.RoomMember.filter({ room_id: roomId }));
      setGoals(await db.entities.Goal.filter({ room_id: roomId }));
      const c = await db.entities.CheckIn.filter({ room_id: roomId });
      setCheckIns(c.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setPayouts(await db.entities.Payout.filter({ room_id: roomId }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateGoal = async () => {
    if (!goalForm.title || !goalForm.stake_amount || !goalForm.deadline) return;
    setCreatingGoal(true);
    try {
      const days = differenceInDays(new Date(goalForm.deadline), new Date());
      let totalCheckins = 0;
      if (goalForm.checkin_frequency === "daily") totalCheckins = days;
      else if (goalForm.checkin_frequency === "weekly") totalCheckins = Math.max(1, Math.ceil(days / 7));
      else totalCheckins = Math.max(1, Math.ceil(days / 14));

      await db.goals.place({
        room_id: roomId,
        title: goalForm.title,
        description: goalForm.description,
        stake_amount: parseInt(goalForm.stake_amount, 10),
        deadline: goalForm.deadline,
        checkin_frequency: goalForm.checkin_frequency,
        total_checkins_required: totalCheckins,
      });
      setGoalForm({ title: "", description: "", stake_amount: "", deadline: "", checkin_frequency: "weekly" });
      setGoalOpen(false);
      toast({ title: "Goal set", description: `${goalForm.stake_amount} 🪙 locked in.` });
      loadAll();
    } catch (e) {
      toast({ title: "Couldn't set goal", description: e.message, variant: "destructive" });
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleCheckIn = async () => {
    if (!checkInGoalId) return;
    setSubmittingCheckIn(true);
    try {
      let proof_image_url = "";
      if (checkInFile) {
        const { file_url } = await db.integrations.Core.UploadFile({ file: checkInFile });
        proof_image_url = file_url;
      }
      await db.checkins.submit({ goal_id: checkInGoalId, proof_image_url, note: checkInNote });
      setCheckInGoalId("");
      setCheckInNote("");
      setCheckInFile(null);
      setCheckInOpen(false);
      toast({ title: "Check-in submitted", description: "Your group will vote on it." });
      loadAll();
    } catch (e) {
      toast({ title: "Couldn't submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleSettle = async () => {
    if (!window.confirm("Settle this season? Failed stakes go to the jackpot and split among everyone who succeeded. Can't be undone.")) return;
    setSettling(true);
    try {
      await db.rooms.settle(roomId);
      toast({ title: "Season settled", description: "Jackpot paid out to achievers." });
      loadAll();
    } catch (e) {
      toast({ title: "Couldn't settle", description: e.message, variant: "destructive" });
    } finally {
      setSettling(false);
    }
  };

  const isCreator = room && user && room.created_by === user.id;
  const myGoals = goals.filter(g => g.user_id === user?.id && g.status === "active");
  const activeGoals = goals.filter(g => g.status === "active");

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink" />
      </div>
    );
  }

  if (!room) {
    return <p className="py-12 text-center font-mono text-sm text-ink/60">Room not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink/60 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Room header — always-dark ink block */}
      <div className="border-2 border-ink bg-night p-5 text-cream">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-acid">// room</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase leading-none tracking-tight">{room.name}</h1>
            {room.description && <p className="mt-2 font-mono text-xs text-cream/55">{room.description}</p>}
          </div>
          <button onClick={copyCode} className="flex shrink-0 items-center gap-1.5 border-2 border-acid bg-acid px-3 py-1.5 font-mono text-sm font-bold text-night">
            {room.invite_code}
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="border border-cream/30 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-cream/70">Season {room.round}</span>
          <span className="bg-acid px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-night">{room.jackpot || 0} 🪙 jackpot</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {members.map(m => (
            <span key={m.id} className="flex items-center gap-1.5 border border-cream/25 px-2 py-1">
              <span className="grid h-4 w-4 place-items-center bg-acid font-mono text-[8px] font-bold text-night">{(m.user_name || "?")[0].toUpperCase()}</span>
              <span className="font-mono text-[11px] text-cream/80">{m.user_name}</span>
            </span>
          ))}
        </div>

        {isCreator && activeGoals.length > 0 && (
          <button onClick={handleSettle} disabled={settling} className="mt-5 flex w-full items-center justify-center gap-2 border-2 border-acid bg-acid py-3 font-mono text-xs font-bold uppercase tracking-widest text-night transition-transform hover:-translate-y-0.5 disabled:opacity-50">
            {settling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Settle Season {room.round} · {activeGoals.length} goal{activeGoals.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
          <DialogTrigger asChild>
            <button className="btn btn-ink"><Target className="h-4 w-4" /> Set Goal</button>
          </DialogTrigger>
          <DialogContent className="border-2 border-ink bg-paper">
            <DialogHeader><DialogTitle className="font-display text-2xl font-black uppercase tracking-tight">Set a goal</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <label className="eyebrow">// your goal</label>
                <input value={goalForm.title} onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))} placeholder="Run 5km every day" className="inp mt-1.5" />
              </div>
              <div>
                <label className="eyebrow">// details (optional)</label>
                <textarea value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} placeholder="Rules or specifics..." className="inp mt-1.5 h-auto resize-none py-2.5" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow">// stake 🪙</label>
                  <input type="number" min="1" step="1" value={goalForm.stake_amount} onChange={e => setGoalForm(p => ({ ...p, stake_amount: e.target.value }))} placeholder="50" className="inp mt-1.5" />
                </div>
                <div>
                  <label className="eyebrow">// deadline</label>
                  <input type="date" value={goalForm.deadline} onChange={e => setGoalForm(p => ({ ...p, deadline: e.target.value }))} className="inp mt-1.5" min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              <div>
                <label className="eyebrow">// check-in frequency</label>
                <Select value={goalForm.checkin_frequency} onValueChange={v => setGoalForm(p => ({ ...p, checkin_frequency: v }))}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button onClick={handleCreateGoal} disabled={creatingGoal || !goalForm.title || !goalForm.stake_amount || !goalForm.deadline} className="btn btn-ink w-full">
                {creatingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Lock in stake
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
          <DialogTrigger asChild>
            <button className="btn btn-line" disabled={myGoals.length === 0}><Upload className="h-4 w-4" /> Check In</button>
          </DialogTrigger>
          <DialogContent className="border-2 border-ink bg-paper">
            <DialogHeader><DialogTitle className="font-display text-2xl font-black uppercase tracking-tight">Submit check-in</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <label className="eyebrow">// goal</label>
                <Select value={checkInGoalId} onValueChange={setCheckInGoalId}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Select goal" /></SelectTrigger>
                  <SelectContent>
                    {myGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="eyebrow">// photo or video proof</label>
                <input type="file" accept="image/*,video/*" onChange={e => setCheckInFile(e.target.files[0])} className="mt-1.5 w-full border-2 border-ink bg-paper/50 p-2 font-mono text-xs file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-bold file:uppercase file:text-paper" />
                <p className="mt-1 font-mono text-[10px] text-ink/45">Max 50MB — keep videos short.</p>
              </div>
              <div>
                <label className="eyebrow">// note (optional)</label>
                <textarea value={checkInNote} onChange={e => setCheckInNote(e.target.value)} placeholder="What did you do?" className="inp mt-1.5 h-auto resize-none py-2.5" rows={2} />
              </div>
              <button onClick={handleCheckIn} disabled={submittingCheckIn || !checkInGoalId} className="btn btn-ink w-full">
                {submittingCheckIn ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-none border-2 border-ink bg-paper p-0">
          {["goals", "checkins", "payouts"].map((t, i) => (
            <TabsTrigger key={t} value={t} className={`rounded-none py-2.5 font-mono text-xs font-bold uppercase tracking-wider data-[state=active]:bg-ink data-[state=active]:text-paper ${i < 2 ? "border-r-2 border-ink" : ""}`}>
              {t === "checkins" ? "Check-Ins" : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="goals" className="space-y-3">
          {goals.length === 0 ? (
            <div className="border-2 border-dashed border-ink/40 py-8 text-center font-mono text-sm text-ink/50">No goals yet. Be the first.</div>
          ) : goals.map(g => <GoalCard key={g.id} goal={g} />)}
        </TabsContent>

        <TabsContent value="checkins" className="space-y-3">
          {checkIns.length === 0 ? (
            <div className="border-2 border-dashed border-ink/40 py-8 text-center font-mono text-sm text-ink/50">No check-ins yet.</div>
          ) : checkIns.map(c => (
            <CheckInCard key={c.id} checkIn={c} currentUserId={user?.id} roomMembers={members} onVoted={loadAll} />
          ))}
        </TabsContent>

        <TabsContent value="payouts">
          {payouts.length === 0 ? (
            <div className="border-2 border-dashed border-ink/40 py-8 text-center font-mono text-sm text-ink/50">No payouts yet. They land when a season is settled.</div>
          ) : (
            <div className="space-y-2">
              {payouts.map(p => {
                const lost = p.kind === "forfeit";
                return (
                  <div key={p.id} className="flex items-center justify-between border-2 border-ink bg-card p-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold">
                        {lost ? "−" : "+"}{p.amount} 🪙 {lost ? "·" : "→"} {p.to_user_name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink/55">{p.reason}</p>
                    </div>
                    <span className={`stamp shrink-0 ${lost ? "border-flag text-flag" : "border-ink bg-acid text-night"}`}>
                      {lost ? "lost" : "won"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
