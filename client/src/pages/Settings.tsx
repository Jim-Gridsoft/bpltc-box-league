import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import TournamentNav from "@/components/TournamentNav";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Phone,
  UserCheck,
  Loader2,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Save,
  Shield,
} from "lucide-react";

export default function Settings() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  // ── Profile section ─────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  useEffect(() => {
    if (user) {
      setProfileName(user.name ?? "");
      setProfileEmail(user.email ?? "");
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      utils.auth.me.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSaveProfile = () => {
    const updates: { name?: string; email?: string } = {};
    if (profileName.trim() && profileName.trim() !== (user?.name ?? "")) updates.name = profileName.trim();
    if (profileEmail.trim() && profileEmail.trim() !== (user?.email ?? "")) updates.email = profileEmail.trim();
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save.");
      return;
    }
    updateProfileMutation.mutate(updates);
  };

  // ── Password section ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleChangePassword = () => {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  // ── Season contact preferences ───────────────────────────────────────────────
  const { data: activeSeason } = trpc.tournament.currentSeason.useQuery(
    { division: "mens" },
    { enabled: isAuthenticated }
  );
  const { data: myEntry } = trpc.tournament.myEntry.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason?.id }
  );

  const [editPhone, setEditPhone] = useState("");
  const [editShareContact, setEditShareContact] = useState(false);

  useEffect(() => {
    if (myEntry) {
      setEditPhone((myEntry as any).phoneNumber ?? "");
      setEditShareContact((myEntry as any).shareContact ?? false);
    }
  }, [myEntry]);

  const updateContactMutation = trpc.tournament.updateContactPreferences.useMutation({
    onSuccess: () => {
      toast.success("Contact preferences saved.");
      utils.tournament.myEntry.invalidate();
      utils.tournament.getBoxContacts.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSaveContact = () => {
    if (!myEntry) return;
    updateContactMutation.mutate({
      seasonEntrantId: myEntry.id,
      phoneNumber: editPhone.trim() || null,
      shareContact: editShareContact,
    });
  };

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <TournamentNav />

      {/* Header */}
      <div className="bg-[#1b4332] text-white py-10 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-[#c9a84c]" />
          <div>
            <h1 className="font-serif text-3xl font-bold">Account Settings</h1>
            <p className="text-green-200 text-sm mt-0.5">Manage your profile, password and contact preferences</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <User className="w-5 h-5 text-[#c9a84c]" />
            <h2 className="font-serif text-xl font-bold text-[#1b4332]">Profile</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your full name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              />
              <p className="text-xs text-gray-400 mt-1">This is the name shown on leaderboards and match results.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Used to sign in. Must be unique across all accounts.</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="bg-[#1b4332] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#163728] transition-colors disabled:opacity-50 flex items-center gap-2">
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── Password Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#c9a84c]" />
            <h2 className="font-serif text-xl font-bold text-[#1b4332]">Change Password</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full border border-gray-200 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-gray-200 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332] ${
                  confirmPassword && confirmPassword !== newPassword ? "border-red-300" : "border-gray-200"
                }`}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="bg-[#1b4332] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#163728] transition-colors disabled:opacity-50 flex items-center gap-2">
                {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* ── Season Contact Preferences Card ──────────────────────────────── */}
        {myEntry && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#c9a84c]" />
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1b4332]">Season Contact Preferences</h2>
                <p className="text-xs text-gray-400 mt-0.5">{activeSeason?.name ?? "Current season"}</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 07700 900123"
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Only shared with your box-mates if you enable sharing below.</p>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                <input
                  type="checkbox"
                  id="shareContactSettings"
                  checked={editShareContact}
                  onChange={(e) => setEditShareContact(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1b4332] cursor-pointer"
                />
                <label htmlFor="shareContactSettings" className="cursor-pointer">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                    <UserCheck className="w-4 h-4 text-[#1b4332]" />
                    Share my contact details with box-mates
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When enabled, your name, email address, and phone number (if provided) will be visible to the other players in your box to help arrange matches.
                  </p>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveContact}
                  disabled={updateContactMutation.isPending}
                  className="bg-[#1b4332] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#163728] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {updateContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Account Info Card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#c9a84c]" />
            <h2 className="font-serif text-xl font-bold text-[#1b4332]">Account Information</h2>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Account type</dt>
                <dd className="font-semibold text-gray-800 capitalize">{user?.role ?? "user"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">User ID</dt>
                <dd className="font-mono text-gray-600">{user?.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Signed in as</dt>
                <dd className="text-gray-800">{user?.email}</dd>
              </div>
            </dl>
          </div>
        </div>

      </div>
    </div>
  );
}
