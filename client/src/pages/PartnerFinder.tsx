import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import TournamentNav from "@/components/TournamentNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users,
  PlusCircle,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  LogIn,
  Inbox,
  X,
} from "lucide-react";

type Tab = "find" | "my-slots" | "requests";

function StatusBadge({ status }: { status: "pending" | "accepted" | "declined" }) {
  const map = {
    pending: { color: "var(--gold)", bg: "rgba(201,168,76,0.12)", icon: Clock, label: "Pending" },
    accepted: { color: "var(--green-deep)", bg: "rgba(45,106,79,0.1)", icon: CheckCircle2, label: "Accepted" },
    declined: { color: "#999", bg: "rgba(0,0,0,0.05)", icon: XCircle, label: "Declined" },
  };
  const { color, bg, icon: Icon, label } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function PartnerFinder() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("find");

  // Post slot form
  const [slotDesc, setSlotDesc] = useState("");
  const [slotNotes, setSlotNotes] = useState("");
  const [showSlotForm, setShowSlotForm] = useState(false);

  // Request form
  const [requestingSlot, setRequestingSlot] = useState<{ id: number; toEntrantId: number; desc: string } | null>(null);
  const [requestMsg, setRequestMsg] = useState("");

  // Queries
  const { data: myEntry } = trpc.tournament.myEntry.useQuery(undefined, { enabled: isAuthenticated });
  const { data: openSlots, isLoading: slotsLoading } = trpc.tournament.partnerSlots.useQuery(undefined, {
    enabled: isAuthenticated && !!myEntry?.paid,
  });
  const { data: mySlots } = trpc.tournament.myPartnerSlots.useQuery(undefined, {
    enabled: isAuthenticated && !!myEntry?.paid,
  });
  const { data: incoming } = trpc.tournament.incomingRequests.useQuery(undefined, {
    enabled: isAuthenticated && !!myEntry?.paid,
  });
  const { data: outgoing } = trpc.tournament.outgoingRequests.useQuery(undefined, {
    enabled: isAuthenticated && !!myEntry?.paid,
  });

  // Mutations
  const postSlotMut = trpc.tournament.postPartnerSlot.useMutation({
    onSuccess: () => {
      utils.tournament.myPartnerSlots.invalidate();
      utils.tournament.partnerSlots.invalidate();
      setSlotDesc("");
      setSlotNotes("");
      setShowSlotForm(false);
      toast.success("Availability posted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const closeSlotMut = trpc.tournament.closePartnerSlot.useMutation({
    onSuccess: () => {
      utils.tournament.myPartnerSlots.invalidate();
      utils.tournament.partnerSlots.invalidate();
      toast.success("Slot withdrawn.");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendRequestMut = trpc.tournament.sendMatchRequest.useMutation({
    onSuccess: () => {
      utils.tournament.outgoingRequests.invalidate();
      utils.tournament.partnerSlots.invalidate();
      setRequestingSlot(null);
      setRequestMsg("");
      toast.success("Match request sent!");
    },
    onError: (e) => toast.error(e.message),
  });

  const respondMut = trpc.tournament.respondToRequest.useMutation({
    onSuccess: (_, vars) => {
      utils.tournament.incomingRequests.invalidate();
      utils.tournament.myPartnerSlots.invalidate();
      toast.success(vars.status === "accepted" ? "Request accepted! Match arranged." : "Request declined.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="container py-24 text-center">
          <div className="w-12 h-12 rounded-full border-4 animate-spin mx-auto"
            style={{ borderColor: "var(--green-deep)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="container py-24 text-center max-w-md mx-auto">
          <LogIn size={48} style={{ color: "var(--green-deep)", margin: "0 auto 16px" }} />
          <h2 className="text-3xl font-semibold mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
            Sign In Required
          </h2>
          <p className="mb-6" style={{ color: "var(--charcoal-mid)" }}>
            Please sign in to use the Partner Finder.
          </p>
          <Button size="lg" onClick={() => (window.location.href = getLoginUrl())}
            style={{ background: "var(--green-deep)", color: "var(--cream)" }}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!myEntry?.paid) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="container py-24 text-center max-w-md mx-auto">
          <Users size={48} style={{ color: "var(--green-deep)", margin: "0 auto 16px" }} />
          <h2 className="text-3xl font-semibold mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
            Paid Entrants Only
          </h2>
          <p className="mb-6" style={{ color: "var(--charcoal-mid)" }}>
            The Partner Finder is available to paid tournament entrants. Register and pay your entry fee to access it.
          </p>
          <Button size="lg" onClick={() => window.location.href = "/dashboard"}
            style={{ background: "var(--green-deep)", color: "var(--cream)" }}>
            Go to My Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const pendingIncoming = incoming?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />

      {/* Header */}
      <div className="py-10 border-b"
        style={{ background: "var(--green-deep)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="container">
          <span className="label-tag" style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Find a Playing Partner
          </span>
          <h1 className="text-4xl font-bold mt-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}>
            Partner Finder
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(250,246,238,0.7)" }}>
            Post your availability or browse other players looking for a doubles partner
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-3xl">
        {/* Tabs */}
        <div className="flex gap-2 border-b mb-8" style={{ borderColor: "var(--cream-dark)" }}>
          {([
            { key: "find", label: "Find a Partner" },
            { key: "my-slots", label: "My Availability" },
            { key: "requests", label: `Requests${pendingIncoming > 0 ? ` (${pendingIncoming})` : ""}` },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-5 py-3 text-sm font-medium transition-colors"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: tab === key ? "var(--green-deep)" : "var(--charcoal-mid)",
                borderBottom: tab === key ? "2px solid var(--green-deep)" : "2px solid transparent",
                marginBottom: "-1px",
                background: "transparent",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Find a Partner ── */}
        {tab === "find" && (
          <div className="space-y-4">
            {slotsLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: "var(--cream-dark)" }} />
              ))
            ) : !openSlots || openSlots.length === 0 ? (
              <div className="text-center py-16">
                <CalendarDays size={40} style={{ color: "var(--cream-dark)", margin: "0 auto 12px" }} />
                <p className="text-lg font-semibold" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                  No availability posted yet
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--charcoal-mid)" }}>
                  Be the first — post your availability in the "My Availability" tab.
                </p>
              </div>
            ) : (
              openSlots.map((slot) => (
                <div key={slot.id} className="rounded-lg border p-5"
                  style={{ background: "#fff", borderColor: "var(--cream-dark)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
                        {slot.displayName}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--charcoal-mid)" }}>
                        {slot.setsWon} sets won so far
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-sm" style={{ color: "var(--charcoal)" }}>
                        <CalendarDays size={14} style={{ color: "var(--gold)" }} />
                        {slot.slotDescription}
                      </div>
                      {slot.notes && (
                        <p className="text-xs mt-1" style={{ color: "var(--charcoal-mid)" }}>
                          {slot.notes}
                        </p>
                      )}
                    </div>
                    <Button size="sm"
                      onClick={() => setRequestingSlot({ id: slot.id, toEntrantId: slot.entrantId!, desc: slot.slotDescription })}
                      style={{ background: "var(--green-deep)", color: "var(--cream)", flexShrink: 0 }}>
                      <Send size={13} className="mr-1" />
                      Request
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── My Availability ── */}
        {tab === "my-slots" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSlotForm(!showSlotForm)}
                style={{ borderColor: "var(--green-mid)", color: "var(--green-mid)" }}>
                <PlusCircle size={14} className="mr-1" />
                {showSlotForm ? "Cancel" : "Post Availability"}
              </Button>
            </div>

            {showSlotForm && (
              <form className="rounded-lg border p-5 space-y-4"
                style={{ background: "#fff", borderColor: "var(--gold)" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  postSlotMut.mutate({ slotDescription: slotDesc, notes: slotNotes || undefined });
                }}>
                <h3 className="text-xl font-semibold"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
                  Post Your Availability
                </h3>
                <div>
                  <Label style={{ color: "var(--green-deep)" }}>When are you available?</Label>
                  <Input value={slotDesc} onChange={(e) => setSlotDesc(e.target.value)}
                    placeholder="e.g. Saturday 12 Apr, 10am–12pm" required minLength={5} className="mt-1" />
                </div>
                <div>
                  <Label style={{ color: "var(--green-deep)" }}>Notes (optional)</Label>
                  <Input value={slotNotes} onChange={(e) => setSlotNotes(e.target.value)}
                    placeholder="e.g. Prefer Court 1, intermediate level" className="mt-1" />
                </div>
                <Button type="submit" disabled={postSlotMut.isPending}
                  style={{ background: "var(--green-deep)", color: "var(--cream)" }}>
                  {postSlotMut.isPending ? "Posting..." : "Post Availability"}
                </Button>
              </form>
            )}

            {!mySlots || mySlots.length === 0 ? (
              <p style={{ color: "var(--charcoal-mid)" }}>
                You haven't posted any availability slots yet.
              </p>
            ) : (
              mySlots.map((slot) => (
                <div key={slot.id} className="rounded-lg border p-4 flex items-start justify-between gap-4"
                  style={{
                    background: slot.open ? "#fff" : "rgba(0,0,0,0.02)",
                    borderColor: slot.open ? "var(--cream-dark)" : "var(--cream-dark)",
                    opacity: slot.open ? 1 : 0.6,
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays size={14} style={{ color: "var(--gold)" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
                        {slot.slotDescription}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: slot.open ? "rgba(45,106,79,0.1)" : "rgba(0,0,0,0.06)",
                          color: slot.open ? "var(--green-deep)" : "var(--charcoal-mid)",
                        }}>
                        {slot.open ? "Open" : "Closed"}
                      </span>
                    </div>
                    {slot.notes && (
                      <p className="text-xs" style={{ color: "var(--charcoal-mid)" }}>{slot.notes}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--charcoal-mid)" }}>
                      Posted {new Date(slot.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {slot.open && (
                    <Button size="sm" variant="outline"
                      disabled={closeSlotMut.isPending}
                      onClick={() => closeSlotMut.mutate({ slotId: slot.id })}
                      style={{ borderColor: "var(--charcoal-mid)", color: "var(--charcoal-mid)" }}>
                      <X size={13} className="mr-1" />
                      Withdraw
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Requests ── */}
        {tab === "requests" && (
          <div className="space-y-8">
            {/* Incoming */}
            <div>
              <h3 className="text-2xl font-semibold mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
                Incoming Requests
              </h3>
              {!incoming || incoming.length === 0 ? (
                <p style={{ color: "var(--charcoal-mid)" }}>No incoming requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {incoming.map((r) => (
                    <div key={r.id} className="rounded-lg border p-4"
                      style={{ background: "#fff", borderColor: "var(--cream-dark)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                            {r.fromDisplayName}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--charcoal-mid)" }}>
                            For slot: {r.slotDescription}
                          </p>
                          {r.message && (
                            <p className="text-sm mt-2 italic" style={{ color: "var(--charcoal)" }}>
                              "{r.message}"
                            </p>
                          )}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm"
                            disabled={respondMut.isPending}
                            onClick={() => respondMut.mutate({ requestId: r.id, status: "accepted" })}
                            style={{ background: "var(--green-deep)", color: "var(--cream)" }}>
                            <CheckCircle2 size={13} className="mr-1" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline"
                            disabled={respondMut.isPending}
                            onClick={() => respondMut.mutate({ requestId: r.id, status: "declined" })}
                            style={{ borderColor: "var(--charcoal-mid)", color: "var(--charcoal-mid)" }}>
                            <XCircle size={13} className="mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing */}
            <div>
              <h3 className="text-2xl font-semibold mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
                Sent Requests
              </h3>
              {!outgoing || outgoing.length === 0 ? (
                <p style={{ color: "var(--charcoal-mid)" }}>You haven't sent any match requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {outgoing.map((r) => (
                    <div key={r.id} className="rounded-lg border p-4 flex items-start justify-between gap-3"
                      style={{ background: "#fff", borderColor: "var(--cream-dark)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold" style={{ color: "var(--green-deep)", fontFamily: "'Cormorant Garamond', serif" }}>
                          To: {r.toDisplayName}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--charcoal-mid)" }}>
                          For slot: {r.slotDescription}
                        </p>
                        {r.message && (
                          <p className="text-sm mt-2 italic" style={{ color: "var(--charcoal)" }}>
                            "{r.message}"
                          </p>
                        )}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Match Request Modal ── */}
      {requestingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setRequestingSlot(null)}>
          <div className="rounded-xl p-6 max-w-md w-full shadow-2xl"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-semibold mb-1"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}>
              Send Match Request
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--charcoal-mid)" }}>
              Slot: <strong>{requestingSlot.desc}</strong>
            </p>
            <div className="mb-4">
              <Label style={{ color: "var(--green-deep)" }}>Message (optional)</Label>
              <Input value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)}
                placeholder="e.g. Happy to play at 10am, I'm an intermediate player"
                className="mt-1" />
            </div>
            <div className="flex gap-3">
              <Button
                disabled={sendRequestMut.isPending}
                onClick={() => sendRequestMut.mutate({
                  slotId: requestingSlot.id,
                  toEntrantId: requestingSlot.toEntrantId,
                  message: requestMsg || undefined,
                })}
                style={{ background: "var(--green-deep)", color: "var(--cream)" }}>
                <Send size={14} className="mr-1" />
                {sendRequestMut.isPending ? "Sending..." : "Send Request"}
              </Button>
              <Button variant="outline" onClick={() => setRequestingSlot(null)}
                style={{ borderColor: "var(--charcoal-mid)", color: "var(--charcoal-mid)" }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
