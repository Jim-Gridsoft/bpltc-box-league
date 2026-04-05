import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2,
  Trash2,
  CreditCard,
  Users,
  ClipboardList,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLocation } from "wouter";

type Tab = "entrants" | "sets";

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("entrants");
  const [expandedEntrant, setExpandedEntrant] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: entrants, isLoading: entrantsLoading } = trpc.tournament.adminAllEntrants.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: setReports, isLoading: setsLoading } = trpc.tournament.adminAllSetReports.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" && tab === "sets" }
  );

  const markPaidMut = trpc.tournament.adminMarkPaid.useMutation({
    onSuccess: () => {
      utils.tournament.adminAllEntrants.invalidate();
      toast.success("Entrant marked as paid.");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifySetMut = trpc.tournament.adminVerifySet.useMutation({
    onSuccess: () => {
      utils.tournament.adminAllSetReports.invalidate();
      toast.success("Set report verified.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSetMut = trpc.tournament.adminDeleteSet.useMutation({
    onSuccess: () => {
      utils.tournament.adminAllSetReports.invalidate();
      utils.tournament.adminAllEntrants.invalidate();
      toast.success("Set report deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="container py-24 text-center">
          <div
            className="w-12 h-12 rounded-full border-4 animate-spin mx-auto"
            style={{ borderColor: "var(--green-deep)", borderTopColor: "transparent" }}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="container py-24 text-center max-w-md mx-auto">
          <ShieldAlert size={48} style={{ color: "var(--gold)", margin: "0 auto 16px" }} />
          <h2
            className="text-3xl font-semibold mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            Admin Access Only
          </h2>
          <p className="mb-6" style={{ color: "var(--charcoal-mid)" }}>
            This page is restricted to club administrators.
          </p>
          <Button onClick={() => navigate("/")} style={{ background: "var(--green-deep)", color: "var(--cream)" }}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const paid = entrants?.filter((e) => e.paid).length ?? 0;
  const unpaid = entrants?.filter((e) => !e.paid).length ?? 0;
  const completed = entrants?.filter((e) => e.completed).length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />

      {/* Header */}
      <div
        className="py-10 border-b"
        style={{ background: "var(--green-deep)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="container">
          <span
            className="label-tag"
            style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Club Administration
          </span>
          <h1
            className="text-4xl font-bold mt-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}
          >
            Admin Panel
          </h1>
        </div>
      </div>

      <div className="container py-10 max-w-5xl space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Entrants", value: entrants?.length ?? 0, icon: Users },
            { label: "Paid", value: paid, icon: CreditCard },
            { label: "Unpaid", value: unpaid, icon: ClipboardList },
            { label: "Completed 50 Sets", value: completed, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border p-5 text-center"
              style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
            >
              <Icon size={20} style={{ color: "var(--gold)", margin: "0 auto 8px" }} />
              <p
                className="text-3xl font-bold"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                {value}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--charcoal-mid)" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b" style={{ borderColor: "var(--cream-dark)" }}>
          {(["entrants", "sets"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-3 text-sm font-medium transition-colors"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: tab === t ? "var(--green-deep)" : "var(--charcoal-mid)",
                borderBottom: tab === t ? "2px solid var(--green-deep)" : "2px solid transparent",
                marginBottom: "-1px",
                background: "transparent",
              }}
            >
              {t === "entrants" ? "Entrants" : "Set Reports"}
            </button>
          ))}
        </div>

        {/* ── Entrants tab ── */}
        {tab === "entrants" && (
          <div className="space-y-3">
            {entrantsLoading ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg animate-pulse"
                  style={{ background: "var(--cream-dark)" }}
                />
              ))
            ) : !entrants || entrants.length === 0 ? (
              <p style={{ color: "var(--charcoal-mid)" }}>No entrants yet.</p>
            ) : (
              entrants.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
                >
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedEntrant(expandedEntrant === e.id ? null : e.id)}
                  >
                    {/* Status dot */}
                    <span
                      className="shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{ background: e.paid ? "var(--green-mid)" : "var(--gold)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-base truncate"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                      >
                        {e.displayName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--charcoal-mid)" }}>
                        {e.email ?? "No email"} · Registered {new Date(e.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span
                        className="text-sm px-2 py-0.5 rounded-full"
                        style={{
                          background: e.paid ? "rgba(45,106,79,0.1)" : "rgba(201,168,76,0.15)",
                          color: e.paid ? "var(--green-deep)" : "var(--gold)",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        {e.paid ? "Paid" : "Unpaid"}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--green-deep)" }}>
                        {e.setsWon}/{50}
                      </span>
                      {expandedEntrant === e.id ? (
                        <ChevronUp size={16} style={{ color: "var(--charcoal-mid)" }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: "var(--charcoal-mid)" }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedEntrant === e.id && (
                    <div
                      className="px-4 pb-4 pt-2 border-t flex flex-wrap gap-3"
                      style={{ borderColor: "var(--cream-dark)", background: "var(--cream)" }}
                    >
                      <div className="text-sm space-y-1 flex-1" style={{ color: "var(--charcoal-mid)" }}>
                        <p>Sets played: <strong>{e.setsPlayed}</strong></p>
                        <p>Sets won: <strong>{e.setsWon}</strong></p>
                        <p>Completed: <strong>{e.completed ? "Yes" : "No"}</strong></p>
                        {e.stripePaymentIntentId && (
                          <p className="text-xs">Stripe PI: {e.stripePaymentIntentId}</p>
                        )}
                      </div>
                      {!e.paid && (
                        <Button
                          size="sm"
                          disabled={markPaidMut.isPending}
                          onClick={() => markPaidMut.mutate({ entrantId: e.id })}
                          style={{ background: "var(--green-deep)", color: "var(--cream)" }}
                        >
                          <CreditCard size={14} className="mr-1" />
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Set Reports tab ── */}
        {tab === "sets" && (
          <div className="space-y-2">
            {setsLoading ? (
              [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg animate-pulse"
                  style={{ background: "var(--cream-dark)" }}
                />
              ))
            ) : !setReports || setReports.length === 0 ? (
              <p style={{ color: "var(--charcoal-mid)" }}>No set reports yet.</p>
            ) : (
              setReports.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-3 px-4 rounded-lg border"
                  style={{
                    background: s.verified ? "rgba(45,106,79,0.04)" : "#fff",
                    borderColor: s.verified ? "rgba(45,106,79,0.2)" : "var(--cream-dark)",
                  }}
                >
                  <span
                    className="shrink-0 w-2 h-2 rounded-full"
                    style={{ background: s.won ? "var(--green-mid)" : "var(--charcoal-mid)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
                      <span style={{ color: "var(--green-deep)" }}>{s.displayName}</span>
                      {" vs "}
                      {s.opponent}
                    </p>
                    <p className="text-xs" style={{ color: "var(--charcoal-mid)" }}>
                      {s.score} · {new Date(s.playedOn).toLocaleDateString("en-GB")}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </p>
                  </div>
                  {s.verified && (
                    <span
                      className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(45,106,79,0.1)", color: "var(--green-deep)" }}
                    >
                      Verified
                    </span>
                  )}
                  {!s.verified && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={verifySetMut.isPending}
                      onClick={() => verifySetMut.mutate({ reportId: s.id })}
                      style={{ borderColor: "var(--green-mid)", color: "var(--green-mid)" }}
                    >
                      <CheckCircle2 size={13} className="mr-1" />
                      Verify
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteSetMut.isPending}
                    onClick={() => {
                      if (confirm("Delete this set report? This will recalculate the player's totals.")) {
                        deleteSetMut.mutate({ reportId: s.id });
                      }
                    }}
                    style={{ borderColor: "var(--charcoal-mid)", color: "var(--charcoal-mid)" }}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
