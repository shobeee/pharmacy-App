import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth, db } from './firebaseConfig'; // If in root, ensure it's up one level correctly
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

// YOUR ORIGINAL BYPASS LOGIC
const IS_BYPASS_ENABLED = false; 
const MOCK_USER = {
  uid: 'dev-bypass-123',
  name: 'Shoaib Latif Qureshi',
  email: 'shoaib@developer.com',
  role: 'admin'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(IS_BYPASS_ENABLED ? MOCK_USER : null);
  const [loading, setLoading] = useState(!IS_BYPASS_ENABLED);

  // Add this check at the top of your AuthProvider
useEffect(() => {
  console.log("Auth Provider Initialized. Current User:", auth.currentUser);
}, []);

  // 1. Firebase Auth Listener (Restored)
  useEffect(() => {
    if (IS_BYPASS_ENABLED) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Signal that auth check is complete
    });
    return unsubscribe;
  }, []);

  // 2. Kill Switch Listener (Restored)
  useEffect(() => {
    if (IS_BYPASS_ENABLED) return;

    const unsubscribe = onSnapshot(doc(db, "AppConfig", "Settings"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().isLocked) {
        if (auth.currentUser) {
          auth.signOut();
          Alert.alert("Access Restricted", "This app has been locked by the administrator.");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Auth Methods (Restored)
// In AuthContext.js
const login = async (email, password) => {
  if (IS_BYPASS_ENABLED) {
    setUser(MOCK_USER);
    return { user: MOCK_USER };
  }
  
  try {
    console.log("Attempting login for:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // If successful, the onAuthStateChanged listener in useEffect 
    // will automatically trigger and update the state.
    console.log("Login successful! User UID:", userCredential.user.uid);
    return userCredential;
    
  } catch (error) {
    console.error("Login Error details:", error.code, error.message);
    Alert.alert("Login Failed", error.message);
    throw error; // Re-throw to handle in LoginScreen
  }
};

  const logout = async () => {
    if (IS_BYPASS_ENABLED) {
      setUser(null);
    } else {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);