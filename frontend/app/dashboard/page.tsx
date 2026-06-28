import RoutingMap from "@/components/RoutingMap";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
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
      <RoutingMap />
    </div>
  );
}