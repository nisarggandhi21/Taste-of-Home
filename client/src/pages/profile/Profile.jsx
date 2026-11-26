import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import upload from '../../utils/upload';
import './Profile.scss';

function Profile() {
  const { currentUser, login, logout } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    isLoading,
    error,
    data: me,
  } = useQuery({
    queryKey: ['me'],
    queryFn: userService.getMe,
  });

  const [form, setForm] = useState({ location: '', phone: '', desc: '' });
  const [file, setFile] = useState(null);
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (me) setForm({ location: me.location || '', phone: me.phone || '', desc: me.desc || '' });
  }, [me]);

  const save = useMutation({
    mutationFn: async () => {
      const img = file ? await upload(file) : undefined;
      return userService.updateMe({ ...form, ...(img && { img }) });
    },
    onSuccess: (updated) => {
      // Keep the remembered user (navbar name and picture) in step with the account.
      login({ ...currentUser, ...updated });
      queryClient.setQueryData(['me'], updated);
      queryClient.invalidateQueries({ queryKey: ['user', updated._id] });
      setFile(null);
      toast.success('Profile saved');
    },
  });

  const changePassword = useMutation({
    mutationFn: () => authService.changePassword(passwords.current, passwords.next),
    onSuccess: (res) => {
      setPasswords({ current: '', next: '' });
      toast.success(res.message);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => userService.deleteAccount(me._id, deletePassword),
    onSuccess: () => {
      queryClient.clear();
      logout();
      navigate('/');
      toast.success('Your account has been deleted.');
    },
  });

  const resend = useMutation({
    mutationFn: authService.resendVerification,
    onSuccess: (res) => toast.success(res.message),
  });

  if (isLoading) return <div className="profile">loading</div>;
  if (error) return <div className="profile">Something went wrong!</div>;

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="profile">
      <Helmet>
        <title>Your profile | Taste of Home</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="container">
        <div className="header">
          <img src={me.img || '/img/noavatar.jpg'} alt="" />
          <div>
            <h1>{me.username}</h1>
            <p className="email">
              {me.email}{' '}
              {me.emailVerified ? (
                <span className="badge confirmed">Confirmed</span>
              ) : (
                <span className="badge">Not confirmed</span>
              )}
            </p>
            <p className="role">{me.isSeller ? 'Seller account' : 'Buyer account'}</p>
          </div>
        </div>

        {!me.emailVerified && (
          <div className="notice">
            <span>Please confirm your email address using the link we sent you.</span>
            <button type="button" disabled={resend.isPending} onClick={() => resend.mutate()}>
              {resend.isPending ? 'Sending...' : 'Send the link again'}
            </button>
          </div>
        )}

        <form
          className="section"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h2>About you</h2>
          <label htmlFor="picture">Profile picture</label>
          <input id="picture" type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
          <label htmlFor="location">City</label>
          <input id="location" name="location" value={form.location} onChange={handleChange} />
          <label htmlFor="phone">Phone number</label>
          <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          <label htmlFor="desc">Description</label>
          <textarea id="desc" name="desc" rows="4" value={form.desc} onChange={handleChange} />
          <button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        <form
          className="section"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <h2>Change password</h2>
          <label htmlFor="current">Current password</label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            required
          />
          <label htmlFor="next">New password</label>
          <input
            id="next"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={passwords.next}
            onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
            required
          />
          <button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Saving...' : 'Change password'}
          </button>
        </form>

        <form
          className="section danger"
          onSubmit={(e) => {
            e.preventDefault();
            if (window.confirm('Delete your account for good? This cannot be undone.')) {
              deleteAccount.mutate();
            }
          }}
        >
          <h2>Delete account</h2>
          <p>
            This removes your account{me.isSeller ? ', your items' : ''}, your reviews and your
            conversations for good. Orders you have open must be completed or cancelled first.
          </p>
          <label htmlFor="deletePassword">Your password</label>
          <input
            id="deletePassword"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            required
          />
          <button type="submit" disabled={deleteAccount.isPending}>
            {deleteAccount.isPending ? 'Deleting...' : 'Delete my account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
