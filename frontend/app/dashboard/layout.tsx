"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Key, Settings, User } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";
import { WaylineLogo } from "@/components/ui";

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
    pathname === "/dashboard/keys"
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
        <div className="flex flex-col items-center gap-7 w-full">
          
          {/* Logo container */}
          <Link href="/" className="hover:opacity-90 transition-all p-1" title="Wayline Home">
            <WaylineLogo size="sm" showText={false} variant="app-icon-dark" />
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-3 w-full">
            <Link 
              href="/dashboard" 
              title="Overview & Map Console"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>

            <Link 
              href="/dashboard/keys" 
              title="API Keys"
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard/keys" 
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20" 
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
                  ? "text-accent-purple bg-accent-purple-muted border border-accent-purple/20" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              }`}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </nav>
        </div>

        {/* Bottom Avatar Indicator -> Links to Profile Settings */}
        <Link
          href="/dashboard/settings"
          title="Account Settings"
          className="w-9 h-9 rounded-full bg-accent-purple-muted border border-accent-purple/20 flex items-center justify-center text-xs font-bold text-accent-purple hover:border-accent-purple transition-all"
        >
          {userInitials || "AD"}
        </Link>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-16 min-h-screen flex flex-col">
        
        {/* Top Header */}
        <header className="bg-bg-base/80 backdrop-blur-md border-b border-border-subtle h-16 flex items-center justify-between px-6 sm:px-8 select-none sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted">wayline /</span>
            <h1 className="text-sm font-bold tracking-tight text-text-primary">{sectionTitle}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Clickable User Profile Widget -> Links to Settings */}
            <Link
              href="/dashboard/settings"
              title="Manage Profile & Settings"
              className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-bg-surface border border-transparent hover:border-border-subtle transition-all cursor-pointer group"
            >
              <div className="text-right flex flex-col justify-center">
                <span className="text-xs font-bold text-text-primary leading-tight group-hover:text-accent-purple transition-colors">
                  {userName}
                </span>
                <span className="text-[10px] text-text-muted font-medium leading-tight">
                  Field Team · Pro
                </span>
              </div>

              {/* Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-accent-purple-muted border border-accent-purple/30 flex items-center justify-center text-xs font-bold text-accent-purple group-hover:scale-105 transition-transform">
                {userInitials || "AD"}
              </div>
            </Link>

            <div className="h-4 w-[1px] bg-border-subtle" />

            {/* Sign Out Action */}
            <SignOutButton />
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