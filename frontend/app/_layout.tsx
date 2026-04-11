import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { onAuthStateChanged } from 'firebase/auth';
import 'react-native-reanimated';
import { auth } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [authChecked, setAuthChecked] = useState(false);
  // Only act on sign-OUT after the initial routing decision is made.
  const initialRouteDone = useRef(false);

  useEffect(() => {
    if (!fontsLoaded) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);

      if (!initialRouteDone.current) {
        initialRouteDone.current = true;
        SplashScreen.hideAsync();
        if (!user) {
          // Not signed in — go to login.
          router.replace('/(auth)/login' as any);
        }
        // If signed in, (tabs)/index is the default route — stay there.
      } else if (!user) {
        // User signed out mid-session — send back to login.
        router.replace('/(auth)/login' as any);
      }
    });
    return unsubscribe;
  }, [fontsLoaded]);

  // On native: keep splash visible while fonts + auth are resolving.
  // On web: never return null — the browser has no splash screen, so null = blank page.
  // Instead, render the Stack immediately and overlay a loader until ready.
  if (!fontsLoaded) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
      </Stack>

      {/* Full-screen loading overlay while Firebase resolves auth state.
          Prevents a flash of whichever tab loads first before routing to login. */}
      {!authChecked && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
