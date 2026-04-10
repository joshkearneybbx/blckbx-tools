import type { ReactNode } from "react";
import { Redirect } from "wouter";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";
import type { ToolSlug } from "@/lib/tool-access";

interface ToolGuardProps {
  slug: ToolSlug;
  children: ReactNode;
}

export default function ToolGuard({ slug, children }: ToolGuardProps) {
  const { isAuthenticated, hasAccess, isLoading } = useAuth();

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
    return <Redirect to="/login" replace />;
  }

  if (!hasAccess(slug)) {
    return <Redirect to="/" replace />;
  }

  return <>{children}</>;
}
