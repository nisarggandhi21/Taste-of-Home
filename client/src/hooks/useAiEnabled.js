import { useQuery } from '@tanstack/react-query';
import { aiService } from '../services/aiService';

// Whether the AI features are set up on the server. Everything AI-related in the client is
// hidden when they are not, so the site looks and works the same without them.
export const useAiEnabled = () => {
  const { data } = useQuery({
    queryKey: ['aiStatus'],
    queryFn: aiService.getStatus,
    staleTime: 5 * 60 * 1000,
  });
  return !!data?.enabled;
};
