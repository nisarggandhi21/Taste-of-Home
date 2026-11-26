import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { averageRating } from '../../constants/food';
import { userService } from '../../services/userService';
import DietBadge from '../dietBadge/DietBadge';
import './ItemCard.scss';

const ItemCard = ({ item }) => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['user', item.userId],
    queryFn: () => userService.getUser(item.userId),
  });

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
              <span className="reviews">({item.starNumber})</span>
            </div>
          ) : (
            <div className="star">
              <span>No ratings yet</span>
            </div>
          )}
        </div>
        <hr />
        <div className="detail">
          <img src="/img/heart.png" alt="" />
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
