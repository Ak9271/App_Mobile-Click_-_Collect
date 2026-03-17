import { createContext, useContext, useMemo, useState } from "react";
import { toast } from "../lib/toast";

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function add(product) {
    setItems((prev) => {
      const existing = prev.find((cartItem) => cartItem.$id === product.$id);

      if (existing) {
        toast("Quantite +1");
        return prev.map((cartItem) =>
          cartItem.$id === product.$id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      toast("Produit ajoute au panier");
      return [{ ...product, quantity: 1 }, ...prev];
    });
  }

  function decrease(id) {
    setItems((prev) => {
      const target = prev.find((item) => item.$id === id);

      if (!target) return prev;
      if (target.quantity <= 1) {
        toast("Produit retire du panier");
        return prev.filter((item) => item.$id !== id);
      }

      return prev.map((item) =>
        item.$id === id ? { ...item, quantity: item.quantity - 1 } : item,
      );
    });
  }

  function increase(id) {
    setItems((prev) =>
      prev.map((item) =>
        item.$id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  function remove(id) {
    setItems((prev) => prev.filter((item) => item.$id !== id));
    toast("Produit retire du panier");
  }

  function clear() {
    if (!items.length) return;
    setItems([]);
    toast("Panier vide");
  }

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.priceValue || item.price || 0) * item.quantity,
        0,
      ),
    [items],
  );

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      count,
      total,
      add,
      remove,
      clear,
      decrease,
      increase,
    }),
    [items, count, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
