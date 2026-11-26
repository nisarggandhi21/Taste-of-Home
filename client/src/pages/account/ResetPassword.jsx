import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import './Account.scss';

function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== repeat) return setProblem('The two passwords are not the same.');
    setProblem('');
    setSaving(true);
    try {
      const res = await authService.resetPassword(token, password);
      setDone(res.message);
    } catch (err) {
      setProblem(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account">
      <Helmet>
        <title>Choose a new password | Taste of Home</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <form className="card" onSubmit={handleSubmit}>
        <h1>Choose a new password</h1>
        {!token ? (
          <p className="notice problem">
            This link is not complete. Please use the link from the email.
          </p>
        ) : done ? (
          <>
            <p className="notice">{done}</p>
            <Link to="/login">Sign in</Link>
          </>
        ) : (
          <>
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="repeat">Repeat new password</label>
            <input
              id="repeat"
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              required
            />
            {problem && <p className="notice problem">{problem}</p>}
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Change password'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default ResetPassword;
