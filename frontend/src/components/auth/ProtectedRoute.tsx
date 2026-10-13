import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserRole } from "../../types/auth";
import { useAuth } from "../../context/AuthContext";

interface Props {
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          Loading account...
        </div>
      </div>
    );
  }

 
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }


  if (allowedRoles.includes(user.role)) {
    return <Outlet />;
  }


  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "NGO") {
    return <Navigate to="/ngo" replace />;
  }

  if (user.role === "TENANT") {
    return <Navigate to="/dashboard" replace />;
  }


  return <Navigate to="/login" replace />;
}