import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { averageRating } from '../../constants/food';
import { useFavourites } from '../../hooks/useFavourites';
import { userService } from '../../services/userService';
import DietBadge from '../dietBadge/DietBadge';
import './ItemCard.scss';

const ItemCard = ({ item }) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['user', item.userId],
    queryFn: () => userService.getUser(item.userId),
  });

  const navigate = useNavigate();
  const favourites = useFavourites();
  const saved = favourites.isFavourite(item._id);

  // The heart sits inside the card link, so the click must not open the item.
  const handleFavourite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!favourites.isLoggedIn) return navigate('/login');
    favourites.toggle(item._id);
  };

  return (
    <Link to={`/item/${item._id}`} className="link">
      <div className="itemCard">
        <img src={item.cover} alt="" />
        <div className="info">
          {isLoading ? (
            'loading'
          ) : error ? (
            'Something went wrong!'
          ) : (
            <div className="user">
              <img src={data.img || '/img/noavatar.jpg'} alt="" />
              <span>{data.username}</span>
            </div>
          )}
          <p>
            <DietBadge diet={item.diet} /> {item.title}
          </p>
          {item.starNumber > 0 ? (
            <div className="star">
              <img src="/img/star.png" alt="" />
              <span>{averageRating(item)}</span>
              <span className="reviewCount">({item.starNumber})</span>
            </div>
          ) : (
            <div className="star">
              <span>No ratings yet</span>
            </div>
          )}
        </div>
        <hr />
        <div className="detail">
          <button
            type="button"
            className={saved ? 'favourite saved' : 'favourite'}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from favourites' : 'Save to favourites'}
            onClick={handleFavourite}
          >
            {saved ? '♥' : '♡'}
          </button>
          <div className="price">
            <span>PRICE</span>
            <h2>&#8377; {item.price}</h2>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
