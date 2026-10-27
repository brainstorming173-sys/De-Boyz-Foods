import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const u = await login(email, password);
      nav(state?.from || (u.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Sign in" subtitle="Sign in to place orders and see your past orders.">
      <GoogleButton text="signin_with" onDone={(u) => nav(state?.from || (u.role === 'admin' ? '/admin' : '/'), { replace: true })} onError={setError} />
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="field" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <div className="flex justify-between text-sm">
          <Link to="/forgot-password" className="text-leaf hover:underline">Forgot password?</Link>
          <Link to="/register" state={state} className="text-leaf hover:underline">Create account</Link>
        </div>
      </form>
    </AuthShell>
  );
}
