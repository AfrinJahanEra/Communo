import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Logo } from "../components/Logo";
import { GoogleButton } from "../components/GoogleButton";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { apiMessage } from "../lib/api";
import * as authService from "../services/authService";

/** The backend flags unverified accounts with this code on a 403. */
const isUnverified = (err) =>
  err?.response?.data?.errors?.some((e) => e.code === "EMAIL_NOT_VERIFIED");

const TABS = [
  { key: "user", label: "User" },
  { key: "admin", label: "Admin" },
];

const Login = () => {
  const { login, loginAsAdmin, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState("user");
  const [form, setForm] = useState({ email: "", password: "" });
  const [adminForm, setAdminForm] = useState({ email: "", secretKey: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/app";

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const setAdmin = (key) => (e) => {
    setAdminForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const switchTab = (key) => {
    setTab(key);
    setErrors({});
    setServerError("");
    setUnverifiedEmail("");
  };

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address";
    else if (!form.email.trim().toLowerCase().endsWith("@iut-dhaka.edu"))
      next.email = "Only @iut-dhaka.edu emails can log in";
    if (!form.password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateAdmin = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(adminForm.email.trim())) next.email = "Enter a valid email address";
    if (!adminForm.secretKey.trim()) next.secretKey = "Secret key is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setUnverifiedEmail("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (isUnverified(err)) {
        setUnverifiedEmail(form.email.trim());
      } else {
        setServerError(apiMessage(err, "Unable to log in"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onAdminSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validateAdmin()) return;
    setSubmitting(true);
    try {
      await loginAsAdmin({
        email: adminForm.email.trim(),
        secretKey: adminForm.secretKey.trim(),
      });
      navigate("/admin", { replace: true });
    } catch (err) {
      setServerError(apiMessage(err, "Unable to log in"));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      await authService.resendVerification(unverifiedEmail);
      navigate("/check-email", { state: { email: unverifiedEmail } });
    } catch (err) {
      toast({ type: "error", title: "Could not send", body: apiMessage(err) });
    } finally {
      setResending(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setServerError("");
    setUnverifiedEmail("");
    try {
      await loginWithGoogle(credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(apiMessage(err, "Google sign-in failed"));
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
        <div className="card p-8">
          {/* Entry selector: regular users vs. platform admins */}
          <div className="flex rounded-xl bg-cream-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => switchTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === t.key
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                {t.key === "admin" && <ShieldCheck size={15} className="text-lav-600" />}
                {t.label}
              </button>
            ))}
          </div>

          <h1 className="mt-6 text-xl font-bold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">
            {tab === "user"
              ? "Log in to catch up with your study groups."
              : "Sign in with the admin email and secret key."}
          </p>

          {serverError && (
            <div className="mt-4 rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
              {serverError}
            </div>
          )}

          {tab === "user" && unverifiedEmail && (
            <div className="mt-4 rounded-xl border border-lav-300 bg-lav-50 px-3.5 py-3 text-sm text-ink-700">
              <p className="font-semibold text-ink-900">Verify your email first</p>
              <p className="mt-1 text-ink-500">
                We sent a 6-digit code to {unverifiedEmail}. Check your inbox — and your spam folder.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                loading={resending}
                onClick={onResend}
              >
                Resend the code
              </Button>
            </div>
          )}

          {tab === "user" ? (
            <>
              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <Field label="Email" error={errors.email}>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@university.edu"
                    value={form.email}
                    onChange={set("email")}
                    error={errors.email}
                  />
                </Field>
                <Field label="Password" error={errors.password}>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    error={errors.password}
                  />
                </Field>
                <Button type="submit" loading={submitting} className="w-full">
                  Log in
                </Button>
              </form>

              <GoogleButton onCredential={onGoogleCredential} onError={setServerError} />
            </>
          ) : (
            <form onSubmit={onAdminSubmit} className="mt-6 space-y-4" noValidate>
              <Field label="Admin email" error={errors.email}>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="admin email"
                  value={adminForm.email}
                  onChange={setAdmin("email")}
                  error={errors.email}
                />
              </Field>
              <Field label="Secret key" error={errors.secretKey}>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={adminForm.secretKey}
                  onChange={setAdmin("secretKey")}
                  error={errors.secretKey}
                />
              </Field>
              <Button type="submit" loading={submitting} className="w-full">
                Log in as admin
              </Button>
            </form>
          )}
        </div>

        {tab === "user" ? (
          <p className="mt-5 text-center text-sm text-ink-500">
            New to Communo?{" "}
            <Link to="/register" className="font-semibold text-lav-600 hover:text-lav-700">
              Create an account
            </Link>
          </p>
        ) : (
          <p className="mt-5 text-center text-sm text-ink-400">
            Admin access is restricted to authorized personnel.
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
