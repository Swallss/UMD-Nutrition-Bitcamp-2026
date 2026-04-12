import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { auth } from '@/lib/firebase';
import {
  fetchUserProfile,
  getDefaultProfile,
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
const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  low: 'Mostly sedentary: little to no structured exercise, desk job, minimal walking.',
  light: 'Light activity: light exercise 1-2 days/week or regular walking.',
  moderate: 'Moderately active: exercise 3-4 days/week or active daily routines.',
  high: 'Highly active: intense exercise 5-6 days/week or a very active job.',
  very_high: 'Very high activity: professional athlete level or very physical daily work.',
};
const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
  extreme_weight_loss: 'Aggressive plan aimed at rapid loss. Typically >1.0 lb/week — requires strict calorie deficit and monitoring.',
  moderate_weight_loss: 'Steady weight loss plan. Around 0.5-1.0 lb/week with moderate calorie deficit and regular activity.',
  maintain_weight: 'Maintain current weight — we will calculate calories to keep you stable.',
  moderate_weight_gain: 'Controlled weight gain plan. Aim for gradual increase (~0.5 lb/week) with increased calories and strength training.',
  extreme_weight_gain: 'Faster weight gain approach for significant mass increase; higher calorie surplus and training required.',
};
const GOAL_LABELS: Record<GoalType, string> = {
  extreme_weight_loss: 'Extreme Weight Loss',
  moderate_weight_loss: 'Moderate Weight Loss',
  maintain_weight: 'Maintain Weight',
  moderate_weight_gain: 'Moderate Weight Gain',
  extreme_weight_gain: 'Extreme Weight Gain',
};
const SEX_LABELS: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other / Prefer not to say',
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const pageCount = 4; // metrics + sex + activity + goal
  const scrollX = useRef(new Animated.Value(0)).current; // will be used as translateX
  const [page, setPage] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/login' as any);
      return;
    }
    fetchUserProfile(user.uid)
      .then(setProfile)
      .catch(() => setProfile(getDefaultProfile(user)));
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

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.medium, color: Colors.onSurfaceVariant }}>Setting up your profile…</Text>
      </View>
    );
  }

  // Desktop / wide layout: keep original single-page ScrollView
  if (!isMobile) {
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
            placeholder="e.g. 73"
            suffix="in"
            value={profile.metrics.height_in}
            onChange={(value) => updateMetric('height_in', value)}
          />
          <NumberField
            label="Current weight"
            placeholder="e.g. 210"
            suffix="lbs"
            value={profile.metrics.current_weight_lbs}
            onChange={(value) => updateMetric('current_weight_lbs', value)}
          />
          <NumberField
            label="Target weight"
            placeholder="e.g. 180"
            suffix="lbs"
            value={profile.metrics.target_weight_lbs}
            onChange={(value) => updateMetric('target_weight_lbs', value)}
          />
          <NumberField
            label="Age"
            placeholder="e.g. 20"
            suffix="yrs"
            value={profile.metrics.age}
            onChange={(value) => updateMetric('age', value)}
          />

          <SelectorRow label="Sex" options={Object.keys(SEX_LABELS) as Sex[]} labels={SEX_LABELS} value={profile.metrics.sex} onSelect={(value) => updateMetric('sex', value)} />
          <SelectorRow label="Activity" options={Object.keys(ACTIVITY_LABELS) as ActivityLevel[]} labels={ACTIVITY_LABELS} value={profile.metrics.activity_level} onSelect={(value) => updateMetric('activity_level', value)} />
          <Text style={styles.activityDescription}>{ACTIVITY_DESCRIPTIONS[profile.metrics.activity_level ?? 'moderate']}</Text>
          <SelectorRow label="Goal" options={Object.keys(GOAL_LABELS) as GoalType[]} labels={GOAL_LABELS} value={profile.metrics.goal_type} onSelect={(value) => updateMetric('goal_type', value)} />
          <Text style={styles.activityDescription}>{GOAL_DESCRIPTIONS[profile.metrics.goal_type ?? 'maintain_weight']}</Text>
        </View>

        <TouchableOpacity style={styles.cta} onPress={handleContinue} disabled={isSaving}>
          <Text style={styles.ctaText}>{isSaving ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Mobile: split into multiple pages; navigation controlled by Continue button
  const pageWidth = width - Spacing.lg * 2; // content padding is applied by container

  const translateX = scrollX.interpolate({ inputRange: [0, pageWidth * (pageCount - 1)], outputRange: [0, -pageWidth * (pageCount - 1)], extrapolate: 'clamp' });

  const goToPage = (next: number) => {
    const toValue = next * pageWidth * -1;
    Animated.timing(scrollX, { toValue, duration: 350, useNativeDriver: false }).start();
    setPage(next);
  };

  const onPressContinue = () => {
    if (page < pageCount - 1) {
      goToPage(page + 1);
      return;
    }
    handleContinue();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <View style={[styles.content, { paddingHorizontal: Spacing.lg }] as any}>
        <Text style={styles.title}>Set your goals</Text>
        <Text style={styles.subtitle}>A few details help us calculate your daily calories and macros.</Text>

        <View style={{ overflow: 'hidden' }}>
          <Animated.View style={{ flexDirection: 'row', width: pageWidth * pageCount, transform: [{ translateX: scrollX }] }}>
            <View style={[styles.card, { width: pageWidth }]}>
              <NumberField
                label="Height"
                placeholder="e.g. 73"
                suffix="in"
                value={profile.metrics.height_in}
                onChange={(value) => updateMetric('height_in', value)}
              />
              <NumberField
                label="Current weight"
                placeholder="e.g. 210"
                suffix="lbs"
                value={profile.metrics.current_weight_lbs}
                onChange={(value) => updateMetric('current_weight_lbs', value)}
              />
              <NumberField
                label="Target weight"
                placeholder="e.g. 180"
                suffix="lbs"
                value={profile.metrics.target_weight_lbs}
                onChange={(value) => updateMetric('target_weight_lbs', value)}
              />
              <NumberField
                label="Age"
                placeholder="e.g. 20"
                suffix="yrs"
                value={profile.metrics.age}
                onChange={(value) => updateMetric('age', value)}
              />
            </View>

            <View style={[styles.card, { width: pageWidth }]}>
              <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Sex</Text>
              <Text style={[styles.subtitle, { marginBottom: 12 }]}>Used to estimate body composition and calorie needs. Choose the option that best describes you.</Text>
              <SelectorRow label="" options={Object.keys(SEX_LABELS) as Sex[]} labels={SEX_LABELS} value={profile.metrics.sex} onSelect={(value) => updateMetric('sex', value)} />
            </View>

            <View style={[styles.card, { width: pageWidth }]}>
              <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Activity</Text>
              <Text style={[styles.subtitle, { marginBottom: 12 }]}>How active you are on a typical day. Pick the level that most closely matches your weekly routine.</Text>
              <SelectorRow label="" options={Object.keys(ACTIVITY_LABELS) as ActivityLevel[]} labels={ACTIVITY_LABELS} value={profile.metrics.activity_level} onSelect={(value) => updateMetric('activity_level', value)} />
              <Text style={styles.activityDescription}>{ACTIVITY_DESCRIPTIONS[profile.metrics.activity_level ?? 'moderate']}</Text>
            </View>

            <View style={[styles.card, { width: pageWidth }]}>
              <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Goal</Text>
              <Text style={[styles.subtitle, { marginBottom: 12 }]}>Your primary goal for the app — weight loss, maintenance, or gain. Tap a choice to learn more and select it.</Text>
              <SelectorRow label="" options={Object.keys(GOAL_LABELS) as GoalType[]} labels={GOAL_LABELS} value={profile.metrics.goal_type} onSelect={(value) => updateMetric('goal_type', value)} />
              <Text style={styles.activityDescription}>{GOAL_DESCRIPTIONS[profile.metrics.goal_type ?? 'maintain_weight']}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Page indicator */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          {Array.from({ length: pageCount }).map((_, i) => {
            const inputRange = [ -pageWidth * (i + 1), -pageWidth * i, -pageWidth * (i - 1) ];
            const dotScale = scrollX.interpolate({ inputRange, outputRange: [1, 1.6, 1], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
            return (
              <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.onSurface, transform: [{ scale: dotScale }], opacity }} />
            );
          })}
        </View>

        <TouchableOpacity style={[styles.cta, { marginTop: Spacing.lg }]} onPress={onPressContinue} disabled={isSaving}>
          <Text style={styles.ctaText}>{isSaving ? 'Saving...' : page < pageCount - 1 ? 'Continue' : 'Finish'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NumberField({
  label,
  placeholder,
  suffix,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  // Keep a free-form string so the user can clear and retype freely.
  // Only push a parsed number up when the input contains a valid positive integer.
  const [text, setText] = useState('');
  const initialised = useRef(false);

  // Do not pre-fill inputs on first render; keep them empty so the user types their value.
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    // If parent value changes after initial render (e.g., reset), reflect it.
    setText(String(value));
  }, [value]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as never),
          ]}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={`${Colors.onSurfaceVariant}88`}
          selectionColor={Colors.primary}
          value={text}
          onChangeText={(t) => {
            setText(t);
            const n = parseInt(t, 10);
            if (!isNaN(n) && n > 0) onChange(n);
          }}
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
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.primary,
    borderRadius: Radii.innerCard,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onSurface,
    paddingVertical: 10,
  },
  suffix: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  selectorGroup: { gap: 8 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: -6 },
  chip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 6,
    marginBottom: 8,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.secondaryFixed },
  chipText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  chipTextActive: { color: Colors.onSecondaryFixed },
  activityDescription: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 18,
  },
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
