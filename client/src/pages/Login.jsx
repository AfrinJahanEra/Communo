import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { apiMessage } from "../lib/api";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
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
    if (!form.password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(location.state?.from?.pathname || "/app", { replace: true });
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
          <h1 className="text-xl font-bold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Log in to catch up with your study groups.</p>

          {serverError && (
            <div className="mt-4 rounded-xl border border-status-dnd/30 bg-status-dnd/10 px-3.5 py-2.5 text-sm text-status-dnd">
              {serverError}
            </div>
          )}

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
        </div>
        <p className="mt-5 text-center text-sm text-ink-500">
          New to CodeCord?{" "}
          <Link to="/register" className="font-semibold text-lav-600 hover:text-lav-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
