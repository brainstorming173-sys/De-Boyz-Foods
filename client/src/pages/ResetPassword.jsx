import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { api } from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault(); setError('');
    try { await api.resetPassword(params.get('token'), password); setDone(true); } catch (err) { setError(err.message); }
  }

  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <p>Password updated. <Link to="/login" className="text-leaf hover:underline">Sign in</Link></p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label" htmlFor="pw">New password</label><input id="pw" type="password" minLength={8} className="field" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-chili">{error}</p>}
          <button className="btn-green w-full">Update password</button>
        </form>
      )}
    </AuthShell>
  );
}
