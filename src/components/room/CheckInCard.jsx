import db from '@/api/db';

import React, { useState, useEffect } from "react";

import { ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle, Loader2, Gavel, MessageSquareWarning } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function CheckInCard({ checkIn, currentUserId, roomMembers, onVoted }) {
  const [voting, setVoting] = useState(false);
  const [appealing, setAppealing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [votes, setVotes] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    db.entities.CheckinVote.filter({ checkin_id: checkIn.id })
      .then(setVotes)
      .catch(() => {});
  }, [checkIn.id, checkIn.status, checkIn.vote_round]);

  const memberName = (id) => roomMembers.find(m => m.user_id === id)?.user_name || "Someone";
  const currentVotes = votes.filter(v => v.vote_round === checkIn.vote_round);
  const hasVoted = currentVotes.some(v => v.voter_id === currentUserId);
  const isOwn = checkIn.user_id === currentUserId;
  const rejectReasons = currentVotes.filter(v => v.vote === "reject" && v.reason);
  const canAppeal = isOwn && checkIn.status === "rejected" && !checkIn.appealed;

  const submitVote = async (vote, voteReason) => {
    setVoting(true);
    try {
      await db.checkins.vote({ checkin_id: checkIn.id, vote, reason: voteReason });
      toast({ title: vote === "approve" ? "Approved ✅" : "Rejected ❌" });
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
      toast({ title: "Add a reason", description: "Rejecting a check-in requires a reason.", variant: "destructive" });
      return;
    }
    submitVote("reject", reason.trim());
  };

  const handleAppeal = async () => {
    setAppealing(true);
    try {
      await db.checkins.appeal(checkIn.id);
      toast({ title: "Appeal opened 🔨", description: "Members who didn't vote can re-decide." });
      onVoted?.();
    } catch (e) {
      toast({ title: "Couldn't appeal", description: e.message, variant: "destructive" });
    } finally {
      setAppealing(false);
    }
  };

  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    approved: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    rejected: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">
              {(checkIn.user_name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{checkIn.user_name}</p>
            <p className="text-[10px] text-slate-400">
              {checkIn.created_date ? format(new Date(checkIn.created_date), "MMM d, h:mm a") : ""}
              {checkIn.appealed ? " · appealed" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {statusIcon[checkIn.status]}
          <span className="text-xs font-medium text-slate-500 capitalize">{checkIn.status}</span>
        </div>
      </div>

      {checkIn.proof_image_url && (
        <img src={checkIn.proof_image_url} alt="Proof" className="w-full h-48 object-cover rounded-lg" />
      )}

      {checkIn.note && <p className="text-sm text-slate-600 dark:text-slate-300">{checkIn.note}</p>}

      {/* Transparent reject reasons */}
      {rejectReasons.length > 0 && (
        <div className="space-y-1.5">
          {rejectReasons.map(v => (
            <div key={v.id} className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
              <MessageSquareWarning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span><span className="font-medium">{memberName(v.voter_id)}:</span> {v.reason}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-400">
          {checkIn.approvals || 0} approve · {checkIn.rejections || 0} reject
        </span>

        {checkIn.status === "pending" && !isOwn && !hasVoted && !rejecting && (
          <div className="flex gap-2">
            <button
              onClick={() => submitVote("approve", null)}
              disabled={voting}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {voting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
              Approve
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={voting}
              className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ThumbsDown className="w-3 h-3" /> Reject
            </button>
          </div>
        )}

        {hasVoted && checkIn.status === "pending" && (
          <span className="text-[10px] text-slate-400 italic">You voted</span>
        )}

        {canAppeal && (
          <button
            onClick={handleAppeal}
            disabled={appealing}
            className="flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {appealing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gavel className="w-3 h-3" />}
            Appeal
          </button>
        )}
      </div>

      {/* Reject reason capture */}
      {rejecting && (
        <div className="space-y-2 pt-1">
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why are you rejecting this? (visible to the group)"
            className="rounded-xl resize-none text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={voting}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors"
            >
              {voting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
              Confirm Reject
            </button>
            <button
              onClick={() => { setRejecting(false); setReason(""); }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
