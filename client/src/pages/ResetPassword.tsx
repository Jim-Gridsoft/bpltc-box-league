import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TournamentNav from "@/components/TournamentNav";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function ResetPassword() {
  const [location] = useLocation();

  // Parse token from query string
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    resetMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen" style={{ background: "var(--cream)" }}>
        <TournamentNav />
        <div className="flex items-center justify-center px-4 py-16">
          <div
            className="w-full max-w-md rounded-2xl shadow-sm border p-8 text-center"
            style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
          >
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-amber-500" />
            <h1
              className="text-2xl font-bold mb-3"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
            >
              Invalid Reset Link
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--charcoal-mid)" }}>
              This password reset link is missing or malformed. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold underline"
              style={{ color: "var(--green-deep)" }}
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />
      <div className="flex items-center justify-center px-4 py-16">
        <div
          className="w-full max-w-md rounded-2xl shadow-sm border p-8"
          style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
        >
          {done ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--green-deep)" }} />
              <h1
                className="text-2xl font-bold mb-3"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                Password Reset!
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--charcoal-mid)" }}>
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="inline-block py-2.5 px-6 rounded-lg text-white text-sm font-semibold"
                style={{ background: "var(--green-deep)" }}
              >
                Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <KeyRound className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--green-deep)" }} />
                <h1
                  className="text-3xl font-bold"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                >
                  Set New Password
                </h1>
                <p className="text-sm mt-2" style={{ color: "var(--charcoal-mid)" }}>
                  Choose a strong new password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
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

                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your new password"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--cream-dark)" }}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs mt-1 text-red-500">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  style={{ background: "var(--green-deep)" }}
                >
                  {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
