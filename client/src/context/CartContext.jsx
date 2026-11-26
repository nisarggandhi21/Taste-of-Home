import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

// The cart lives in the browser. It holds dishes from one cook at a time, because each cook
// delivers their own food and an order has exactly one seller.
//
//   { sellerId, items: [{ itemId, title, img, price, quantity }] }
//
// Prices here are only what the buyer saw when adding; the API works out the real total.

export const MAX_QUANTITY = 20;
const STORAGE_KEY = 'cart';
const EMPTY = { sellerId: null, items: [] };

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.items)) return saved;
  } catch {
    // Unreadable or unavailable storage: start with an empty cart.
  }
  return EMPTY;
};

const clamp = (quantity) => Math.max(1, Math.min(MAX_QUANTITY, quantity));

export const CartContext = createContext({ ...EMPTY, count: 0, subtotal: 0 });

export const CartContextProvider = ({ children }) => {
  const [cart, setCart] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // The cart still works for this visit.
    }
  }, [cart]);

  // True when the dish comes from a different cook than what is already in the cart.
  const isOtherSeller = useCallback(
    (item) => cart.items.length > 0 && cart.sellerId !== item.userId,
    [cart]
  );

  // Adds a dish (an item as the API returns it). With `replace`, the cart is emptied first;
  // callers use that after asking the buyer when the dish is from another cook.
  const add = useCallback((item, quantity = 1, { replace = false } = {}) => {
    setCart((prev) => {
      const base = replace || prev.sellerId !== item.userId ? EMPTY : prev;
      const existing = base.items.find((line) => line.itemId === item._id);
      const items = existing
        ? base.items.map((line) =>
            line.itemId === item._id ? { ...line, quantity: clamp(line.quantity + quantity) } : line
          )
        : [
            ...base.items,
            {
              itemId: item._id,
              title: item.title,
              img: item.cover,
              price: item.price,
              quantity: clamp(quantity),
            },
          ];
      return { sellerId: item.userId, items };
    });
  }, []);

  const setQuantity = useCallback((itemId, quantity) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((line) =>
        line.itemId === itemId ? { ...line, quantity: clamp(quantity) } : line
      ),
    }));
  }, []);

  const remove = useCallback((itemId) => {
    setCart((prev) => {
      const items = prev.items.filter((line) => line.itemId !== itemId);
      return items.length ? { ...prev, items } : EMPTY;
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo(
    () => ({
      ...cart,
      count: cart.items.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: cart.items.reduce((sum, line) => sum + line.price * line.quantity, 0),
      isOtherSeller,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [cart, isOtherSeller, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
