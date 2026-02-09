import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "wouter";
import { pb } from "@/lib/pocketbase";
import { Loader2 } from "lucide-react";
import logoUrl from "@assets/blckbx-logo.png";

/**
 * OAuth Callback Handler
 *
 * This page handles the redirect back from Google OAuth.
 * PocketBase OAuth2 flow:
 * 1. User clicks "Sign in with Google" -> redirects to Google
 * 2. User authorizes -> Google redirects back here with code/state
 * 3. This page exchanges the code for a token
 */
export default function OAuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The URL contains the OAuth callback data (code, state)
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        console.log("OAuth callback received:", { code: code?.substring(0, 10) + "...", state });

        if (!code) {
          throw new Error("No authorization code received from OAuth provider");
        }

        // Complete the OAuth flow with PocketBase
        // PocketBase will exchange the code for an access token and create/update the user
        const authData = await pb.collection('users').authWithOAuth2(
          { provider: 'google', code, state },
          { redirectUrl: window.location.origin + '/oauth/callback' }
        );

        console.log("OAuth successful:", authData);

        setStatus("success");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          const redirectTo = sessionStorage.getItem("blckbx_oauth_redirect") || "/itinerary";
          sessionStorage.removeItem("blckbx_oauth_redirect");
          navigate(redirectTo);
        }, 500);
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setError(err.message || "Authentication failed");
        setStatus("error");
      }
    };

    handleCallback();
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <img src={logoUrl} alt="BlckBx" className="h-16 w-auto mx-auto" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-muted-foreground">Signing you in...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <img src={logoUrl} alt="BlckBx" className="h-16 w-auto mx-auto" />
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            <p className="font-medium">Sign In Failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Success - will redirect automatically
  return null;
}
