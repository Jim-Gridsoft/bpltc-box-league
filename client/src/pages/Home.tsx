import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import TournamentNav from "@/components/TournamentNav";
import { Trophy, Calendar, CreditCard, BarChart3, CheckCircle2, LayoutDashboard } from "lucide-react";
import { useEffect, useRef } from "react";

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
    body: "Sign in, enter your display name, and pay the £20 entry fee securely via card. Your place on the ladder is confirmed instantly.",
  },
  {
    icon: Calendar,
    title: "Play Your Sets",
    body: "Arrange doubles sets with other members throughout the year. The target is 50 sets won between 1 April 2026 and 31 March 2027.",
  },
  {
    icon: BarChart3,
    title: "Report Results",
    body: "Log each set result in your personal dashboard — opponent name, score, and date. Your leaderboard position updates immediately.",
  },
  {
    icon: Trophy,
    title: "Climb the Ladder",
    body: "Track your progress on the live leaderboard. The first player to reach 50 sets wins the tournament. Good luck!",
  },
];

const RULES = [
  "Entry fee is £20 per player, payable online at registration.",
  "The tournament runs from 1 April 2026 to 31 March 2027.",
  "Sets must be doubles sets played at Bramhall Park LTC.",
  "Each player must reach 50 sets won to complete the challenge.",
  "Results are self-reported and subject to club committee verification.",
  "The first player to reach 50 sets wins the tournament.",
  "In the event of a tie, the earlier completion date takes precedence.",
  "Entry fees are non-refundable after payment.",
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const heroRef = useFadeUp();
  const howRef = useFadeUp();
  const rulesRef = useFadeUp();

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />

      {/* Hero */}
      <header className="relative overflow-hidden" style={{ minHeight: "520px" }}>
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
              "linear-gradient(to right, rgba(27,67,50,0.90) 0%, rgba(27,67,50,0.65) 50%, rgba(27,67,50,0.2) 100%)",
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
              Men's Doubles<br />Ladder Tournament
            </h1>
            <p
              className="text-lg md:text-xl leading-relaxed mb-8"
              style={{ color: "rgba(250,246,238,0.85)", fontFamily: "'Source Sans 3', sans-serif", fontWeight: 300 }}
            >
              Play 50 sets over the course of the year. Track your progress. Compete for the title.
              Entry is just £20 — all proceeds go directly to the club.
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
                  View Leaderboard
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
            { value: "50", label: "Sets to Win" },
            { value: "£20", label: "Entry Fee" },
            { value: "1 Apr 2026", label: "Start Date" },
            { value: "31 Mar 2027", label: "End Date" },
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
                Four Simple Steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                Tournament Rules
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
          <p className="text-lg mb-8" style={{ color: "var(--charcoal-mid)" }}>
            Sign in, register your name, and pay the £20 entry fee to secure your place on the ladder.
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
            Centenary Year 2026 · Men's Doubles Ladder Tournament
          </p>
        </div>
      </footer>
    </div>
  );
}
