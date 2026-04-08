import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import TournamentNav from "@/components/TournamentNav";
import {
  Trophy,
  Calendar,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  Users,
  RefreshCw,
  Star,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663452042921/PTKxsipnFcy6SZgTVAYLQb/ladder-hero-8P36hrf3wYXvayVXguUpki.webp";

function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const HOW_IT_WORKS = [
  {
    icon: CreditCard,
    title: "Register & Pay",
    body: "Sign in, enter your display name and ability rating, then pay the £20 seasonal entry fee. Your place in the box league is confirmed instantly.",
  },
  {
    icon: Users,
    title: "Get Placed in a Box",
    body: "The committee seeds players into ability-matched boxes based on the number of entrants. You will play every other player in your box over the 3-month season — roughly one match per month.",
  },
  {
    icon: RefreshCw,
    title: "Play Your System-Generated Fixtures",
    body: "The system automatically generates your fixture schedule, maximising partner rotation across every match. Partners are varied as much as possible each season — keeping things fresh, fair, and social.",
  },
  {
    icon: BarChart3,
    title: "Report Results & Earn Points",
    body: "Log match results in your dashboard. Win a match and earn 2 points; win at least one set but lose the match and earn 1 point; lose both sets and earn 0 points. Every set counts.",
  },
  {
    icon: ArrowUpDown,
    title: "Promotion & Relegation",
    body: "At the end of each season, the top players in each box are promoted and the bottom players are relegated. New season, new challenge.",
  },
  {
    icon: Trophy,
    title: "Compete for Year-Long Honours",
    body: "Points accumulate across all seasons played into a year-long table. Five awards are presented at the end-of-year celebration — including Best Improver and Spirit of the Club.",
  },
];

const RULES = [
  "Entry fee is £20 per player per season.",
  "The competition is open to male members of Bramhall Park Lawn Tennis Club.",
  "Players are seeded into ability-matched boxes by the committee at the start of each season. Box sizes are determined by the total number of entrants.",
  "Each match is a best-of-3 sets doubles match played at Bramhall Park LTC.",
  "Partners rotate each match — the system maximises partner variation so you play with as many different partners as possible across the season.",
  "Points are awarded as follows: 2 points for a match won, 1 point for winning at least one set but losing the match, 0 points for losing both sets (or a walkover).",
  "Box standings are determined by points, then by matches won, then by sets won.",
  "At the end of each season, the top 1–2 players in each box are promoted and the bottom 1–2 are relegated.",
  "Year-long points accumulate across all seasons played in a year and determine the overall annual champion.",
  "Results are self-reported via the website and are subject to committee verification.",
  "The committee reserves the right to amend or remove any result that appears inaccurate.",
  "Entry fees are non-refundable once a season has commenced.",
  "Balls are not provided by the club. Players are responsible for bringing their own balls to each match.",
  "Contact details (phone number and email) are only shared with other members of your box if you explicitly opt in during registration. You may update your sharing preferences at any time from your Dashboard.",
];

const AWARDS = [
  {
    icon: Trophy,
    title: "Annual Champion",
    desc: "The player with the most accumulated points across all seasons played in the year.",
  },
  {
    icon: Star,
    title: "Seasonal Box Winners",
    desc: "The top player in each box at the end of every season.",
  },
  {
    icon: Calendar,
    title: "Most Committed",
    desc: "The player who has played the most matches across the year — regardless of win rate.",
  },
  {
    icon: ArrowUpDown,
    title: "Best Improver",
    desc: "The player who has gained the most box divisions over the course of the year.",
  },
  {
    icon: Users,
    title: "Spirit of the Club",
    desc: "A committee nomination for the player who best embodies the values of BPLTC.",
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  registration: { label: "Registration Open", color: "#c9a84c" },
  active: { label: "Active", color: "#2d6a4f" },
  upcoming: { label: "Upcoming", color: "#6b7280" },
  completed: { label: "Completed", color: "#9ca3af" },
};

export default function Home() {
  const { isAuthenticated } = useAuth();
  const heroRef = useFadeUp();
  const howRef = useFadeUp();
  const seasonsRef = useFadeUp();
  const rulesRef = useFadeUp();
  const awardsRef = useFadeUp();

  const { data: allSeasons } = trpc.tournament.seasons.useQuery();
  const { data: currentSeason } = trpc.tournament.currentSeason.useQuery();

  // Show active + upcoming seasons; hide completed ones.
  // Order: active first, then registration open, then upcoming — oldest start date first within each group.
  const STATUS_ORDER: Record<string, number> = { active: 0, registration: 1, upcoming: 2 };
  const visibleSeasons = useMemo(() => {
    if (!allSeasons) return [];
    return allSeasons
      .filter((s) => s.status !== "completed")
      .sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        if (statusDiff !== 0) return statusDiff;
        // Within same status group, oldest start date first
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
  }, [allSeasons]);

  const currentSeasonName = currentSeason?.name ?? null;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />

      {/* Hero */}
      <header className="relative overflow-hidden" style={{ minHeight: "540px" }}>
        <img
          src={HERO_IMAGE}
          alt="Men's doubles tennis at Bramhall Park LTC"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 35%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(27,67,50,0.92) 0%, rgba(27,67,50,0.68) 55%, rgba(27,67,50,0.2) 100%)",
          }}
        />
        <div className="relative container flex flex-col justify-end pb-16 pt-24">
          <div ref={heroRef} className="fade-up max-w-xl">
            <span
              className="label-tag mb-3 inline-block"
              style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Bramhall Park Lawn Tennis Club · Centenary Year 2026
            </span>
            <h1
              className="text-5xl md:text-6xl font-bold mb-4 leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#faf6ee" }}
            >
              Men's Doubles<br />Box League
            </h1>
            <p
              className="text-lg md:text-xl leading-relaxed mb-8"
              style={{ color: "rgba(250,246,238,0.85)", fontFamily: "'Source Sans 3', sans-serif", fontWeight: 300 }}
            >
              Ability-matched boxes. Maximally varied partners. Promotion and relegation.
              Compete for the title — and earn points for every match you play. Entry is just £20 per season.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    style={{ background: "var(--gold)", color: "var(--green-deep)", fontWeight: 600 }}
                  >
                    <LayoutDashboard size={16} className="mr-2" />
                    Go to My Dashboard
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={() => (window.location.href = getLoginUrl())}
                  style={{ background: "var(--gold)", color: "var(--green-deep)", fontWeight: 600 }}
                >
                  <CreditCard size={16} className="mr-2" />
                  Register & Enter — £20
                </Button>
              )}
              <Link href="/leaderboard">
                <Button
                  size="lg"
                  variant="outline"
                  style={{ borderColor: "rgba(250,246,238,0.5)", color: "#faf6ee", background: "transparent" }}
                >
                  <BarChart3 size={16} className="mr-2" />
                  View Standings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Stats banner */}
      <div
        className="py-6 border-y"
        style={{ background: "var(--green-deep)", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "£20", label: "Entry Per Season" },
            { value: "2 pts", label: "For a Win" },
            { value: "1 pt", label: "For Winning a Set" },
            { value: "0 pts", label: "For Losing 2-0" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p
                className="text-3xl font-bold"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--gold)" }}
              >
                {value}
              </p>
              <p className="label-tag mt-1" style={{ color: "rgba(250,246,238,0.7)" }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="py-16 border-b" style={{ borderColor: "var(--cream-dark)" }}>
        <div className="container">
          <div ref={howRef} className="fade-up">
            <div className="text-center mb-12">
              <span
                className="label-tag"
                style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                How It Works
              </span>
              <h2
                className="text-4xl font-semibold mt-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                Six Simple Steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
                <div
                  key={title}
                  className="rounded-lg p-6 border flex flex-col gap-4"
                  style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--green-deep)" }}
                  >
                    <Icon size={18} color="var(--gold)" />
                  </div>
                  <div>
                    <span
                      className="label-tag"
                      style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Step {i + 1}
                    </span>
                    <h3
                      className="text-xl font-semibold mt-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                    >
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed mt-2" style={{ color: "var(--charcoal-mid)" }}>
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Season Calendar */}
      <section className="py-16 border-b" style={{ borderColor: "var(--cream-dark)" }}>
        <div className="container max-w-3xl">
          <div ref={seasonsRef} className="fade-up">
            <div className="mb-8 text-center">
              <span
                className="label-tag"
                style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Season Calendar
              </span>
              <h2
                className="text-4xl font-semibold mt-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                Season Calendar
              </h2>
              <p className="text-base mt-3" style={{ color: "var(--charcoal-mid)" }}>
                Each season runs for approximately 3 months. Seasons are scheduled around the club calendar
                — you can enter whenever a season is open, making it easy to fit around other commitments.
              </p>
            </div>
            {visibleSeasons.length === 0 ? (
              <p className="text-center text-sm" style={{ color: "var(--charcoal-mid)" }}>No upcoming seasons have been scheduled yet. Check back soon.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleSeasons.map((season) => {
                  const statusInfo = STATUS_LABELS[season.status] ?? { label: season.status, color: "#6b7280" };
                  const start = season.startDate ? new Date(season.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
                  const end = season.endDate ? new Date(season.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
                  const deadline = season.registrationDeadline ? new Date(season.registrationDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
                  return (
                    <div
                      key={season.id}
                      className="rounded-lg p-5 border"
                      style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p
                          className="text-xl font-bold"
                          style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                        >
                          {season.name}
                        </p>
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: `${statusInfo.color}18`, color: statusInfo.color, fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      {start && end && (
                        <p className="text-xs" style={{ color: "var(--charcoal-mid)", fontFamily: "'Space Grotesk', sans-serif" }}>
                          {start} – {end}
                        </p>
                      )}
                      {deadline && (season.status === "registration" || season.status === "active") && (
                        <p className="text-xs mt-1" style={{ color: "var(--charcoal-mid)", fontFamily: "'Space Grotesk', sans-serif" }}>
                          Registration closes: {deadline}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-16 border-b" style={{ background: "var(--green-deep)", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="container">
          <div ref={awardsRef} className="fade-up">
            <div className="text-center mb-12">
              <span
                className="label-tag"
                style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                End-of-Year Honours
              </span>
              <h2
                className="text-4xl font-semibold mt-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "#faf6ee" }}
              >
                Five Awards to Compete For
              </h2>
              <p className="text-base mt-3 max-w-xl mx-auto" style={{ color: "rgba(250,246,238,0.75)" }}>
                The best player does not always win. We recognise commitment, improvement, and the spirit of the game — not just results.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {AWARDS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-lg p-5 border flex flex-col gap-3"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--gold)" }}
                  >
                    <Icon size={16} color="var(--green-deep)" />
                  </div>
                  <p
                    className="text-lg font-semibold leading-snug"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: "#faf6ee" }}
                  >
                    {title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(250,246,238,0.7)" }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rules */}
      <section
        className="py-16 border-b"
        style={{ background: "var(--cream-dark)", borderColor: "var(--cream-dark)" }}
      >
        <div className="container max-w-3xl">
          <div ref={rulesRef} className="fade-up">
            <div className="mb-8">
              <span
                className="label-tag"
                style={{ color: "var(--gold)", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Competition Rules
              </span>
              <h2
                className="text-4xl font-semibold mt-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                What You Need to Know
              </h2>
            </div>
            <ul className="space-y-3">
              {RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    className="shrink-0 mt-0.5"
                    style={{ color: "var(--green-mid)" }}
                  />
                  <span className="text-base" style={{ color: "var(--charcoal)" }}>
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container text-center">
          <h2
            className="text-4xl font-semibold mb-4"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            Ready to Enter?
          </h2>
          <p className="text-lg mb-8 max-w-lg mx-auto" style={{ color: "var(--charcoal-mid)" }}>
            Sign in, register your name and ability rating, and pay the £20 seasonal entry fee to secure
            your place in the{currentSeasonName ? ` ${currentSeasonName}` : ""} box league.
          </p>
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button
                size="lg"
                style={{ background: "var(--green-deep)", color: "var(--cream)", fontWeight: 600 }}
              >
                <LayoutDashboard size={16} className="mr-2" />
                Go to My Dashboard
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              style={{ background: "var(--green-deep)", color: "var(--cream)", fontWeight: 600 }}
            >
              <CreditCard size={16} className="mr-2" />
              Sign In & Register — £20
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 border-t"
        style={{ borderColor: "var(--cream-dark)", background: "var(--cream-dark)" }}
      >
        <div className="container text-center">
          <p
            className="font-semibold"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            Bramhall Park Lawn Tennis Club — Est. 1926
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--charcoal-mid)" }}>
            Centenary Year 2026 · Men's Doubles Box League
          </p>
        </div>
      </footer>
    </div>
  );
}
