import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useContext, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import { CartContext, MAX_QUANTITY } from '../../context/CartContext';
import { conversationService } from '../../services/conversationService';
import Reviews from '../../components/reviews/Reviews';
import { itemService } from '../../services/itemService';
import DietBadge from '../../components/dietBadge/DietBadge';
import { allergenLabel } from '../../constants/food';
import { userService } from '../../services/userService';
import LoadError from '../../components/offlineBanner/LoadError';
import Seo from '../../components/seo/Seo';
import { dishData } from '../../utils/structuredData';
import './Item.scss';

function Item() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const cart = useContext(CartContext);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { isLoading, error, data } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemService.getSingleItem(id),
    // A dish that does not exist will not start existing on the second try.
    retry: (failures, err) => failures < 2 && ![400, 404].includes(err.response?.status),
  });

  const userId = data?.userId; //optional chaning operator

  const {
    isLoading: isLoadingUser,
    error: errorUser,
    data: dataUser,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(userId),
    enabled: !!userId, //enable usequery function whenever userId is not null
  });

  const { data: stats } = useQuery({
    queryKey: ['sellerStats', userId],
    queryFn: () => userService.getStats(userId),
    enabled: !!userId,
  });

  const isOwner = !!currentUser && currentUser._id === userId;
  const isAvailable = data?.isAvailable !== false;

  const inCart = cart.items.find((line) => line.itemId === id)?.quantity || 0;

  const handleAddToCart = () => {
    // A cart holds dishes from one cook; adding from another starts a new cart.
    if (
      cart.isOtherSeller(data) &&
      !window.confirm(
        'Your cart has dishes from another cook. Start a new cart with this dish instead?'
      )
    ) {
      return;
    }
    cart.add(data, quantity, { replace: cart.isOtherSeller(data) });
    toast.success(`Added ${quantity} × ${data.title} to your cart`);
    setQuantity(1);
  };

  const handleContact = async () => {
    if (!currentUser) return navigate('/login');
    try {
      // Returns the existing conversation with the seller, or starts one.
      const conversation = await conversationService.createConversation({ to: userId });
      navigate(`/message/${conversation.id}`);
    } catch {
      // The request interceptor already shows the error.
    }
  };

  return (
    <div className="item">
      {isLoading ? (
        'loading'
      ) : error ? (
        <>
          {/* Nothing here to list: usually a dish that was deleted. */}
          <Seo title="Dish not found | Taste of Home" noindex />
          <LoadError />
        </>
      ) : (
        <div className="container">
          <Seo
            title={`${data.title} | Taste of Home`}
            description={(data.shortDesc || data.desc || '').substring(0, 160)}
            path={`/item/${data._id}`}
            image={data.cover}
            type="product"
            jsonLd={dishData(data, dataUser)}
          />
          <div className="left">
            <span className="breadcrumbs">
              Taste of Home {'>'} {data.cat} {'>'}
            </span>
            <h1>{data.title}</h1>
            {isLoadingUser ? (
              'loading'
            ) : errorUser ? (
              'Something went wrong'
            ) : (
              <div className="user">
                <img className="pp" src={dataUser.img || '/img/noavatar.jpg'} alt="" />
                <span>{dataUser.username}</span>
                {!isNaN(data.totalStars / data.starNumber) && (
                  <div className="stars">
                    {Array(Math.round(data.totalStars / data.starNumber))
                      .fill()
                      .map((item, i) => (
                        <img src="/img/star.png" alt="" key={i} />
                      ))}
                    <span>{Math.round(data.totalStars / data.starNumber)}</span>
                  </div>
                )}
              </div>
            )}
            {data.images && data.images.length > 0 && (
              <div className="slider">
                {data.images.length > 1 && (
                  <div
                    className="arrow"
                    onClick={() =>
                      setCurrentSlide(
                        currentSlide === 0 ? data.images.length - 1 : currentSlide - 1
                      )
                    }
                  >
                    &#10094;
                  </div>
                )}
                <img src={data.images[currentSlide]} alt="" />
                {data.images.length > 1 && (
                  <div
                    className="arrow"
                    onClick={() =>
                      setCurrentSlide(
                        currentSlide === data.images.length - 1 ? 0 : currentSlide + 1
                      )
                    }
                  >
                    &#10095;
                  </div>
                )}
              </div>
            )}
            <h2>About This Item</h2>
            <p>{data.desc}</p>
            {isLoadingUser ? (
              'loading'
            ) : errorUser ? (
              'Something went wrong!'
            ) : (
              <div className="seller">
                <h2>About The Seller</h2>
                <div className="user">
                  <img src={dataUser.img || '/img/noavatar.jpg'} alt="" />
                  <div className="info">
                    <span>{dataUser.username}</span>
                    {!isNaN(data.totalStars / data.starNumber) && (
                      <div className="stars">
                        {Array(Math.round(data.totalStars / data.starNumber))
                          .fill()
                          .map((item, i) => (
                            <img src="/img/star.png" alt="" key={i} />
                          ))}
                        <span>{Math.round(data.totalStars / data.starNumber)}</span>
                      </div>
                    )}
                    {!isOwner && (
                      <button type="button" onClick={handleContact}>
                        Contact Me
                      </button>
                    )}
                  </div>
                </div>
                <div className="box">
                  <div className="items">
                    <div className="item">
                      <span className="title">From</span>
                      <span className="desc">{dataUser.location || 'Location not specified'}</span>
                    </div>
                    {stats && (
                      <>
                        <div className="item">
                          <span className="title">Member since</span>
                          <span className="desc">
                            {moment(stats.memberSince).format('MMM YYYY')}
                          </span>
                        </div>
                        <div className="item">
                          <span className="title">Orders delivered</span>
                          <span className="desc">{stats.ordersDelivered}</span>
                        </div>
                        <div className="item">
                          <span className="title">Last delivery</span>
                          <span className="desc">
                            {stats.lastDeliveryAt
                              ? moment(stats.lastDeliveryAt).fromNow()
                              : 'No deliveries yet'}
                          </span>
                        </div>
                        <div className="item">
                          <span className="title">Rating across all items</span>
                          <span className="desc">
                            {stats.rating
                              ? `${stats.rating} from ${stats.reviews} review${stats.reviews === 1 ? '' : 's'}`
                              : 'No reviews yet'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <hr />
                  <p>{dataUser.desc || 'No description provided'}</p>
                </div>
              </div>
            )}
            <Reviews itemId={id} />
          </div>
          <div className="right">
            <div className="price">
              <h3>{data.shortTitle}</h3>
              <h2>&#8377; {data.price}</h2>
            </div>
            <p>{data.shortDesc}</p>
            {data.diet && (
              <div className="dietary">
                <DietBadge diet={data.diet} showLabel />
                <p className="allergens">
                  {!data.allergens
                    ? 'Allergens not declared.'
                    : data.allergens.length === 0
                      ? 'The cook declares none of the common allergens.'
                      : `Contains: ${data.allergens.map(allergenLabel).join(', ')}.`}
                </p>
              </div>
            )}
            <div className="details">
              <div className="item">
                <img src="/img/clock.png" alt="" />
                <span>Delivery in {data.deliveryTime} hours</span>
              </div>
            </div>
            <div className="features">
              {data.features?.map((feature) => (
                <div className="item" key={feature}>
                  <img src="/img/greencheck.png" alt="" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            {isOwner ? (
              <Link to={`/edit/${id}`}>
                <button>Edit this item</button>
              </Link>
            ) : isAvailable ? (
              <div className="buy">
                <div className="quantity">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                  >
                    &minus;
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= MAX_QUANTITY}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button type="button" className="addToCart" onClick={handleAddToCart}>
                  Add to cart
                </button>
                {inCart > 0 && (
                  <Link className="viewCart" to="/cart">
                    {inCart} in your cart · View cart
                  </Link>
                )}
                <Link className="orderNow" to={`/pay/${id}`}>
                  Or order just this dish now
                </Link>
              </div>
            ) : (
              <p className="unavailable">This item is not available right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Item;
