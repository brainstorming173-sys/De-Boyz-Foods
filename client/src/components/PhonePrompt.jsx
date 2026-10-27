import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const phoneOk = (p) => /^[0-9+\s-]{9,15}$/.test(p || '');

// Blocks the site until a signed-in customer has a mobile number on their account.
export default function PhonePrompt() {
  const { user, isAdmin, savePhone, logout } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || isAdmin || user.phone) return null;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!phoneOk(phone)) return setError('Enter a valid mobile number, e.g. 024 123 4567');
    setBusy(true);
    try { await savePhone(phone.trim()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Add your mobile number">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-extrabold tracking-tight">Add your mobile number</h2>
        <p className="text-sm text-black/60">We use it to reach you about your orders and deliveries.</p>
        <div>
          <label className="label" htmlFor="pp-phone">Mobile number</label>
          <input id="pp-phone" className="field" inputMode="tel" autoFocus required placeholder="024 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full" disabled={busy}>{busy ? 'Saving...' : 'Continue'}</button>
        <button type="button" onClick={logout} className="w-full text-center text-sm text-black/50 hover:underline">Sign out</button>
      </form>
    </div>
  );
}
