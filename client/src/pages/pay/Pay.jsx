import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CheckoutForm from '../../components/checkoutForm/checkoutForm';
import { orderService } from '../../services/orderService';
import './Pay.scss';

// Publishable keys are safe to ship to the browser. Set VITE_STRIPE_PUBLISHABLE_KEY to use
// your own (e.g. the live key); without it the project's test key is used.
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51OlVJvSIv0FHoYInm7FmStDnkOS4jCjQ6fZvcA5X8z5FwIaDj1KrMQbFhVnWmPDHKwcON2Mnq2l63iULLiX1ippj00Aqcbm50Q'
);

const Pay = () => {
  const [clientSecret, setClientSecret] = useState('');

  const { id } = useParams();

  useEffect(() => {
    const makeRequest = async () => {
      try {
        const res = await orderService.createPaymentIntent(id);
        setClientSecret(res.clientSecret);
      } catch (err) {
        console.log(err);
      }
    };
    makeRequest();
  }, []);

  const appearance = {
    theme: 'stripe',
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="pay">
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      )}
    </div>
  );
};

export default Pay;
