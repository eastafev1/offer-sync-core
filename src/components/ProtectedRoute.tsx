import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'seller' | 'agent';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isSeller, isAgent, roles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) return <Navigate to="/login" replace />;

  if (profile.status === 'pending') return <Navigate to="/pending" replace />;
  if (profile.status === 'blocked') return <Navigate to="/blocked" replace />;

  if (requireRole) {
    const hasRole =
      requireRole === 'admin' ? isAdmin :
      requireRole === 'seller' ? (isSeller || isAdmin) :
      requireRole === 'agent' ? (isAgent || isSeller || isAdmin) :
      false;
    if (!hasRole) return <Navigate to="/dashboard" replace />;
  }

  if (roles.length === 0) return <Navigate to="/pending" replace />;

  return <>{children}</>;
}
