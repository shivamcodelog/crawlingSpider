import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Public route — after Google OAuth, the backend redirects here with ?token=...
 * We save the token then forward to /dashboard.
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      navigate("/login?error=auth_failed", { replace: true });
      return;
    }

    if (token) {
      login(token);
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-8 h-8 text-primary mx-auto mb-4 animate-pulse" />
        <p className="font-mono text-sm text-muted">Signing you in…</p>
      </div>
    </div>
  );
}
