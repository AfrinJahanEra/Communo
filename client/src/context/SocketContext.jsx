import { useEffect, useMemo, useState } from "react";
import { SocketContext } from "./contexts";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { getAccessToken, refreshSession } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user?._id) return undefined;

    const sock = connectSocket();
    const onConnect = () => setReady(true);
    const onDisconnect = () => setReady(false);
    // Expired token on (re)connect → refresh and retry with the new one.
    const onConnectError = async () => {
      try {
        await refreshSession();
        sock.auth = { token: getAccessToken() };
        sock.connect();
      } catch {
        /* refresh failed — the HTTP layer will surface the logged-out state */
      }
    };
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("connect_error", onConnectError);

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off("connect_error", onConnectError);
      disconnectSocket();
      setReady(false);
    };
  }, [user?._id]);

  const value = useMemo(() => ({ ready }), [ready]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
