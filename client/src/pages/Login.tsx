import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function Login() {
  const { isAuthenticated, isLoading, loginWithGoogle } = useAuth();
  const redirectTarget = (() => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") || "/";
  })();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <img src={logoUrl} alt="BlckBx" className="h-16 w-auto" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to={redirectTarget} />;
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);

    try {
      // Persist requested destination so OAuth callback can restore it.
      sessionStorage.setItem("blckbx_oauth_redirect", redirectTarget);
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Authentication failed. Please try again.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F8] flex items-center justify-center p-4 font-serif">
      <Card className="w-full max-w-md rounded-[12px] bg-white border-[#DDD8D0] shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={logoUrl} alt="BlckBx" className="h-16 w-auto" data-testid="img-logo" />
          </div>
          <div>
            <CardTitle className="text-xl font-serif">BlckBx</CardTitle>
            <CardDescription className="mt-1">Tools</CardDescription>
          </div>
          <div className="pt-2">
            <h2 className="text-3xl font-semibold text-[#232220]">Welcome Back</h2>
            <p className="text-sm text-muted-foreground mt-2">Sign in to manage your itineraries</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-[8px]">
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full h-12 rounded-[8px] bg-white text-[#232220] border border-[#DDD8D0] hover:bg-[#FAF9F8] flex items-center justify-center gap-3"
            data-testid="button-login-google"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.5 3.5-5.4 3.5-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 2.9 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.8-.1-1.2H12z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground pt-2">
            Authorized personnel only
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
