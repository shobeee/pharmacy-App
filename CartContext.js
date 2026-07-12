// CartContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const CartContext = createContext();
const CART_STORAGE_KEY = '@al_shifa_pharmacy_cart';

export function CartProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isStorageReady, setIsStorageReady] = useState(false);

  // Load cart from storage on startup
  useEffect(() => {
    async function loadData() {
      try {
        const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.log('Error loading data:', error);
      } finally {
        setIsStorageReady(true);
      }
    }
    loadData();
  }, []);

  // Sync Cart to storage
  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems, isStorageReady]);

  // Standard Cart Functions
  const addToCart = (product, quantity = 1) => {
    if (product.isOutOfStock) return;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (id) => setCartItems((prev) => prev.filter((i) => i.id !== id));
  const updateQuantity = (id, qty) => setCartItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  const clearCart = () => setCartItems([]);
  const getCartTotal = () => cartItems.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);
  const getCartCount = () => cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Upgraded placeOrder with Firebase Integration
  const placeOrder = async (user) => {
    const orderData = {
      customerEmail: user.email,
      items: cartItems,
      total: getCartTotal(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      // Send to Cloud
      await addDoc(collection(db, "orders"), orderData);
      
      // Clear local state
      clearCart();
      alert("Order placed and synced to cloud!");
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Order saved, but failed to sync to cloud.");
    }
  };

  return (
    <CartContext.Provider value={{ 
      cart: cartItems, 
      orders,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      placeOrder, 
      getCartTotal, 
      getCartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);