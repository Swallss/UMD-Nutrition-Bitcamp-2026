import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithRedirect,
  type User,
} from 'firebase/auth';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { HeroPattern } from '@/components/HeroPattern';
import { auth } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/firestore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    '263060087857-menbal4r8rv9t5hdpfks3fj3k0rsb5p9.apps.googleusercontent.com';
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? googleClientId,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? googleClientId,
  });

  const routeAfterGoogle = async (user: User) => {
    const { needsOnboarding } = await ensureUserProfile(user);
    router.replace((needsOnboarding ? '/(auth)/onboarding' : '/(tabs)') as any);
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !isMounted) return;
      try {
        await routeAfterGoogle(user);
      } catch (error) {
        Alert.alert('Could not load account', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        if (isMounted) setIsSigningIn(false);
      }
    });

    if (Platform.OS === 'web') {
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user && isMounted) routeAfterGoogle(result.user);
        })
        .catch((error) => {
          if (isMounted) {
            Alert.alert('Could not finish Google sign-in', error instanceof Error ? error.message : 'Please try again.');
          }
        });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    if (Platform.OS === 'web') {
      try {
        setIsSigningIn(true);
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } catch (error) {
        Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Please try again.');
        setIsSigningIn(false);
      } finally {
        // Redirect auth navigates away from this page on success.
      }
      return;
    }

    if (!request) {
      Alert.alert('Google sign-in is not ready', 'Please try again after Expo finishes loading auth.');
      return;
    }
    setIsSigningIn(true);
    await promptAsync();
  };

  useEffect(() => {
    const finishSignIn = async () => {
      if (response?.type !== 'success') {
        if (response?.type) setIsSigningIn(false);
        return;
      }

      try {
        const idToken = response.params.id_token;
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await routeAfterGoogle(result.user);
      } catch (error) {
        Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setIsSigningIn(false);
      }
    };

    finishSignIn();
  }, [response]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <HeroPattern opacity={0.14} />
          <Text style={styles.wordmark}>UMD Nutrition</Text>
          <Text style={styles.tagline}>Track every meal. Fuel every day.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in with your Google account.</Text>

          <TouchableOpacity style={styles.cta} onPress={handleSignIn} activeOpacity={0.85} disabled={isSigningIn}>
            {isSigningIn ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.ctaText}>Continue with Google</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 72,
    alignItems: 'flex-start',
    gap: 8,
    overflow: 'hidden',
  },
  wordmark: {
    fontFamily: FONTS.extraBold,
    fontSize: 38,
    color: Colors.onPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
    marginTop: -Radii.card,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    minHeight: 420,
    gap: Spacing.lg,
  },
  heading: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    color: Colors.onSurface,
  },
  subheading: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    color: Colors.onPrimary,
    letterSpacing: 0.5,
  },
});
