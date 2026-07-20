import db from '@/api/db';

import React, { useState, useEffect } from "react";

import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Check, Loader2, Target, Upload, Trophy, Coins } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays } from "date-fns";
import GoalCard from "@/components/room/GoalCard";
import CheckInCard from "@/components/room/CheckInCard";

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

  // Goal form
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", description: "", stake_amount: "", deadline: "", checkin_frequency: "weekly" });
  const [creatingGoal, setCreatingGoal] = useState(false);

  // Check-in form
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInGoalId, setCheckInGoalId] = useState("");
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInFile, setCheckInFile] = useState(null);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  useEffect(() => { loadAll(); }, [roomId]);

  const loadAll = async () => {
    try {
      // Sweep any check-ins past their voting deadline (benefit of the doubt).
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
      toast({ title: "Goal set! 🎯", description: `${goalForm.stake_amount} 🪙 locked in.` });
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
      toast({ title: "Check-in submitted! 📸", description: "Your group will vote on it." });
      loadAll();
    } catch (e) {
      toast({ title: "Couldn't submit check-in", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleSettle = async () => {
    if (!window.confirm("Settle this season? Failed stakes go to the jackpot and are split among everyone who succeeded. This can't be undone.")) return;
    setSettling(true);
    try {
      await db.rooms.settle(roomId);
      toast({ title: "Season settled! 🏆", description: "Jackpot paid out to achievers." });
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!room) {
    return <p className="text-center text-slate-500 py-12">Room not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Room header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold text-slate-900 dark:text-white">{room.name}</h1>
            {room.description && <p className="text-sm text-slate-500 mt-1">{room.description}</p>}
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-violet-600 bg-violet-50 dark:bg-violet-900/40 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
          >
            {room.invite_code}
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-3 py-1">
            Season {room.round}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full px-3 py-1">
            <Coins className="w-3.5 h-3.5" /> {room.jackpot || 0} jackpot
          </span>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">{(m.user_name || "?")[0].toUpperCase()}</span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300">{m.user_name}</span>
            </div>
          ))}
        </div>

        {isCreator && activeGoals.length > 0 && (
          <Button
            onClick={handleSettle}
            disabled={settling}
            size="sm"
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs"
          >
            {settling ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trophy className="w-3 h-3 mr-1" />}
            Settle Season {room.round} ({activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""})
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl h-11 text-sm font-medium">
              <Target className="w-4 h-4 mr-1.5" /> Set Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Set a Goal</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>What's your goal?</Label>
                <Input value={goalForm.title} onChange={e => setGoalForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Run 5km every day" className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Details (optional)</Label>
                <Textarea value={goalForm.description} onChange={e => setGoalForm(p => ({...p, description: e.target.value}))} placeholder="Any rules or specifics..." className="mt-1.5 rounded-xl resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stake (🪙)</Label>
                  <Input type="number" min="1" step="1" value={goalForm.stake_amount} onChange={e => setGoalForm(p => ({...p, stake_amount: e.target.value}))} placeholder="50" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input type="date" value={goalForm.deadline} onChange={e => setGoalForm(p => ({...p, deadline: e.target.value}))} className="mt-1.5 rounded-xl" min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              <div>
                <Label>Check-in Frequency</Label>
                <Select value={goalForm.checkin_frequency} onValueChange={v => setGoalForm(p => ({...p, checkin_frequency: v}))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateGoal} disabled={creatingGoal || !goalForm.title || !goalForm.stake_amount || !goalForm.deadline} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl">
                {creatingGoal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Lock in stake & set goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 rounded-xl h-11 text-sm font-medium border-slate-200" disabled={myGoals.length === 0}>
              <Upload className="w-4 h-4 mr-1.5" /> Check In
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Check-In</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Goal</Label>
                <Select value={checkInGoalId} onValueChange={setCheckInGoalId}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select goal" /></SelectTrigger>
                  <SelectContent>
                    {myGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Photo Proof</Label>
                <input type="file" accept="image/*" onChange={e => setCheckInFile(e.target.files[0])} className="mt-1.5 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-violet-50 file:text-violet-600 file:font-medium hover:file:bg-violet-100" />
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={checkInNote} onChange={e => setCheckInNote(e.target.value)} placeholder="What did you do?" className="mt-1.5 rounded-xl resize-none" rows={2} />
              </div>
              <Button onClick={handleCheckIn} disabled={submittingCheckIn || !checkInGoalId} className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl">
                {submittingCheckIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Check-In
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <TabsTrigger value="goals" className="rounded-lg text-sm data-[state=active]:bg-white">Goals</TabsTrigger>
          <TabsTrigger value="checkins" className="rounded-lg text-sm data-[state=active]:bg-white">Check-Ins</TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg text-sm data-[state=active]:bg-white">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-3">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No goals yet. Be the first to set one!</div>
          ) : (
            goals.map(g => <GoalCard key={g.id} goal={g} />)
          )}
        </TabsContent>

        <TabsContent value="checkins" className="space-y-3">
          {checkIns.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No check-ins yet.</div>
          ) : (
            checkIns.map(c => (
              <CheckInCard key={c.id} checkIn={c} currentUserId={user?.id} roomMembers={members} onVoted={loadAll} />
            ))
          )}
        </TabsContent>

        <TabsContent value="payouts">
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No payouts yet. They land when a season is settled.</div>
          ) : (
            <div className="space-y-2">
              {payouts.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.amount} 🪙 → {p.to_user_name}</p>
                    <p className="text-xs text-slate-400">{p.reason}</p>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Jackpot</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
