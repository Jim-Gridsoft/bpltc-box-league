import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Users,
  ChevronRight,
  Loader2,
  ClipboardEdit,
  X,
  Trophy,
} from "lucide-react";

// ── Inline result form state per fixture ─────────────────────────────────────
interface FixtureResultState {
  score: string;
  winner: "A" | "B";
  playedAt: string;
  notes: string;
}

const defaultResultState = (): FixtureResultState => ({
  score: "",
  winner: "A",
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
  const [form, setForm] = useState<FixtureResultState>(defaultResultState);

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
      utils.tournament.myFixtures.invalidate();
      utils.tournament.myMatches.invalidate();
      utils.tournament.myEntry.invalidate();
      onResultSubmitted();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.score.trim()) {
      toast.error("Please enter the score.");
      return;
    }
    // iAmTeamA: my team is Team A in the fixture, so "A won" = "we won"
    // iAmTeamB: my team is Team B, so "A won" = "we lost" → flip
    const fixtureWinner: "A" | "B" = iAmTeamA
      ? form.winner
      : form.winner === "A"
      ? "B"
      : "A";

    reportMutation.mutate({
      seasonId: f.seasonId,
      boxId: f.boxId,
      partner1Id: partnerId,
      player2Id: opp1Id,
      partner2Id: opp2Id,
      score: form.score,
      winner: fixtureWinner,
      playedAt: new Date(form.playedAt),
      notes: form.notes || undefined,
      fixtureId: f.id,
    });
  };

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
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
              f.status === "played"
                ? "bg-green-100 text-green-700"
                : f.status === "cancelled"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {f.status}
          </span>
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
        <div className="border-t border-gray-200 bg-white px-4 py-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Enter Result — Round {f.round}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Score <span className="text-gray-400">(e.g. 6-4, 3-6, 10-7)</span>
              </label>
              <input
                value={form.score}
                onChange={(e) => setForm((s) => ({ ...s, score: e.target.value }))}
                placeholder="6-4, 6-2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Result</label>
              <select
                value={form.winner}
                onChange={(e) => setForm((s) => ({ ...s, winner: e.target.value as "A" | "B" }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              >
                <option value="A">We won (my team)</option>
                <option value="B">We lost (opponents won)</option>
              </select>
            </div>
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
                placeholder="Any notes about the match"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!form.score.trim() || reportMutation.isPending}
              className="bg-[#1b4332] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {reportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Result
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setForm(defaultResultState());
              }}
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

// ── Main Results Page ─────────────────────────────────────────────────────────
export default function Results() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [seasonId, setSeasonId] = useState<number | null>(null);

  const { data: seasons } = trpc.tournament.seasons.useQuery();
  const { data: currentSeason } = trpc.tournament.currentSeason.useQuery();

  const activeSeason = useMemo(() => {
    if (seasonId) return seasons?.find((s) => s.id === seasonId) ?? currentSeason;
    return currentSeason;
  }, [seasonId, seasons, currentSeason]);

  const { data: myEntry } = trpc.tournament.myEntry.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason && isAuthenticated }
  );

  // Only fetch fixtures and matches for paid entrants
  const { data: myFixtures, refetch: refetchFixtures } = trpc.tournament.myFixtures.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );

  const { data: myMatches } = trpc.tournament.myMatches.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );

  // ── Loading ──
  if (authLoading)
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" />
      </div>
    );

  // ── Not logged in ──
  if (!isAuthenticated)
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Sign In to Record Results</h1>
          <p className="text-gray-600 mb-8">
            You need to be signed in and registered for the current season to record match results.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );

  // ── Not a paid entrant ──
  if (myEntry && !myEntry.paid)
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Payment Required</h1>
          <p className="text-gray-600 mb-8">
            Please complete your £20 entry payment to access match result entry.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors"
          >
            Go to Dashboard to Pay
          </a>
        </div>
      </div>
    );

  // ── Not registered ──
  if (!myEntry)
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Not Registered</h1>
          <p className="text-gray-600 mb-8">
            You are not registered for the current season. Register via your Dashboard to enter the
            box league and record match results.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );

  const upcomingCount = myFixtures?.filter((f) => f.status === "scheduled").length ?? 0;
  const rounds = myFixtures
    ? Array.from(new Set(myFixtures.map((f) => f.round))).sort((a, b) => a - b)
    : [];

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />

      {/* Page header */}
      <div className="bg-[#1b4332] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-green-300 text-sm mb-1">
            {activeSeason?.name ?? "BPLTC Men's Doubles Box League"}
          </p>
          <h1 className="font-serif text-3xl font-bold">My Match Results</h1>
          <p className="text-green-200 mt-1 text-sm">
            Record results only for matches you have played in
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Season selector */}
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

        {/* Fixture schedule with inline result entry */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#c9a84c]" />
            <h2 className="font-serif text-xl font-bold text-[#1b4332]">My Fixtures</h2>
            {upcomingCount > 0 && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                {upcomingCount} to play
              </span>
            )}
          </div>

          {!myFixtures ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" />
            </div>
          ) : myFixtures.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">
                Your fixture schedule has not been generated yet. Check back once the admin has
                created boxes and generated fixtures for this season.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rounds.map((round) => (
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
          )}
        </div>

        {/* Match history */}
        {myMatches && myMatches.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">My Match History</h2>
              <span className="ml-auto text-xs text-gray-400">
                {myMatches.length} match{myMatches.length !== 1 ? "es" : ""} played
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {myMatches.map((m) => {
                const iWon =
                  m.player1Id === myEntry.id || m.partner1Id === myEntry.id
                    ? m.winner === "A"
                    : m.winner === "B";
                return (
                  <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
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
                          iWon ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}
                      >
                        {iWon ? "Won · +2 pts" : "Lost · +1 pt"}
                      </span>
                      {m.verified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
