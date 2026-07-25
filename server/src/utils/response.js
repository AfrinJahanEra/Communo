/**
 * Uniform success envelope: { success, message, ...payload }
 * Payload keys are spread at the top level (e.g. { user }, { servers })
 * so clients can read response fields directly.
 */
export const sendResponse = (res, statusCode, message, payload = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...payload,
  });
};

export const sendCreated = (res, message, payload = {}) =>
  sendResponse(res, 201, message, payload);

export const sendOk = (res, message, payload = {}) =>
  sendResponse(res, 200, message, payload);
