import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SpiderIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="4" fill="#e8e8e8" />
    <line x1="14" y1="10" x2="14" y2="2" stroke="#555" strokeWidth="1" />
    <line x1="14" y1="18" x2="14" y2="26" stroke="#555" strokeWidth="1" />
    <line x1="10" y1="14" x2="2" y2="14" stroke="#555" strokeWidth="1" />
    <line x1="18" y1="14" x2="26" y2="14" stroke="#555" strokeWidth="1" />
    <line x1="11.2" y1="11.2" x2="5.5" y2="5.5" stroke="#444" strokeWidth="1" />
    <line x1="16.8" y1="16.8" x2="22.5" y2="22.5" stroke="#444" strokeWidth="1" />
    <line x1="16.8" y1="11.2" x2="22.5" y2="5.5" stroke="#444" strokeWidth="1" />
    <line x1="11.2" y1="16.8" x2="5.5" y2="22.5" stroke="#444" strokeWidth="1" />
  </svg>
);

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("google"); // "google" | "email"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await client.post("/auth/login", { email, password });
      if (data.success) {
        login(data.data.token);
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded p-10 max-w-md w-full text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <SpiderIcon />
          <span className="font-mono text-2xl font-bold">
            Shizuku<span className="text-[#555]">8</span>
          </span>
        </div>

        <h1 className="font-mono text-section text-textPrimary mb-3">
          Welcome Back
        </h1>
        <p className="font-sans text-body text-muted mb-6">
          Sign in to access your scraping dashboard
        </p>

        {/* Tab switcher */}
        <div className="flex rounded overflow-hidden border border-border mb-6 cursor-target">
          <button
            onClick={() => { setTab("google"); setError(""); }}
            className={`cursor-target flex-1 py-2 text-xs font-mono transition-colors ${
              tab === "google" ? "bg-white text-black font-bold" : "text-muted hover:text-textPrimary"
            }`}
          >
            Google
          </button>
          <button
            onClick={() => { setTab("email"); setError(""); }}
            className={`cursor-target flex-1 py-2 text-xs font-mono transition-colors ${
              tab === "email" ? "bg-white text-black font-bold" : "text-muted hover:text-textPrimary"
            }`}
          >
            Email / Password
          </button>
        </div>

        {tab === "google" ? (
          <button
            onClick={handleGoogleLogin}
            className="cursor-target w-full flex items-center justify-center gap-3 py-4 rounded bg-white text-gray-800 font-mono text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        ) : (
          <form onSubmit={handleEmailLogin} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-mono text-muted mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="cursor-target w-full bg-bg border border-border rounded pl-9 pr-3 py-3 text-sm font-mono text-textPrimary placeholder-muted focus:outline-none focus:border-[#3a3a3a]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="cursor-target w-full bg-bg border border-border rounded pl-9 pr-9 py-3 text-sm font-mono text-textPrimary placeholder-muted focus:outline-none focus:border-[#3a3a3a]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="cursor-target absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-textPrimary"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-400 text-xs font-mono bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="cursor-target w-full flex items-center justify-center gap-2 py-3 rounded bg-white text-black font-mono text-sm font-bold hover:bg-[#e5e5e5] transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        <p className="mt-6 font-sans text-xs text-muted">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
