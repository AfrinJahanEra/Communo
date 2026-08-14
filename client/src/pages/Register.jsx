import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { GoogleButton } from "../components/GoogleButton";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { apiMessage } from "../lib/api";

const Register = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  // Mirrors the backend zod rules so most errors are caught before the request.
  const validate = () => {
    const next = {};
    const username = form.username.trim().toLowerCase();
    if (username.length < 3 || username.length > 30) {
      next.username = "Username must be 3–30 characters";
    } else if (!/^[a-z0-9_.]+$/.test(username)) {
      next.username = "Only letters, numbers, dots and underscores";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address";
    if (form.password.length < 8) {
      next.password = "At least 8 characters";
    } else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = "Must contain at least one letter and one number";
    }
    if (form.confirm !== form.password) next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    const email = form.email.trim();
    try {
      const data = await register({
        username: form.username.trim().toLowerCase(),
        email,
        password: form.password,
      });

      // No session is issued until the email is confirmed
      if (data.requiresVerification) {
        navigate("/check-email", { state: { email }, replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    } catch (err) {
      setServerError(apiMessage(err, "Unable to create your account"));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setServerError("");
    try {
      await loginWithGoogle(credential);
      navigate("/app", { replace: true });
    } catch (err) {
      setServerError(apiMessage(err, "Google sign-up failed"));
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
          <h1 className="text-xl font-bold text-ink-900">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">Join your batch on CodeCord — it takes a minute.</p>

          {serverError && (
            <div className="mt-4 rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label="Username" error={errors.username} hint="Lowercase letters, numbers, dots, underscores">
              <Input
                autoComplete="username"
                placeholder="ada.lovelace"
                value={form.username}
                onChange={set("username")}
                error={errors.username}
              />
            </Field>
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
            <Field label="Password" error={errors.password} hint="8+ characters with a letter and a number">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                error={errors.password}
              />
            </Field>
            <Field label="Confirm password" error={errors.confirm}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={set("confirm")}
                error={errors.confirm}
              />
            </Field>
            <Button type="submit" loading={submitting} className="w-full">
              Create account
            </Button>
          </form>

          <GoogleButton onCredential={onGoogleCredential} onError={setServerError} label="or sign up with" />
        </div>
        <p className="mt-5 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-lav-600 hover:text-lav-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;