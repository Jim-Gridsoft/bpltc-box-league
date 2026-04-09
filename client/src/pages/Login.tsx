import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TournamentNav from "@/components/TournamentNav";
import { Loader2, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      registerMutation.mutate({ name, email, password });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />
      <div className="flex items-center justify-center px-4 py-16">
        <div
          className="w-full max-w-md rounded-2xl shadow-sm border p-8"
          style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--charcoal-mid)" }}>
              {mode === "login"
                ? "Sign in to access your BPLTC Box League account."
                : "Register to join the BPLTC Doubles Box League."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border mb-6" style={{ borderColor: "var(--cream-dark)" }}>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                mode === "login"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={mode === "login" ? { background: "var(--green-deep)" } : { background: "#fff" }}
            >
              <LogIn className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                mode === "register"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={mode === "register" ? { background: "var(--green-deep)" } : { background: "#fff" }}
            >
              <UserPlus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  placeholder="e.g. John Smith"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--cream-dark)" }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--cream-dark)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                  className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--cream-dark)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--cream-dark)" }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background: "var(--green-deep)" }}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {mode === "login" && (
            <div className="text-center mt-4 space-y-2">
              <p className="text-xs" style={{ color: "var(--charcoal-mid)" }}>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-semibold underline"
                  style={{ color: "var(--green-deep)" }}
                >
                  Register here
                </button>
              </p>
              <p className="text-xs" style={{ color: "var(--charcoal-mid)" }}>
                <Link
                  href="/forgot-password"
                  className="font-semibold underline"
                  style={{ color: "var(--charcoal-mid)" }}
                >
                  Forgot your password?
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
