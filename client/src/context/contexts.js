import { createContext } from "react";

/** Context objects live here so provider files only export components (fast refresh). */
export const AuthContext = createContext(null);
export const SocketContext = createContext({ ready: false });
export const PresenceContext = createContext(null);
export const ToastContext = createContext(null);
