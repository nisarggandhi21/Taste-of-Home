import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import './Success.scss';

const Success = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const payment_intent = params.get('payment_intent');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const makeRequest = async () => {
      try {
        await orderService.confirmOrder(payment_intent);
      } catch (err) {
        console.error('Error confirming order:', err);
      }
    };

    if (payment_intent) {
      makeRequest();
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [payment_intent, navigate]);

  return (
    <div className="success">
      <div className="icon">
        <img src="/img/check.png" alt="Success" />
      </div>
      <h1>Payment Successful!</h1>
      <p>
        Thank you for your order. We've received your payment and the home cook has been notified.
      </p>
      <p>
        You will be redirected to your orders page in <span className="countdown">{countdown}</span> seconds.
      </p>
      <button onClick={() => navigate('/orders')}>Go to Orders Now</button>
    </div>
  );
};

export default Success;
