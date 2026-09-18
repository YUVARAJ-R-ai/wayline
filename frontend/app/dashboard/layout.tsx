"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Map, BarChart3, Key, Settings, LogOut, ShieldCheck } from "lucide-react";
import { WaylineLogo } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      const loginUrl = pathname 
        ? `/login?callbackUrl=${encodeURIComponent(pathname)}`
        : "/login";
      router.replace(loginUrl);
    }
  }, [status, router, pathname]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base text-text-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-purple border-t-transparent" />
      </div>
    );
  }

  // Determine section breadcrumb/title based on path
  const sectionTitle =
    pathname === "/dashboard/explorer"
      ? "Spatial Explorer & Layers"
      : pathname === "/dashboard/analytics"
      ? "Usage Analytics & Telemetry"
      : pathname === "/dashboard/keys"
      ? "API Keys"
      : pathname === "/dashboard/settings"
      ? "Settings & Profile"
      : "Console Overview";

  // Initials for avatar
  const userName = session?.user?.name || "Admin";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex relative transition-colors duration-200">
      
      {/* Side Navigation Rail */}
      <aside className="w-16 h-screen bg-bg-surface border-r border-border-subtle flex flex-col items-center py-5 justify-between flex-shrink-0 z-20 fixed left-0 top-0 select-none">
        <div className="flex flex-col items-center gap-6 w-full">
          
          {/* Logo container */}
          <Link href="/" className="hover:opacity-90 transition-all p-1" title="Wayline Home">
            <WaylineLogo size="sm" showText={false} variant="default" />
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-2.5 w-full">
            <Link 
              href="/dashboard" 
              title="Overview & Console"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20 shadow-xs" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>

            <Link 
              href="/dashboard/explorer" 
              title="Spatial Layers & Explorer"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard/explorer" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20 shadow-xs" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <Map className="w-5 h-5" />
            </Link>

            <Link 
              href="/dashboard/analytics" 
              title="Usage Analytics & Telemetry"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard/analytics" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20 shadow-xs" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </Link>

            <Link 
              href="/dashboard/keys" 
              title="API Keys"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard/keys" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20 shadow-xs" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <Key className="w-5 h-5" />
            </Link>

            <Link 
              href="/dashboard/settings" 
              title="Settings & Profile"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard/settings" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20 shadow-xs" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </nav>
        </div>

        {/* Bottom Rail Action: Sign Out */}
        <div className="flex flex-col items-center gap-2.5 w-full pt-4 border-t border-border-subtle/80">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign Out"
            className="p-2.5 rounded-xl text-text-muted hover:text-status-error hover:bg-status-error/10 transition-all flex items-center justify-center group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-16 min-h-screen flex flex-col">
        
        {/* Top Header */}
        <header className="bg-bg-base/80 backdrop-blur-md border-b border-border-subtle h-16 flex items-center justify-between px-6 sm:px-8 select-none sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted">wayline /</span>
            <h1 className="text-sm font-bold tracking-tight text-text-primary">{sectionTitle}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle (Dark / Light) */}
            <ThemeToggle />

            {/* Premium Standalone User Profile Pill */}
            <Link
              href="/dashboard/settings"
              title="Manage Profile & Settings"
              className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-bg-surface/90 hover:bg-bg-surface border border-border-default/80 hover:border-accent-purple/40 transition-all cursor-pointer shadow-xs group"
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-accent-purple text-btn-primary-text flex items-center justify-center text-[11px] font-bold shadow-xs">
                  {userInitials || "AD"}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-status-success ring-2 ring-bg-surface" />
              </div>

              <div className="flex flex-col text-left pr-1">
                <span className="text-xs font-bold text-text-primary leading-none group-hover:text-accent-purple transition-colors">
                  {userName}
                </span>
                <span className="text-[10px] text-text-muted font-medium flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-accent-purple" />
                  <span>Pro Plan</span>
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="p-6 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}