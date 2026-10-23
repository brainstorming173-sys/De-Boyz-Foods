import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { api } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault(); setError('');
    try { await api.forgotPassword(email); setSent(true); } catch (err) { setError(err.message); }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <p>If an account exists for <strong>{email}</strong>, a reset link is on its way. <Link to="/login" className="text-leaf hover:underline">Back to sign in</Link></p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-chili">{error}</p>}
          <button className="btn-green w-full">Send reset link</button>
        </form>
      )}
    </AuthShell>
  );
}
