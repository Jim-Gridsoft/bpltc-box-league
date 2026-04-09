import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import SetScoreEntry, { ScoreResult } from "@/components/SetScoreEntry";
import { toast } from "sonner";
import {
  Shield, Users, Trophy, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronUp, Calendar, Plus, Trash2, ClipboardList,
} from "lucide-react";

export default function Admin() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [expandedEntrant, setExpandedEntrant] = useState<number | null>(null);
  // activeTab is now declared above with boxes included
  const [seedCount, setSeedCount] = useState(6);
  const [targetBoxSize, setTargetBoxSize] = useState(6);
  const [activeTab, setActiveTab] = useState<"entrants" | "boxes" | "matches" | "seasons" | "admins" | "disputes" | "sandbox">("entrants");
  const [userSearch, setUserSearch] = useState("");
  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null);
  const [confirmPromoteId, setConfirmPromoteId] = useState<number | null>(null);

  const { data: allUsers } = trpc.adminUsers.list.useQuery(
    undefined,
    { enabled: activeTab === "admins" && user?.role === "admin" }
  );
  const setRoleMutation = trpc.adminUsers.setRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated.");
      utils.adminUsers.list.invalidate();
      setConfirmRevokeId(null);
      setConfirmPromoteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Create season form
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonYear, setNewSeasonYear] = useState(2026);
  const [newSeasonQuarter, setNewSeasonQuarter] = useState<"spring" | "summer" | "autumn" | "winter">("spring");
  const [newSeasonDivision, setNewSeasonDivision] = useState<"mens" | "ladies">("mens");
  const [newSeasonStart, setNewSeasonStart] = useState("");
  const [newSeasonEnd, setNewSeasonEnd] = useState("");
  const [newSeasonDeadline, setNewSeasonDeadline] = useState("");

  const utils = trpc.useUtils();
  const { data: seasons } = trpc.tournament.seasons.useQuery();
  const { data: currentSeason } = trpc.tournament.currentSeason.useQuery();
  const activeSeason = selectedSeasonId
    ? seasons?.find((s) => s.id === selectedSeasonId) ?? currentSeason
    : currentSeason;

  const { data: entrants, isLoading: entrantsLoading } = trpc.tournament.adminSeasonEntrants.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason && user?.role === "admin" }
  );

  const { data: boxes } = trpc.tournament.seasonBoxes.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason && user?.role === "admin" }
  );

  const markPaidMutation = trpc.tournament.adminMarkPaid.useMutation({
    onSuccess: () => { toast.success("Marked as paid."); utils.tournament.adminSeasonEntrants.invalidate(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.tournament.adminUpdateSeasonStatus.useMutation({
    onSuccess: () => {
      toast.success("Season status updated.");
      utils.tournament.seasons.invalidate();
      utils.tournament.currentSeason.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const createSeasonMutation = trpc.tournament.adminCreateSeason.useMutation({
    onSuccess: () => {
      toast.success("Season created!");
      setNewSeasonName(""); setNewSeasonStart(""); setNewSeasonEnd(""); setNewSeasonDeadline("");
      utils.tournament.seasons.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [confirmDeleteSeasonId, setConfirmDeleteSeasonId] = useState<number | null>(null);
  const [confirmRegenFixtures, setConfirmRegenFixtures] = useState(false);
  const [confirmEndSeasonId, setConfirmEndSeasonId] = useState<number | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState<{ seasonId: number; seasonName: string; from: string; to: string } | null>(null);
  const [endSeasonResult, setEndSeasonResult] = useState<{ seasonId: number; summary: { boxId: number; boxName: string; level: number; outcomes: { entrantId: number; userId: number; displayName: string; rank: number; points: number; outcome: "promoted" | "stayed" | "relegated"; newAbilityRating: number }[] }[] } | null>(null);
  const endSeasonMutation = trpc.tournament.adminEndSeason.useMutation({
    onSuccess: (data, variables) => {
      setEndSeasonResult({ seasonId: variables.seasonId, summary: data.summary });
      setConfirmEndSeasonId(null);
      utils.tournament.seasons.invalidate();
      utils.tournament.currentSeason.invalidate();
      utils.tournament.seasonLeaderboard.invalidate();
      utils.tournament.seasonBoxes.invalidate();
      toast.success("Season ended. Outcomes calculated and ability ratings updated.");
    },
    onError: (e: { message: string }) => { toast.error(e.message); setConfirmEndSeasonId(null); },
  });
  const deleteSeasonMutation = trpc.tournament.adminDeleteSeason.useMutation({
    onSuccess: () => {
      toast.success("Season and all associated data deleted.");
      setConfirmDeleteSeasonId(null);
      utils.tournament.seasons.invalidate();
      utils.tournament.currentSeason.invalidate();
      utils.tournament.seasonLeaderboard.invalidate();
      utils.tournament.seasonBoxes.invalidate();
    },
    onError: (e: { message: string }) => { toast.error(e.message); setConfirmDeleteSeasonId(null); },
  });

  const sandboxSeedMutation = trpc.tournament.sandboxSeedPlayers.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} test players added to the season.`);
      utils.tournament.adminSeasonEntrants.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const autoCreateBoxesMutation = trpc.tournament.adminAutoCreateBoxes.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.length} boxes created successfully!`);
      utils.tournament.seasonBoxes.invalidate();
      utils.tournament.adminSeasonEntrants.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const generateFixturesMutation = trpc.tournament.adminGenerateFixtures.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.totalFixtures} fixtures generated across ${data.boxCount} boxes!`);
      utils.tournament.seasonBoxes.invalidate();
      utils.tournament.fixtureBalanceSummary.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const sandboxResetMutation = trpc.tournament.sandboxReset.useMutation({
    onSuccess: () => {
      toast.success("Sandbox data reset. All test players removed.");
      utils.tournament.adminSeasonEntrants.invalidate();
      utils.tournament.seasonBoxes.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const sandboxResetAndRegenerateMutation = trpc.tournament.sandboxResetAndRegenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`Reset complete: ${data.deletedUsers} test users removed, ${data.totalFixtures} fixtures generated across ${data.boxCount} boxes.`);
      utils.tournament.adminSeasonEntrants.invalidate();
      utils.tournament.seasonBoxes.invalidate();
      utils.tournament.fixtureBalanceSummary.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const { data: balanceSummary } = trpc.tournament.fixtureBalanceSummary.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: (activeSeason?.id ?? 0) > 0 }
  );

  // Remove player state
  const [removePlayerEntrantId, setRemovePlayerEntrantId] = useState<number | null>(null);
  const [removePlayerStep, setRemovePlayerStep] = useState<1 | 2>(1);
  const [removePlayerConfirmName, setRemovePlayerConfirmName] = useState("");

  const { data: removePlayerPreview, isLoading: removePlayerPreviewLoading } =
    trpc.tournament.adminRemovePlayerPreview.useQuery(
      { seasonEntrantId: removePlayerEntrantId ?? 0 },
      { enabled: removePlayerEntrantId !== null }
    );

  const removePlayerMutation = trpc.tournament.adminRemovePlayer.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.displayName} has been removed from the season.`);
      setRemovePlayerEntrantId(null);
      setRemovePlayerStep(1);
      setRemovePlayerConfirmName("");
      utils.tournament.adminSeasonEntrants.invalidate();
      utils.tournament.seasonBoxes.invalidate();
      utils.tournament.fixtureBalanceSummary.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const verifyMatchMutation = trpc.tournament.adminVerifyMatch.useMutation({
    onSuccess: () => { toast.success("Match verified."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMatchMutation = trpc.tournament.adminDeleteMatch.useMutation({
    onSuccess: () => { toast.success("Match deleted."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // WhatsApp link state: boxId -> draft link string
  const [whatsappDrafts, setWhatsappDrafts] = useState<Record<number, string>>({});
  const updateBoxWhatsappMutation = trpc.tournament.adminUpdateBoxWhatsapp.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp link saved.");
      utils.tournament.seasonBoxes.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  if (authLoading) return (
    <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" />
    </div>
  );

  if (!isAuthenticated || user?.role !== "admin") return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Shield className="w-16 h-16 mx-auto mb-6 text-red-400" />
        <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Access Restricted</h1>
        <p className="text-gray-500">This page is only accessible to club administrators.</p>
      </div>
    </div>
  );

  const paid = entrants?.filter((e) => e.paid).length ?? 0;
  const unpaid = entrants?.filter((e) => !e.paid).length ?? 0;

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />
      <div className="bg-[#1b4332] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#c9a84c]" />
          <div>
            <h1 className="font-serif text-3xl font-bold">Admin Panel</h1>
            <p className="text-green-200 text-sm mt-0.5">BPLTC Doubles Box League — Committee View</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Season selector */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-gray-500 font-medium">Season:</span>
          {seasons?.map((s) => (
            <button key={s.id} onClick={() => setSelectedSeasonId(s.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${activeSeason?.id === s.id ? "bg-[#1b4332] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s.name}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Entrants", value: entrants?.length ?? 0, icon: <Users className="w-5 h-5 text-blue-500" /> },
            { label: "Paid", value: paid, icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
            { label: "Unpaid", value: unpaid, icon: <XCircle className="w-5 h-5 text-amber-500" /> },
            { label: "Boxes", value: boxes?.length ?? 0, icon: <Trophy className="w-5 h-5 text-[#c9a84c]" /> },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
              <div className="text-2xl font-bold text-[#1b4332] font-serif">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
             {(["entrants", "boxes", "matches", "seasons", "admins", "disputes", "sandbox"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? tab === "sandbox" ? "bg-amber-500 shadow-sm text-white" : "bg-white shadow-sm text-[#1b4332]"
                  : tab === "sandbox" ? "text-amber-600 hover:text-amber-700" : "text-gray-500 hover:text-gray-700"
              }`}>
              {tab === "sandbox" ? "🧪 Sandbox" : tab === "boxes" ? "📦 Boxes" : tab === "admins" ? "🔐 Admins" : tab === "disputes" ? "⚠ Disputes" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Entrants tab */}
        {activeTab === "entrants" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">Season Entrants</h2>
            </div>
            {entrantsLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" /></div>
            ) : !entrants || entrants.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No entrants yet for this season.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {entrants.map((e) => (
                  <div key={e.id}>
                    <div className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedEntrant(expandedEntrant === e.id ? null : e.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${e.paid ? "bg-green-500" : "bg-amber-400"}`} />
                        <div>
                          <p className="font-medium text-gray-800">{e.displayName}</p>
                          <p className="text-xs text-gray-400">Ability: {e.abilityRating}/5 · {e.matchesPlayed} matches · {e.seasonPoints} pts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {e.paid ? "Paid" : "Unpaid"}
                        </span>
                        {(e as any).shareContact && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Sharing
                          </span>
                        )}
                        {expandedEntrant === e.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                    {expandedEntrant === e.id && (
                      <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                        <div className="pt-4 flex flex-wrap gap-4 items-start">
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><strong>User ID:</strong> {e.userId}</p>
                            <p><strong>Entrant ID:</strong> {e.id}</p>
                            <p><strong>Matches Won:</strong> {e.matchesWon}</p>
                            {e.stripePaymentIntentId && <p><strong>Stripe PI:</strong> {e.stripePaymentIntentId}</p>}
                          </div>
                          <div className="ml-auto flex items-center gap-2 flex-wrap">
                            {!e.paid && (
                              <button
                                onClick={() => markPaidMutation.mutate({ entrantId: e.id })}
                                disabled={markPaidMutation.isPending}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                                {markPaidMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                Mark as Paid
                              </button>
                            )}
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setRemovePlayerEntrantId(e.id); setRemovePlayerStep(1); setRemovePlayerConfirmName(""); }}
                              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors flex items-center gap-2">
                              <Trash2 className="w-3 h-3" />
                              Remove Player
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Boxes tab */}
        {activeTab === "boxes" && (
          <div className="space-y-6">
            {/* Auto-create boxes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📦</span>
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Auto-Create Ability-Seeded Boxes</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Automatically groups all paid entrants into boxes by ability rating (highest to lowest). Existing boxes and fixtures for this season will be cleared and recreated.
              </p>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target players per box</label>
                  <select value={targetBoxSize} onChange={(e) => setTargetBoxSize(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
                    {[4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} players per box</option>)}
                  </select>
                </div>
                <button
                  onClick={() => activeSeason && autoCreateBoxesMutation.mutate({ seasonId: activeSeason.id, targetBoxSize })}
                  disabled={!activeSeason || autoCreateBoxesMutation.isPending}
                  className="bg-[#1b4332] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {autoCreateBoxesMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Boxes
                </button>
              </div>
              {autoCreateBoxesMutation.data && (
                <div className="mt-4 space-y-2">
                  {autoCreateBoxesMutation.data.map((box) => (
                    <div key={box.boxId} className="bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                      <p className="font-medium text-green-800 text-sm">{box.name} — {box.members.length} players</p>
                      <p className="text-xs text-green-600">{box.members.map((m) => `${m.displayName} (${m.abilityRating}/5)`).join(" · ")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate fixtures */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📅</span>
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Generate Round-Robin Fixtures</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Generates a full balanced fixture schedule for all boxes. Each player gets an equal number of matches. Where box sizes require it, a balancer match is added — points are only awarded to the players who needed the extra fixture.
              </p>
              {/* Confirmation guard — shown when fixtures already exist */}
              {confirmRegenFixtures ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Fixtures already exist for this season</p>
                  <p className="text-xs text-amber-700 mb-3">
                    Regenerating will delete all existing fixtures and any recorded results for this season. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (activeSeason) generateFixturesMutation.mutate({ seasonId: activeSeason.id });
                        setConfirmRegenFixtures(false);
                      }}
                      className="bg-red-600 text-white px-4 py-1.5 rounded-lg font-semibold text-xs hover:bg-red-700 transition-colors">
                      Yes, regenerate
                    </button>
                    <button
                      onClick={() => setConfirmRegenFixtures(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg font-semibold text-xs hover:bg-gray-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!activeSeason) return;
                    // If fixtures already exist, show confirmation guard
                    if (balanceSummary && balanceSummary.length > 0) {
                      setConfirmRegenFixtures(true);
                    } else {
                      generateFixturesMutation.mutate({ seasonId: activeSeason.id });
                    }
                  }}
                  disabled={!activeSeason || !boxes || boxes.length === 0 || generateFixturesMutation.isPending}
                  className="bg-[#c9a84c] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b8963e] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {generateFixturesMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Generate Fixtures
                </button>
              )}
              {!boxes || boxes.length === 0 ? (
                <p className="text-xs text-amber-600 mt-3">Create boxes first before generating fixtures.</p>
              ) : generateFixturesMutation.data ? (
                <p className="text-sm text-green-700 mt-3 font-medium">
                  ✓ {generateFixturesMutation.data.totalFixtures} fixtures generated across {generateFixturesMutation.data.boxCount} boxes.
                </p>
              ) : null}
            </div>

            {/* Fixture balance summary — shown when fixtures exist */}
            {balanceSummary && balanceSummary.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                  <span className="text-xl">⚖️</span>
                  <h2 className="font-serif text-xl font-bold text-[#1b4332]">Fixture Balance Summary</h2>
                  <span className="ml-auto text-xs text-gray-400">Verify each player has an equal number of matches</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 font-semibold text-gray-600">Player</th>
                        <th className="px-6 py-3 font-semibold text-gray-600 text-center">Total Matches</th>
                        <th className="px-6 py-3 font-semibold text-gray-600 text-center">Regular</th>
                        <th className="px-6 py-3 font-semibold text-gray-600 text-center">Balancer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {balanceSummary.map((row) => (
                        <tr key={row.playerId} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">{row.playerName}</td>
                          <td className="px-6 py-3 text-center font-bold text-[#1b4332]">{row.totalMatches}</td>
                          <td className="px-6 py-3 text-center text-gray-600">{row.totalMatches - row.balancerMatches}</td>
                          <td className="px-6 py-3 text-center">
                            {row.balancerMatches > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                {row.balancerMatches} balancer
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Balancer matches are played normally but award points only to players who needed the extra match to reach the season maximum. Players already at the maximum score 0 points in balancer fixtures.
                  </p>
                </div>
              </div>
            )}

            {/* WhatsApp group links */}
            {boxes && boxes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💬</span>
                  <h2 className="font-serif text-xl font-bold text-[#1b4332]">WhatsApp Group Links</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Paste a WhatsApp group invite link for each box. Players will see a &ldquo;Join Box WhatsApp Group&rdquo; button on their dashboard.
                </p>
                <div className="space-y-3">
                  {boxes.map((box) => {
                    const draft = whatsappDrafts[box.id] ?? (box.whatsappLink ?? "");
                    return (
                      <div key={box.id} className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 w-16 shrink-0">{box.name}</span>
                        <input
                          type="url"
                          placeholder="https://chat.whatsapp.com/..."
                          value={draft}
                          onChange={(e) => setWhatsappDrafts((prev) => ({ ...prev, [box.id]: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                        />
                        <button
                          onClick={() => {
                            const link = draft.trim() || null;
                            updateBoxWhatsappMutation.mutate({ boxId: box.id, whatsappLink: link });
                          }}
                          disabled={updateBoxWhatsappMutation.isPending}
                          className="bg-[#25D366] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#1ebe5a] transition-colors disabled:opacity-50 shrink-0">
                          Save
                        </button>
                        {box.whatsappLink && (
                          <button
                            onClick={() => {
                              setWhatsappDrafts((prev) => ({ ...prev, [box.id]: "" }));
                              updateBoxWhatsappMutation.mutate({ boxId: box.id, whatsappLink: null });
                            }}
                            disabled={updateBoxWhatsappMutation.isPending}
                            className="text-red-500 hover:text-red-700 text-xs font-medium shrink-0 disabled:opacity-50">
                            Clear
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Box fixture viewer */}
            {boxes && boxes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#c9a84c]" />
                  <h2 className="font-serif text-xl font-bold text-[#1b4332]">Box Fixture Schedules</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {boxes.map((box) => (
                    <BoxFixtureRow key={box.id} box={box} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matches tab */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            {/* Admin fixture entry — all scheduled fixtures across all boxes */}
            <AdminFixtureEntry
              seasonId={activeSeason?.id ?? 0}
              onResultSubmitted={() => {
                utils.tournament.seasonBoxes.invalidate();
                utils.tournament.seasonLeaderboard.invalidate();
                utils.tournament.yearLeaderboard.invalidate();
                utils.tournament.adminAllFixtures.invalidate();
              }}
            />

            {/* Existing completed match results per box */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Completed Match Results</h2>
              </div>
              {!boxes || boxes.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No boxes created for this season yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {boxes.map((box) => (
                    <BoxMatchesRow
                      key={box.id}
                      box={box}
                      onVerify={(id) => verifyMatchMutation.mutate({ matchId: id })}
                      onDelete={(id) => {
                        deleteMatchMutation.mutate({ matchId: id }, {
                          onSuccess: () => {
                            utils.tournament.adminAllFixtures.invalidate();
                            utils.tournament.seasonLeaderboard.invalidate();
                            utils.tournament.yearLeaderboard.invalidate();
                          }
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seasons tab */}
        {activeTab === "seasons" && (
          <div className="space-y-6">


            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Plus className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Create New Season</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Season Name</label>
                  <input value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="e.g. Spring 2026"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={newSeasonYear} onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                  <select value={newSeasonQuarter} onChange={(e) => setNewSeasonQuarter(e.target.value as typeof newSeasonQuarter)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
                    <option value="spring">Spring (Apr–Jun)</option>
                    <option value="summer">Summer (Jul–Sep)</option>
                    <option value="autumn">Autumn (Oct–Dec)</option>
                    <option value="winter">Winter (Jan–Mar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select value={newSeasonDivision} onChange={(e) => setNewSeasonDivision(e.target.value as "mens" | "ladies")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
                    <option value="mens">Men's</option>
                    <option value="ladies">Ladies'</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                  <input type="date" value={newSeasonDeadline} onChange={(e) => setNewSeasonDeadline(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={newSeasonStart} onChange={(e) => setNewSeasonStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={newSeasonEnd} onChange={(e) => setNewSeasonEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
              </div>
              <button
                onClick={() => createSeasonMutation.mutate({
                  name: newSeasonName,
                  year: newSeasonYear,
                  quarter: newSeasonQuarter,
                  division: newSeasonDivision,
                  startDate: new Date(newSeasonStart),
                  endDate: new Date(newSeasonEnd),
                  registrationDeadline: new Date(newSeasonDeadline),
                })}
                disabled={!newSeasonName.trim() || !newSeasonStart || !newSeasonEnd || !newSeasonDeadline || createSeasonMutation.isPending}
                className="mt-4 bg-[#1b4332] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center gap-2">
                {createSeasonMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Season
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">All Seasons</h2>
              </div>
              {!seasons || seasons.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No seasons created yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {seasons.map((s) => (
                    <div key={s.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">{s.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              (s as any).division === "ladies"
                                ? "bg-pink-100 text-pink-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {(s as any).division === "ladies" ? "Ladies'" : "Men's"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(s.startDate).toLocaleDateString("en-GB")} — {new Date(s.endDate).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={confirmStatusChange?.seasonId === s.id ? confirmStatusChange.to : s.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as "upcoming" | "registration" | "active" | "completed";
                              if (newStatus !== s.status) {
                                setConfirmStatusChange({ seasonId: s.id, seasonName: s.name, from: s.status, to: newStatus });
                              }
                            }}
                            disabled={updateStatusMutation.isPending}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-[#1b4332] bg-white"
                          >
                            {(["upcoming", "registration", "active", "completed"] as const).map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          {s.status !== "completed" && confirmEndSeasonId !== s.id && confirmDeleteSeasonId !== s.id && (
                            <button
                              onClick={() => setConfirmEndSeasonId(s.id)}
                              title="End season & calculate outcomes"
                              className="text-amber-600 hover:text-amber-800 transition-colors px-2 py-1 rounded text-xs font-semibold border border-amber-300 hover:border-amber-500 bg-amber-50"
                            >
                              End Season
                            </button>
                          )}
                          {confirmDeleteSeasonId === s.id ? null : (
                            <button
                              onClick={() => setConfirmDeleteSeasonId(s.id)}
                              title="Delete season"
                              className="text-red-400 hover:text-red-600 transition-colors p-1 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Inline status change confirmation */}
                      {confirmStatusChange?.seasonId === s.id && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-blue-800 mb-1">
                            Change status of "{confirmStatusChange.seasonName}"?
                          </p>
                          <p className="text-xs text-blue-700 mb-3">
                            This will change the season status from{" "}
                            <span className="font-semibold capitalize">{confirmStatusChange.from}</span>{" "}to{" "}
                            <span className="font-semibold capitalize">{confirmStatusChange.to}</span>.
                            {confirmStatusChange.to === "active" && (
                              <span className="block mt-1 font-semibold text-amber-700">
                                ⚠ Setting a season to Active will make it the current season visible to all players.
                              </span>
                            )}
                            {confirmStatusChange.to === "completed" && (
                              <span className="block mt-1 font-semibold text-amber-700">
                                ⚠ Marking a season as Completed will hide it from the active season view. Use "End Season" to also calculate final standings.
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                updateStatusMutation.mutate({
                                  seasonId: confirmStatusChange.seasonId,
                                  status: confirmStatusChange.to as "upcoming" | "registration" | "active" | "completed",
                                });
                                setConfirmStatusChange(null);
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {updateStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Yes, change status
                            </button>
                            <button
                              onClick={() => setConfirmStatusChange(null)}
                              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Inline end season confirmation */}
                      {confirmEndSeasonId === s.id && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-amber-800 mb-1">End "{s.name}"?</p>
                          <p className="text-xs text-amber-700 mb-3">
                            This will calculate final standings for each box, assign promotion/relegation outcomes, and update ability ratings for next season seeding. The season status will be set to Completed. This action cannot be undone.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => endSeasonMutation.mutate({ seasonId: s.id })}
                              disabled={endSeasonMutation.isPending}
                              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {endSeasonMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Yes, end season
                            </button>
                            <button
                              onClick={() => setConfirmEndSeasonId(null)}
                              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {/* End season outcome results */}
                      {endSeasonResult?.seasonId === s.id && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-green-800">Season Ended — Final Outcomes</p>
                            <button onClick={() => setEndSeasonResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                          </div>
                          {endSeasonResult.summary.map((box) => (
                            <div key={box.boxId} className="mb-4">
                              <p className="text-xs font-bold text-green-700 mb-2">{box.boxName}</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-500">
                                    <th className="pb-1 pr-3">Rank</th>
                                    <th className="pb-1 pr-3">Player</th>
                                    <th className="pb-1 pr-3">Pts</th>
                                    <th className="pb-1 pr-3">Outcome</th>
                                    <th className="pb-1">New Rating</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {box.outcomes.map((o) => (
                                    <tr key={o.entrantId} className="border-t border-green-100">
                                      <td className="py-1 pr-3 font-semibold">{o.rank}</td>
                                      <td className="py-1 pr-3">{o.displayName}</td>
                                      <td className="py-1 pr-3">{o.points}</td>
                                      <td className="py-1 pr-3">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                                          o.outcome === "promoted" ? "bg-green-100 text-green-700" :
                                          o.outcome === "relegated" ? "bg-red-100 text-red-700" :
                                          "bg-gray-100 text-gray-600"
                                        }`}>
                                          {o.outcome === "promoted" ? "⬆ Promoted" : o.outcome === "relegated" ? "⬇ Relegated" : "= Stayed"}
                                        </span>
                                      </td>
                                      <td className="py-1">{o.newAbilityRating}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Inline delete confirmation */}
                      {confirmDeleteSeasonId === s.id && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-red-700 mb-1">Delete "{s.name}"?</p>
                          <p className="text-xs text-red-600 mb-3">
                            This will permanently delete the season and ALL associated data — entrants, boxes, fixtures, and match results. This cannot be undone.
                            {s.status === "active" && (
                              <span className="block mt-1 font-semibold">⚠ This is the active season. You must change its status before deleting.</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => deleteSeasonMutation.mutate({ seasonId: s.id })}
                              disabled={deleteSeasonMutation.isPending || s.status === "active"}
                              className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {deleteSeasonMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Yes, delete permanently
                            </button>
                            <button
                              onClick={() => setConfirmDeleteSeasonId(null)}
                              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Admins tab */}
        {activeTab === "admins" && (
          <div className="space-y-6">
            {/* Current admins */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Current Administrators</h2>
                <span className="ml-auto text-xs text-gray-400">
                  {allUsers?.filter((u) => u.role === "admin").length ?? 0} admin{allUsers?.filter((u) => u.role === "admin").length !== 1 ? "s" : ""}
                </span>
              </div>
              {!allUsers ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" /></div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {allUsers.filter((u) => u.role === "admin").map((u) => (
                    <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{u.name ?? "(no name)"}</p>
                        <p className="text-xs text-gray-400">{u.email ?? "(no email)"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-[#1b4332] text-white px-2.5 py-1 rounded-full font-medium">Admin</span>
                        {u.id !== user?.id && (
                          confirmRevokeId === u.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-medium">Revoke admin?</span>
                              <button
                                onClick={() => setRoleMutation.mutate({ userId: u.id, role: "user" })}
                                disabled={setRoleMutation.isPending}
                                className="text-xs bg-red-600 text-white px-3 py-1 rounded font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                {setRoleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Confirm"}
                              </button>
                              <button onClick={() => setConfirmRevokeId(null)} className="text-xs text-gray-500 hover:text-gray-700">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRevokeId(u.id)}
                              className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded font-medium hover:bg-red-200 transition-colors"
                            >
                              Revoke Admin
                            </button>
                          )
                        )}
                        {u.id === user?.id && (
                          <span className="text-xs text-gray-400 italic">You</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Promote a user */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Promote a User to Admin</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">
                  Search for a registered user below and grant them admin access. They will immediately be able to access the Admin panel.
                </p>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                />
                {!allUsers ? (
                  <div className="text-center"><Loader2 className="w-5 h-5 animate-spin text-[#1b4332] mx-auto" /></div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allUsers
                      .filter((u) => u.role === "user")
                      .filter((u) => {
                        const q = userSearch.toLowerCase();
                        return !q || (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
                      })
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{u.name ?? "(no name)"}</p>
                            <p className="text-xs text-gray-400">{u.email ?? "(no email)"}</p>
                          </div>
                          {confirmPromoteId === u.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#1b4332] font-medium">Make admin?</span>
                              <button
                                onClick={() => setRoleMutation.mutate({ userId: u.id, role: "admin" })}
                                disabled={setRoleMutation.isPending}
                                className="text-xs bg-[#1b4332] text-white px-3 py-1 rounded font-medium hover:bg-[#2d6a4f] transition-colors disabled:opacity-50"
                              >
                                {setRoleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Confirm"}
                              </button>
                              <button onClick={() => setConfirmPromoteId(null)} className="text-xs text-gray-500 hover:text-gray-700">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmPromoteId(u.id)}
                              className="text-xs bg-[#1b4332] text-white px-3 py-1 rounded font-medium hover:bg-[#2d6a4f] transition-colors"
                            >
                              Make Admin
                            </button>
                          )}
                        </div>
                      ))}
                    {allUsers.filter((u) => u.role === "user").filter((u) => {
                      const q = userSearch.toLowerCase();
                      return !q || (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
                    }).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {userSearch ? "No matching users found." : "No regular users registered yet."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Disputes tab */}
        {activeTab === "disputes" && (
          <DisputesTab />
        )}

        {/* Sandbox tab */}
        {activeTab === "sandbox" && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🧪</span>
                <h2 className="font-serif text-xl font-bold text-amber-800">Sandbox / Demo Mode</h2>
              </div>
              <p className="text-sm text-amber-700 mb-1">
                Use these tools to test the full box league flow without real payments. All test data is clearly marked and can be reset at any time.
              </p>
              <p className="text-xs text-amber-600">
                Test players are created with synthetic accounts and marked as paid instantly. They will appear on the leaderboard and in boxes alongside real players during testing.
              </p>
            </div>

            {/* Seed players */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-serif text-lg font-bold text-[#1b4332] mb-4">Add Test Players</h3>
              <p className="text-sm text-gray-500 mb-4">
                Instantly add synthetic paid players to the selected season. Each test player gets a random ability rating (1–5) and a generated name.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Number of players to add</label>
                  <select value={seedCount} onChange={(e) => setSeedCount(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
                    {[2, 4, 6, 8, 10, 12, 16, 20, 24].map((n) => (
                      <option key={n} value={n}>{n} players</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => activeSeason && sandboxSeedMutation.mutate({ seasonId: activeSeason.id, count: seedCount })}
                  disabled={!activeSeason || sandboxSeedMutation.isPending}
                  className="mt-4 bg-amber-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {sandboxSeedMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add {seedCount} Test Players
                </button>
              </div>
            </div>

            {/* Reset & Regenerate (combined) */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
              <h3 className="font-serif text-lg font-bold text-[#1b4332] mb-2">Reset & Regenerate Fixtures</h3>
              <p className="text-sm text-gray-500 mb-4">
                Removes all test players, clears all boxes and fixtures, then immediately re-creates boxes from current paid entrants and generates a fresh balanced fixture schedule. Use this to quickly restart a full test cycle.
              </p>
              <button
                onClick={() => {
                  if (confirm("This will remove all test players, clear all boxes and fixtures, then regenerate everything from scratch. Continue?")) {
                    activeSeason && sandboxResetAndRegenerateMutation.mutate({ seasonId: activeSeason.id });
                  }
                }}
                disabled={!activeSeason || sandboxResetAndRegenerateMutation.isPending}
                className="bg-[#1b4332] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#163828] transition-colors disabled:opacity-50 flex items-center gap-2">
                {sandboxResetAndRegenerateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset & Regenerate
              </button>
            </div>

            {/* Reset sandbox only */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
              <h3 className="font-serif text-lg font-bold text-red-700 mb-2">Reset Sandbox Data Only</h3>
              <p className="text-sm text-gray-500 mb-4">
                Removes all test players, their match records, partner slots, and match requests from the selected season.
                Boxes, fixtures, and real member registrations are <strong>not affected</strong>.
              </p>
              <button
                onClick={() => {
                  if (confirm("Remove all sandbox test data from this season? This cannot be undone.")) {
                    activeSeason && sandboxResetMutation.mutate({ seasonId: activeSeason.id });
                  }
                }}
                disabled={!activeSeason || sandboxResetMutation.isPending}
                className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {sandboxResetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset Sandbox Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Remove Player Confirmation Dialog ─────────────────────────────── */}
      {removePlayerEntrantId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            {removePlayerPreviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#1b4332]" />
              </div>
            ) : removePlayerPreview ? (
              <>
                {removePlayerStep === 1 && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold text-gray-900">Remove Player</h3>
                        <p className="text-sm text-gray-500">This action cannot be undone.</p>
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
                      <p><strong className="text-gray-700">Player:</strong> <span className="text-gray-900">{removePlayerPreview.displayName}</span></p>
                      <p><strong className="text-gray-700">Fixtures to delete:</strong> <span className="text-red-700 font-semibold">{removePlayerPreview.fixtureCount}</span></p>
                      <p><strong className="text-gray-700">Matches to delete:</strong> <span className="text-red-700 font-semibold">{removePlayerPreview.matchCount}</span></p>
                      {removePlayerPreview.isPaid && (
                        <p className="text-amber-700 font-semibold">⚠️ This player has paid their entry fee. Removing them will not issue a refund automatically.</p>
                      )}
                      {removePlayerPreview.hasPlayedMatches && (
                        <p className="text-amber-700 font-semibold">⚠️ This player has played matches. Removing them will delete those results and recalculate other players&apos; points.</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setRemovePlayerEntrantId(null); setRemovePlayerStep(1); }}
                        className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={() => setRemovePlayerStep(2)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
                        Continue
                      </button>
                    </div>
                  </>
                )}
                {removePlayerStep === 2 && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold text-gray-900">Confirm Removal</h3>
                        <p className="text-sm text-gray-500">Type the player&apos;s name to confirm.</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      To permanently remove <strong>{removePlayerPreview.displayName}</strong>, type their exact name below:
                    </p>
                    <input
                      type="text"
                      value={removePlayerConfirmName}
                      onChange={(ev) => setRemovePlayerConfirmName(ev.target.value)}
                      placeholder={removePlayerPreview.displayName}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRemovePlayerStep(1)}
                        className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                        Back
                      </button>
                      <button
                        onClick={() => removePlayerMutation.mutate({ seasonEntrantId: removePlayerEntrantId, confirmationName: removePlayerConfirmName })}
                        disabled={removePlayerMutation.isPending || removePlayerConfirmName.trim() !== removePlayerPreview.displayName.trim()}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                        {removePlayerMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Remove Player
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-red-600 py-4">Could not load player data. Please try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function BoxFixtureRow({ box }: { box: { id: number; name: string } }) {
  const [expanded, setExpanded] = useState(false);
  const { data: fixtures } = trpc.tournament.boxFixtures.useQuery({ boxId: box.id }, { enabled: expanded });

  return (
    <div>
      <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <p className="font-medium text-gray-800">{box.name}</p>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>
      {expanded && (
        <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
          {!fixtures || fixtures.length === 0 ? (
            <p className="text-sm text-gray-400 pt-3">No fixtures generated for this box yet.</p>
          ) : (
            <div className="space-y-3 pt-3">
              {Array.from(new Set(fixtures.map((f) => f.round))).sort((a, b) => a - b).map((round) => (
                <div key={round}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Round {round}</p>
                  {fixtures.filter((f) => f.round === round).map((f) => (
                    <div key={f.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100 mb-1">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{f.teamAPlayer1Name} &amp; {f.teamAPlayer2Name}</span>
                        <span className="text-gray-400 mx-2">vs</span>
                        <span className="font-medium">{f.teamBPlayer1Name} &amp; {f.teamBPlayer2Name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        f.status === "played" ? "bg-green-100 text-green-700" :
                        f.status === "cancelled" ? "bg-red-100 text-red-600" :
                        "bg-blue-100 text-blue-700"
                      }`}>{f.status}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BoxMatchesRow({
  box,
  onVerify,
  onDelete,
}: {
  box: { id: number; name: string };
  onVerify: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: matches } = trpc.tournament.boxMatches.useQuery({ boxId: box.id }, { enabled: expanded });

  return (
    <div>
      <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <p className="font-medium text-gray-800">{box.name}</p>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>
      {expanded && (
        <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
          {!matches || matches.length === 0 ? (
            <p className="text-sm text-gray-400 pt-3">No matches reported in this box yet.</p>
          ) : (
            <div className="space-y-2 pt-3">
              {matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.score} — Team {m.winner} won</p>
                    <p className="text-xs text-gray-400">{new Date(m.playedAt).toLocaleDateString("en-GB")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.verified ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <button onClick={() => onVerify(m.id)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium hover:bg-green-200 transition-colors">
                        Verify
                      </button>
                    )}
                    <button onClick={() => onDelete(m.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium hover:bg-red-200 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DisputesTab() {
  const { data: disputes, isLoading } = trpc.disputes.list.useQuery();
  const utils = trpc.useUtils();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});

  const updateStatusMutation = trpc.disputes.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Dispute updated.");
      utils.disputes.list.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const statusColors: Record<string, string> = {
    open: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">⚠</span>
        <h2 className="font-serif text-xl font-bold text-[#1b4332]">Dispute & Contact Messages</h2>
        <span className="ml-auto text-xs text-gray-400">
          {disputes?.filter((d) => d.status === "open").length ?? 0} open
        </span>
      </div>
      {isLoading ? (
        <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" /></div>
      ) : !disputes || disputes.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No disputes or contact messages submitted yet.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {disputes.map((d) => (
            <div key={d.id}>
              <div
                className="px-6 py-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {d.status}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                  <p className="font-medium text-gray-800 truncate">{d.subject}</p>
                  <p className="text-xs text-gray-400">{d.userName ?? "Unknown user"} · {d.userEmail ?? ""}</p>
                </div>
                {expandedId === d.id ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-1 shrink-0" />}
              </div>
              {expandedId === d.id && (
                <div className="px-6 pb-5 bg-gray-50 border-t border-gray-100">
                  <div className="pt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.description}</p>
                    </div>
                    {(d.matchId || d.fixtureId) && (
                      <div className="text-xs text-gray-400 space-x-4">
                        {d.matchId && <span>Match ID: {d.matchId}</span>}
                        {d.fixtureId && <span>Fixture ID: {d.fixtureId}</span>}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Admin Notes</p>
                      <textarea
                        rows={3}
                        value={adminNotes[d.id] ?? d.adminNotes ?? ""}
                        onChange={(e) => setAdminNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        placeholder="Add internal notes…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332] resize-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {(["open", "resolved", "closed"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatusMutation.mutate({
                            disputeId: d.id,
                            status,
                            adminNotes: adminNotes[d.id] ?? d.adminNotes ?? undefined,
                          })}
                          disabled={d.status === status || updateStatusMutation.isPending}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors disabled:opacity-40 ${
                            d.status === status ? "bg-[#1b4332] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                      {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-[#1b4332]" />}
                    </div>
                  </div>
                </div>
              )}
             </div>
          ))}
        </div>
      )}

    </div>
  );
}
// ── AdminFixtureEntry ─────────────────────────────────────────────────────────

/**
 * Displays all scheduled (unplayed) fixtures for a season, grouped by box.
 * Admins can expand any fixture and enter the result using the SetScoreEntry component.
 */
function AdminFixtureEntry({
  seasonId,
  onResultSubmitted,
}: {
  seasonId: number;
  onResultSubmitted: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: allBoxFixtures, isLoading } = trpc.tournament.adminAllFixtures.useQuery(
    { seasonId },
    { enabled: seasonId > 0 }
  );

  const adminReportMatch = trpc.tournament.adminReportMatch.useMutation({
    onSuccess: () => {
      toast.success("Result recorded successfully.");
      utils.tournament.adminAllFixtures.invalidate();
      onResultSubmitted();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Track which fixture is being edited
  const [expandedFixtureId, setExpandedFixtureId] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [playedAt, setPlayedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");

  const scheduledBoxes = allBoxFixtures
    ?.map((box) => ({
      ...box,
      fixtures: box.fixtures.filter((f) => f.status === "scheduled"),
    }))
    .filter((box) => box.fixtures.length > 0);

  const scheduledCount = scheduledBoxes?.reduce((n, b) => n + b.fixtures.length, 0) ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-[#c9a84c]" />
        <h2 className="font-serif text-xl font-bold text-[#1b4332]">Enter Match Results</h2>
        {scheduledCount > 0 && (
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {scheduledCount} to play
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" />
        </div>
      ) : !scheduledBoxes || scheduledBoxes.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          {allBoxFixtures && allBoxFixtures.length > 0
            ? "All fixtures have been played. No pending results to enter."
            : "No fixtures generated for this season yet."}
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {scheduledBoxes.map((box) => (
            <div key={box.boxId}>
              {/* Box header */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold text-[#1b4332] uppercase tracking-wide">
                  {box.boxName}
                </p>
              </div>

              {/* Fixtures in this box */}
              {box.fixtures.map((fixture) => {
                const isExpanded = expandedFixtureId === fixture.id;
                const teamALabel = `${fixture.teamAPlayer1Name} & ${fixture.teamAPlayer2Name}`;
                const teamBLabel = `${fixture.teamBPlayer1Name} & ${fixture.teamBPlayer2Name}`;

                return (
                  <div key={fixture.id} className="border-b border-gray-50 last:border-0">
                    {/* Fixture row */}
                    <div
                      className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedFixtureId(null);
                          setScoreResult(null);
                        } else {
                          setExpandedFixtureId(fixture.id);
                          setScoreResult(null);
                          setPlayedAt(new Date().toISOString().slice(0, 10));
                          setNotes("");
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">Round {fixture.round}</p>
                        <p className="text-sm font-medium text-gray-800 truncate">
                          <span className="text-[#1b4332] font-semibold">{teamALabel}</span>
                          <span className="text-gray-400 mx-2">vs</span>
                          <span className="text-gray-700">{teamBLabel}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fixture.isBalancer && (() => {
                          let eligibleIds: number[] = [];
                          try { eligibleIds = fixture.isBalancer && (fixture as any).balancerEligiblePlayers ? JSON.parse((fixture as any).balancerEligiblePlayers) : []; } catch {}
                          const allInvolved = [fixture.teamAPlayer1, fixture.teamAPlayer2, fixture.teamBPlayer1, fixture.teamBPlayer2];
                          const allEligible = allInvolved.every(id => eligibleIds.includes(id));
                          return (
                            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                              Balancer {allEligible ? '— pts count' : '— partial pts'}
                            </span>
                          );
                        })()}
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          Scheduled
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Inline result entry form */}
                    {isExpanded && (
                      <div className="px-6 pb-6 bg-green-50/30 border-t border-gray-100">
                        <div className="max-w-lg pt-4 space-y-5">
                          {/* Team labels */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-[#1b4332]/5 rounded-lg p-3">
                              <p className="text-xs font-bold text-[#1b4332] uppercase tracking-wide mb-1">Team A</p>
                              <p className="font-medium text-gray-800">{fixture.teamAPlayer1Name}</p>
                              <p className="font-medium text-gray-800">{fixture.teamAPlayer2Name}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Team B</p>
                              <p className="font-medium text-gray-800">{fixture.teamBPlayer1Name}</p>
                              <p className="font-medium text-gray-800">{fixture.teamBPlayer2Name}</p>
                            </div>
                          </div>

                          {/* Balancer notice */}
                          {fixture.isBalancer && (() => {
                            let eligibleIds: number[] = [];
                            try { eligibleIds = (fixture as any).balancerEligiblePlayers ? JSON.parse((fixture as any).balancerEligiblePlayers) : []; } catch {}
                            const allPlayers = [
                              { id: fixture.teamAPlayer1, name: fixture.teamAPlayer1Name },
                              { id: fixture.teamAPlayer2, name: fixture.teamAPlayer2Name },
                              { id: fixture.teamBPlayer1, name: fixture.teamBPlayer1Name },
                              { id: fixture.teamBPlayer2, name: fixture.teamBPlayer2Name },
                            ];
                            const scoringPlayers = allPlayers.filter(p => eligibleIds.includes(p.id));
                            const nonScoringPlayers = allPlayers.filter(p => !eligibleIds.includes(p.id));
                            return (
                              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
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

                          {/* Score entry — "My team" = Team A in admin context */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                              Score (Team A vs Team B)
                            </p>
                            <SetScoreEntry
                              key={fixture.id}
                              onChange={(result) => setScoreResult(result)}
                            />
                          </div>

                          {/* Date played */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Date Played
                            </label>
                            <input
                              type="date"
                              value={playedAt}
                              onChange={(e) => setPlayedAt(e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              Notes (optional)
                            </label>
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="e.g. walkover, injury, etc."
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                            />
                          </div>

                          {/* Validation message */}
                          {scoreResult && !scoreResult.valid && scoreResult.message && (
                            <p className="text-xs text-amber-600">{scoreResult.message}</p>
                          )}
                          {scoreResult?.valid && scoreResult.winner && (
                            <p className="text-xs text-green-700 font-medium">
                              ✓ {scoreResult.winner === "A" ? teamALabel : teamBLabel} won — {scoreResult.scoreString}
                            </p>
                          )}

                          {/* Submit */}
                          <div className="flex items-center gap-3">
                            <button
                              disabled={!scoreResult?.valid || adminReportMatch.isPending}
                              onClick={() => {
                                if (!scoreResult?.valid || !scoreResult.winner) return;
                                adminReportMatch.mutate({
                                  seasonId,
                                  boxId: box.boxId,
                                  fixtureId: fixture.id,
                                  player1Id: fixture.teamAPlayer1,
                                  partner1Id: fixture.teamAPlayer2,
                                  player2Id: fixture.teamBPlayer1,
                                  partner2Id: fixture.teamBPlayer2,
                                  score: scoreResult.scoreString,
                                  winner: scoreResult.winner,
                                  playedAt: new Date(playedAt),
                                  notes: notes.trim() || undefined,
                                });
                              }}
                              className="bg-[#1b4332] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2d6a4f] transition-colors disabled:opacity-40 flex items-center gap-2"
                            >
                              {adminReportMatch.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                              Record Result
                            </button>
                            <button
                              onClick={() => { setExpandedFixtureId(null); setScoreResult(null); }}
                              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
             </div>
          ))}
        </div>
      )}

    </div>
  );
}
