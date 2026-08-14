import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./contexts";
import { refreshSession, setAccessToken } from "../lib/api";
import * as authService from "../services/authService";
import { disconnectSocket } from "../lib/socket";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore the session from the refresh-token cookie on first load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
        const data = await authService.getMe();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload) => {
    const data = await authService.login(payload);
    setUser(data.user);
    return data.user;
  }, []);

  /**
   * Returns the full response rather than the user: when verification is
   * required no session exists yet, so the caller redirects to /check-email
   * instead of into the app.
   */
  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    if (data.accessToken) setUser(data.user);
    return data;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const data = await authService.verifyEmail(token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await authService.googleLogin(credential);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      setAccessToken(null); // even if the request fails, drop the session locally
    }
    disconnectSocket();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, booting, login, register, verifyEmail, loginWithGoogle, logout, setUser }),
    [user, booting, login, register, verifyEmail, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};