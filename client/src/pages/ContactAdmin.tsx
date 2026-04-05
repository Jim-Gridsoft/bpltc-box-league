import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  MessageSquare, CheckCircle2, AlertTriangle, Loader2,
  Shield, ChevronDown, ChevronUp,
} from "lucide-react";

const SUBJECTS = [
  "Score dispute",
  "Fixture scheduling issue",
  "Payment / registration problem",
  "Conduct complaint",
  "Technical issue with the website",
  "Other",
];

export default function ContactAdmin() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [description, setDescription] = useState("");
  const [matchId, setMatchId] = useState("");
  const [fixtureId, setFixtureId] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.disputes.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (e) => {
      toast.error(e.message || "Failed to submit. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = subject === "Other" ? customSubject.trim() : subject;
    if (!finalSubject) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error("Please provide a description (at least 10 characters).");
      return;
    }
    submitMutation.mutate({
      subject: finalSubject,
      description: description.trim(),
      matchId: matchId ? parseInt(matchId, 10) : undefined,
      fixtureId: fixtureId ? parseInt(fixtureId, 10) : undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf6ee]">
        <TournamentNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Shield className="w-16 h-16 mx-auto mb-6 text-gray-300" />
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] mb-4">Sign in required</h1>
          <p className="text-gray-500 mb-6">You must be signed in to contact the administrators.</p>
          <button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-[#1b4332] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />

      {/* Header */}
      <div className="bg-[#1b4332] text-white py-10 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#c9a84c]" />
          <div>
            <h1 className="font-serif text-3xl font-bold">Contact Administrator</h1>
            <p className="text-green-200 text-sm mt-0.5">Dispute resolution &amp; general enquiries</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {submitted ? (
          /* Success state */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-5 text-green-500" />
            <h2 className="font-serif text-2xl font-bold text-[#1b4332] mb-3">Message Sent</h2>
            <p className="text-gray-500 mb-6">
              Your message has been received. The club administrators have been notified and will
              review your submission. You can expect a response within 48 hours.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setSubject("");
                setCustomSubject("");
                setDescription("");
                setMatchId("");
                setFixtureId("");
              }}
              className="text-sm text-[#1b4332] underline hover:no-underline"
            >
              Submit another message
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Dispute resolution:</strong> Use this form to report score disputes, scheduling
                issues, conduct concerns, or any other matter requiring administrator attention. All
                submissions are logged and reviewed by the club committee.
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#c9a84c]" />
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">New Message</h2>
                <span className="ml-auto text-xs text-gray-400">From: {user?.name ?? user?.email}</span>
              </div>

              <div className="p-6 space-y-5">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332] bg-white"
                  >
                    <option value="">Select a subject…</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {subject === "Other" && (
                    <input
                      type="text"
                      placeholder="Please specify…"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      maxLength={256}
                      required
                      className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe the issue in detail. Include names of players involved, dates, and any relevant context…"
                    rows={6}
                    maxLength={5000}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/5000</p>
                </div>

                {/* Optional references */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOptional(!showOptional)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1b4332] transition-colors"
                  >
                    {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Add optional match or fixture reference
                  </button>

                  {showOptional && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Match ID (optional)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 42"
                          value={matchId}
                          onChange={(e) => setMatchId(e.target.value)}
                          min={1}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Fixture ID (optional)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 7"
                          value={fixtureId}
                          onChange={(e) => setFixtureId(e.target.value)}
                          min={1}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitMutation.isPending || !subject || !description.trim()}
                  className="w-full bg-[#1b4332] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send to Administrators
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
