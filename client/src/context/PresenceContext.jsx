import { useCallback, useEffect, useMemo, useState } from "react";
import { PresenceContext } from "./contexts";
import { emitAck, getSocket } from "../lib/socket";
import { getFriendsPresence } from "../services/friendService";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";

/**
 * Global presence map: userId → { status, lastSeenAt }.
 * Seeded from GET /friends/presence, kept live via `presence:update`.
 * Server-member presence is merged in by views via `prime()`.
 */
export const PresenceProvider = ({ children }) => {
  const { user } = useAuth();
  const { ready } = useSocket();
  const [presences, setPresences] = useState({});

  useEffect(() => {
    if (!ready || !user?._id) return undefined;
    let stale = false;

    getFriendsPresence()
      .then((list) => {
        if (stale) return;
        setPresences((prev) => {
          const next = { ...prev };
          list.forEach((p) => {
            next[p.userId] = { status: p.status, lastSeenAt: p.lastSeenAt };
          });
          return next;
        });
      })
      .catch(() => {});

    const socket = getSocket();
    const onUpdate = ({ userId, status, lastSeenAt }) => {
      setPresences((prev) => ({ ...prev, [userId]: { status, lastSeenAt } }));
    };
    socket.on("presence:update", onUpdate);
    return () => {
      stale = true;
      socket.off("presence:update", onUpdate);
    };
  }, [ready, user?._id]);

  /** Merge a presence list fetched elsewhere (e.g. server presence). */
  const prime = useCallback((list = []) => {
    setPresences((prev) => {
      const next = { ...prev };
      list.forEach((p) => {
        next[p.userId] = { status: p.status, lastSeenAt: p.lastSeenAt };
      });
      return next;
    });
  }, []);

  const statusOf = useCallback(
    (userId) => presences[String(userId)]?.status || "offline",
    [presences]
  );

  const lastSeenOf = useCallback(
    (userId) => presences[String(userId)]?.lastSeenAt || null,
    [presences]
  );

  // Own devices receive their presence:update too, so this stays in sync.
  const myId = user?._id;
  const myStatus = myId ? statusOf(myId) : "offline";

  const setMyStatus = useCallback(
    async (status) => {
      const ack = await emitAck("presence:set", { status });
      if (ack?.success !== false && myId) {
        setPresences((prev) => ({
          ...prev,
          [String(myId)]: { status, lastSeenAt: null },
        }));
      }
      return ack;
    },
    [myId]
  );

  const value = useMemo(
    () => ({ presences, statusOf, lastSeenOf, prime, myStatus, setMyStatus }),
    [presences, statusOf, lastSeenOf, prime, myStatus, setMyStatus]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};
