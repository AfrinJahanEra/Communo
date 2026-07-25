import { useContext, useEffect } from "react";
import { SocketContext } from "../context/contexts";
import { getSocket } from "../lib/socket";

/** { ready } — true once the authenticated socket is connected. */
export const useSocket = () => useContext(SocketContext);

/**
 * Subscribes to a socket event while the socket is connected.
 * `handler` is kept fresh via the deps array of the calling component.
 */
export const useSocketEvent = (event, handler, deps = []) => {
  const { ready } = useSocket();
  useEffect(() => {
    const socket = getSocket();
    if (!ready || !socket) return undefined;
    socket.on(event, handler);
    return () => socket.off(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, event, ...deps]);
};
