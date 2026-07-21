import db from '@/api/db';

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Copy, Check, ArrowRight } from "lucide-react";
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
      <div className="mx-auto max-w-md space-y-6 pt-6">
        <div>
          <p className="eyebrow">// live</p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight">
            room <span className="mark">created.</span>
          </h1>
          <p className="mt-2 font-mono text-xs text-ink/60">Share the code. First stakes lock the season.</p>
        </div>

        <div className="border-2 border-ink bg-acid p-6 text-center text-night shadow-hard">
          <p className="eyebrow text-night/70">// invite code</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-bold tracking-[0.3em] text-night">{createdRoom.invite_code}</span>
            <button onClick={copyCode} className="grid h-10 w-10 place-items-center border-2 border-night text-night hover:bg-night hover:text-acid">
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button onClick={() => navigate(`/room/${createdRoom.id}`)} className="btn btn-ink w-full">
          Go to room <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink/60 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div>
        <p className="eyebrow">// new room</p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight">
          start a <span className="mark">table.</span>
        </h1>
        <p className="mt-2 font-mono text-xs text-ink/60">A space for your crew to bet on goals.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="eyebrow">// room name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Fitness Challenge" className="inp mt-1.5" />
        </div>
        <div>
          <label className="eyebrow">// description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this room about?" className="inp mt-1.5 h-auto resize-none py-2.5" rows={3} />
        </div>
        <button onClick={handleCreate} disabled={creating || !name.trim()} className="btn btn-ink w-full">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create room
        </button>
      </div>
    </div>
  );
}
