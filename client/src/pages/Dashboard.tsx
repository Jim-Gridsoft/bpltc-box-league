import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  Calendar,
  CreditCard,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  Star,
  Loader2,
  ClipboardEdit,
  X,
} from "lucide-react";
import SetScoreEntry, { ScoreResult } from "@/components/SetScoreEntry";

// ── Inline result form state per fixture ─────────────────────────────────────
const defaultScoreResult = (): ScoreResult => ({ scoreString: "", winner: null, valid: false, message: "" });

const defaultResultState = () => ({
  playedAt: new Date().toISOString().split("T")[0],
  notes: "",
});

// ── FixtureCard ───────────────────────────────────────────────────────────────
interface FixtureCardProps {
  fixture: {
    id: number;
    round: number;
    status: string;
    boxId: number;
    seasonId: number;
    teamAPlayer1: number;
    teamAPlayer2: number;
    teamBPlayer1: number;
    teamBPlayer2: number;
    teamAPlayer1Name: string;
    teamAPlayer2Name: string;
    teamBPlayer1Name: string;
    teamBPlayer2Name: string;
  };
  currentUserId: number;
  onResultSubmitted: () => void;
}

function FixtureCard({ fixture: f, currentUserId, onResultSubmitted }: FixtureCardProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultResultState);
  const [scoreResult, setScoreResult] = useState<ScoreResult>(defaultScoreResult);

  const iAmTeamA = f.teamAPlayer1 === currentUserId || f.teamAPlayer2 === currentUserId;

  const myPartner = iAmTeamA
    ? f.teamAPlayer1 === currentUserId
      ? f.teamAPlayer2Name
      : f.teamAPlayer1Name
    : f.teamBPlayer1 === currentUserId
    ? f.teamBPlayer2Name
    : f.teamBPlayer1Name;

  const opponents = iAmTeamA
    ? `${f.teamBPlayer1Name} & ${f.teamBPlayer2Name}`
    : `${f.teamAPlayer1Name} & ${f.teamAPlayer2Name}`;

  // IDs needed for the mutation
  const partnerId = iAmTeamA
    ? f.teamAPlayer1 === currentUserId
      ? f.teamAPlayer2
      : f.teamAPlayer1
    : f.teamBPlayer1 === currentUserId
    ? f.teamBPlayer2
    : f.teamBPlayer1;

  const opp1Id = iAmTeamA ? f.teamBPlayer1 : f.teamAPlayer1;
  const opp2Id = iAmTeamA ? f.teamBPlayer2 : f.teamAPlayer2;

  const utils = trpc.useUtils();
  const reportMutation = trpc.tournament.reportMatch.useMutation({
    onSuccess: () => {
      toast.success("Result recorded! Points have been updated.");
      setOpen(false);
      setForm(defaultResultState());
      // Invalidate all queries that display points so they refresh immediately
      utils.tournament.myFixtures.invalidate();
      utils.tournament.myMatches.invalidate();
      utils.tournament.myEntry.invalidate();
      utils.tournament.myBox.invalidate();
      utils.tournament.seasonLeaderboard.invalidate();
      utils.tournament.yearLeaderboard.invalidate();
      utils.tournament.seasonBoxes.invalidate();
      utils.tournament.boxDetail.invalidate();
      onResultSubmitted();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!scoreResult.valid || !scoreResult.winner) {
      toast.error(scoreResult.message || "Please enter a valid score.");
      return;
    }
    // The backend always stores the submitting user as player1Id (Team A).
    // SetScoreEntry uses "A" = "my team won", which directly matches the backend's
    // Team A perspective — no flip needed regardless of fixture team assignment.
    reportMutation.mutate({
      seasonId: f.seasonId,
      boxId: f.boxId,
      partner1Id: partnerId,
      player2Id: opp1Id,
      partner2Id: opp2Id,
      score: scoreResult.scoreString,
      winner: scoreResult.winner,
      playedAt: new Date(form.playedAt),
      notes: form.notes || undefined,
      fixtureId: f.id,
    });
  };

  const statusBadge = (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0 ${
        f.status === "played"
          ? "bg-green-100 text-green-700"
          : f.status === "cancelled"
          ? "bg-red-100 text-red-600"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {f.status}
    </span>
  );

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden mb-3 last:mb-0 border border-gray-100">
      {/* Summary row */}
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1b4332] flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">
              Partner: <strong>{myPartner}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">vs {opponents}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusBadge}
          {f.status === "scheduled" && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#1b4332] text-white px-3 py-1.5 rounded-lg hover:bg-[#2d6a4f] transition-colors"
            >
              {open ? (
                <>
                  <X className="w-3.5 h-3.5" /> Cancel
                </>
              ) : (
                <>
                  <ClipboardEdit className="w-3.5 h-3.5" /> Record Result
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Inline result form */}
      {open && f.status === "scheduled" && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Enter Result — My team vs {opponents}
          </p>

          {/* Structured set-score entry */}
          <SetScoreEntry onChange={setScoreResult} />

          {/* Date + notes */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date Played</label>
              <input
                type="date"
                value={form.playedAt}
                onChange={(e) => setForm((s) => ({ ...s, playedAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <input
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Any notes"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!scoreResult.valid || reportMutation.isPending}
              className="bg-[#1b4332] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {reportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Result
            </button>
            <button
              onClick={() => { setOpen(false); setForm(defaultResultState()); setScoreResult(defaultScoreResult()); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [regName, setRegName] = useState("");
  const [regAbility, setRegAbility] = useState(3);
  const utils = trpc.useUtils();

  const { data: seasons } = trpc.tournament.seasons.useQuery();
  const { data: currentSeason } = trpc.tournament.currentSeason.useQuery();
  const activeSeason = useMemo(() => {
    if (seasonId) return seasons?.find((s) => s.id === seasonId) ?? currentSeason;
    return currentSeason;
  }, [seasonId, seasons, currentSeason]);

  const { data: myEntry, isLoading: entrantLoading } = trpc.tournament.myEntry.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason && isAuthenticated }
  );
  const { data: myMatches } = trpc.tournament.myMatches.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );
  const { data: myBox } = trpc.tournament.myBox.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );
  const { data: myFixtures, refetch: refetchFixtures } = trpc.tournament.myFixtures.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );

  const registerMutation = trpc.tournament.register.useMutation({
    onSuccess: () => {
      toast.success("Registered! Please complete payment.");
      utils.tournament.myEntry.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const checkoutMutation = trpc.tournament.createCheckout.useMutation({
    onSuccess: (data: { url: string | null }) => {
      if (data.url) {
        toast.info("Redirecting to payment...");
        window.open(data.url, "_blank");
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const sandboxRegisterMutation = trpc.tournament.sandboxRegister.useMutation({
    onSuccess: () => {
      toast.success("Demo registration complete! You are now a paid entrant.");
      utils.tournament.myEntry.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (authLoading)
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" />
      </div>
    );

  if (!isAuthenticated)
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Sign In to Enter</h1>
          <p className="text-gray-600 mb-8">
            Create a free account to register for the BPLTC Men's Doubles Box League and get placed
            in an ability-matched box.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors"
          >
            Sign In / Register
          </a>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />
      <div className="bg-[#1b4332] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-green-300 text-sm mb-1">Welcome back</p>
          <h1 className="font-serif text-3xl font-bold">{user?.name ?? "Player"}</h1>
          <p className="text-green-200 mt-1">
            {activeSeason?.name ?? "BPLTC Men's Doubles Box League"}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {seasons && seasons.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeasonId(s.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeSeason?.id === s.id
                    ? "bg-[#1b4332] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {entrantLoading ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" />
          </div>
        ) : !myEntry ? (
          /* ── Registration card ── */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="w-6 h-6 text-[#c9a84c]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">
                Register for {activeSeason?.name ?? "the current season"} Box League
              </h2>
            </div>
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ability Rating (1-5)
                </label>
                <select
                  value={regAbility}
                  onChange={(e) => setRegAbility(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                >
                  <option value={1}>1 - Beginner</option>
                  <option value={2}>2 - Improver</option>
                  <option value={3}>3 - Intermediate</option>
                  <option value={4}>4 - Advanced</option>
                  <option value={5}>5 - County / Elite</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Used to seed you into an ability-matched box. Be honest — you will enjoy the
                  competition more when playing at the right level.
                </p>
              </div>
              <button
                onClick={() =>
                  activeSeason &&
                  registerMutation.mutate({
                    seasonId: activeSeason.id,
                    displayName: regName,
                    abilityRating: regAbility,
                  })
                }
                disabled={!regName.trim() || registerMutation.isPending}
                className="w-full bg-[#1b4332] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Register for this Season — £20
              </button>
              <div className="mt-3 pt-3 border-t border-dashed border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-2">
                  🧪 Demo Mode — skip payment for testing
                </p>
                <button
                  onClick={() =>
                    activeSeason &&
                    sandboxRegisterMutation.mutate({
                      seasonId: activeSeason.id,
                      displayName: regName || "Demo Player",
                      abilityRating: regAbility,
                    })
                  }
                  disabled={sandboxRegisterMutation.isPending}
                  className="w-full bg-amber-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sandboxRegisterMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Register Free (Demo — No Payment)
                </button>
              </div>
            </div>
          </div>
        ) : !myEntry.paid ? (
          /* ── Payment pending card ── */
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-amber-500" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">
                Complete Your Payment
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-5">
              You are registered as <strong>{myEntry.displayName}</strong> for{" "}
              {activeSeason?.name}. Pay the £20 entry fee to confirm your place in the box league.
            </p>
            <button
              onClick={() =>
                myEntry && activeSeason && checkoutMutation.mutate({ seasonId: activeSeason.id })
              }
              disabled={checkoutMutation.isPending}
              className="bg-[#c9a84c] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b8963d] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {checkoutMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Pay £20 Entry Fee <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Season Points",
                  value: myEntry.seasonPoints,
                  icon: <Star className="w-5 h-5 text-[#c9a84c]" />,
                },
                {
                  label: "Matches Played",
                  value: myEntry.matchesPlayed,
                  icon: <Users className="w-5 h-5 text-blue-500" />,
                },
                {
                  label: "Matches Won",
                  value: myEntry.matchesWon,
                  icon: <Trophy className="w-5 h-5 text-green-600" />,
                },
                {
                  label: "Win Rate",
                  value:
                    myEntry.matchesPlayed > 0
                      ? `${Math.round((myEntry.matchesWon / myEntry.matchesPlayed) * 100)}%`
                      : "—",
                  icon: <CheckCircle2 className="w-5 h-5 text-purple-500" />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {stat.icon}
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1b4332] font-serif">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* ── My Box ── */}
            {myBox && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-[#1b4332]" />
                  <h2 className="font-serif text-xl font-bold text-[#1b4332]">
                    My Box — {myBox.name}
                  </h2>
                </div>
                {myBox.members && myBox.members.length > 0 ? (
                  <div className="space-y-2">
                    {myBox.members.map((m, i) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${
                          m.userId === user?.id
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-5">{i + 1}</span>
                          <span className="font-medium text-gray-800">{m.displayName}</span>
                          {m.userId === user?.id && (
                            <span className="text-xs bg-[#1b4332] text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#1b4332]">{m.seasonPoints} pts</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {m.matchesPlayed}P {m.matchesWon}W
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Box assignments will be published when the season opens.
                  </p>
                )}
              </div>
            )}

            {/* ── Fixture Schedule with inline result entry ── */}
            {myFixtures && myFixtures.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#c9a84c]" />
                  <h2 className="font-serif text-xl font-bold text-[#1b4332]">
                    My Fixture Schedule
                  </h2>
                  <span className="ml-auto text-xs text-gray-400">
                    {myFixtures.filter((f) => f.status === "scheduled").length} upcoming
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {Array.from(new Set(myFixtures.map((f) => f.round)))
                    .sort((a, b) => a - b)
                    .map((round) => (
                      <div key={round} className="px-6 py-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                          Round {round}
                        </p>
                        {myFixtures
                          .filter((f) => f.round === round)
                          .map((f) => (
                            <FixtureCard
                              key={f.id}
                              fixture={f}
                              currentUserId={user?.id ?? 0}
                              onResultSubmitted={() => refetchFixtures()}
                            />
                          ))}
                      </div>
                    ))}
                </div>
              </div>
            ) : myEntry.paid ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  Your fixture schedule will appear here once the admin generates fixtures for your
                  box.
                </p>
              </div>
            ) : null}

            {/* ── Match History ── */}
            {myMatches && myMatches.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#c9a84c]" />
                  <h2 className="font-serif text-xl font-bold text-[#1b4332]">
                    My Match History
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {myMatches.map((m) => {
                    const iWon =
                      m.player1Id === myEntry.id || m.partner1Id === myEntry.id
                        ? m.winner === "A"
                        : m.winner === "B";
                    return (
                      <div
                        key={m.id}
                        className="px-6 py-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              iWon ? "bg-green-500" : "bg-red-400"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{m.score}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(m.playedAt).toLocaleDateString("en-GB")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              iWon
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {iWon ? "+2 pts" : "+1 pt"}
                          </span>
                          {m.verified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
