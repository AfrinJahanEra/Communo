/**
 * Wraps async route handlers so rejected promises
 * are forwarded to the centralized error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
