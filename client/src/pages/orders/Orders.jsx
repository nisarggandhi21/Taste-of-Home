import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Orders.scss';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { conversationService } from '../../services/conversationService';
import { orderService } from '../../services/orderService';

const Orders = () => {
  const { currentUser } = useContext(AuthContext);

  const navigate = useNavigate();
  const { isLoading, error, data } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders(),
  });

  const handleContact = async (order) => {
    const sellerId = order.sellerId;
    const buyerId = order.buyerId;
    const id = sellerId + buyerId;

    try {
      const res = await conversationService.getSingleConversation(id);
      navigate(`/message/${res.id}`);
    } catch (err) {
      if (err.response.status === 404) {
        const res = await conversationService.createConversation({
          to: currentUser.seller ? buyerId : sellerId,
        });
        navigate(`/message/${res.id}`);
      }
    }
  };

  return (
    <div className="orders">
      {isLoading ? (
        'loading'
      ) : error ? (
        'error'
      ) : (
        <div className="container">
          <div className="title">
            <h1>Orders</h1>
          </div>
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Price</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => (
                <tr key={order._id}>
                  <td>
                    <img className="image" src={order.img} alt="" />
                  </td>
                  <td>{order.title}</td>
                  <td>{order.price}</td>

                  <td>
                    <img
                      className="message"
                      src="./img/message.png"
                      alt=""
                      onClick={() => handleContact(order)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;
