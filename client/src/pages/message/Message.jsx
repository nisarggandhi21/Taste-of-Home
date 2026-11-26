import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
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
  const [socketConnected, setSocketConnected] = useState(false);
  const SOCKET_URL = import.meta.env.VITE_BASEURL.replace('/api/', '');

  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messageService.getMessages(id),
    // Without a live socket (e.g. on serverless hosting) fall back to polling.
    refetchInterval: socketConnected ? false : 5000,
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

  // The server authenticates the socket with the login cookie and pushes new messages to it.
  useEffect(() => {
    if (!currentUser) return;
    const socket = io(SOCKET_URL, { withCredentials: true, reconnectionAttempts: 5 });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('getMessage', (message) => {
      if (message.conversationId !== id) return;
      queryClient.setQueryData(['messages', id], (old = []) =>
        old.some((m) => m._id === message._id) ? old : [...old, message]
      );
    });

    return () => {
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [currentUser, SOCKET_URL, id, queryClient]);

  const mutation = useMutation({
    mutationFn: (message) => {
      return messageService.sendMessage(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = e.target[0].value;
    if (!text) return;

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
