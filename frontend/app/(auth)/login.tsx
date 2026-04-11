import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { HeroPattern } from '@/components/HeroPattern';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSignIn = () => {
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <HeroPattern opacity={0.14} />
          <Text style={styles.wordmark}>UMD Nutrition</Text>
          <Text style={styles.tagline}>Track every meal. Fuel every day.</Text>
        </View>

        {/* ── Form card (overlaps hero) ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to your account</Text>

          <View style={styles.fields}>
            {/* Email */}
            <View style={[styles.inputWrap, emailFocused && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrap, passwordFocused && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.onSurfaceVariant}
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In CTA */}
          <TouchableOpacity style={styles.cta} onPress={handleSignIn} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Sign In</Text>
          </TouchableOpacity>

          {/* Signup link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>New here? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={styles.signupLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  // Hero
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

  // Card
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
    marginTop: -Radii.card,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    minHeight: 520,
  },
  heading: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xl,
  },

  fields: { gap: 12 },

  // Soft-fill input — surfaceContainerHighest bg, no border by default
  inputWrap: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.input,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.primary,
  },
  input: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: Colors.onSurface,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 4 },
  forgotText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },

  // Primary CTA — full-width red pill
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
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

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  signupPrompt: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  signupLink: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
