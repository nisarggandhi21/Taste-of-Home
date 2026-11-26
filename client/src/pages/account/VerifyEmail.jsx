import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import './Account.scss';

function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { currentUser, login } = useContext(AuthContext);

  // A query (rather than an effect) so the one-time link is only ever sent once.
  const { isLoading, isSuccess, data } = useQuery({
    queryKey: ['verifyEmail', token],
    queryFn: () => authService.verifyEmail(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isSuccess && currentUser && !currentUser.emailVerified) {
      login({ ...currentUser, emailVerified: true });
    }
  }, [isSuccess, currentUser, login]);

  return (
    <div className="account">
      <Helmet>
        <title>Confirm your email | Taste of Home</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="card">
        <h1>Confirm your email</h1>
        {!token ? (
          <p className="notice problem">
            This link is not complete. Please use the link from the email.
          </p>
        ) : isLoading ? (
          <p>Checking your link...</p>
        ) : isSuccess ? (
          <p className="notice">{data.message}</p>
        ) : (
          <p className="notice problem">
            This link is not valid or has expired. You can ask for a new one from your profile.
          </p>
        )}
        <Link to={currentUser ? '/profile' : '/login'}>
          {currentUser ? 'Go to your profile' : 'Sign in'}
        </Link>
      </div>
    </div>
  );
}

export default VerifyEmail;
