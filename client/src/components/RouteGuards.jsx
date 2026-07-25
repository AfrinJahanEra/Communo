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

/** Keeps signed-in users out of the auth pages. */
export const RedirectIfAuth = ({ children }) => {
  const { user, booting } = useAuth();
  if (booting) return <LoadingScreen />;
  if (user) return <Navigate to="/app" replace />;
  return children;
};
