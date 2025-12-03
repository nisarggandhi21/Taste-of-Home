import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import './Messages.scss';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import { conversationService } from '../../services/conversationService';

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
      queryClient.invalidateQueries(['conversations']);
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
            <tr>
              <th>{currentUser.isSeller ? 'Buyer' : 'Seller'}</th>
              <th>Last Message</th>
              <th>Date</th>
              <th>Action</th>
            </tr>

            {data.map((c) => (
              <tr
                className={
                  (currentUser.isSeller && !c.readBySeller) ||
                  (!currentUser.isSeller && !c.readByBuyer && 'active')
                }
                key={c.id}
              >
                <td>{currentUser.isSeller ? c.buyerId : c.sellerId}</td>
                <td>
                  <Link to={`/message/${c.id}`} className="link">
                    {c?.lastMessage?.substring(0, 100)}...
                  </Link>
                </td>
                <td>{moment(c.updatedAt).fromNow()}</td>
                <td>
                  {(currentUser.isSeller && !c.readBySeller) ||
                    (!currentUser.isSeller && !c.readByBuyer && (
                      <button onClick={() => handleRead(c.id)}>Mark as Read</button>
                    ))}
                </td>
              </tr>
            ))}
          </table>
        </div>
      )}
    </div>
  );
};

export default Messages;
