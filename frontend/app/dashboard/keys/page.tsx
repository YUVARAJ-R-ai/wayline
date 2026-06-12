"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage API Keys</h2>
        <button
          onClick={handleGenerateKey}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          Generate New Key
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Keys</h3>
          <p className="mt-1 text-sm text-gray-500">
            Below is the list of your active API keys. Use these keys to authenticate your geocoding and routing requests.
          </p>
        </div>

        {keys.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No API keys found. Click the button above to generate your first key.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Prefix
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Count
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {key.prefix}xxxxxx
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.usage_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteKey(key.prefix)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for new key display */}
      {showModal && newKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">API Key Generated</h3>
            
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm space-y-1">
              <p className="font-semibold">Important:</p>
              <p>Copy this API key now. For security reasons, you will not be able to see it again.</p>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <span className="font-mono text-sm break-all select-all flex-1 text-gray-900">{newKey}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  alert("Copied to clipboard!");
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-xs font-medium rounded transition-colors"
              >
                Copy
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewKey(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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