/**
 * Holds the Socket.IO server instance so the service layer can broadcast
 * without importing the HTTP bootstrap (avoids circular imports).
 */
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;
