"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Shield,
  MapPin,
  Compass,
  Sliders,
  Bell,
  Save,
  Check,
  Server,
  Key,
  Globe,
  Lock,
} from "lucide-react";
import { Badge, PremiumButton, Toast } from "@/components/ui";

export default function SettingsProfilePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "routing" | "security">("profile");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(session?.user?.name || "Admin User");
  const [email, setEmail] = useState(session?.user?.email || "admin@wayline.dev");
  const [organization, setOrganization] = useState("Wayline Field Team");
  const [role, setRole] = useState("System Administrator");

  // Routing Preferences State
  const [defaultMode, setDefaultMode] = useState<"car" | "foot" | "bike">("car");
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");
  const [defaultCenter, setDefaultCenter] = useState("13.0843, 80.2705");
  const [customOsrmUrl, setCustomOsrmUrl] = useState("https://router.project-osrm.org");
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (session?.user?.name) setFullName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToastMessage("Profile settings updated successfully");
    }, 600);
  };

  const handleSaveRouting = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToastMessage("Map & routing preferences saved");
    }, 600);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setToastMessage("New passwords do not match");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToastMessage("Password updated successfully");
    }, 600);
  };

  const userInitials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none pb-4 border-b border-border-subtle">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Account & Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your personal profile, map settings, and security credentials
          </p>
        </div>
        <Badge variant="success" size="sm">
          Active Plan: Pro Enterprise
        </Badge>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 bg-bg-surface p-1 rounded-2xl border border-border-default text-xs font-semibold select-none max-w-md">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors ${
            activeTab === "profile"
              ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <User className="w-3.5 h-3.5 text-accent-purple" />
          <span>Profile</span>
        </button>
        <button
          onClick={() => setActiveTab("routing")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors ${
            activeTab === "routing"
              ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-accent-purple" />
          <span>Map & Engine</span>
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors ${
            activeTab === "security"
              ? "bg-bg-elevated text-text-primary border border-border-subtle shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-accent-purple" />
          <span>Security</span>
        </button>
      </div>

      {/* TAB 1: PROFILE INFO */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Banner Card */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-3xl shadow-sm flex flex-col sm:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 border-2 border-accent-purple/30 flex items-center justify-center text-xl font-bold text-accent-purple shadow-sm select-none">
              {userInitials || "AD"}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h3 className="text-base font-bold text-text-primary">{fullName}</h3>
              <p className="text-xs text-text-secondary">{email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-accent-purple bg-accent-purple-muted px-2 py-0.5 rounded-md border border-accent-purple/20">
                  <Shield className="w-3 h-3" /> {role}
                </span>
                <span className="text-xs text-text-muted">•</span>
                <span className="text-xs text-text-muted">{organization}</span>
              </div>
            </div>
          </div>

          {/* Form Fields Card */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-text-primary mb-3 select-none">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">Team / Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">Account Role</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <PremiumButton
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save Profile
              </PremiumButton>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: MAP & ENGINE PREFERENCES */}
      {activeTab === "routing" && (
        <form onSubmit={handleSaveRouting} className="space-y-6">
          <div className="p-6 bg-bg-surface border border-border-default rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-text-primary mb-3 select-none">
              Default Geospatial Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">
                  Default Travel Profile
                </label>
                <select
                  value={defaultMode}
                  onChange={(e: any) => setDefaultMode(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                >
                  <option value="car">Driving (Car)</option>
                  <option value="foot">Walking (Pedestrian)</option>
                  <option value="bike">Bicycle</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">Distance Units</label>
                <select
                  value={distanceUnit}
                  onChange={(e: any) => setDistanceUnit(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                >
                  <option value="km">Metric (Kilometers)</option>
                  <option value="mi">Imperial (Miles)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-text-secondary block">
                  Default Viewport Center (Lat, Lng)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={defaultCenter}
                    onChange={(e) => setDefaultCenter(e.target.value)}
                    placeholder="13.0843, 80.2705"
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-xs text-text-primary font-mono outline-none focus:border-accent-purple"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-text-secondary block">
                  Custom OSRM Backend Endpoint
                </label>
                <div className="relative">
                  <Server className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={customOsrmUrl}
                    onChange={(e) => setCustomOsrmUrl(e.target.value)}
                    placeholder="http://localhost:5000"
                    className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-9 pr-3 text-xs text-text-primary font-mono outline-none focus:border-accent-purple"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Point to your self-hosted OSRM Docker daemon or leave as default.
                </p>
              </div>
            </div>

            {/* Toggle */}
            <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-text-primary">
                  Real-time Route Telemetry Tracking
                </div>
                <div className="text-[11px] text-text-muted">
                  Record query latency and per-key usage counts for analytics
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTelemetryEnabled(!telemetryEnabled)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  telemetryEnabled
                    ? "bg-accent-purple text-btn-primary-text border-transparent"
                    : "bg-bg-elevated text-text-muted border-border-subtle"
                }`}
              >
                {telemetryEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="pt-3 flex justify-end">
              <PremiumButton
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save Engine Settings
              </PremiumButton>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === "security" && (
        <form onSubmit={handleSaveSecurity} className="space-y-6">
          <div className="p-6 bg-bg-surface border border-border-default rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-text-primary mb-3 select-none">
              Password & Authentication
            </h3>

            <div className="space-y-3 text-xs max-w-md">
              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text-secondary block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-bg-base border border-border-default py-2 px-3 text-xs text-text-primary outline-none focus:border-accent-purple"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <PremiumButton
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Update Password
              </PremiumButton>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
