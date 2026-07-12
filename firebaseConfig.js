import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { APP_CONFIG } from "./appConfig";

const app = initializeApp(APP_CONFIG.firebase);

export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const functions = getFunctions(app, "us-central1");
