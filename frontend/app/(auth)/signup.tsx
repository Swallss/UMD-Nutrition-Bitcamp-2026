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

type Field = 'name' | 'email' | 'password' | 'confirm';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [focused, setFocused] = useState<Field | null>(null);

  const handleCreate = () => {
    router.replace('/(tabs)');
  };

  const inputStyle = (field: Field) => [
    styles.inputWrap,
    focused === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
          <HeroPattern opacity={0.14} />
          <Text style={styles.wordmark}>UMD Nutrition</Text>
          <Text style={styles.tagline}>Join thousands of Terps eating smarter.</Text>
        </View>

        {/* ── Form card ─────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subheading}>It only takes a minute</Text>

          <View style={styles.fields}>
            <View style={inputStyle('name')}>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={Colors.onSurfaceVariant}
                autoCapitalize="words"
                autoComplete="name"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={inputStyle('email')}>
              <TextInput
                style={styles.input}
                placeholder="UMD email address"
                placeholderTextColor={Colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={inputStyle('password')}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.onSurfaceVariant}
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={inputStyle('confirm')}>
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colors.onSurfaceVariant}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
              />
            </View>
          </View>

          {/* Create Account CTA */}
          <TouchableOpacity style={styles.cta} onPress={handleCreate} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Create Account</Text>
          </TouchableOpacity>

          {/* Sign-in link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.loginLink}>Sign in</Text>
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

  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 64,
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
    minHeight: 580,
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

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  loginPrompt: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  loginLink: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
