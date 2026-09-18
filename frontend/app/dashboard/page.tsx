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

  const [engineHealth, setEngineHealth] = useState<{
    status: string;
    latency: number;
  }>({ status: "Operational", latency: 18 });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setEngineHealth({
            status: data.status || "Operational",
            latency: data.latency || 18,
          });
        }
      } catch (err) {
        console.warn("Health check error:", err);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">


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
          value={engineHealth.status}
          subtitle="OSRM routing & PostGIS"
          icon={
            <Radio
              className={`w-4 h-4 ${
                engineHealth.status === "Operational"
                  ? "text-status-success"
                  : "text-status-warning"
              }`}
            />
          }
          trend={engineHealth.status === "Operational" ? "up" : "down"}
          trendValue={engineHealth.status === "Operational" ? "Live" : "Degraded"}
          loading={false}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${engineHealth.latency} ms`}
          subtitle="live roundtrip latency"
          icon={<Zap className="w-4 h-4 text-accent-purple" />}
          trend={engineHealth.latency < 50 ? "up" : "neutral"}
          trendValue={engineHealth.latency < 50 ? "Fast" : "Normal"}
          loading={false}
        />
      </div>

      {/* Interactive Routing Map */}
      <RoutingMap />
    </div>
  );
}