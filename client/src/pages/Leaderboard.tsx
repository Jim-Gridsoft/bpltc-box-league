import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TournamentNav from "@/components/TournamentNav";
import { Trophy, Medal, Star, Users, ChevronDown, ChevronUp } from "lucide-react";

const CURRENT_YEAR = 2026;

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">{rank}</span>;
}

function WinRate({ played, won }: { played: number; won: number }) {
  if (played === 0) return <span className="text-gray-400">—</span>;
  const pct = Math.round((won / played) * 100);
  return (
    <span className={pct >= 60 ? "text-green-600 font-semibold" : pct >= 40 ? "text-amber-600" : "text-red-500"}>
      {pct}%
    </span>
  );
}

function BoxCard({ boxId, name, level, expanded, onToggle }: {
  boxId: number; name: string; level: number; expanded: boolean; onToggle: () => void;
}) {
  const { data: box } = trpc.tournament.boxDetail.useQuery({ boxId }, { enabled: expanded });
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-sm font-bold">{level}</div>
          <span className="font-serif text-lg font-bold text-[#1b4332]">{name}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {expanded && box && (
        <div className="border-t border-gray-100">
          {box.members && box.members.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Player</th>
                  <th className="px-4 py-2 text-center">Pts</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">P</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">W</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {box.members.map((m, i) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{m.displayName}</td>
                    <td className="px-4 py-2 text-center font-bold text-[#1b4332]">{m.seasonPoints}</td>
                    <td className="px-4 py-2 text-center text-gray-500 hidden sm:table-cell">{m.matchesPlayed}</td>
                    <td className="px-4 py-2 text-center text-gray-500 hidden sm:table-cell">{m.matchesWon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-6 py-4 text-gray-400 text-sm">Players will be assigned to this box when the season opens.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const [showYear, setShowYear] = useState(false);
  const [expandedBox, setExpandedBox] = useState<number | null>(null);

  const { data: currentSeason } = trpc.tournament.currentSeason.useQuery();
  const { data: seasonLeaderboard, isLoading: loadingSeason } = trpc.tournament.seasonLeaderboard.useQuery(
    { seasonId: currentSeason?.id ?? 0 },
    { enabled: !!currentSeason }
  );
  const { data: yearLeaderboard, isLoading: loadingYear } = trpc.tournament.yearLeaderboard.useQuery(
    { year: CURRENT_YEAR },
    { enabled: showYear }
  );
  const { data: boxes } = trpc.tournament.seasonBoxes.useQuery(
    { seasonId: currentSeason?.id ?? 0 },
    { enabled: !!currentSeason }
  );

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />
      <div className="relative bg-[#1b4332] text-white py-14 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">Standings</h1>
          <p className="text-green-200 text-lg">{currentSeason ? currentSeason.name : "BPLTC Men's Doubles Box League 2026"}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        <div className="flex gap-2 justify-center">
          <button onClick={() => setShowYear(false)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${!showYear ? "bg-[#1b4332] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Season Standings</button>
          <button onClick={() => setShowYear(true)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${showYear ? "bg-[#1b4332] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Year Accumulator {CURRENT_YEAR}</button>
        </div>

        {!showYear && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">{currentSeason?.name ?? "Current Season"} — Points Table</h2>
            </div>
            {loadingSeason ? (
              <div className="p-8 text-center text-gray-400">Loading standings…</div>
            ) : !seasonLeaderboard || seasonLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No results yet. Matches will appear here once the season begins.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Played</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Won</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Win %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {seasonLeaderboard.map((player, i) => (
                    <tr key={player.id} className={i < 3 ? "bg-amber-50/40" : ""}>
                      <td className="px-4 py-3"><div className="flex items-center justify-center">{getRankIcon(i + 1)}</div></td>
                      <td className="px-4 py-3 font-medium text-gray-800">{player.displayName}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#1b4332] text-base">{player.seasonPoints}</td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{player.matchesPlayed}</td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{player.matchesWon}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell"><WinRate played={player.matchesPlayed} won={player.matchesWon} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">Points: 2 for a win · 1 for a loss · 0 for a walkover</div>
          </div>
        )}

        {showYear && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#c9a84c]" />
              <h2 className="font-serif text-xl font-bold text-[#1b4332]">{CURRENT_YEAR} Year-Long Accumulator</h2>
            </div>
            {loadingYear ? (
              <div className="p-8 text-center text-gray-400">Loading…</div>
            ) : !yearLeaderboard || yearLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Year standings will populate as seasons are completed.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">#</th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-center">Total Pts</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Matches</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Seasons</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Win %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {yearLeaderboard.map((player, i) => (
                    <tr key={player.id} className={i < 3 ? "bg-amber-50/40" : ""}>
                      <td className="px-4 py-3"><div className="flex items-center justify-center">{getRankIcon(i + 1)}</div></td>
                      <td className="px-4 py-3 font-medium text-gray-800">{player.displayName ?? "—"}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#1b4332] text-base">{player.totalPoints}</td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{player.totalMatchesPlayed}</td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{player.seasonsEntered}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell"><WinRate played={player.totalMatchesPlayed} won={player.totalMatchesWon} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">Accumulated across all four 3-month seasons. Awards presented at the end-of-year social.</div>
          </div>
        )}

        {!showYear && boxes && boxes.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#1b4332]">Box Standings</h2>
            {boxes.map((box) => (
              <BoxCard key={box.id} boxId={box.id} name={box.name} level={box.level}
                expanded={expandedBox === box.id}
                onToggle={() => setExpandedBox(expandedBox === box.id ? null : box.id)}
              />
            ))}
          </div>
        )}

        <div className="bg-[#1b4332] text-white rounded-2xl p-6">
          <h3 className="font-serif text-xl font-bold mb-4 text-[#c9a84c]">How Points Work</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/10 rounded-xl p-4 text-center"><div className="text-3xl font-bold text-[#c9a84c] mb-1">2</div><div className="text-green-200">Points for a win</div></div>
            <div className="bg-white/10 rounded-xl p-4 text-center"><div className="text-3xl font-bold text-[#c9a84c] mb-1">1</div><div className="text-green-200">Point for a loss</div></div>
            <div className="bg-white/10 rounded-xl p-4 text-center"><div className="text-3xl font-bold text-[#c9a84c] mb-1">0</div><div className="text-green-200">Walkover / no-show</div></div>
          </div>
          <p className="text-green-200 text-sm mt-4">Partners rotate each match — you cannot play with the same partner twice in a season. Every player earns points for competing, not just the winners.</p>
        </div>
      </div>
    </div>
  );
}
