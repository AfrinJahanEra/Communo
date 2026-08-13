import { GoogleLogin } from "@react-oauth/google";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Renders Google's own button. It hands back an ID token (`credential`)
 * which the backend verifies against Google's public keys.
 *
 * Renders nothing when VITE_GOOGLE_CLIENT_ID is unset, so the app still
 * works for teammates who have not configured Google locally.
 */
export const GoogleButton = ({ onCredential, onError, label = "or continue with" }) => {
  if (!CLIENT_ID) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-lav-100" />
        <span className="text-xs font-medium uppercase tracking-wide text-ink-300">{label}</span>
        <span className="h-px flex-1 bg-lav-100" />
      </div>

      <div className="mt-4 flex justify-center">
        <GoogleLogin
          onSuccess={(response) => onCredential(response.credential)}
          onError={() => onError?.("Google sign-in was cancelled or failed")}
          shape="pill"
          size="large"
          text="continue_with"
          width="320"
        />
      </div>
    </div>
  );
};