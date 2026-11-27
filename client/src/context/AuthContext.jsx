import axios from 'axios';
import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('currentUser')) || null
  );

  const login = (userInfo) => {
    setCurrentUser(userInfo);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  useEffect(() => {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  // What the browser remembers about the account can be out of date (a role that changed,
  // a session that ended), so it is checked against the server once when the site opens.
  // Asked without the shared error handling: a visitor must not be bounced to the login page
  // just for opening the site with an old session.
  useEffect(() => {
    if (!currentUser) return;
    axios
      .get(`${import.meta.env.VITE_BASEURL}users/me`, { withCredentials: true })
      .then((res) => setCurrentUser((user) => (user ? { ...user, ...res.data } : user)))
      .catch((err) => {
        if (err.response?.status === 401) setCurrentUser(null);
      });
    // Deliberately only when the site opens, not each time the account changes.
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>{children}</AuthContext.Provider>
  );
};
