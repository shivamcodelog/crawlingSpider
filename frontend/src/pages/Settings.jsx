import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Key, Copy, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import Sidebar from "../components/Sidebar";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { data } = await client.put("/api/user/profile", { name });
      if (data.success) {
        setMessage("Profile updated successfully.");
        await refreshUser();
      } else {
        setMessage(data.message || "Failed to update profile.");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // TODO: This is a client-side placeholder only.
  // Production implementation should generate and persist
  // API keys server-side via POST /api/user/api-key
  // and store them hashed in the database.
  const generateApiKey = () => {
    // Generate a random API key (in production this would be done server-side)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "msp_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiKey(key);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="pt-16 lg:pt-4 lg:ml-64 p-6 max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl"
        >
          <h1 className="font-mono text-section text-textPrimary mb-2">
            Settings
          </h1>
          <p className="font-sans text-body text-muted mb-8">
            Manage your profile and API access.
          </p>

          {/* Profile Section */}
          <div className="bg-surface border border-border rounded p-6 mb-8">
            <h2 className="font-mono text-card text-textPrimary mb-6">
              Profile
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-16 h-16 rounded-full border-2 border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center font-mono text-primary text-2xl font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-mono text-sm text-textPrimary">
                    {user?.email}
                  </p>
                  <p className="font-mono text-xs text-muted capitalize">
                    {user?.plan} plan
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-mono text-caption uppercase text-muted tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg border border-border rounded px-4 py-3 font-mono text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block font-mono text-caption uppercase text-muted tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-bg border border-border rounded px-4 py-3 font-mono text-sm text-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted font-sans mt-1">
                  Email is managed by your Google account.
                </p>
              </div>

              {message && (
                <p
                  className={`font-mono text-sm ${
                    message.includes("success") ? "text-success" : "text-error"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-bg rounded font-mono text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* API Keys Section */}
          <div className="bg-surface border border-border rounded p-6">
            <h2 className="font-mono text-card text-textPrimary mb-2">
              API Keys
            </h2>
            <p className="font-sans text-sm text-muted mb-6">
              {user?.plan === "enterprise"
                ? "Generate API keys for programmatic access."
                : "API access is available on the Enterprise plan."}
            </p>

            {user?.plan === "enterprise" ? (
              <div className="space-y-4">
                {apiKey && (
                  <div className="flex items-center gap-2 bg-bg border border-border rounded px-4 py-3">
                    <Key className="w-4 h-4 text-primary flex-shrink-0" />
                    <code className="font-mono text-sm text-textPrimary flex-1 truncate">
                      {apiKey}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4 text-muted" />
                    </button>
                    {copied && (
                      <span className="font-mono text-xs text-success">
                        Copied!
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={generateApiKey}
                  className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded font-mono text-sm hover:bg-primary/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {apiKey ? "Regenerate Key" : "Generate API Key"}
                </button>
              </div>
            ) : (
              <div className="bg-bg border border-border rounded p-4 text-center">
                <p className="font-mono text-sm text-muted mb-2">
                  🔒 Enterprise Feature
                </p>
                <a
                  href="/billing"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  Upgrade to Enterprise →
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
