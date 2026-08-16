import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { apiMessage } from "../lib/api";
import * as authService from "../services/authService";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Code-entry step of registration: /verify-email (email arrives via router
 * state or ?email=). The user types the 6-digit code we emailed; when all
 * six boxes are filled it submits automatically. On success the server
 * issues a session, so we drop the user straight into the app.
 */
const VerifyEmail = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();

  const initialEmail = location.state?.email || searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [emailEntered, setEmailEntered] = useState(Boolean(initialEmail));

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);
  const cooldownRef = useRef(null);
  // Guards against re-submitting the same code after a failed attempt
  // re-renders, and against double auto-submits.
  const lastSubmitted = useRef("");

  // Countdown so the resend button cannot be spammed
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(cooldownRef.current);
  }, [cooldown]);

  const submitCode = async (code) => {
    setSubmitting(true);
    setError("");
    try {
      await verifyEmail({ email: email.trim().toLowerCase(), code });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(apiMessage(err, "That code didn't match. Check your inbox and try again."));
      setDigits(Array(CODE_LENGTH).fill(""));
      lastSubmitted.current = "";
      setSubmitting(false);
      inputsRef.current[0]?.focus();
    }
  };

  // Auto-submit the moment the sixth digit lands
  useEffect(() => {
    const code = digits.join("");
    if (code.length === CODE_LENGTH && code !== lastSubmitted.current && !submitting) {
      lastSubmitted.current = code;
      submitCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  /** Writes a single digit and moves focus forward. */
  const setDigit = (index, raw) => {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[index] = value;
      return next;
    });
    setError("");
    if (value && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigits((d) => {
        const next = [...d];
        next[index - 1] = "";
        return next;
      });
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  /** Pasting "123456" (from anywhere) fills the boxes in order. */
  const onPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    setDigits((d) => {
      const next = [...d];
      pasted.split("").forEach((ch, i) => {
        next[i] = ch;
      });
      return next;
    });
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const onResend = async () => {
    setResending(true);
    setError("");
    try {
      await authService.resendVerification(email.trim().toLowerCase());
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(""));
      lastSubmitted.current = "";
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(apiMessage(err, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="card p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lav-100 text-lav-600">
            <MailCheck size={24} />
          </span>

          {!emailEntered ? (
            <>
              <h1 className="mt-5 text-xl font-bold text-ink-900">Enter your email</h1>
              <p className="mt-2 text-sm text-ink-500">
                Tell us which address you registered with and we&apos;ll check its code.
              </p>
              <form
                className="mt-6 space-y-4 text-left"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (/^\S+@\S+\.\S+$/.test(email.trim())) setEmailEntered(true);
                  else setError("Enter a valid email address");
                }}
              >
                <Field label="Email">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@iut-dhaka.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                  />
                </Field>
                {error && <p className="text-sm text-status-dnd">{error}</p>}
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-xl font-bold text-ink-900">Enter the 6-digit code</h1>
              <p className="mt-2 text-sm text-ink-500">
                We sent a verification code to{" "}
                <span className="font-semibold text-ink-900">{email}</span>. Enter it below to
                activate your account.
              </p>

              <div className="mt-6 flex justify-center gap-2" onPaste={onPaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={2}
                    aria-label={`Digit ${i + 1}`}
                    className="font-mono h-12 w-11 rounded-xl border border-cream-300 bg-white/70 text-center text-xl font-bold text-ink-900 outline-none transition focus:border-lav-400 focus:ring-2 focus:ring-lav-200"
                    value={digit}
                    disabled={submitting}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>

              {error && (
                <p className="mt-4 rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
                  {error}
                </p>
              )}

              <div className="mt-6 space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  loading={submitting}
                  disabled={digits.some((d) => !d)}
                  onClick={() => {
                    const code = digits.join("");
                    if (code.length === CODE_LENGTH) {
                      lastSubmitted.current = code;
                      submitCode(code);
                    }
                  }}
                >
                  {submitting ? "Verifying…" : "Verify & continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  loading={resending}
                  disabled={cooldown > 0}
                  onClick={onResend}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
                  Back to log in
                </Button>
              </div>

              <p className="mt-4 text-xs text-ink-300">
                Codes expire after 24 hours and can only be used once. Wrong email?{" "}
                <button
                  type="button"
                  className="font-semibold text-lav-600 hover:text-lav-700"
                  onClick={() => {
                    setEmailEntered(false);
                    setDigits(Array(CODE_LENGTH).fill(""));
                    setError("");
                  }}
                >
                  Change it
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
