"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Key, Map, BarChart3 } from "lucide-react";
import { SignOutButton } from "@/components/SignOutButton";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-purple"></div>
      </div>
    );
  }

  // Determine page title based on path
  const pageTitle = pathname === "/dashboard/keys" ? "API Keys" : "Overview";

  // Initials for avatar
  const userName = session?.user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex relative transition-colors duration-200">
      
      {/* Side Navigation Rail */}
      <aside className="w-16 h-screen bg-bg-surface border-r border-border-subtle flex flex-col items-center py-6 justify-between flex-shrink-0 z-20 fixed left-0 top-0 select-none">
        <div className="flex flex-col items-center gap-8 w-full">
          
          {/* Logo container */}
          <Link href="/" className="border border-accent-purple/35 text-accent-purple p-2 rounded-xl flex items-center justify-center bg-accent-purple/5 hover:scale-105 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <rect width="18" height="18" x="3" y="3" rx="4" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
              <polygon points="12,9 13.5,12 12,15 10.5,12" fill="currentColor" fillOpacity={0.1} />
              <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" />
              <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-4 w-full">
            <Link 
              href="/dashboard" 
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard" 
                  ? "text-accent-purple bg-accent-purple/5" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated/50"
              }`}
            >
              {pathname === "/dashboard" && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent-purple rounded-r-md" />
              )}
              <LayoutGrid className="w-5 h-5" />
            </Link>

            <Link 
              href="/dashboard/keys" 
              className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center ${
                pathname === "/dashboard/keys" 
                  ? "text-accent-purple bg-accent-purple/5" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated/50"
              }`}
            >
              {pathname === "/dashboard/keys" && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent-purple rounded-r-md" />
              )}
              <Key className="w-5 h-5" />
            </Link>

            <div className="relative p-2.5 rounded-xl text-text-disabled cursor-not-allowed flex items-center justify-center">
              <Map className="w-5 h-5 opacity-40" />
            </div>

            <div className="relative p-2.5 rounded-xl text-text-disabled cursor-not-allowed flex items-center justify-center">
              <BarChart3 className="w-5 h-5 opacity-40" />
            </div>
          </nav>
        </div>

        {/* Bottom Avatar Indicator */}
        <div className="w-9 h-9 rounded-full border border-border-default/60 flex items-center justify-center text-xs font-semibold text-text-secondary select-none">
          {userInitials || "WL"}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-16 min-h-screen flex flex-col">
        
        {/* Top Header */}
        <header className="bg-bg-base border-b border-border-subtle/50 h-16 flex items-center justify-between px-8 select-none">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">{pageTitle}</h1>
          
          <div className="flex items-center gap-4">
            
            {/* User Profile Info */}
            <div className="text-right flex flex-col justify-center">
              <span className="text-sm font-bold text-text-primary leading-tight">{userName}</span>
              <span className="text-xs text-text-secondary font-medium leading-tight">Field Team · Pro</span>
            </div>

            {/* Avatar Circle */}
            <div className="w-9 h-9 rounded-full bg-accent-purple/5 border border-accent-purple/20 flex items-center justify-center text-xs font-semibold text-accent-purple">
              {userInitials || "WL"}
            </div>

            {/* Sign Out Action */}
            <SignOutButton />
          </div>
        </header>

        {/* Page Content Container */}
        <main className="p-8 flex-1 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}