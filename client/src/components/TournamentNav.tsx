import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Trophy, LayoutDashboard, Home, LogOut, LogIn, Users, ShieldCheck, ClipboardList } from "lucide-react";

export default function TournamentNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/leaderboard", label: "Standings", icon: Trophy },
    ...(isAuthenticated ? [{ href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard }] : []),
    ...(isAuthenticated ? [{ href: "/results", label: "My Results", icon: ClipboardList }] : []),
    ...(isAuthenticated ? [{ href: "/partners", label: "Partner Finder", icon: Users }] : []),
    ...(isAuthenticated && user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(250,246,238,0.95)",
        backdropFilter: "blur(8px)",
        borderColor: "var(--cream-dark)",
      }}
    >
      <div className="container flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/">
          <span
            className="font-semibold text-lg cursor-pointer"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
          >
            BPLTC Doubles Box League 2026
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <span
                className="label-tag flex items-center gap-1.5 cursor-pointer transition-colors"
                style={{
                  color: location === href ? "var(--green-deep)" : "var(--charcoal-mid)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  borderBottom: location === href ? "2px solid var(--gold)" : "2px solid transparent",
                  paddingBottom: "2px",
                }}
              >
                <Icon size={13} />
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm hidden sm:block" style={{ color: "var(--charcoal-mid)" }}>
                {user?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-1.5"
                style={{ borderColor: "var(--cream-dark)", color: "var(--charcoal-mid)" }}
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => (window.location.href = getLoginUrl())}
              className="flex items-center gap-1.5"
              style={{ background: "var(--green-deep)", color: "var(--cream)" }}
            >
              <LogIn size={13} />
              Sign in
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-4 px-4 pb-2">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <span
              className="label-tag flex items-center gap-1 cursor-pointer"
              style={{
                color: location === href ? "var(--green-deep)" : "var(--charcoal-mid)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Icon size={12} />
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
