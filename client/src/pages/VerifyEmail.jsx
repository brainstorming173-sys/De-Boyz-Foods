import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { api } from '../api.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    api.verifyEmail(params.get('token'))
      .then(() => setState({ status: 'ok', message: 'Your email is verified.' }))
      .catch((e) => setState({ status: 'error', message: e.message }));
  }, [params]);

  return (
    <AuthShell title="Email verification">
      <p className={state.status === 'error' ? 'text-chili' : ''}>{state.status === 'loading' ? 'Checking your link...' : state.message}</p>
      <Link to="/" className="btn-green mt-4">Go to home</Link>
    </AuthShell>
  );
}
