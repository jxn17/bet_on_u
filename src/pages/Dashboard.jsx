import db from '@/api/db';

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, DoorOpen, ArrowRight, Loader2, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [goals, setGoals] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, locked: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setWallet(await db.wallet.get());
      setRooms(await db.entities.Room.list());
      setGoals(await db.entities.Goal.filter({ user_id: currentUser.id }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const room = await db.rooms.join(joinCode.trim().toUpperCase());
      toast({ title: "You're in", description: `Joined "${room.name}"` });
      setJoinCode("");
      setJoinOpen(false);
      loadData();
    } catch (e) {
      toast({ title: "Couldn't join", description: e.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const activeGoals = goals.filter(g => g.status === "active").length;
  const firstName = user?.full_name?.split(" ")[0] || "player";

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <p className="eyebrow">// {firstName}'s table</p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-5xl">
          coins where your<br /><span className="mark">goals</span> are.
        </h1>
      </div>

      {/* Wallet + stats */}
      <div className="space-y-3">
        <div className="flex items-end justify-between border-2 border-ink bg-acid p-5 text-night shadow-hard">
          <div>
            <p className="eyebrow text-night/70">// wallet balance</p>
            <p className="mt-1 font-display text-5xl font-black leading-none">{wallet.balance}</p>
          </div>
          <Coins className="h-9 w-9" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="tile">
            <p className="eyebrow">// in play</p>
            <p className="mt-1 font-display text-3xl font-black">{wallet.locked}</p>
          </div>
          <div className="tile">
            <p className="eyebrow">// active goals</p>
            <p className="mt-1 font-display text-3xl font-black">{activeGoals}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/create-room" className="btn btn-ink">
          <Plus className="h-4 w-4" /> Create Room
        </Link>
        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogTrigger asChild>
            <button className="btn btn-line"><DoorOpen className="h-4 w-4" /> Join Room</button>
          </DialogTrigger>
          <DialogContent className="border-2 border-ink bg-paper">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-black uppercase tracking-tight">Join a room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <input
                placeholder="INVITE CODE"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="inp h-14 text-center text-xl font-bold tracking-[0.4em]"
                maxLength={8}
              />
              <button onClick={handleJoinRoom} disabled={joining || !joinCode.trim()} className="btn btn-ink w-full">
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Join Room
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rooms */}
      <div>
        <p className="eyebrow mb-3">// your rooms [{rooms.length}]</p>
        {rooms.length === 0 ? (
          <div className="border-2 border-dashed border-ink/40 p-8 text-center">
            <p className="font-mono text-sm text-ink/60">No rooms yet.<br />Create one or join with a code.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className="block border-2 border-ink bg-card p-4 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-xl font-black uppercase tracking-tight">{room.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-ink/60">
                      season {room.round} · {room.jackpot || 0} 🪙 pot
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`stamp ${room.status === "active" ? "border-ink text-ink" : "border-ink/40 text-ink/40"}`}>
                      {room.status}
                    </span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
