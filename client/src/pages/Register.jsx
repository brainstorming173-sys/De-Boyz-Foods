import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await register(f); nav('/', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Create account" subtitle="We'll email you a link to verify your address.">
      <GoogleButton text="signup_with" onDone={() => nav('/', { replace: true })} onError={setError} />
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="n">Full name</label><input id="n" className="field" required value={f.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="e">Email</label><input id="e" type="email" className="field" required value={f.email} onChange={set('email')} /></div>
        <div><label className="label" htmlFor="p">Phone (optional)</label><input id="p" className="field" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
        <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" minLength={8} className="field" required value={f.password} onChange={set('password')} /><p className="mt-1 text-xs text-black/50">At least 8 characters.</p></div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
        <p className="text-sm">Already have an account? <Link to="/login" className="text-leaf hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
