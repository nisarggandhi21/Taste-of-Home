import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import CheckoutForm from '../../components/checkoutForm/checkoutForm';
import { CartContext } from '../../context/CartContext';
import { ThemeContext } from '../../context/ThemeContext';
import { itemService } from '../../services/itemService';
import { orderService } from '../../services/orderService';
import './Pay.scss';

// Publishable keys are safe to ship to the browser. Set VITE_STRIPE_PUBLISHABLE_KEY to use
// your own (e.g. the live key); without it the project's test key is used.
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51OlVJvSIv0FHoYInm7FmStDnkOS4jCjQ6fZvcA5X8z5FwIaDj1KrMQbFhVnWmPDHKwcON2Mnq2l63iULLiX1ippj00Aqcbm50Q'
);

const MAX_QUANTITY = 20;
const SAVED_ADDRESS_KEY = 'deliveryAddress';
const EMPTY_ADDRESS = { name: '', phone: '', line1: '', city: '', pincode: '', notes: '' };

// The last address used on this device is offered again; it is only a convenience.
const loadSavedAddress = () => {
  try {
    return { ...EMPTY_ADDRESS, ...JSON.parse(localStorage.getItem(SAVED_ADDRESS_KEY)) };
  } catch {
    return EMPTY_ADDRESS;
  }
};

// Set while a cart is being paid for, so the success page knows to empty it afterwards.
export const CART_CHECKOUT_KEY = 'cartCheckoutIntent';

// Checkout for one dish (/pay/:id) or for the whole cart (/checkout).
const Pay = () => {
  const { id } = useParams();
  const isCart = !id;
  const cart = useContext(CartContext);
  const { theme } = useContext(ThemeContext);
  const [clientSecret, setClientSecret] = useState('');
  // The total the API charged, once the order has been created.
  const [charged, setCharged] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState(loadSavedAddress);

  const {
    isLoading,
    error,
    data: item,
  } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemService.getSingleItem(id),
    enabled: !isCart,
  });

  const handleChange = (e) => {
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { notes, ...required } = address;
      const deliveryAddress = { ...required, ...(notes.trim() && { notes }) };
      const res = await orderService.checkout({
        items: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
        deliveryAddress,
      });
      localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(address));
      if (isCart) sessionStorage.setItem(CART_CHECKOUT_KEY, res.clientSecret.split('_secret')[0]);
      setCharged(res.total);
      setClientSecret(res.clientSecret);
    } catch {
      // The request interceptor already shows the error.
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCart && isLoading) return <div className="pay">loading</div>;
  if (!isCart && error) return <div className="pay">Something went wrong!</div>;
  // Nothing to check out: back to the (empty) cart page.
  if (isCart && cart.items.length === 0 && !clientSecret) return <Navigate to="/cart" replace />;

  const lines = isCart
    ? cart.items
    : [{ itemId: id, title: item.title, img: item.cover, price: item.price, quantity }];
  const total = charged ?? lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const summary = (
    <div className="summary">
      <div className="summaryLines">
        {lines.map((line) => (
          <div className="summaryLine" key={line.itemId}>
            <img src={line.img} alt="" />
            <div>
              <h2>{line.title}</h2>
              <span>
                &#8377; {line.price} &times; {line.quantity}
              </span>
            </div>
          </div>
        ))}
      </div>
      <strong className="total">&#8377; {total}</strong>
    </div>
  );

  if (clientSecret) {
    return (
      <div className="pay">
        <div className="panel">
          {summary}
          <p className="deliverTo">
            Delivering to {address.name}, {address.line1}, {address.city} {address.pincode}.{' '}
            <button
              type="button"
              className="linkButton"
              onClick={() => {
                setClientSecret('');
                setCharged(null);
              }}
            >
              Change
            </button>
          </p>
          <Elements
            options={{ clientSecret, appearance: { theme: theme === 'dark' ? 'night' : 'stripe' } }}
            stripe={stripePromise}
          >
            <CheckoutForm
              billingDetails={{
                name: address.name,
                phone: address.phone,
                address: {
                  line1: address.line1,
                  city: address.city,
                  postal_code: address.pincode,
                  country: 'IN',
                },
              }}
            />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="pay">
      <form className="panel checkout" onSubmit={handleSubmit}>
        <h1>Delivery details</h1>
        {summary}

        {!isCart && (
          <>
            <label htmlFor="quantity">Quantity</label>
            <div className="quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                &minus;
              </button>
              <span id="quantity">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= MAX_QUANTITY}
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </>
        )}

        <label htmlFor="name">Full name</label>
        <input id="name" name="name" value={address.name} onChange={handleChange} required />

        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+91 98765 43210"
          value={address.phone}
          onChange={handleChange}
          required
        />

        <label htmlFor="line1">Address</label>
        <input
          id="line1"
          name="line1"
          placeholder="Flat, building, street"
          value={address.line1}
          onChange={handleChange}
          required
        />

        <div className="row">
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" value={address.city} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="pincode">Pincode</label>
            <input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              pattern="[1-9][0-9]{5}"
              title="6 digit pincode"
              value={address.pincode}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <label htmlFor="notes">Delivery notes (optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows="2"
          placeholder="Landmark, gate code, spice level..."
          value={address.notes}
          onChange={handleChange}
        />

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Please wait...' : `Continue to payment · ₹ ${total}`}
        </button>
      </form>
    </div>
  );
};

export default Pay;
