import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/aiService';
import './ReviewSummary.scss';

// "What buyers say": an AI summary of this dish's reviews, shown once there are a few.
// `reviewCount` is part of the cache key so a new review fetches a fresh summary.
const ReviewSummary = ({ itemId, reviewCount }) => {
  const { data: summary } = useQuery({
    queryKey: ['reviewSummary', itemId, reviewCount],
    queryFn: () => aiService.getReviewSummary(itemId),
    enabled: reviewCount >= 3,
    staleTime: 5 * 60 * 1000,
  });

  if (!summary) return null;

  return (
    <div className="reviewSummary">
      <h3>What buyers say</h3>
      <p>{summary.text}</p>
      {(summary.pros.length > 0 || summary.cons.length > 0) && (
        <div className="points">
          {summary.pros.map((point) => (
            <span className="point pro" key={`pro-${point}`}>
              + {point}
            </span>
          ))}
          {summary.cons.map((point) => (
            <span className="point con" key={`con-${point}`}>
              &minus; {point}
            </span>
          ))}
        </div>
      )}
      <span className="source">
        Summarised by AI from {summary.reviewCount} reviews. Read them below.
      </span>
    </div>
  );
};

export default ReviewSummary;
