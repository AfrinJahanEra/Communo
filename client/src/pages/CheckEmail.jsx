import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { useToast } from "../hooks/useToast";
import { apiMessage } from "../lib/api";
import * as authService from "../services/authService";

const RESEND_COOLDOWN_SECONDS = 60;

/** Shown after registering: tells the user to open the link we emailed. */
const CheckEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState(location.state?.email || "");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  // Countdown so the resend button cannot be spammed
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const onResend = async () => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast({ type: "error", title: "Enter a valid email address" });
      return;
    }
    setSending(true);
    try {
      await authService.resendVerification(trimmed);
      // The server answers identically whether or not the account exists
      toast({
        type: "success",
        title: "Link sent",
        body: "If that account still needs verifying, a new link is on its way.",
      });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast({ type: "error", title: "Could not send", body: apiMessage(err) });
    } finally {
      setSending(false);
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
            <Mail size={24} />
          </span>

          <h1 className="mt-5 text-xl font-bold text-ink-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-ink-500">
            {location.state?.email ? (
              <>
                We sent a verification link to{" "}
                <span className="font-semibold text-ink-900">{location.state.email}</span>. Open it
                to activate your account.
              </>
            ) : (
              "Open the verification link we emailed you to activate your account."
            )}
          </p>
          <p className="mt-2 text-xs text-ink-300">
            The link expires in 24 hours. If it is not there, check your spam folder.
          </p>

          <div className="mt-6 space-y-3 text-left">
            {!location.state?.email && (
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              loading={sending}
              disabled={cooldown > 0}
              onClick={onResend}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
              Back to log in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckEmail;