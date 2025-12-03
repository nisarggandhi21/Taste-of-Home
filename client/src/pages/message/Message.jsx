import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useContext, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { conversationService } from '../../services/conversationService';
import { messageService } from '../../services/messageService';
import { userService } from '../../services/userService';
import './Message.scss';

const Message = () => {
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);
  const socket = useRef();
  const SOCKET_URL = import.meta.env.VITE_BASEURL.replace('/api/', '');

  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ['messages'],
    queryFn: () => messageService.getMessages(id),
  });

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationService.getSingleConversation(id),
    enabled: !!id,
  });

  const receiverId =
    conversation &&
    (conversation.sellerId === currentUser._id ? conversation.buyerId : conversation.sellerId);

  const { data: user } = useQuery({
    queryKey: ['user', receiverId],
    queryFn: () => userService.getUser(receiverId),
    enabled: !!receiverId,
  });

  useEffect(() => {
    if (!currentUser) return;
    socket.current = io(SOCKET_URL);
    socket.current.on('connect', () => {
      socket.current.emit('addUser', currentUser._id);
    });
    return () => {
      socket.current.disconnect();
    };
  }, [currentUser, SOCKET_URL]);

  useEffect(() => {
    const handleMessage = (data) => {
      queryClient.setQueryData(['messages'], (old) => {
        return [...old, { userId: data.senderId, desc: data.text, _id: Date.now() }];
      });
    };
    socket.current.on('getMessage', handleMessage);
    return () => {
      socket.current.off('getMessage', handleMessage);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (message) => {
      return messageService.sendMessage(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = e.target[0].value;
    if (!text) return;

    socket.current.emit('sendMessage', {
      senderId: currentUser._id,
      receiverId,
      text,
    });

    mutation.mutate({
      conversationId: id,
      desc: text,
    });
    e.target[0].value = '';
  };

  return (
    <div className="message">
      <div className="container">
        <span className="breadcrumbs">
          <Link to="/messages">Messages</Link> {'>'} {user?.username || 'User'} {'>'}
        </span>
        {isLoading ? (
          'loading'
        ) : error ? (
          'error'
        ) : (
          <div className="messages">
            {data.map((m) => (
              <div className={m.userId === currentUser._id ? 'owner item' : 'item'} key={m._id}>
                <img
                  src={
                    m.userId === currentUser._id
                      ? currentUser.img || '/img/noavatar.jpg'
                      : user?.img || '/img/noavatar.jpg'
                  }
                  alt=""
                />
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        )}
        <hr />
        <form className="write" onSubmit={handleSubmit}>
          <textarea type="text" placeholder="write a message" />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Message;
