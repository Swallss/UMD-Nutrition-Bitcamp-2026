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
import { Colors, FONTS, Radii } from '@/constants/Colors';
import { auth } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/firestore';

// Lazy-load the native Google Sign-In library so it is never required on web
// (the module contains native code that doesn't exist in the web bundle).
let _GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
let _statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gs = require('@react-native-google-signin/google-signin');
  _GoogleSignin = gs.GoogleSignin;
  _statusCodes  = gs.statusCodes;
  _GoogleSignin!.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      '263060087857-menbal4r8rv9t5hdpfks3fj3k0rsb5p9.apps.googleusercontent.com',
  });
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Prevent double-navigation (onAuthStateChanged + sign-in handler can both fire).
  const hasRouted = useRef(false);

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

    // Native (iOS / Android) — @react-native-google-signin/google-signin
    if (!_GoogleSignin) {
      Alert.alert('Not ready', 'Google sign-in is still initialising. Please try again.');
      return;
    }
    try {
      setIsSigningIn(true);
      await _GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      const { data } = await _GoogleSignin.signIn();
      const credential = GoogleAuthProvider.credential(data?.idToken ?? null);
      const { user } = await signInWithCredential(auth, credential);
      await routeAfterGoogle(user);
    } catch (error: any) {
      if (error?.code !== _statusCodes?.SIGN_IN_CANCELLED) {
        Alert.alert('Sign-in failed', error instanceof Error ? error.message : 'Please try again.');
      }
      hasRouted.current = false;
      setIsSigningIn(false);
    }
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
