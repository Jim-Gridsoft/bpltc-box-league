import { trpc } from "@/lib/trpc";
import TournamentNav from "@/components/TournamentNav";
import { Trophy, Medal, Star } from "lucide-react";

const TARGET = 50;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={20} style={{ color: "var(--gold)" }} />;
  if (rank === 2) return <Medal size={20} style={{ color: "#aaa" }} />;
  if (rank === 3) return <Medal size={20} style={{ color: "#cd7f32" }} />;
  return (
    <span
      className="text-sm font-semibold w-6 text-center"
      style={{ color: "var(--charcoal-mid)", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {rank}
    </span>
  );
}

export default function Leaderboard() {
  const { data: players, isLoading } = trpc.tournament.leaderboard.useQuery();

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />

      {/* Header */}
      <div
        className="py-12 border-b"
        style={{ background: "var(--green-deep)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="container text-center">
          <span
            className="label-tag"
            style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Live Rankings
          </span>
          <h1
            className="text-5xl font-bold mt-2"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}
          >
            Leaderboard
          </h1>
          <p className="mt-2 text-base" style={{ color: "rgba(250,246,238,0.7)" }}>
            BPLTC Men's Doubles Ladder 2026 · Target: {TARGET} sets won
          </p>
        </div>
      </div>

      <div className="container py-12 max-w-3xl">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg animate-pulse"
                style={{ background: "var(--cream-dark)" }}
              />
            ))}
          </div>
        ) : !players || players.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} style={{ color: "var(--cream-dark)", margin: "0 auto 16px" }} />
            <h2
              className="text-2xl font-semibold"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
            >
              No entrants yet
            </h2>
            <p className="mt-2" style={{ color: "var(--charcoal-mid)" }}>
              Be the first to register and start climbing the ladder!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player, i) => {
              const rank = i + 1;
              const pct = Math.min(100, Math.round((player.setsWon / TARGET) * 100));
              const isComplete = player.completed;

              return (
                <div
                  key={player.id}
                  className="rounded-lg border p-5 transition-all duration-200 hover:shadow-md"
                  style={{
                    background: isComplete ? "rgba(201,168,76,0.08)" : "#fff",
                    borderColor: isComplete ? "var(--gold)" : "var(--cream-dark)",
                    borderWidth: isComplete ? "2px" : "1px",
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="shrink-0 w-8 flex justify-center">
                      <RankBadge rank={rank} />
                    </div>

                    {/* Name + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="font-semibold text-lg truncate"
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            color: "var(--green-deep)",
                          }}
                        >
                          {player.displayName}
                        </span>
                        {isComplete && (
                          <span
                            className="label-tag px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: "var(--gold)",
                              color: "var(--green-deep)",
                              fontFamily: "'Space Grotesk', sans-serif",
                            }}
                          >
                            <Star size={10} className="inline mr-1" />
                            Complete
                          </span>
                        )}
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-bar-fill${isComplete ? " completed" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="shrink-0 text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          color: isComplete ? "var(--gold)" : "var(--green-deep)",
                        }}
                      >
                        {player.setsWon}
                        <span
                          className="text-sm font-normal ml-1"
                          style={{ color: "var(--charcoal-mid)" }}
                        >
                          / {TARGET}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--charcoal-mid)" }}>
                        {player.setsPlayed} played · {pct}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div
          className="mt-8 rounded-lg p-4 border text-sm"
          style={{ borderColor: "var(--cream-dark)", color: "var(--charcoal-mid)" }}
        >
          <p>
            <strong style={{ color: "var(--green-deep)" }}>Rankings</strong> are ordered by sets
            won. In the event of a tie, the player who reached 50 sets first is ranked higher. The
            leaderboard updates in real time as players report results.
          </p>
        </div>
      </div>
    </div>
  );
}
