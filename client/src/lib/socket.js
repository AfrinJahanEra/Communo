import { io } from "socket.io-client";
import { getAccessToken } from "./api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/api.*$/, "");

let socket = null;

/** Connects (or reconnects) the singleton socket with the current token. */
export const connectSocket = () => {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() },
    transports: ["websocket"],
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** emit wrapped in a promise resolving the server ack ({success, ...}). */
export const emitAck = (event, payload) =>
  new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ success: false, message: "Not connected" });
      return;
    }
    const timer = setTimeout(
      () => resolve({ success: false, message: "Request timed out" }),
      8000
    );
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack ?? { success: true });
    });
  });
