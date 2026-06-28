"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";

interface ApiKey {
  id: number;
  prefix: string;
  created_at: string;
  usage_count: number;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
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
    }
  }, [status, token]);

  // Generate a key
  const handleGenerateKey = async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await fetch(`${apiBaseUrl}/api/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("wayline_api_key", data.key);
        }
        setShowModal(true);
        fetchKeys(); // Refresh list
      } else {
        setError("Failed to generate API key.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the API key.");
    }
  };

  // Delete a key
  const handleDeleteKey = async (prefix: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete key prefix ${prefix}?`)) return;
    try {
      setError(null);
      const res = await fetch(`${apiBaseUrl}/api/keys/${prefix}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchKeys(); // Refresh list
      } else {
        setError("Failed to delete API key.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting the API key.");
    }
  };

  if (status === "loading" || (status === "authenticated" && loading && keys.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg shadow">
        Access Denied. Please log in to manage API keys.
      </div>
    );
  }

  const mockTitles = ["Production server", "Staging", "CI pipeline"];
  const mockLocations = ["Mumbai edge", "Frankfurt edge", "N. Virginia edge"];

  return (
    <div className="space-y-6">
      
      {/* Title & Generate action */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Your waypoints</h2>
          <p className="text-sm text-text-secondary mt-1">Every key is a waypoint — manage authentication</p>
        </div>
        <button
          onClick={handleGenerateKey}
          className="px-5 py-2.5 bg-accent-purple text-btn-primary-text font-semibold rounded-xl hover:opacity-90 shadow-sm transition-all text-sm flex items-center justify-center"
        >
          + Generate New Key
        </button>
      </div>

      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Keys list and search container */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-glass p-6">
        
        {/* Search input for keys */}
        <div className="relative mb-6 max-w-xl">
          <input
            type="text"
            placeholder="Search keys..."
            className="w-full rounded-xl bg-bg-base border border-border-default py-2.5 pl-11 pr-4 text-text-primary placeholder-text-muted/65 outline-none text-sm focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-text-muted" />
        </div>

        {keys.length === 0 ? (
          <div className="p-12 text-center text-text-muted select-none">
            No API keys found. Click the button above to generate your first key.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {keys.map((key, index) => {
              const title = mockTitles[index % mockTitles.length];
              const location = mockLocations[index % mockLocations.length];
              
              return (
                <div 
                  key={key.id} 
                  className="p-5 bg-bg-base border border-border-subtle rounded-2xl flex flex-col md:flex-row md:items-center justify-between shadow-sm relative pl-6 pr-6 gap-4"
                >
                  {/* Left green active indicator stripe */}
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-status-success rounded-l-2xl" />

                  {/* Key metadata & Title */}
                  <div className="flex flex-col gap-1.5 select-none">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-text-primary text-base">{title}</span>
                      <span className="text-xs font-semibold text-text-secondary bg-bg-elevated px-2.5 py-0.5 rounded-full border border-border-subtle/50">
                        {location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Last ping {key.usage_count > 0 ? `${key.usage_count} min ago` : "never"}</span>
                    </div>
                  </div>

                  {/* Key prefix, status and actions */}
                  <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                    
                    {/* Key token wrapper */}
                    <span className="font-mono text-xs bg-bg-elevated px-3 py-1.5 rounded-xl border border-border-subtle text-text-secondary select-all select-none">
                      {key.prefix}••••••••
                    </span>

                    {/* Status Badge */}
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-status-success/10 text-status-success border border-status-success/20 select-none">
                      ACTIVE
                    </span>

                    {/* Delete Action button */}
                    <button
                      onClick={() => handleDeleteKey(key.prefix)}
                      className="text-status-error hover:opacity-80 text-sm font-semibold transition-all select-none pl-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for new key display */}
      {showModal && newKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in scale-in duration-200">
            <h3 className="text-xl font-bold tracking-tight text-text-primary">API Key Generated</h3>
            
            <div className="p-4 bg-status-warning/10 border border-status-warning/20 text-status-warning rounded-xl text-sm space-y-1.5">
              <p className="font-bold">Important security warning:</p>
              <p className="font-medium text-text-secondary">Copy this API key now. For security reasons, you will not be able to see it again.</p>
            </div>

            <div className="flex items-center space-x-2 bg-bg-base border border-border-subtle p-3 rounded-xl">
              <span className="font-mono text-sm break-all select-all flex-1 text-text-primary px-1">{newKey}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  alert("Copied to clipboard!");
                }}
                className="px-4 py-2 bg-bg-surface border border-border-default hover:bg-bg-elevated text-xs font-bold rounded-lg text-text-primary transition-all select-none"
              >
                Copy
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewKey(null);
                }}
                className="px-5 py-2.5 bg-accent-purple hover:opacity-90 text-btn-primary-text font-semibold rounded-xl transition-all text-sm select-none"
              >
                I have saved this key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}