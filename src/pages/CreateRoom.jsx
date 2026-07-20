import db from '@/api/db';

import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CreateRoom() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const room = await db.rooms.create({ name: name.trim(), description: description.trim() });
      setCreatedRoom(room);
    } catch (e) {
      toast({ title: "Couldn't create room", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdRoom.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdRoom) {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Room Created!</h1>
          <p className="text-slate-500 text-sm">Share the invite code with your friends</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Invite Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-mono font-bold tracking-[0.4em] text-violet-600">
              {createdRoom.invite_code}
            </span>
            <button onClick={copyCode} className="p-2 rounded-lg hover:bg-slate-50 transition-colors">
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400" />}
            </button>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/room/${createdRoom.id}`)}
          className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl h-12"
        >
          Go to Room
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Create a Room</h1>
        <p className="text-slate-500 text-sm mt-1">Set up a space for your friend group to bet on goals.</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Room Name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Summer Fitness Challenge"
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Description (optional)</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's this room about?"
            className="mt-1.5 rounded-xl resize-none"
            rows={3}
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl h-12 font-medium"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Create Room
        </Button>
      </div>
    </div>
  );
}