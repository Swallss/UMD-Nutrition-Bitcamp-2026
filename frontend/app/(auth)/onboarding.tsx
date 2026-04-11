import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { auth } from '@/lib/firebase';
import {
  fetchUserProfile,
  saveUserProfile,
  type ActivityLevel,
  type GoalType,
  type Sex,
  type UserProfile,
} from '@/lib/firestore';

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  low: 'Low',
  light: 'Light',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
};
const GOAL_LABELS: Record<GoalType, string> = {
  lose_weight: 'Lose Weight',
  maintain_weight: 'Maintain',
  gain_weight: 'Gain Weight',
};
const SEX_LABELS: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/login' as any);
      return;
    }
    fetchUserProfile(user.uid).then(setProfile).catch(() => undefined);
  }, []);

  const updateMetric = <K extends keyof UserProfile['metrics']>(key: K, value: UserProfile['metrics'][K]) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, metrics: { ...prev.metrics, [key]: value } };
    });
  };

  const handleContinue = async () => {
    const user = auth.currentUser;
    if (!user || !profile) return;

    try {
      setIsSaving(true);
      await saveUserProfile(user.uid, profile);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
    >
      <Text style={styles.title}>Set your goals</Text>
      <Text style={styles.subtitle}>A few details help us calculate your daily calories and macros.</Text>

      <View style={styles.card}>
        <NumberField
          label="Height"
          suffix="in"
          value={profile.metrics.height_in}
          onChange={(value) => updateMetric('height_in', value)}
        />
        <NumberField
          label="Current weight"
          suffix="lbs"
          value={profile.metrics.current_weight_lbs}
          onChange={(value) => updateMetric('current_weight_lbs', value)}
        />
        <NumberField
          label="Target weight"
          suffix="lbs"
          value={profile.metrics.target_weight_lbs}
          onChange={(value) => updateMetric('target_weight_lbs', value)}
        />
        <NumberField
          label="Age"
          suffix="yrs"
          value={profile.metrics.age}
          onChange={(value) => updateMetric('age', value)}
        />

        <SelectorRow label="Sex" options={Object.keys(SEX_LABELS) as Sex[]} labels={SEX_LABELS} value={profile.metrics.sex} onSelect={(value) => updateMetric('sex', value)} />
        <SelectorRow label="Activity" options={Object.keys(ACTIVITY_LABELS) as ActivityLevel[]} labels={ACTIVITY_LABELS} value={profile.metrics.activity_level} onSelect={(value) => updateMetric('activity_level', value)} />
        <SelectorRow label="Goal" options={Object.keys(GOAL_LABELS) as GoalType[]} labels={GOAL_LABELS} value={profile.metrics.goal_type} onSelect={(value) => updateMetric('goal_type', value)} />
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleContinue} disabled={isSaving}>
        <Text style={styles.ctaText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(value)}
          onChangeText={(text) => onChange(parseInt(text, 10) || value)}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function SelectorRow<T extends string>({
  label,
  options,
  labels,
  value,
  onSelect,
}: {
  label: string;
  options: T[];
  labels: Record<T, string>;
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((option) => {
          const active = option === value;
          return (
            <TouchableOpacity key={option} onPress={() => onSelect(option)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{labels[option]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 34,
    color: Colors.onSurface,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  field: { gap: 8 },
  fieldLabel: {
    fontFamily: FONTS.extraBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.input,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onSurface,
    paddingVertical: 12,
  },
  suffix: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  selectorGroup: { gap: 8 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.chip,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: Colors.secondaryFixed },
  chipText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  chipTextActive: { color: Colors.onSecondaryFixed },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
});
