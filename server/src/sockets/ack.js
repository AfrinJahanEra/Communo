/** Wraps a socket handler so thrown errors become clean acks, not crashes. */
export const safe = (handler) => async (payload, ack) => {
  try {
    const result = await handler(payload);
    if (typeof ack === "function") ack({ success: true, ...result });
  } catch (err) {
    if (typeof ack === "function") {
      ack({ success: false, message: err.message || "Something went wrong" });
    }
  }
};
