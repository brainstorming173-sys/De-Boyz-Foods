import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Shown while data is on its way, so the page never looks empty or broken.
// If the server is slow (e.g. waking up), a friendlier note appears after a few seconds.
export default function Loading({ message = 'Loading...', className = 'py-16', slowAfter = 6000 }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowAfter);
    return () => clearTimeout(t);
  }, [slowAfter]);

  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-leaf" aria-hidden="true" />
      <p className="mt-3 font-medium text-black/60">{message}</p>
      {slow && <p className="mt-1 text-sm text-black/45">Taking a little longer than usual. Hang tight...</p>}
    </div>
  );
}
