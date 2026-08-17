import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { apiMessage } from "../lib/api";

/**
 * Hidden entry point reachable only via /admin. On success the auth context
 * flips the session to the admin account, and /admin swaps this form for
 * the dashboard in place — no navigation needed.
 */
const AdminLogin = () => {
  const { loginAsAdmin } = useAuth();
  const [form, setForm] = useState({ email: "", secretKey: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address";
    if (!form.secretKey.trim()) next.secretKey = "Secret key is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await loginAsAdmin({
        email: form.email.trim(),
        secretKey: form.secretKey.trim(),
      });
    } catch (err) {
      setServerError(apiMessage(err, "Unable to log in"));
    } finally {
      setSubmitting(false);
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
          <div className="flex items-center gap-2 text-lav-600">
            <ShieldCheck size={18} />
            <h1 className="text-xl font-bold text-ink-900">Admin console</h1>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Sign in with the admin email and secret key.
          </p>

          {serverError && (
            <div className="mt-4 rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="Admin email" error={errors.email}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="admin email"
                value={form.email}
                onChange={set("email")}
                error={errors.email}
              />
            </Field>
            <Field label="Secret key" error={errors.secretKey}>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.secretKey}
                onChange={set("secretKey")}
                error={errors.secretKey}
              />
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              Log in as admin
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-400">
          Admin access is restricted to authorized personnel.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
