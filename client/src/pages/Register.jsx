import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useCity } from '../context/CityContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';
import { safeNext } from '../lib/redirect.js';

// Mirrors the server's Zod rules so most mistakes are caught before a round trip.
function validate({ name, email, password }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Enter your name';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}

export default function Register() {
  const { user, register } = useAuth();
  const { city } = useCity();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const u = await register({ ...form, ...(city && { city }) });
      toast.success(`Welcome to CineBook, ${u.name.split(' ')[0]}!`);
      navigate(next, { replace: true });
    } catch (err) {
      // Server-side field errors (from Zod) map straight onto the inputs.
      if (err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      else setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-400 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {formError}
          </p>
        )}
        <Field id="name" name="name" label="Full name" autoComplete="name" value={form.name} onChange={onChange} error={errors.name} />
        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          error={errors.email}
        />
        <Field
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={onChange}
          error={errors.password}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
