import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleButton from './GoogleButton.jsx';

const KEY = 'deboyz_welcome_dismissed';
// Pages that already are a sign-in / checkout / admin flow: never cover them.
const SKIP = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/admin', '/pay', '/order'];

const dismissed = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

// Pops up when a signed-out visitor opens the site, offering Google sign-up / sign-in first.
export default function WelcomeGate() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(dismissed);
  const [error, setError] = useState('');

  if (loading || user || hidden || SKIP.some((p) => pathname.startsWith(p))) return null;

  const close = () => {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: just hide for now */ }
    setHidden(true);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Sign up or sign in">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-extrabold tracking-tight">Welcome to De-Boyz Foods</h2>
        <p className="mt-2 text-sm text-black/60">Sign up or sign in to order groceries and hot meals in a few taps.</p>
        <div className="mt-5">
          <GoogleButton text="continue_with" onDone={close} onError={setError} />
        </div>
        {error && <p role="alert" className="mb-3 text-sm text-chili">{error}</p>}
        <Link to="/register" className="btn-green w-full">Sign up with email</Link>
        <p className="mt-4 text-center text-sm">Already have an account? <Link to="/login" className="font-semibold text-leaf hover:underline">Sign in</Link></p>
        <button type="button" onClick={close} className="mt-4 w-full text-center text-sm text-black/50 hover:underline">Browse the menu first</button>
      </div>
    </div>
  );
}
