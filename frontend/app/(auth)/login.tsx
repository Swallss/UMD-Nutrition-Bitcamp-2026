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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { Colors, FONTS, Radii } from '@/constants/Colors';
import { auth } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/firestore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Prevent double-navigation (onAuthStateChanged + response useEffect can both fire).
  const hasRouted = useRef(false);

  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    '263060087857-menbal4r8rv9t5hdpfks3fj3k0rsb5p9.apps.googleusercontent.com';

  // Native-only: expo-auth-session handles the OAuth flow on iOS/Android.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    webClientId: webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // ── Core navigation after a successful Google sign-in ────────────────────────
  // Always navigates forward, even if the Firestore profile write fails.
  // Firebase Auth has already created/verified the user before this is called.
  const routeAfterGoogle = async (user: User) => {
    if (hasRouted.current) return;
    hasRouted.current = true;

    let needsOnboarding = false;
    try {
      // ensureUserProfile creates/updates the user doc in Firestore `users` collection.
      // New Firebase Auth users are created automatically by signInWithPopup /
      // signInWithCredential — no extra code needed for that.
      const result = await ensureUserProfile(user);
      needsOnboarding = result.needsOnboarding;
    } catch (err) {
      // Firestore write failed (permissions not set up yet, or offline).
      // Still navigate — profile will be lazily created on next successful write.
      console.warn('[Login] ensureUserProfile failed, continuing anyway:', err);
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

  // ── Native: finish credential exchange after expo-auth-session response ───────
  useEffect(() => {
    if (!response) return;
    if (response.type === 'cancel' || response.type === 'dismiss') {
      setIsSigningIn(false);
      return;
    }
    if (response.type !== 'success') {
      setIsSigningIn(false);
      Alert.alert('Sign-in cancelled', 'Please try again.');
      return;
    }
    (async () => {
      try {
        const { id_token } = response.params;
        const credential = GoogleAuthProvider.credential(id_token);
        // signInWithCredential automatically creates a new Firebase Auth user
        // if this Google account has never signed in before.
        const { user } = await signInWithCredential(auth, credential);
        await routeAfterGoogle(user);
      } catch (error) {
        Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.');
        hasRouted.current = false; // allow retry
        setIsSigningIn(false);
      }
    })();
  }, [response]);

  // ── Button handler ────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (Platform.OS === 'web') {
      // signInWithPopup is far more reliable than signInWithRedirect for web:
      // it opens a small window, completes OAuth, then closes — no full-page
      // navigation means the app state is preserved and onAuthStateChanged fires
      // cleanly. New Google accounts are automatically added to Firebase Auth.
      try {
        setIsSigningIn(true);
        const provider = new GoogleAuthProvider();
        const { user } = await signInWithPopup(auth, provider);
        await routeAfterGoogle(user);
      } catch (error: any) {
        // popup_closed_by_user is not a real error — user just closed the popup.
        if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
          Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.');
        }
        hasRouted.current = false;
        setIsSigningIn(false);
      }
      return;
    }

    // Native (iOS / Android)
    if (!request) {
      Alert.alert('Not ready', 'Google sign-in is still initialising. Please try again in a moment.');
      return;
    }
    setIsSigningIn(true);
    await promptAsync();
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
