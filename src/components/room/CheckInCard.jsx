import db from '@/api/db';

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, Loader2, Gavel, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import Lightbox from "@/components/Lightbox";

export default function CheckInCard({ checkIn, currentUserId, roomMembers, onVoted }) {
  const [voting, setVoting] = useState(false);
  const [appealing, setAppealing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [votes, setVotes] = useState([]);
  const [zoom, setZoom] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    db.entities.CheckinVote.filter({ checkin_id: checkIn.id }).then(setVotes).catch(() => {});
  }, [checkIn.id, checkIn.status, checkIn.vote_round]);

  const memberName = (id) => roomMembers.find(m => m.user_id === id)?.user_name || "Someone";
  const currentVotes = votes.filter(v => v.vote_round === checkIn.vote_round);
  const hasVoted = currentVotes.some(v => v.voter_id === currentUserId);
  const isOwn = checkIn.user_id === currentUserId;
  const rejectReasons = currentVotes.filter(v => v.vote === "reject" && v.reason);
  const canAppeal = isOwn && checkIn.status === "rejected" && !checkIn.appealed;
  const isVideo = /\.(mp4|mov|m4v|webm|ogg)(\?|$)/i.test(checkIn.proof_image_url || "");

  const submitVote = async (vote, voteReason) => {
    setVoting(true);
    try {
      await db.checkins.vote({ checkin_id: checkIn.id, vote, reason: voteReason });
      toast({ title: vote === "approve" ? "Approved" : "Rejected" });
      setRejecting(false);
      setReason("");
      onVoted?.();
    } catch (e) {
      toast({ title: "Couldn't vote", description: e.message, variant: "destructive" });
    } finally {
      setVoting(false);
    }
  };

  const handleReject = () => {
    if (!reason.trim()) {
      toast({ title: "Add a reason", description: "Rejecting needs a reason.", variant: "destructive" });
      return;
    }
    submitVote("reject", reason.trim());
  };

  const handleAppeal = async () => {
    setAppealing(true);
    try {
      await db.checkins.appeal(checkIn.id);
      toast({ title: "Appeal opened", description: "Members who didn't vote can re-decide." });
      onVoted?.();
    } catch (e) {
      toast({ title: "Couldn't appeal", description: e.message, variant: "destructive" });
    } finally {
      setAppealing(false);
    }
  };

  const stampClass = {
    pending: "border-ink text-ink",
    approved: "border-ink bg-acid text-night",
    rejected: "border-flag text-flag",
  }[checkIn.status] || "border-ink text-ink";

  const statusIcon = {
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  }[checkIn.status];

  return (
    <div className="border-2 border-ink bg-card">
      <div className="flex items-center justify-between p-3.5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center bg-acid">
            <span className="font-mono text-xs font-bold text-night">{(checkIn.user_name || "?")[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="font-display text-sm font-black uppercase tracking-tight">{checkIn.user_name}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
              {checkIn.created_date ? format(new Date(checkIn.created_date), "MMM d · h:mma") : ""}
              {checkIn.appealed ? " · appealed" : ""}
            </p>
          </div>
        </div>
        <span className={`stamp ${stampClass}`}>{statusIcon}{checkIn.status}</span>
      </div>

      {checkIn.proof_image_url && (
        isVideo ? (
          <div className="relative mx-3.5 mb-3 border-2 border-ink">
            <video src={checkIn.proof_image_url} controls playsInline className="h-48 w-full bg-night object-contain" />
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label="View full screen"
              className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center border-2 border-cream bg-night/80 text-cream transition-colors hover:bg-acid hover:text-night"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="group relative mx-3.5 mb-3 block w-[calc(100%-1.75rem)] border-2 border-ink"
            aria-label="View proof full screen"
          >
            <img src={checkIn.proof_image_url} alt="Check-in proof" className="h-48 w-full object-cover" />
            <span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center border-2 border-cream bg-night/80 text-cream transition-colors group-hover:bg-acid group-hover:text-night">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </button>
        )
      )}
      {zoom && checkIn.proof_image_url && (
        <Lightbox src={checkIn.proof_image_url} alt="Check-in proof" onClose={() => setZoom(false)} />
      )}

      {checkIn.note && (
        <p className="px-3.5 pb-3 font-mono text-xs text-ink/80">{checkIn.note}</p>
      )}

      {rejectReasons.length > 0 && (
        <div className="mx-3.5 mb-3 space-y-1.5">
          {rejectReasons.map(v => (
            <div key={v.id} className="border-l-2 border-flag bg-flag/5 px-2.5 py-1.5 font-mono text-[11px] text-flag">
              <span className="font-bold uppercase">{memberName(v.voter_id)}:</span> {v.reason}
            </div>
          ))}
        </div>
      )}

      <div className="mx-3.5 border-t-2 border-dashed border-ink/25" />

      <div className="flex items-center justify-between p-3.5 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
          {checkIn.approvals || 0} approve · {checkIn.rejections || 0} reject
        </span>

        {checkIn.status === "pending" && !isOwn && !hasVoted && !rejecting && (
          <div className="flex gap-2">
            <button
              onClick={() => submitVote("approve", null)}
              disabled={voting}
              className="border-2 border-ink bg-acid px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-night transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            >
              Approve
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={voting}
              className="border-2 border-flag px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-flag transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        )}

        {hasVoted && checkIn.status === "pending" && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">You voted</span>
        )}

        {canAppeal && (
          <button
            onClick={handleAppeal}
            disabled={appealing}
            className="flex items-center gap-1 border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            {appealing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gavel className="h-3 w-3" />}
            Appeal
          </button>
        )}
      </div>

      {rejecting && (
        <div className="space-y-2 border-t-2 border-ink p-3.5">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why reject? (shown to the group)"
            className="inp h-auto resize-none py-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={handleReject} disabled={voting} className="flex-1 border-2 border-ink bg-flag px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-cream disabled:opacity-40">
              {voting ? "..." : "Confirm reject"}
            </button>
            <button onClick={() => { setRejecting(false); setReason(""); }} className="border-2 border-ink px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
