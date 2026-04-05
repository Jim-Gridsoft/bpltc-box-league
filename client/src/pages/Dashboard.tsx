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
  Trophy,
  CreditCard,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Clock,
  BarChart3,
  LogIn,
} from "lucide-react";

const TARGET = 50;

function ProgressRing({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="100" height="100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--cream-dark)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={pct >= 100 ? "var(--gold)" : "var(--green-mid)"}
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="16"
        fontWeight="700"
        fontFamily="'Cormorant Garamond', serif"
        fill={pct >= 100 ? "var(--gold)" : "var(--green-deep)"}
      >
        {pct}%
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  // Registration form state
  const [displayName, setDisplayName] = useState(user?.name ?? "");

  // Set report form state
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState("");
  const [won, setWon] = useState(true);
  const [playedOn, setPlayedOn] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Queries
  const { data: myEntry, isLoading: entryLoading } = trpc.tournament.myEntry.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: setHistory, isLoading: historyLoading } = trpc.tournament.mySetHistory.useQuery(
    undefined,
    { enabled: isAuthenticated && !!myEntry?.paid }
  );

  // Mutations
  const registerMut = trpc.tournament.register.useMutation({
    onSuccess: () => {
      utils.tournament.myEntry.invalidate();
      toast.success("Registration successful! Please complete your payment.");
    },
    onError: (e) => toast.error(e.message),
  });

  const checkoutMut = trpc.tournament.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to secure payment...");
        window.open(data.url, "_blank");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const reportSetMut = trpc.tournament.reportSet.useMutation({
    onSuccess: () => {
      utils.tournament.myEntry.invalidate();
      utils.tournament.mySetHistory.invalidate();
      utils.tournament.leaderboard.invalidate();
      setOpponent("");
      setScore("");
      setWon(true);
      setNotes("");
      setPlayedOn(new Date().toISOString().split("T")[0]);
      setShowForm(false);
      toast.success("Set reported successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSetMut = trpc.tournament.deleteSet.useMutation({
    onSuccess: () => {
      utils.tournament.myEntry.invalidate();
      utils.tournament.mySetHistory.invalidate();
      utils.tournament.leaderboard.invalidate();
      toast.success("Set removed.");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="container py-24 text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: "var(--green-deep)", borderTopColor: "transparent" }}
          />
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
          <h2
            className="text-3xl font-semibold mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            Sign In Required
          </h2>
          <p className="mb-6" style={{ color: "var(--charcoal-mid)" }}>
            Please sign in to access your tournament dashboard.
          </p>
          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            style={{ background: "var(--green-deep)", color: "var(--cream)" }}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const pct = myEntry ? Math.min(100, Math.round((myEntry.setsWon / TARGET) * 100)) : 0;

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
            My Dashboard
          </span>
          <h1
            className="text-4xl font-bold mt-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}
          >
            {user?.name ?? "Player"}
          </h1>
        </div>
      </div>

      <div className="container py-10 max-w-3xl space-y-8">

        {/* ── Step 1: Register ── */}
        {!myEntry && !entryLoading && (
          <div
            className="rounded-lg border p-8"
            style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
          >
            <span
              className="label-tag"
              style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Step 1 of 2
            </span>
            <h2
              className="text-3xl font-semibold mt-1 mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
            >
              Register for the Tournament
            </h2>
            <p className="mb-6 text-sm" style={{ color: "var(--charcoal-mid)" }}>
              Enter the name you'd like displayed on the leaderboard, then proceed to pay the £20 entry fee.
            </p>
            <div className="space-y-4 max-w-sm">
              <div>
                <Label htmlFor="displayName" style={{ color: "var(--green-deep)" }}>
                  Display Name (shown on leaderboard)
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. J. Smith"
                  className="mt-1"
                />
              </div>
              <Button
                disabled={displayName.trim().length < 2 || registerMut.isPending}
                onClick={() => registerMut.mutate({ displayName: displayName.trim() })}
                style={{ background: "var(--green-deep)", color: "var(--cream)" }}
              >
                {registerMut.isPending ? "Registering..." : "Register"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Pay ── */}
        {myEntry && !myEntry.paid && (
          <div
            className="rounded-lg border-2 p-8"
            style={{ background: "#fff", borderColor: "var(--gold)" }}
          >
            <span
              className="label-tag"
              style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Step 2 of 2
            </span>
            <h2
              className="text-3xl font-semibold mt-1 mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
            >
              Complete Your Entry Payment
            </h2>
            <p className="mb-2 text-sm" style={{ color: "var(--charcoal-mid)" }}>
              Registered as: <strong style={{ color: "var(--green-deep)" }}>{myEntry.displayName}</strong>
            </p>
            <p className="mb-6 text-sm" style={{ color: "var(--charcoal-mid)" }}>
              Pay the £20 entry fee to activate your place on the ladder. You will be redirected to a
              secure Stripe checkout page.
            </p>
            <Button
              size="lg"
              disabled={checkoutMut.isPending}
              onClick={() => checkoutMut.mutate()}
              style={{ background: "var(--gold)", color: "var(--green-deep)", fontWeight: 600 }}
            >
              <CreditCard size={16} className="mr-2" />
              {checkoutMut.isPending ? "Loading..." : "Pay £20 Entry Fee"}
            </Button>
            <p className="mt-3 text-xs" style={{ color: "var(--charcoal-mid)" }}>
              Payments are processed securely by Stripe. Use test card 4242 4242 4242 4242.
            </p>
          </div>
        )}

        {/* ── Active player view ── */}
        {myEntry?.paid && (
          <>
            {/* Progress card */}
            <div
              className="rounded-lg border p-8 flex flex-col sm:flex-row items-center gap-8"
              style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
            >
              <ProgressRing pct={pct} />
              <div className="flex-1 text-center sm:text-left">
                {myEntry.completed ? (
                  <>
                    <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                      <Trophy size={24} style={{ color: "var(--gold)" }} />
                      <span
                        className="text-2xl font-bold"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--gold)" }}
                      >
                        Challenge Complete!
                      </span>
                    </div>
                    <p style={{ color: "var(--charcoal-mid)" }}>
                      Congratulations — you have reached {TARGET} sets won. Check the leaderboard to see your final ranking.
                    </p>
                  </>
                ) : (
                  <>
                    <h2
                      className="text-3xl font-semibold mb-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                    >
                      {myEntry.displayName}
                    </h2>
                    <p className="text-4xl font-bold mb-1" style={{ color: "var(--green-deep)" }}>
                      {myEntry.setsWon}
                      <span className="text-xl font-normal" style={{ color: "var(--charcoal-mid)" }}>
                        {" "}/ {TARGET} sets won
                      </span>
                    </p>
                    <p className="text-sm" style={{ color: "var(--charcoal-mid)" }}>
                      {myEntry.setsPlayed} sets played · {TARGET - myEntry.setsWon} more wins needed
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--charcoal-mid)" }}>
                  <CheckCircle2 size={14} style={{ color: "var(--green-mid)" }} />
                  {myEntry.setsWon} won
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--charcoal-mid)" }}>
                  <Clock size={14} style={{ color: "var(--charcoal-mid)" }} />
                  {myEntry.setsPlayed - myEntry.setsWon} lost
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--charcoal-mid)" }}>
                  <BarChart3 size={14} style={{ color: "var(--charcoal-mid)" }} />
                  {myEntry.setsPlayed} total
                </div>
              </div>
            </div>

            {/* Report a set */}
            <div
              className="rounded-lg border p-6"
              style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-2xl font-semibold"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                >
                  Report a Set
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(!showForm)}
                  style={{ borderColor: "var(--green-mid)", color: "var(--green-mid)" }}
                >
                  <PlusCircle size={14} className="mr-1" />
                  {showForm ? "Cancel" : "Add Set"}
                </Button>
              </div>

              {showForm && (
                <form
                  className="space-y-4 mt-4 pt-4 border-t"
                  style={{ borderColor: "var(--cream-dark)" }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    reportSetMut.mutate({
                      opponent,
                      score,
                      won,
                      playedOn: new Date(playedOn),
                      notes: notes || undefined,
                    });
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="opponent" style={{ color: "var(--green-deep)" }}>
                        Opponent(s)
                      </Label>
                      <Input
                        id="opponent"
                        value={opponent}
                        onChange={(e) => setOpponent(e.target.value)}
                        placeholder="e.g. A. Jones & B. Smith"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="score" style={{ color: "var(--green-deep)" }}>
                        Score
                      </Label>
                      <Input
                        id="score"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="e.g. 6-3"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="playedOn" style={{ color: "var(--green-deep)" }}>
                        Date Played
                      </Label>
                      <Input
                        id="playedOn"
                        type="date"
                        value={playedOn}
                        onChange={(e) => setPlayedOn(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label style={{ color: "var(--green-deep)" }}>Result</Label>
                      <div className="flex gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setWon(true)}
                          className="flex-1 py-2 rounded border text-sm font-medium transition-colors"
                          style={{
                            background: won ? "var(--green-deep)" : "transparent",
                            color: won ? "var(--cream)" : "var(--green-deep)",
                            borderColor: "var(--green-deep)",
                          }}
                        >
                          Won
                        </button>
                        <button
                          type="button"
                          onClick={() => setWon(false)}
                          className="flex-1 py-2 rounded border text-sm font-medium transition-colors"
                          style={{
                            background: !won ? "var(--charcoal)" : "transparent",
                            color: !won ? "var(--cream)" : "var(--charcoal)",
                            borderColor: "var(--charcoal)",
                          }}
                        >
                          Lost
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes" style={{ color: "var(--green-deep)" }}>
                      Notes (optional)
                    </Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Club championship match"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={reportSetMut.isPending}
                    style={{ background: "var(--green-deep)", color: "var(--cream)" }}
                  >
                    {reportSetMut.isPending ? "Saving..." : "Submit Set Result"}
                  </Button>
                </form>
              )}
            </div>

            {/* Set history */}
            <div
              className="rounded-lg border p-6"
              style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
            >
              <h3
                className="text-2xl font-semibold mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                My Set History
              </h3>
              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded animate-pulse"
                      style={{ background: "var(--cream-dark)" }}
                    />
                  ))}
                </div>
              ) : !setHistory || setHistory.length === 0 ? (
                <p style={{ color: "var(--charcoal-mid)" }}>
                  No sets reported yet. Use the button above to log your first result.
                </p>
              ) : (
                <div className="space-y-2">
                  {setHistory.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 py-3 px-4 rounded border"
                      style={{
                        borderColor: "var(--cream-dark)",
                        background: s.won ? "rgba(45,106,79,0.04)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{ background: s.won ? "var(--green-mid)" : "var(--charcoal-mid)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: "var(--charcoal)" }}>
                          vs {s.opponent}
                        </span>
                        {s.notes && (
                          <span className="text-xs ml-2" style={{ color: "var(--charcoal-mid)" }}>
                            · {s.notes}
                          </span>
                        )}
                      </div>
                      <span
                        className="shrink-0 text-sm font-semibold"
                        style={{ color: s.won ? "var(--green-deep)" : "var(--charcoal-mid)" }}
                      >
                        {s.score}
                      </span>
                      <span className="shrink-0 text-xs" style={{ color: "var(--charcoal-mid)" }}>
                        {new Date(s.playedOn).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <button
                        onClick={() => deleteSetMut.mutate({ reportId: s.id })}
                        disabled={deleteSetMut.isPending}
                        className="shrink-0 p-1 rounded transition-colors"
                        style={{ color: "var(--charcoal-mid)" }}
                        title="Remove this set"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
