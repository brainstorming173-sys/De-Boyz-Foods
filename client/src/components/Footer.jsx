import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-black/60 sm:px-6">
        <p>&copy; {new Date().getFullYear()} De-Boyz Foods. Koforidua, Ghana.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/groceries" className="hover:text-ink">Groceries</Link>
          <Link to="/food" className="hover:text-ink">Hot meals</Link>
          <Link to="/orders" className="hover:text-ink">Track order</Link>
          <Link to="/login" className="hover:text-ink">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
