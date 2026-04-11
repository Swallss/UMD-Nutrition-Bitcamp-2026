import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
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

const asyncStoragePersistence = {
  type: 'LOCAL',
  async _isAvailable() {
    const testKey = 'firebase-auth-storage-test';
    try {
      await AsyncStorage.setItem(testKey, '1');
      await AsyncStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
  async _set(key: string, value: unknown) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async _get<T>(key: string) {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  },
  async _remove(key: string) {
    await AsyncStorage.removeItem(key);
  },
  _addListener() {},
  _removeListener() {},
};

const createAuth = (): Auth => {
  if (Platform.OS === 'web') return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: asyncStoragePersistence as never,
    });
  } catch {
    return getAuth(app);
  }
};

export const auth = createAuth();
export const db = getFirestore(app);

export default app;
