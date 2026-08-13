import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../hooks/useAuth";
import { apiMessage } from "../lib/api";

/**
 * Landing page for the emailed link: /verify-email?token=...
 * On success the server issues a session, so we drop the user into the app.
 */
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  // The token is single-use, and StrictMode runs effects twice in dev —
  // without this guard the second call would fail against a spent token.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its verification token.");
      return;
    }

    (async () => {
      try {
        await verifyEmail(token);
        setStatus("success");
        setTimeout(() => navigate("/app", { replace: true }), 1500);
      } catch (err) {
        setStatus("error");
        setMessage(apiMessage(err, "We could not verify this link."));
      }
    })();
  }, [searchParams, verifyEmail, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="card p-8 text-center">
          {status === "verifying" && (
            <>
              <Spinner size={28} className="mx-auto" />
              <h1 className="mt-5 text-xl font-bold text-ink-900">Verifying your email…</h1>
              <p className="mt-2 text-sm text-ink-500">This only takes a second.</p>
            </>
          )}

          {status === "success" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-status-online/10 text-status-online">
                <CheckCircle2 size={24} />
              </span>
              <h1 className="mt-5 text-xl font-bold text-ink-900">Email verified</h1>
              <p className="mt-2 text-sm text-ink-500">Taking you to CodeCord…</p>
            </>
          )}

          {status === "error" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-status-dnd/10 text-status-dnd">
                <XCircle size={24} />
              </span>
              <h1 className="mt-5 text-xl font-bold text-ink-900">Verification failed</h1>
              <p className="mt-2 text-sm text-ink-500">{message}</p>
              <p className="mt-2 text-xs text-ink-300">
                Links expire after 24 hours and can only be used once.
              </p>

              <div className="mt-6 space-y-3">
                <Button type="button" className="w-full" onClick={() => navigate("/check-email")}>
                  Send a new link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  Back to log in
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;