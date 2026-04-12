import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Colors, FONTS, Radii } from '@/constants/Colors';
import { auth } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/firestore';

// Required for expo-auth-session to close the browser tab after redirect on native.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Prevent double-navigation (onAuthStateChanged + sign-in handler can both fire).
  const hasRouted = useRef(false);

  // expo-auth-session Google provider — routes through auth.expo.io proxy so
  // Google sees a valid https:// redirect URI regardless of network/IP.
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: 'https://auth.expo.io/@eabou/umd-nutrition',
  });

  // ── Core navigation after a successful Google sign-in ────────────────────────
  const routeAfterGoogle = async (user: User) => {
    if (hasRouted.current) return;
    hasRouted.current = true;

    let needsOnboarding = true;
    try {
      const result = await ensureUserProfile(user);
      needsOnboarding = result.needsOnboarding;
    } catch (err) {
      const created  = new Date(user.metadata.creationTime  ?? 0).getTime();
      const lastSign = new Date(user.metadata.lastSignInTime ?? 0).getTime();
      const isNew    = Math.abs(lastSign - created) < 10_000;
      needsOnboarding = isNew;
      console.warn(
        '[Login] ensureUserProfile failed — Firestore security rules may be blocking writes.\n' +
        'Add this rule in Firebase Console > Firestore > Rules:\n' +
        '  match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }\n' +
        'Error:', err,
      );
    }

    router.replace((needsOnboarding ? '/(auth)/onboarding' : '/(tabs)') as any);
  };

  // ── If already signed in when this screen mounts, skip to tabs ───────────────
  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !active) return;
      await routeAfterGoogle(user);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // ── Handle expo-auth-session response (native) ────────────────────────────────
  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) {
        Alert.alert('Sign-in failed', 'No access token returned. Please try again.');
        setIsSigningIn(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(null, accessToken);
      signInWithCredential(auth, credential)
        .then(({ user }) => routeAfterGoogle(user))
        .catch((error) => {
          Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.');
          hasRouted.current = false;
          setIsSigningIn(false);
        });
    } else if (response?.type === 'error') {
      Alert.alert('Sign-in failed', response.error?.message ?? 'Please try again.');
      setIsSigningIn(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setIsSigningIn(false);
    }
  }, [response]);

  // ── Button handler ────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (Platform.OS === 'web') {
      // Web: signInWithPopup is reliable — no full-page navigation, state preserved.
      try {
        setIsSigningIn(true);
        const provider = new GoogleAuthProvider();
        const { user } = await signInWithPopup(auth, provider);
        await routeAfterGoogle(user);
      } catch (error: any) {
        if (
          error?.code !== 'auth/popup-closed-by-user' &&
          error?.code !== 'auth/cancelled-popup-request'
        ) {
          Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.');
        }
        hasRouted.current = false;
        setIsSigningIn(false);
      }
      return;
    }

    // Native (iOS/Android) — expo-auth-session opens a browser tab, no native module needed.
    setIsSigningIn(true);
    await promptAsync();
    // Result is handled in the useEffect above watching `response`.
  };

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.textBlock}>
        <Text style={styles.appName}>UMD{'\n'}Nutrition</Text>
        <Text style={styles.tagline}>Track every meal.{'\n'}Fuel every day.</Text>
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={handleSignIn}
        activeOpacity={0.85}
        disabled={isSigningIn}
      >
        {isSigningIn ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text style={styles.ctaText}>Continue with Google</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>Sign in with your UMD Google account.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  textBlock: {
    alignItems: 'center',
    gap: 16,
  },
  appName: {
    fontFamily: FONTS.extraBold,
    fontSize: 56,
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 60,
  },
  tagline: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    lineHeight: 26,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onPrimary,
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
});
