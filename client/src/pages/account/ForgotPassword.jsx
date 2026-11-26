import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import './Account.scss';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.message);
    } catch {
      // The request interceptor already shows the error.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="account">
      <Helmet>
        <title>Forgot password | Taste of Home</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <form className="card" onSubmit={handleSubmit}>
        <h1>Forgot your password?</h1>
        {message ? (
          <p className="notice">{message}</p>
        ) : (
          <>
            <p>
              Enter the email address of your account and we will send you a link to choose a new
              password.
            </p>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send reset link'}
            </button>
          </>
        )}
        <Link to="/login">Back to sign in</Link>
      </form>
    </div>
  );
}

export default ForgotPassword;
