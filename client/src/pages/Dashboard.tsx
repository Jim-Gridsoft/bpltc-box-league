import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Trophy, Users, Calendar, CreditCard, CheckCircle2, ClipboardList, ChevronRight, Star, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [regName, setRegName] = useState("");
  const [regAbility, setRegAbility] = useState(3);
  const [matchScore, setMatchScore] = useState("");
  const [matchPartner, setMatchPartner] = useState("");
  const [matchOpp1, setMatchOpp1] = useState("");
  const [matchOpp2, setMatchOpp2] = useState("");
  const [matchWinner, setMatchWinner] = useState<"A" | "B">("A");
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchNotes, setMatchNotes] = useState("");
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
  const registerMutation = trpc.tournament.register.useMutation({
    onSuccess: () => { toast.success("Registered! Please complete payment."); utils.tournament.myEntry.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const checkoutMutation = trpc.tournament.createCheckout.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) { toast.info("Redirecting to payment..."); window.open(data.url, "_blank"); } },
    onError: (e) => toast.error(e.message),
  });
  const sandboxRegisterMutation = trpc.tournament.sandboxRegister.useMutation({
    onSuccess: () => { toast.success("Demo registration complete! You are now a paid entrant."); utils.tournament.myEntry.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const reportMatchMutation = trpc.tournament.reportMatch.useMutation({
    onSuccess: () => {
      toast.success("Match reported!");
      setMatchScore(""); setMatchNotes("");
      utils.tournament.myMatches.invalidate();
      utils.tournament.myEntry.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  if (authLoading) return <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" /></div>;
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" />
        <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Sign In to Enter</h1>
        <p className="text-gray-600 mb-8">Create a free account to register for the BPLTC Men's Doubles Box League and get placed in an ability-matched box.</p>
        <a href={getLoginUrl()} className="inline-block bg-[#1b4332] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2d6a4f] transition-colors">Sign In / Register</a>
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
          <p className="text-green-200 mt-1">{activeSeason?.name ?? "BPLTC Men's Doubles Box League"}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {seasons && seasons.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {seasons.map((s) => (
              <button key={s.id} onClick={() => setSeasonId(s.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeSeason?.id === s.id ? "bg-[#1b4332] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        {entrantLoading ? (
          <div className="bg-white rounded-2xl p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#1b4332] mx-auto" /></div>
        ) : !myEntry ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6"><ClipboardList className="w-6 h-6 text-[#c9a84c]" /><h2 className="font-serif text-xl font-bold text-[#1b4332]">Register for {activeSeason?.name ?? "the current season"} Box League</h2></div>
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. John Smith" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ability Rating (1-5)</label>
                <select value={regAbility} onChange={(e) => setRegAbility(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
                  <option value={1}>1 - Beginner</option>
                  <option value={2}>2 - Improver</option>
                  <option value={3}>3 - Intermediate</option>
                  <option value={4}>4 - Advanced</option>
                  <option value={5}>5 - County / Elite</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Used to seed you into an ability-matched box. Be honest — you will enjoy the competition more when playing at the right level.</p>
              </div>
              <button onClick={() => activeSeason && registerMutation.mutate({ seasonId: activeSeason.id, displayName: regName, abilityRating: regAbility })}
                disabled={!regName.trim() || registerMutation.isPending}
                className="w-full bg-[#1b4332] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Register for this Season — £20
              </button>
              <div className="mt-3 pt-3 border-t border-dashed border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-2">🧪 Demo Mode — skip payment for testing</p>
                <button onClick={() => activeSeason && sandboxRegisterMutation.mutate({ seasonId: activeSeason.id, displayName: regName || "Demo Player", abilityRating: regAbility })}
                  disabled={sandboxRegisterMutation.isPending}
                  className="w-full bg-amber-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {sandboxRegisterMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Free (Demo — No Payment)
                </button>
              </div>
            </div>
          </div>
        ) : !myEntry.paid ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-3 mb-4"><CreditCard className="w-6 h-6 text-amber-500" /><h2 className="font-serif text-xl font-bold text-[#1b4332]">Complete Your Payment</h2></div>
            <p className="text-gray-600 text-sm mb-5">You are registered as <strong>{myEntry.displayName}</strong> for {activeSeason?.name}. Pay the £20 entry fee to confirm your place in the box league.</p>
            <button onClick={() => myEntry && activeSeason && checkoutMutation.mutate({ seasonId: activeSeason.id })}
              disabled={checkoutMutation.isPending}
              className="bg-[#c9a84c] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#b8963d] transition-colors disabled:opacity-50 flex items-center gap-2">
              {checkoutMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Pay £20 Entry Fee <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Season Points", value: myEntry.seasonPoints, icon: <Star className="w-5 h-5 text-[#c9a84c]" /> },
                { label: "Matches Played", value: myEntry.matchesPlayed, icon: <Users className="w-5 h-5 text-blue-500" /> },
                { label: "Matches Won", value: myEntry.matchesWon, icon: <Trophy className="w-5 h-5 text-green-600" /> },
                { label: "Win Rate", value: myEntry.matchesPlayed > 0 ? `${Math.round((myEntry.matchesWon / myEntry.matchesPlayed) * 100)}%` : "—", icon: <CheckCircle2 className="w-5 h-5 text-purple-500" /> },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
                  <div className="text-2xl font-bold text-[#1b4332] font-serif">{stat.value}</div>
                </div>
              ))}
            </div>
            {myBox && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4"><Users className="w-5 h-5 text-[#1b4332]" /><h2 className="font-serif text-xl font-bold text-[#1b4332]">My Box - {myBox.name}</h2></div>
                {myBox.members && myBox.members.length > 0 ? (
                  <div className="space-y-2">
                    {myBox.members.map((m, i) => (
                      <div key={m.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${m.userId === user?.id ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-5">{i + 1}</span>
                          <span className="font-medium text-gray-800">{m.displayName}</span>
                          {m.userId === user?.id && <span className="text-xs bg-[#1b4332] text-white px-2 py-0.5 rounded-full">You</span>}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#1b4332]">{m.seasonPoints} pts</span>
                          <span className="text-xs text-gray-400 ml-2">{m.matchesPlayed}P {m.matchesWon}W</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 text-sm">Box assignments will be published when the season opens.</p>}
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6"><Calendar className="w-5 h-5 text-[#c9a84c]" /><h2 className="font-serif text-xl font-bold text-[#1b4332]">Report a Match Result</h2></div>
              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                {[
                  { label: "Your Partner", value: matchPartner, setter: setMatchPartner, ph: "Partner name" },
                  { label: "Opponent 1", value: matchOpp1, setter: setMatchOpp1, ph: "Opponent name" },
                  { label: "Opponent 2", value: matchOpp2, setter: setMatchOpp2, ph: "Opponent name" },
                  { label: "Score", value: matchScore, setter: setMatchScore, ph: "e.g. 6-4, 3-6, 10-7" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input value={f.value} onChange={(e) => f.setter(e.target.value)} placeholder={f.ph} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                  <select value={matchWinner} onChange={(e) => setMatchWinner(e.target.value as "A" | "B")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
                    <option value="A">We won (my team)</option>
                    <option value="B">We lost (opponents won)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Played</label>
                  <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input value={matchNotes} onChange={(e) => setMatchNotes(e.target.value)} placeholder="Any notes about the match" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]" />
                </div>
              </div>
              <button onClick={() => activeSeason && myEntry && reportMatchMutation.mutate({ seasonId: activeSeason.id, boxId: myBox?.id ?? 0, partner1Id: 0, player2Id: 0, partner2Id: 0, score: matchScore, winner: matchWinner, playedAt: new Date(matchDate), notes: matchNotes || undefined })}
                disabled={!matchScore.trim() || reportMatchMutation.isPending}
                className="mt-4 bg-[#1b4332] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center gap-2">
                {reportMatchMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Match Result
              </button>
            </div>
            {myMatches && myMatches.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-[#c9a84c]" /><h2 className="font-serif text-xl font-bold text-[#1b4332]">My Box League Match History</h2></div>
                <div className="divide-y divide-gray-50">
                  {myMatches.map((m) => {
                    const iWon = (m.player1Id === myEntry.id || m.partner1Id === myEntry.id) ? m.winner === "A" : m.winner === "B";
                    return (
                      <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${iWon ? "bg-green-500" : "bg-red-400"}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{m.score}</p>
                            <p className="text-xs text-gray-400">{new Date(m.playedAt).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${iWon ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{iWon ? "+2 pts" : "+1 pt"}</span>
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
