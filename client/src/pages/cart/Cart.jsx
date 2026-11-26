import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CartContext, MAX_QUANTITY } from '../../context/CartContext';
import { userService } from '../../services/userService';
import './Cart.scss';

function Cart() {
  const cart = useContext(CartContext);

  const { data: seller } = useQuery({
    queryKey: ['user', cart.sellerId],
    queryFn: () => userService.getUser(cart.sellerId),
    enabled: !!cart.sellerId,
  });

  return (
    <div className="cart">
      <Helmet>
        <title>Your cart | Taste of Home</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="container">
        <h1>Your cart</h1>

        {cart.items.length === 0 ? (
          <p className="empty">
            Your cart is empty. <Link to="/items">Explore the food</Link>
          </p>
        ) : (
          <div className="layout">
            <div className="lines">
              {seller && (
                <p className="from">
                  From <strong>{seller.username}</strong>
                  {seller.location ? `, ${seller.location}` : ''}
                </p>
              )}
              {cart.items.map((line) => (
                <div className="line" key={line.itemId}>
                  <Link to={`/item/${line.itemId}`}>
                    <img src={line.img} alt="" />
                  </Link>
                  <div className="details">
                    <Link className="title" to={`/item/${line.itemId}`}>
                      {line.title}
                    </Link>
                    <span className="each">&#8377; {line.price} each</span>
                  </div>
                  <div className="quantity">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${line.title}`}
                      disabled={line.quantity <= 1}
                      onClick={() => cart.setQuantity(line.itemId, line.quantity - 1)}
                    >
                      &minus;
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${line.title}`}
                      disabled={line.quantity >= MAX_QUANTITY}
                      onClick={() => cart.setQuantity(line.itemId, line.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong className="lineTotal">&#8377; {line.price * line.quantity}</strong>
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Remove ${line.title}`}
                    onClick={() => cart.remove(line.itemId)}
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button type="button" className="clear" onClick={cart.clear}>
                Empty cart
              </button>
            </div>

            <aside className="summary">
              <h2>Order summary</h2>
              <div className="row">
                <span>
                  {cart.count} {cart.count === 1 ? 'portion' : 'portions'}
                </span>
                <span>&#8377; {cart.subtotal}</span>
              </div>
              <div className="row total">
                <span>Total</span>
                <strong>&#8377; {cart.subtotal}</strong>
              </div>
              <Link to="/checkout" className="checkout">
                Checkout
              </Link>
              <p className="note">Prices are confirmed at checkout.</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;
