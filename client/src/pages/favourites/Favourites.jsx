import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ItemCard from '../../components/itemCard/ItemCard';
import { useFavourites } from '../../hooks/useFavourites';
import './Favourites.scss';

function Favourites() {
  const { items, isLoading } = useFavourites();

  return (
    <div className="favourites">
      <Helmet>
        <title>Favourites | Taste of Home</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="container">
        <h1>Favourites</h1>
        {isLoading ? (
          'loading'
        ) : items.length === 0 ? (
          <p className="empty">
            Nothing saved yet. Tap the heart on any item to keep it here.{' '}
            <Link to="/items">Explore the food</Link>
          </p>
        ) : (
          <div className="cards">
            {items.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favourites;
