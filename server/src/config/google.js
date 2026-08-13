import { OAuth2Client } from "google-auth-library";
import env from "./env.js";
import ApiError from "../utils/ApiError.js";

let client = null;

const getClient = () => {
  if (!client) client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return client;
};

/**
 * Verifies a Google ID token (the `credential` string the browser receives
 * from Google Sign-In). Checks the signature against Google's public keys,
 * the audience (our client ID) and the expiry — so a forged or replayed
 * token from another app is rejected.
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!env.isGoogleConfigured) {
    throw new ApiError(503, "Google sign-in is not configured on this server");
  }

  let payload;
  try {
    const ticket = await getClient().verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized("Invalid Google credential");
  }

  if (!payload?.sub || !payload.email) {
    throw ApiError.unauthorized("Google account did not provide an email address");
  }

  // Google tells us whether it has verified the address itself. We rely on
  // this before trusting the email to match an existing local account.
  if (payload.email_verified === false) {
    throw ApiError.unauthorized("Your Google email address is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || "",
    picture: payload.picture || "",
  };
};