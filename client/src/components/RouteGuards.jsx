import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./ui/Spinner";

/** Gate for authenticated routes — waits for session bootstrap. */
export const RequireAuth = ({ children }) => {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <LoadingScreen label="Signing you in…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

/** Platform-admin gate: signed in AND role === "admin". */
export const RequireAdmin = ({ children }) => {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <LoadingScreen label="Signing you in…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin") return <Navigate to="/app" replace />;
  return children;
};
