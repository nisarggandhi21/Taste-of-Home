import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Wraps pages that need a login. Visitors are sent to the login page and brought back
// afterwards; pages marked `seller` or `admin` send everybody else to the home page.
const RequireAuth = ({ children, seller = false, admin = false }) => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if ((seller && !currentUser.isSeller) || (admin && !currentUser.isAdmin)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default RequireAuth;
