import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { money } from '../api.js';

const AREA = 'Koforidua, Ghana'; // TODO: make this a user-selectable delivery area

// Logo lives at client/public/images/logo.png. Falls back to a "DB" mark if it's missing.
function Logo() {
  const [broken, setBroken] = useState(false);
  return (
    <Link to="/" aria-label="De-Boyz Foods home" className="shrink-0">
      {broken ? (
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-leaf font-display text-base font-extrabold text-white">DB</span>
      ) : (
        <img src="/images/logo.png" alt="De-Boyz Foods" onError={() => setBroken(true)} className="h-10 w-10 rounded-lg object-cover" />
      )}
    </Link>
  );
}

// Groceries = green pill, Food = red pill (matches each page's accent).
function ModeToggle({ className = '' }) {
  const { pathname } = useLocation();
  const foodOn = pathname.startsWith('/food');
  const groceriesOn = pathname.startsWith('/groceries') || pathname.startsWith('/cart');
  const pill = 'flex-1 rounded-full px-4 py-1.5 text-center text-sm font-semibold transition sm:flex-none';
  return (
    <div className={`items-center gap-1 rounded-full border border-black/5 bg-black/[0.04] p-1 ${className}`}>
      <Link to="/groceries" className={`${pill} ${groceriesOn ? 'bg-leaf text-white' : 'text-black/60 hover:text-ink'}`}>Groceries</Link>
      <Link to="/food" className={`${pill} ${foodOn ? 'bg-chili text-white' : 'text-black/60 hover:text-ink'}`}>Food</Link>
    </div>
  );
}

export default function Navbar() {
  const { subtotal, count } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');

  const submit = (e) => {
    e.preventDefault();
    nav(`/groceries${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/95 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
        <Logo />
        <ModeToggle className="hidden sm:flex" />

        <form onSubmit={submit} className="relative hidden flex-1 md:block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search groceries..."
            aria-label="Search groceries"
            className="w-full rounded-full bg-black/[0.05] py-2.5 pl-11 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-leaf/30"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden max-w-[14rem] items-center gap-2 text-sm text-black/70 lg:flex">
            <MapPin className="h-5 w-5 shrink-0 text-leaf" /> <span className="truncate">Deliver to {AREA}</span>
          </span>

          {isAdmin && <Link to="/admin" className="btn-ghost hidden sm:inline-flex"><LayoutDashboard className="h-4 w-4" /> Admin</Link>}
          {isAdmin && <Link to="/admin" className="btn-ghost h-10 w-10 p-0 sm:hidden" aria-label="Admin"><LayoutDashboard className="h-4 w-4" /></Link>}
          {user ? (
            <button onClick={logout} className="btn-ghost h-10 w-10 p-0 sm:h-auto sm:w-auto sm:px-3" aria-label="Sign out" title={`Signed in as ${user.name}`}><LogOut className="h-4 w-4" /></button>
          ) : (
            <Link to="/login" className="btn-ghost h-10 w-10 p-0 sm:h-auto sm:w-auto sm:px-3" aria-label="Sign in"><User className="h-4 w-4" /></Link>
          )}

          <Link to="/cart" className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-leaf px-3 font-display text-sm font-bold text-white hover:bg-leaf-dark sm:gap-2 sm:px-4" aria-label={`Cart, ${count} items`}>
            <ShoppingCart className="h-4 w-4" /> {money(subtotal)}
          </Link>
        </div>
      </div>

      <div className="px-3 pb-2 sm:hidden"><ModeToggle className="flex w-full" /></div>
    </header>
  );
}
