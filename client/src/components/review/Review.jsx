import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';
import './Review.scss';

const Review = ({ review }) => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isLoading, error, data } = useQuery({
    queryKey: ['user', review.userId],
    queryFn: () => userService.getUser(review.userId),
  });

  const vote = useMutation({
    mutationFn: (helpful) => reviewService.vote(review._id, helpful),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reviews', review.itemId] }),
  });

  const isOwn = currentUser?._id === review.userId;

  // Clicking the vote you already gave takes it back.
  const handleVote = (helpful) => {
    if (!currentUser) return navigate('/login');
    vote.mutate(review.myVote === helpful ? null : helpful);
  };

  return (
    <div className="review">
      {isLoading ? (
        'loading'
      ) : error ? (
        'error'
      ) : (
        <div className="user">
          <img className="pp" src={data.img || '/img/noavatar.jpg'} alt="" />
          <div className="info">
            <span>{data.username}</span>
            <div className="country">
              <span>{data.location}</span>
            </div>
          </div>
        </div>
      )}
      <div className="stars">
        {Array(review.star)
          .fill()
          .map((item, i) => (
            <img src="/img/star.png" alt="" key={i} />
          ))}
        <span>{review.star}</span>
      </div>
      <p>{review.desc}</p>
      <div className="helpful">
        <span>Helpful?</span>
        <button
          type="button"
          className={review.myVote === true ? 'vote active' : 'vote'}
          aria-pressed={review.myVote === true}
          disabled={isOwn || vote.isPending}
          onClick={() => handleVote(true)}
        >
          <img src="/img/like.png" alt="" />
          Yes ({review.helpfulCount})
        </button>
        <button
          type="button"
          className={review.myVote === false ? 'vote active' : 'vote'}
          aria-pressed={review.myVote === false}
          disabled={isOwn || vote.isPending}
          onClick={() => handleVote(false)}
        >
          <img src="/img/dislike.png" alt="" />
          No ({review.notHelpfulCount})
        </button>
      </div>
    </div>
  );
};

export default Review;
