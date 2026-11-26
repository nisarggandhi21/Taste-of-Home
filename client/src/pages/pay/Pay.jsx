import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import CheckoutForm from '../../components/checkoutForm/checkoutForm';
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

const Pay = () => {
  const { id } = useParams();
  const { theme } = useContext(ThemeContext);
  const [clientSecret, setClientSecret] = useState('');
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
      const res = await orderService.createPaymentIntent(id, { quantity, deliveryAddress });
      localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(address));
      setClientSecret(res.clientSecret);
    } catch {
      // The request interceptor already shows the error.
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="pay">loading</div>;
  if (error) return <div className="pay">Something went wrong!</div>;

  const total = item.price * quantity;
  const summary = (
    <div className="summary">
      <img src={item.cover} alt="" />
      <div>
        <h2>{item.title}</h2>
        <span>
          &#8377; {item.price} &times; {quantity}
        </span>
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
            <button type="button" className="linkButton" onClick={() => setClientSecret('')}>
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
