import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { userService } from '../services/userService';

// The logged-in user's saved items, and a way to save or unsave one.
export const useFavourites = () => {
  const { currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['favourites'],
    queryFn: userService.getFavourites,
    enabled: !!currentUser,
  });
  const items = data || [];
  const ids = new Set(items.map((item) => item._id));

  const mutation = useMutation({
    mutationFn: (itemId) =>
      ids.has(itemId) ? userService.removeFavourite(itemId) : userService.addFavourite(itemId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favourites'] }),
  });

  return {
    items,
    isLoading,
    isLoggedIn: !!currentUser,
    isFavourite: (itemId) => ids.has(itemId),
    toggle: (itemId) => mutation.mutate(itemId),
  };
};
