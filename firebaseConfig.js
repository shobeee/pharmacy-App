import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCTz6t5WMOgfoQ_gW2pxacG1xlcsGlMIJs",
  authDomain: "pharmacy-4514e.firebaseapp.com",
  projectId: "pharmacy-4514e",
  storageBucket: "pharmacy-4514e.firebasestorage.app",
  messagingSenderId: "237683995708",
  appId: "1:237683995708:web:43d9f905e7da88eb6b3f39",
  measurementId: "G-TBKSYLES9W"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore explicitly without any extra logic
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const functions = getFunctions(app, "us-central1");