import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import SetScoreEntry, { ScoreResult } from "@/components/SetScoreEntry";
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
  Eye,
  Phone,
  Mail,
  UserCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FixtureShape {
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
  matchId: number | null;
  /** When true this is a balancer fixture — per-player points eligibility applies */
  isBalancer?: boolean;
  /**
   * JSON-encoded array of userIds who score points in this balancer fixture.
   * Players NOT in this list score 0 pts. Null/undefined on normal fixtures.
   */
  balancerEligiblePlayers?: string | null;
}

// ── FixtureCard ───────────────────────────────────────────────────────────────
interface FixtureCardProps {
  fixture: FixtureShape;
  currentUserId: number;
  canEdit: boolean; // true only when the current user is one of the four players
  onResultSubmitted: () => void;
}

function FixtureCard({ fixture: f, currentUserId, canEdit, onResultSubmitted }: FixtureCardProps) {
  const [open, setOpen] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult>({
    scoreString: "",
    winner: null,
    valid: false,
    message: "",
  });
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const iAmTeamA = f.teamAPlayer1 === currentUserId || f.teamAPlayer2 === currentUserId;

  // Labels for the form — only meaningful when canEdit is true
  const myPartner = iAmTeamA
    ? f.teamAPlayer1 === currentUserId ? f.teamAPlayer2Name : f.teamAPlayer1Name
    : f.teamBPlayer1 === currentUserId ? f.teamBPlayer2Name : f.teamBPlayer1Name;

  const opponents = iAmTeamA
    ? `${f.teamBPlayer1Name} & ${f.teamBPlayer2Name}`
    : `${f.teamAPlayer1Name} & ${f.teamAPlayer2Name}`;

  const partnerId = iAmTeamA
    ? f.teamAPlayer1 === currentUserId ? f.teamAPlayer2 : f.teamAPlayer1
    : f.teamBPlayer1 === currentUserId ? f.teamBPlayer2 : f.teamBPlayer1;

  const opp1Id = iAmTeamA ? f.teamBPlayer1 : f.teamAPlayer1;
  const opp2Id = iAmTeamA ? f.teamBPlayer2 : f.teamAPlayer2;

  const utils = trpc.useUtils();
  const reportMutation = trpc.tournament.reportMatch.useMutation({
    onSuccess: () => {
      toast.success("Result recorded! Points have been updated.");
      setOpen(false);
      setScoreResult({ scoreString: "", winner: null, valid: false, message: "" });
      setNotes("");
      utils.tournament.myBoxFixtures.invalidate();
      utils.tournament.myFixtures.invalidate();
      utils.tournament.myMatches.invalidate();
      utils.tournament.myEntry.invalidate();
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
      playedAt: new Date(playedAt),
      notes: notes || undefined,
      fixtureId: f.id,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setScoreResult({ scoreString: "", winner: null, valid: false, message: "" });
    setNotes("");
  };

  return (
    <div className={`rounded-xl overflow-hidden mb-3 last:mb-0 border ${
      canEdit ? "bg-gray-50 border-gray-100" : "bg-white border-gray-100 opacity-80"
    }`}>
      {/* Summary row */}
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-1 min-w-0">
          {/* Team A */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1b4332] flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">
              {f.teamAPlayer1Name} &amp; {f.teamAPlayer2Name}
            </span>
            {(f.teamAPlayer1 === currentUserId || f.teamAPlayer2 === currentUserId) && (
              <span className="text-xs bg-[#1b4332] text-white px-1.5 py-0.5 rounded font-medium flex-shrink-0">you</span>
            )}
          </div>
          {/* vs */}
          <div className="flex items-center gap-2 pl-6">
            <span className="text-xs text-gray-400 font-medium">vs</span>
          </div>
          {/* Team B */}
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">
              {f.teamBPlayer1Name} &amp; {f.teamBPlayer2Name}
            </span>
            {(f.teamBPlayer1 === currentUserId || f.teamBPlayer2 === currentUserId) && (
              <span className="text-xs bg-[#1b4332] text-white px-1.5 py-0.5 rounded font-medium flex-shrink-0">you</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {f.isBalancer && (() => {
            let eligibleIds: number[] = [];
            try { eligibleIds = f.balancerEligiblePlayers ? JSON.parse(f.balancerEligiblePlayers) : []; } catch {}
            const meEligible = eligibleIds.includes(currentUserId);
            return (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                meEligible
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                Balancer — {meEligible ? 'pts count' : '0 pts'}
              </span>
            );
          })()}
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

          {f.status === "scheduled" && canEdit && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#1b4332] text-white px-3 py-1.5 rounded-lg hover:bg-[#2d6a4f] transition-colors"
            >
              {open ? (
                <><X className="w-3.5 h-3.5" /> Cancel</>
              ) : (
                <><ClipboardEdit className="w-3.5 h-3.5" /> Record Result</>
              )}
            </button>
          )}

          {f.status === "scheduled" && !canEdit && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3.5 h-3.5" /> View only
            </span>
          )}
        </div>
      </div>

      {/* Inline result form — only shown when canEdit */}
      {open && canEdit && f.status === "scheduled" && (
        <div className="border-t border-gray-200 bg-white px-5 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Enter Result — Round {f.round}
            </p>
            <p className="text-xs text-gray-400">
              You &amp; {myPartner} vs {opponents}
            </p>
            {f.isBalancer && (() => {
              let eligibleIds: number[] = [];
              try { eligibleIds = f.balancerEligiblePlayers ? JSON.parse(f.balancerEligiblePlayers) : []; } catch {}
              const allPlayers = [
                { id: f.teamAPlayer1, name: f.teamAPlayer1Name },
                { id: f.teamAPlayer2, name: f.teamAPlayer2Name },
                { id: f.teamBPlayer1, name: f.teamBPlayer1Name },
                { id: f.teamBPlayer2, name: f.teamBPlayer2Name },
              ];
              const scoringPlayers = allPlayers.filter(p => eligibleIds.includes(p.id));
              const nonScoringPlayers = allPlayers.filter(p => !eligibleIds.includes(p.id));
              return (
                <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 space-y-1">
                  <p className="font-semibold text-amber-800">Balancer match — per-player points</p>
                  {scoringPlayers.length > 0 && (
                    <p className="text-green-700">✔ Points count for: {scoringPlayers.map(p => p.name).join(', ')}</p>
                  )}
                  {nonScoringPlayers.length > 0 && (
                    <p className="text-amber-700">✘ No points for: {nonScoringPlayers.map(p => p.name).join(', ')} (already at max matches)</p>
                  )}
                </div>
              );
            })()}
          </div>

          <SetScoreEntry onChange={setScoreResult} />

          {scoreResult.valid && scoreResult.winner && (
            <div
              className={`text-sm font-semibold px-3 py-2 rounded-lg ${
                scoreResult.winner === "A"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {scoreResult.winner === "A" ? "✓ Your team won" : "✗ Opponents won"} —{" "}
              {scoreResult.scoreString}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date Played</label>
              <input
                type="date"
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about the match"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!scoreResult.valid || reportMutation.isPending}
              className="bg-[#1b4332] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {reportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Result
            </button>
            <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
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

  // Box-wide fixtures — all fixtures in the user's box
  const { data: boxData, refetch: refetchBoxFixtures } = trpc.tournament.myBoxFixtures.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );

  const { data: myMatches } = trpc.tournament.myMatches.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!myEntry?.paid }
  );
  const { data: boxContacts } = trpc.tournament.getBoxContacts.useQuery(
    { boxId: boxData?.boxId ?? 0, seasonId: activeSeason?.id ?? 0 },
    { enabled: !!boxData?.boxId && !!activeSeason?.id }
  );

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
          <ClipboardList className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Sign In to Record Results</h1>
          <p className="text-gray-600 mb-8">
            You need to be signed in and registered for the current season to record match results.
          </p>
          <a href={getLoginUrl()} className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );

  if (myEntry && !myEntry.paid)
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Payment Required</h1>
          <p className="text-gray-600 mb-8">Please complete your £20 entry payment to access match result entry.</p>
          <a href="/dashboard" className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors">
            Go to Dashboard to Pay
          </a>
        </div>
      </div>
    );

  if (!myEntry)
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Not Registered</h1>
          <p className="text-gray-600 mb-8">
            You are not registered for the current season. Register via your Dashboard to enter the box league and record match results.
          </p>
          <a href="/dashboard" className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
    );

  const allFixtures = boxData?.fixtures ?? [];
  const boxName = boxData?.boxName;
  const rounds = Array.from(new Set(allFixtures.map((f) => f.round))).sort((a, b) => a - b);
  const pendingCount = allFixtures.filter((f) => f.status === "scheduled").length;

  // Fixtures the current user can edit (they are one of the four players)
  const myFixtureIds = new Set(
    allFixtures
      .filter(
        (f) =>
          f.teamAPlayer1 === user!.id ||
          f.teamAPlayer2 === user!.id ||
          f.teamBPlayer1 === user!.id ||
          f.teamBPlayer2 === user!.id
      )
      .map((f) => f.id)
  );

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />

      <div className="bg-[#1b4332] text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-green-300 text-sm mb-1">
            {activeSeason?.name ?? "BPLTC Men's Doubles Box League"}
          </p>
          <h1 className="font-serif text-3xl font-bold">
            {boxName ? `${boxName} — Fixtures & Results` : "Box Fixtures & Results"}
          </h1>
          <p className="text-green-200 mt-1 text-sm">
            All fixtures in your box are shown. You can only record results for matches you are involved in.
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

        {/* Box fixture schedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#c9a84c]" />
            <h2 className="font-serif text-xl font-bold text-[#1b4332]">
              {boxName ? `${boxName} Schedule` : "Box Schedule"}
            </h2>
            {pendingCount > 0 && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                {pendingCount} to play
              </span>
            )}
          </div>

          {!boxData ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" />
            </div>
          ) : allFixtures.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">
                {boxData.boxId
                  ? "No fixtures have been generated for your box yet. Check back once the admin has generated fixtures for this season."
                  : "You have not been assigned to a box yet. Check back once the admin has created boxes for this season."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rounds.map((round) => (
                <div key={round} className="px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Round {round}
                  </p>
                  {allFixtures
                    .filter((f) => f.round === round)
                    .map((f) => (
                      <FixtureCard
                        key={f.id}
                        fixture={f}
                        currentUserId={user!.id}
                        canEdit={myFixtureIds.has(f.id)}
                        onResultSubmitted={() => refetchBoxFixtures()}
                      />
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box Contact Details */}
        {boxData?.boxId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="w-5 h-5 text-[#1b4332]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">Box Contact Details</h2>
            </div>
            {boxContacts && boxContacts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  The following box-mates have chosen to share their contact details so you can arrange matches.
                </p>
                {boxContacts.map((contact, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-800 min-w-[140px]">{contact.displayName}</span>
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                        <Mail className="w-3.5 h-3.5" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phoneNumber && (
                      <a href={`tel:${contact.phoneNumber}`} className="flex items-center gap-1.5 text-sm text-green-700 hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {contact.phoneNumber}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <UserCheck className="w-4 h-4" />
                <span>No box-mates have shared their contact details yet. You can update your own preferences on the Dashboard.</span>
              </div>
            )}
          </div>
        )}

        {/* My match history */}
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
                const onTeamA = m.player1Id === myEntry.id || m.partner1Id === myEntry.id;
                const iWon = onTeamA ? m.winner === "A" : m.winner === "B";
                // Count sets won by this user's team for the 2/1/0 points badge
                const setsWonByMe = (() => {
                  if (!m.score) return 0;
                  let s = 0;
                  for (const set of m.score.trim().split(/\s+/)) {
                    const p = set.split("-");
                    if (p.length !== 2) continue;
                    const ga = parseInt(p[0], 10), gb = parseInt(p[1], 10);
                    if (isNaN(ga) || isNaN(gb)) continue;
                    const myGames = onTeamA ? ga : gb;
                    const oppGames = onTeamA ? gb : ga;
                    if (myGames > oppGames) s++;
                  }
                  return s;
                })();
                const ptsLabel = iWon ? "Won · +2 pts" : setsWonByMe > 0 ? "Lost · +1 pt" : "Lost · 0 pts";
                const ptsBg = iWon ? "bg-green-100 text-green-700" : setsWonByMe > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500";
                return (
                  <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${iWon ? "bg-green-500" : "bg-red-400"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.score}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(m.playedAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ptsBg}`}>
                        {ptsLabel}
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
