import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCVUZ45f23y5kgfGI8b33pwqCVB3h4poYI',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'neeks-bitcamp-2026.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'neeks-bitcamp-2026',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'neeks-bitcamp-2026.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '263060087857',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:263060087857:web:cfd59c16fbbf552163e110',
};

const app = initializeApp(firebaseConfig);

const createAuth = (): Auth => {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if called more than once (e.g. hot reload) — fall back to getAuth.
    return getAuth(app);
  }
};

export const auth = createAuth();
export const db = getFirestore(app);

export default app;
