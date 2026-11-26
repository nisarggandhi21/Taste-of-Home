import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';
import { orderService } from '../../services/orderService';
import { CART_CHECKOUT_KEY } from '../pay/Pay';
import './Success.scss';

const Success = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const payment_intent = params.get('payment_intent');
  const { clear: clearCart } = useContext(CartContext);
  const [countdown, setCountdown] = useState(5);
  // 'confirming' until the API has verified the payment with Stripe.
  const [status, setStatus] = useState(payment_intent ? 'confirming' : 'failed');

  useEffect(() => {
    if (!payment_intent) return;
    let cancelled = false;

    orderService
      .confirmOrder(payment_intent)
      .then(() => {
        // The cart this payment was for has been ordered; a later, different cart is kept.
        if (sessionStorage.getItem(CART_CHECKOUT_KEY) === payment_intent) {
          sessionStorage.removeItem(CART_CHECKOUT_KEY);
          clearCart();
        }
        if (!cancelled) setStatus('paid');
      })
      .catch(() => !cancelled && setStatus('failed'));

    return () => {
      cancelled = true;
    };
  }, [payment_intent, clearCart]);

  useEffect(() => {
    if (status !== 'paid') return;

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'paid' && countdown === 0) navigate('/orders');
  }, [status, countdown, navigate]);

  if (status === 'confirming') {
    return (
      <div className="success">
        <h1>Confirming your payment...</h1>
        <p>Please wait while we verify your payment.</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="success">
        <h1>We couldn&apos;t confirm your payment</h1>
        <p>
          Your order has not been placed. If you were charged, please contact support before trying
          again.
        </p>
        <button onClick={() => navigate('/items')}>Back to Items</button>
      </div>
    );
  }

  return (
    <div className="success">
      <div className="icon">
        <img src="/img/check.png" alt="Success" />
      </div>
      <h1>Payment Successful!</h1>
      <p>
        Thank you for your order. We&apos;ve received your payment and the home cook has been
        notified.
      </p>
      <p>
        You will be redirected to your orders page in <span className="countdown">{countdown}</span>{' '}
        seconds.
      </p>
      <button onClick={() => navigate('/orders')}>Go to Orders Now</button>
    </div>
  );
};

export default Success;
