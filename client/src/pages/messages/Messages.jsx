import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import './Messages.scss';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { conversationService } from '../../services/conversationService';
import { userService } from '../../services/userService';

const MessageRow = ({ c, currentUser, handleRead }) => {
  const otherUserId = currentUser.isSeller ? c.buyerId : c.sellerId;

  const { isLoading, error, data } = useQuery({
    queryKey: ['user', otherUserId],
    queryFn: () => userService.getUser(otherUserId),
    enabled: !!otherUserId,
  });

  const isUnread =
    (currentUser.isSeller && !c.readBySeller) || (!currentUser.isSeller && !c.readByBuyer);

  return (
    <tr className={isUnread ? 'active' : ''} key={c.id}>
      <td>
        <div className="user-info">
          <img src={data?.img || '/img/noavatar.jpg'} alt="" className="user-img" />
          <span>{isLoading ? 'loading...' : error ? 'error' : data?.username}</span>
        </div>
      </td>
      <td>
        <Link to={`/message/${c.id}`} className="link">
          {c?.lastMessage
            ? c.lastMessage.length > 100
              ? c.lastMessage.substring(0, 100) + '...'
              : c.lastMessage
            : '...'}
        </Link>
      </td>
      <td>{moment(c.updatedAt).fromNow()}</td>
      <td>
        {isUnread ? (
          <button onClick={() => handleRead(c.id)}>Mark as Read</button>
        ) : (
          <Link to={`/message/${c.id}`}>
            <button className="view-btn">View</button>
          </Link>
        )}
      </td>
    </tr>
  );
};

const Messages = () => {
  const { currentUser } = useContext(AuthContext);

  const { isLoading, error, data } = useQuery({
    queryKey: ['messages'],
    queryFn: () => conversationService.getConversations(),
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id) => {
      return conversationService.markAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    },
  });

  const handleRead = (id) => {
    mutation.mutate(id);
  };

  return (
    <div className="messages">
      {isLoading ? (
        'loading'
      ) : error ? (
        'error'
      ) : (
        <div className="container">
          <div className="title">
            <h1>Messages</h1>
          </div>
          <table>
            <thead>
              <tr>
                <th>{currentUser.isSeller ? 'Buyer' : 'Seller'}</th>
                <th>Last Message</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <MessageRow key={c.id} c={c} currentUser={currentUser} handleRead={handleRead} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Messages;
