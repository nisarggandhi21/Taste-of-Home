import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLiveMessages } from '../../hooks/useLiveMessages';
import { conversationService } from '../../services/conversationService';
import { messageService } from '../../services/messageService';
import { userService } from '../../services/userService';
import './Message.scss';

const Message = () => {
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);
  // New messages arrive over a live connection; see the hook.
  const live = useLiveMessages();

  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messageService.getMessages(id),
    // While the live connection is down, ask for new messages every few seconds instead.
    refetchInterval: live ? false : 5000,
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
