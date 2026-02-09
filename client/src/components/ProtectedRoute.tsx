import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { useLocation } from "wouter";
import logoUrl from "@assets/blckbx-logo.png";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <img src={logoUrl} alt="BlckBx" className="h-16 w-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(location || "/");
    return <Redirect to={`/login?redirect=${redirectTo}`} />;
  }

  return <>{children}</>;
}
