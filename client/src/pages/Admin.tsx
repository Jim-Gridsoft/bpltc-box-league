import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { toast } from "sonner";
import {
  Shield, Users, Trophy, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronUp, Calendar, Plus,
} from "lucide-react";

export default function Admin() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [expandedEntrant, setExpandedEntrant] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"entrants" | "matches" | "seasons" | "sandbox">("entrants");
  const [seedCount, setSeedCount] = useState(6);

  // Create season form
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonYear, setNewSeasonYear] = useState(2026);
  const [newSeasonQuarter, setNewSeasonQuarter] = useState<"spring" | "summer" | "autumn" | "winter">("spring");
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

  const sandboxSeedMutation = trpc.tournament.sandboxSeedPlayers.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} test players added to the season.`);
      utils.tournament.adminSeasonEntrants.invalidate();
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

  const verifyMatchMutation = trpc.tournament.adminVerifyMatch.useMutation({
    onSuccess: () => { toast.success("Match verified."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteMatchMutation = trpc.tournament.adminDeleteMatch.useMutation({
    onSuccess: () => { toast.success("Match deleted."); },
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
          {(["entrants", "matches", "seasons", "sandbox"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? tab === "sandbox" ? "bg-amber-500 shadow-sm text-white" : "bg-white shadow-sm text-[#1b4332]"
                  : tab === "sandbox" ? "text-amber-600 hover:text-amber-700" : "text-gray-500 hover:text-gray-700"
              }`}>
              {tab === "sandbox" ? "🧪 Sandbox" : tab}
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
                          {!e.paid && (
                            <button
                              onClick={() => markPaidMutation.mutate({ entrantId: e.id })}
                              disabled={markPaidMutation.isPending}
                              className="ml-auto self-start bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                              {markPaidMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                              Mark as Paid
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Matches tab */}
        {activeTab === "matches" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">Match Results</h2>
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
                    onDelete={(id) => deleteMatchMutation.mutate({ matchId: id })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Seasons tab */}
        {activeTab === "seasons" && (
          <div className="space-y-6">
            {activeSeason && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-serif text-xl font-bold text-[#1b4332] mb-4">Update Season Status</h2>
                <p className="text-sm text-gray-500 mb-4">Current status: <strong className="capitalize">{activeSeason.status}</strong></p>
                <div className="flex flex-wrap gap-2">
                  {(["upcoming", "registration", "active", "completed"] as const).map((status) => (
                    <button key={status} onClick={() => updateStatusMutation.mutate({ seasonId: activeSeason.id, status })}
                      disabled={activeSeason.status === status || updateStatusMutation.isPending}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors disabled:opacity-40 ${activeSeason.status === status ? "bg-[#1b4332] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                    <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.startDate).toLocaleDateString("en-GB")} — {new Date(s.endDate).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        s.status === "active" ? "bg-green-100 text-green-700" :
                        s.status === "registration" ? "bg-blue-100 text-blue-700" :
                        s.status === "completed" ? "bg-gray-100 text-gray-600" :
                        "bg-amber-100 text-amber-700"
                      }`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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

            {/* Reset sandbox */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
              <h3 className="font-serif text-lg font-bold text-red-700 mb-2">Reset Sandbox Data</h3>
              <p className="text-sm text-gray-500 mb-4">
                Removes all test players, their match records, partner slots, and match requests from the selected season.
                Real member registrations and match results are <strong>not affected</strong>.
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
