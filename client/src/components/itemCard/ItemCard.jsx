import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import newRequest from '../../utils/newRequest';
import './ItemCard.scss';

const calculateRating = (totalStars, starNumber) => {
  if (starNumber === 0) return 0;
  const average = totalStars / starNumber;
  return !isNaN(average) ? Math.round(average) : 0;
};

const ItemCard = ({ item }) => {
  const { isLoading, error, data } = useQuery({
    queryKey: [item.userId],
    queryFn: () =>
      newRequest.get(`/users/${item.userId}`).then((res) => {
        return res.data;
      }),
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
          <p>{item.desc}</p>
          {item.starNumber > 0 && (
            <div className="star">
              <img src="./img/star.png" alt="" />
              <span>{calculateRating(item.totalStars, item.starNumber)}</span>
            </div>
          )}
        </div>
        <hr />
        <div className="detail">
          <img src="./img/heart.png" alt="" />
          <div className="price">
            <span>STARTING AT</span>
            <h2>₹ {item.price}</h2>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
