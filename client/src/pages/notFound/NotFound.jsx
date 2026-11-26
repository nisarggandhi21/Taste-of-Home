import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './NotFound.scss';

function NotFound() {
  return (
    <div className="notFound">
      <Helmet>
        <title>Page not found | Taste of Home</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1>404</h1>
      <p>We couldn&apos;t find that page. It may have been moved, or the link may be wrong.</p>
      <div className="links">
        <Link to="/">Go to the home page</Link>
        <Link to="/items">Explore the food</Link>
      </div>
    </div>
  );
}

export default NotFound;
