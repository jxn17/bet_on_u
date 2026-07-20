import db from '@/api/db';

import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { Plus, Users, ArrowRight, DoorOpen, Loader2, Coins, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setWallet(await db.wallet.get());

      // RLS scopes these to rooms the user belongs to.
      const myRooms = await db.entities.Room.list();
      setRooms(myRooms);

      const allGoals = await db.entities.Goal.filter({ user_id: currentUser.id });
      setGoals(allGoals);
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
      toast({ title: "Joined!", description: `You're now in "${room.name}"` });
      setJoinCode("");
      setJoinOpen(false);
      loadData();
    } catch (e) {
      toast({ title: "Couldn't join room", description: e.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const activeGoals = goals.filter(g => g.status === "active").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">
          Hey, {user?.full_name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-slate-500 mt-1">Put your coins where your goals are.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5 text-amber-500" /> Wallet
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{wallet.balance}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-violet-500" /> In Play
          </div>
          <div className="text-2xl font-bold text-violet-600 mt-1">{wallet.locked}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeGoals}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link to="/create-room" className="flex-1">
          <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl h-12 font-medium">
            <Plus className="w-4 h-4 mr-2" /> Create Room
          </Button>
        </Link>
        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-medium border-slate-200">
              <DoorOpen className="w-4 h-4 mr-2" /> Join Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join a Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Enter invite code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-[0.3em] font-mono uppercase"
                maxLength={8}
              />
              <Button
                onClick={handleJoinRoom}
                disabled={joining || !joinCode.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Join Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rooms */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-slate-900 dark:text-white mb-3">Your Rooms</h2>
        {rooms.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No rooms yet. Create one or join with a code!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => (
              <Link key={room.id} to={`/room/${room.id}`}>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 hover:border-violet-200 hover:shadow-sm transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{room.name}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Season {room.round} · {room.jackpot || 0} 🪙 jackpot
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        room.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                      }`}>
                        {room.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                    </div>
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
