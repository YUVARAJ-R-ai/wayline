"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Search, Plus, Copy, Check, Trash2, Key, ShieldAlert } from "lucide-react";
import { PremiumButton, Badge, Modal, Toast } from "@/components/ui";

interface ApiKey {
  id: number;
  prefix: string;
  created_at: string;
  usage_count: number;
  label?: string;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingPrefix, setDeletingPrefix] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & notification states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const token = (session?.user as any)?.accessToken;

  // Fetch keys
  const fetchKeys = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBaseUrl}/api/keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      } else {
        setError("Failed to retrieve API keys.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && token) {
      fetchKeys();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, token]);

  // Generate Key action
  const handleCreateKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    try {
      setGenerating(true);
      setError(null);
      const res = await fetch(`${apiBaseUrl}/api/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: keyLabel.trim() || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        setKeyLabel("");
        fetchKeys();
        setToastMessage("API key generated successfully");
      } else {
        setError("Failed to generate API key.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the API key.");
    } finally {
      setGenerating(false);
    }
  };

  // Delete key action
  const handleDeleteKey = async (prefix: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to revoke key ${prefix}••••••••? This action cannot be undone.`)) return;

    try {
      setDeletingPrefix(prefix);
      setError(null);
      const res = await fetch(`${apiBaseUrl}/api/keys/${prefix}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.prefix !== prefix));
        setToastMessage(`Key ${prefix} revoked successfully`);
      } else {
        setError("Failed to delete API key.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting the API key.");
    } finally {
      setDeletingPrefix(null);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setToastMessage("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredKeys = useMemo(() => {
    if (!searchQuery.trim()) return keys;
    const q = searchQuery.toLowerCase();
    return keys.filter(
      (k) =>
        k.prefix.toLowerCase().includes(q) ||
        (k.label && k.label.toLowerCase().includes(q))
    );
  }, [keys, searchQuery]);

  const mockWaypointTitles = ["Production Primary", "Staging Cluster", "Edge Gateway", "CI / Test Suite"];

  if (status === "loading" || (status === "authenticated" && loading && keys.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-purple border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6 bg-status-error/10 border border-status-error/20 text-status-error rounded-2xl">
        Access Denied. Please log in to manage API keys.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <Toast
        isOpen={Boolean(toastMessage)}
        message={toastMessage || ""}
        onClose={() => setToastMessage(null)}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Your waypoints
            </h2>
            <Badge variant="accent" size="sm">
              {keys.length} {keys.length === 1 ? "active key" : "active keys"}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Every key is an authenticated waypoint for routing & geocoding endpoints
          </p>
        </div>

        <PremiumButton
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setGeneratedKey(null);
            setIsCreateModalOpen(true);
          }}
        >
          + Generate New Key
        </PremiumButton>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Keys Container */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keys by prefix or name..."
              className="w-full rounded-xl bg-bg-base border border-border-default py-2 pl-10 pr-4 text-xs sm:text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
            />
          </div>
        </div>

        {/* Empty State */}
        {keys.length === 0 ? (
          <div className="p-12 text-center select-none space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-bg-elevated border border-border-subtle flex items-center justify-center mx-auto text-text-muted">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">No API keys yet</h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-sm mx-auto">
                Generate your first API key waypoint to authenticate routing and map engine requests.
              </p>
            </div>
            <PremiumButton
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setGeneratedKey(null);
                setIsCreateModalOpen(true);
              }}
            >
              Generate First Key
            </PremiumButton>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-12 text-center text-text-muted text-sm select-none">
            No keys matched &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          /* Sleek Minimalist Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-text-muted bg-bg-base/50 select-none">
                  <th className="py-3.5 px-5">Name / Waypoint</th>
                  <th className="py-3.5 px-5">Key Prefix</th>
                  <th className="py-3.5 px-5">Created</th>
                  <th className="py-3.5 px-5">Usage</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {filteredKeys.map((k, index) => {
                  const title = k.label || mockWaypointTitles[index % mockWaypointTitles.length];

                  return (
                    <tr
                      key={k.id}
                      className="hover:bg-bg-elevated/40 transition-colors group"
                    >
                      {/* Name / Waypoint */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-text-primary group-hover:text-accent-purple transition-colors">
                          {title}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          ID #{k.id}
                        </div>
                      </td>

                      {/* Key Prefix Monospace Pill */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded-lg px-2.5 py-1 text-xs font-mono text-text-secondary select-all">
                          <span>{k.prefix}••••••••</span>
                          <button
                            onClick={() => handleCopy(`${k.prefix}`, `prefix-${k.id}`)}
                            title="Copy prefix"
                            className="text-text-muted hover:text-text-primary transition-colors p-0.5"
                          >
                            {copiedKey === `prefix-${k.id}` ? (
                              <Check className="w-3 h-3 text-status-success" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-5 text-xs text-text-secondary select-none">
                        {new Date(k.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-5 text-xs text-text-secondary select-none">
                        <span className="font-medium text-text-primary">
                          {k.usage_count.toLocaleString()}
                        </span>{" "}
                        calls
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <Badge variant="success" size="sm">
                          ACTIVE
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <PremiumButton
                          variant="danger"
                          size="sm"
                          loading={deletingPrefix === k.prefix}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => handleDeleteKey(k.prefix)}
                        >
                          Revoke
                        </PremiumButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Reveal Key Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setGeneratedKey(null);
        }}
        title={generatedKey ? "API Key Generated" : "Generate New Waypoint Key"}
        description={
          generatedKey
            ? "Your new API key is ready. Copy and store it securely."
            : "Create an authenticated API key to access Wayline routing and mapping APIs."
        }
      >
        {!generatedKey ? (
          <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5 select-none">
                Key Label / Purpose (Optional)
              </label>
              <input
                type="text"
                value={keyLabel}
                onChange={(e) => setKeyLabel(e.target.value)}
                placeholder="e.g., Production Backend, Mobile App, CI"
                className="w-full rounded-xl bg-bg-base border border-border-default py-2.5 px-3.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <PremiumButton
                variant="ghost"
                size="md"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </PremiumButton>
              <PremiumButton
                type="submit"
                variant="primary"
                size="md"
                loading={generating}
              >
                Generate Key
              </PremiumButton>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Security Warning */}
            <div className="p-4 bg-status-warning/10 border border-status-warning/20 text-status-warning rounded-xl text-xs sm:text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Important Security Notice</p>
                <p className="text-text-secondary mt-0.5">
                  Save this key in your environment variables now. For security reasons, it will never be displayed again.
                </p>
              </div>
            </div>

            {/* Key Box */}
            <div className="flex items-center gap-2 bg-bg-base border border-border-default p-2.5 rounded-xl">
              <span className="font-mono text-xs sm:text-sm break-all select-all flex-1 text-text-primary px-1.5">
                {generatedKey}
              </span>
              <PremiumButton
                variant="secondary"
                size="sm"
                icon={
                  copiedKey === "full-key" ? (
                    <Check className="w-3.5 h-3.5 text-status-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )
                }
                onClick={() => handleCopy(generatedKey, "full-key")}
              >
                {copiedKey === "full-key" ? "Copied" : "Copy"}
              </PremiumButton>
            </div>

            <div className="flex justify-end pt-2">
              <PremiumButton
                variant="primary"
                size="md"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setGeneratedKey(null);
                }}
              >
                I have saved this key
              </PremiumButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}