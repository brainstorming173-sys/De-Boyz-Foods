import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { api } from '../api.js';
import Loading from '../components/Loading.jsx';

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
      {state.status === 'loading' ? (
        <Loading message="Checking your link..." className="py-6" />
      ) : (
        <>
          <p className={state.status === 'error' ? 'text-chili' : ''}>{state.message}</p>
          <Link to="/" className="btn-green mt-4">Go to home</Link>
        </>
      )}
    </AuthShell>
  );
}
