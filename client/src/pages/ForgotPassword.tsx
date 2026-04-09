import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TournamentNav from "@/components/TournamentNav";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <TournamentNav />
      <div className="flex items-center justify-center px-4 py-16">
        <div
          className="w-full max-w-md rounded-2xl shadow-sm border p-8"
          style={{ background: "#fff", borderColor: "var(--cream-dark)" }}
        >
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--green-deep)" }} />
              <h1
                className="text-2xl font-bold mb-3"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
              >
                Check Your Email
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--charcoal-mid)" }}>
                If an account exists for <strong>{email}</strong>, we have sent a password reset link.
                Please check your inbox (and spam folder) — the link expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="text-sm font-semibold underline"
                style={{ color: "var(--green-deep)" }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--green-deep)" }} />
                <h1
                  className="text-3xl font-bold"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--green-deep)" }}
                >
                  Forgot Password
                </h1>
                <p className="text-sm mt-2" style={{ color: "var(--charcoal-mid)" }}>
                  Enter your email address and we will send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: "var(--green-deep)", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
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

                <button
                  type="submit"
                  disabled={forgotMutation.isPending}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  style={{ background: "var(--green-deep)" }}
                >
                  {forgotMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Reset Link
                </button>
              </form>

              <p className="text-center text-xs mt-5" style={{ color: "var(--charcoal-mid)" }}>
                <Link href="/login" className="inline-flex items-center gap-1 font-semibold underline" style={{ color: "var(--green-deep)" }}>
                  <ArrowLeft className="w-3 h-3" />
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
