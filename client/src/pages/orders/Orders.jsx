import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Orders.scss';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { conversationService } from '../../services/conversationService';
import { orderService } from '../../services/orderService';
import { userService } from '../../services/userService';

const OrderRow = ({ order, currentUser, handleContact, handleComplete }) => {
  const otherUserId = currentUser.isSeller ? order.buyerId : order.sellerId;

  const { isLoading, error, data } = useQuery({
    queryKey: ['user', otherUserId],
    queryFn: () => userService.getUser(otherUserId),
    enabled: !!otherUserId,
  });

  return (
    <tr key={order._id}>
      <td>
        <img className="image" src={order.img || '/img/noavatar.jpg'} alt="" />
      </td>
      <td>{order.title}</td>
      <td>&#8377; {order.price}</td>
      <td>{isLoading ? 'loading...' : error ? 'error' : data?.username}</td>
      <td>{moment(order.createdAt).format('MMMM Do YYYY, h:mm a')}</td>
      <td>
        <span className={`status ${order.isCompleted ? 'completed' : 'pending'}`}>
          {order.isCompleted ? 'Completed' : 'Pending'}
        </span>
      </td>
      <td>
        <div className="actions">
          <img
            className="message"
            src="./img/message.png"
            alt=""
            onClick={() => handleContact(order)}
          />
          {currentUser.isSeller && !order.isCompleted && (
            <button className="complete-btn" onClick={() => handleComplete(order._id)}>
              Mark as Completed
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const Orders = () => {
  const { currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { isLoading, error, data } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getOrders(),
  });

  const mutation = useMutation({
    mutationFn: (id) => {
      return orderService.completeOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
    },
  });

  const handleContact = async (order) => {
    const sellerId = order.sellerId;
    const buyerId = order.buyerId;
    const id = sellerId + buyerId;

    try {
      const res = await conversationService.getSingleConversation(id);
      navigate(`/message/${res.id}`);
    } catch (err) {
      if (err.response?.status === 404) {
        const res = await conversationService.createConversation({
          to: currentUser.isSeller ? buyerId : sellerId,
        });
        navigate(`/message/${res.id}`);
      }
    }
  };

  const handleComplete = (id) => {
    mutation.mutate(id);
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
                <th>{currentUser.isSeller ? 'Buyer' : 'Seller'}</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => (
                <OrderRow
                  key={order._id}
                  order={order}
                  currentUser={currentUser}
                  handleContact={handleContact}
                  handleComplete={handleComplete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;

