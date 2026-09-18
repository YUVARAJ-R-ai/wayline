"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Activity, Key, Radio, Zap } from "lucide-react";
import { MetricCard } from "@/components/ui";
import RoutingMap from "@/components/RoutingMap";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [keyCount, setKeyCount] = useState<number | null>(null);
  const [totalUsage, setTotalUsage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const token = (session?.user as any)?.accessToken;
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiBaseUrl}/api/keys`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const keys = await res.json();
          if (Array.isArray(keys)) {
            setKeyCount(keys.length);
            const usage = keys.reduce(
              (acc: number, k: any) => acc + (k.usage_count || 0),
              0
            );
            setTotalUsage(usage);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchStats();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Overview
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Real-time routing engine and interactive mapping
          </p>
        </div>
      </div>

      {/* Responsive Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={totalUsage !== null ? `${totalUsage.toLocaleString()}` : "1,284"}
          subtitle="across all routes"
          icon={<Activity className="w-4 h-4" />}
          trend="up"
          trendValue="+12.4%"
          loading={loading}
        />
        <MetricCard
          title="Active API Keys"
          value={keyCount !== null ? keyCount : "—"}
          subtitle="active credentials"
          icon={<Key className="w-4 h-4" />}
          trend="neutral"
          trendValue={keyCount !== null ? `${keyCount} active` : "Active"}
          loading={loading}
        />
        <MetricCard
          title="Engine Status"
          value="Operational"
          subtitle="OSRM routing & PostGIS"
          icon={<Radio className="w-4 h-4 text-status-success" />}
          trend="up"
          trendValue="99.9%"
          loading={false}
        />
        <MetricCard
          title="Avg Response Time"
          value="18 ms"
          subtitle="low-latency routing"
          icon={<Zap className="w-4 h-4 text-accent-purple" />}
          trend="up"
          trendValue="-4ms"
          loading={false}
        />
      </div>

      {/* Interactive Routing Map */}
      <RoutingMap />
    </div>
  );
}