"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
  currency?: 'IDR' | 'USD' | null;
  unitPriceEstimate?: number | null;
  quantity: number;
};

interface CartContextType {
  items: CartItem[];
  count: number;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'tic_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem: CartContextType['addItem'] = (item, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === item.productId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: Math.min(9999, copy[idx].quantity + qty) };
        return copy;
      }
      return [...prev, { ...item, quantity: Math.max(1, qty) }];
    });
  };

  const removeItem: CartContextType['removeItem'] = (productId) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const updateQty: CartContextType['updateQty'] = (productId, qty) => {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, quantity: Math.max(1, qty) } : it)));
  };

  const clear = () => setItems([]);

  const value = useMemo(() => ({
    items,
    count: items.reduce((sum, it) => sum + (it.quantity || 0), 0),
    addItem,
    removeItem,
    updateQty,
    clear,
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
