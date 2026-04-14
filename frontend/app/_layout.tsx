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

// Runs as soon as file is imported; make sure the user doesn't see incomplete UI
SplashScreen.preventAutoHideAsync();


// Main overall layout of the app 
export default function RootLayout() {

  // Load font files to render
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [authChecked, setAuthChecked] = useState(false);
  // useRef is like useState but doesn't cause the page to re-render when updated.
  // basically used as a flag
  const initialRouteDone = useRef(false);

  // useEffect(function, [fontsLoaded]) runs function after the component renders
  // & whenever fontsLoaded changes. Return value is a cleanup function that ensures
  // security
  useEffect(() => {
    // Don't do anything until fonts load
    if (!fontsLoaded) return;
    // cleanup function is the function returned from onAuthStateChanged; make sure the app doesn't render any
    // route before knowing if the user is authenticated
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);

      // If we haven't run this once, run it
      if (!initialRouteDone.current) {
        // ensure it's not run again
        initialRouteDone.current = true;
        // get rid of splash screen
        SplashScreen.hideAsync();
        if (!user) {
          // Not signed in/Go to login
          router.replace('/(auth)/login' as any);
        }
        // If signed in, (tabs)/index is the default route; stay there
      } else if (!user) {
        // User signed out mid-session; send back to login
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
    {// all of the options for screens:
    // (auth) -> login
    // (tabs) -> main app pages themselves
    // modal -> unused (testing)
    // This is necessary to define transitions between routes, not for rendering
    }
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
      </Stack>

     { // Full-screen loading overlay while Firebase resolves auth state.
       // Prevents a flash of whichever tab loads first before routing to login.
     }
      {!authChecked && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <StatusBar style="dark" />
    </>
  );
}

// Spinny loading screen styling
const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
