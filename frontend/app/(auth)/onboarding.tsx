import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  type UserProfile,
} from '@/lib/firestore';

const STEP_COUNT = 4;

// ── Option definitions ─────────────────────────────────────────────────────────

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string; emoji: string }[] = [
  { value: 'low',       label: 'Sedentary',         emoji: '🪑', description: 'Desk job, little to no exercise' },
  { value: 'light',     label: 'Lightly Active',     emoji: '🚶', description: 'Light activity 1–3 days/week (walks, yoga)' },
  { value: 'moderate',  label: 'Moderately Active',  emoji: '🏃', description: 'Exercise 3–5 days/week (gym, jogging)' },
  { value: 'high',      label: 'Very Active',         emoji: '💪', description: 'Hard training 6–7 days/week' },
  { value: 'very_high', label: 'Athlete',             emoji: '🏋️', description: 'Twice-daily training or physical labor' },
];

const GOAL_OPTIONS: { value: GoalType; label: string; subtitle: string; detail: string; emoji: string }[] = [
  { value: 'extreme_weight_loss',  label: 'Aggressive Cut',   emoji: '🔥', subtitle: 'Lose ~1 lb/week',       detail: '~500 cal/day deficit' },
  { value: 'moderate_weight_loss', label: 'Steady Cut',       emoji: '📉', subtitle: 'Lose ~0.5 lb/week',     detail: '~250 cal/day deficit — sustainable long-term' },
  { value: 'maintain_weight',      label: 'Maintain',         emoji: '⚖️', subtitle: 'Keep current weight',   detail: 'Eat at your maintenance calories' },
  { value: 'moderate_weight_gain', label: 'Lean Bulk',        emoji: '📈', subtitle: 'Gain ~0.5 lb/week',     detail: '~300 cal/day surplus — minimize fat gain' },
  { value: 'extreme_weight_gain',  label: 'Aggressive Bulk',  emoji: '💥', subtitle: 'Gain ~1 lb/week',       detail: '~500 cal/day surplus — maximize muscle mass' },
];

const STEP_META = [
  { title: 'Your stats',      subtitle: 'We use these to calculate your daily calorie and macro targets.' },
  { title: 'Biological sex',  subtitle: 'This affects your basal metabolic rate calculation.' },
  { title: 'Activity level',  subtitle: 'How active are you on a typical week?' },
  { title: 'Your goal',       subtitle: 'What are you working toward?' },
];

// ── Main screen ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [panelWidth, setPanelWidth] = useState(0);
  const panelWidthRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { router.replace('/(auth)/login' as any); return; }
    const blankNumbers = (p: UserProfile): UserProfile => ({
      ...p,
      metrics: { ...p.metrics, height_in: 0, current_weight_lbs: 0, target_weight_lbs: 0, age: 0 },
    });
    fetchUserProfile(user.uid)
      .then((p) => setProfile(blankNumbers(p)))
      .catch(() => setProfile(blankNumbers(getDefaultProfile(user))));
  }, []);

  const updateMetric = <K extends keyof UserProfile['metrics']>(key: K, value: UserProfile['metrics'][K]) => {
    setProfile((prev) => prev ? { ...prev, metrics: { ...prev.metrics, [key]: value } } : prev);
  };

  const handleSlideLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== panelWidthRef.current) {
      panelWidthRef.current = w;
      setPanelWidth(w);
      slideAnim.setValue(-step * w);
    }
  };

  const navigateTo = (nextStep: number) => {
    Animated.spring(slideAnim, {
      toValue: -nextStep * panelWidthRef.current,
      useNativeDriver: Platform.OS !== 'web',
      tension: 68,
      friction: 11,
    }).start();
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step === 0) {
      const { height_in, current_weight_lbs, target_weight_lbs, age } = profile!.metrics;
      if (!height_in || !current_weight_lbs || !target_weight_lbs || !age) {
        Alert.alert('Missing info', 'Please fill in all fields before continuing.');
        return;
      }
    }
    if (step < STEP_COUNT - 1) { navigateTo(step + 1); return; }
    handleSave();
  };

  const handleSave = async () => {
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
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>Setting up your profile…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress dots */}
      <View style={[styles.progressRow, { paddingTop: insets.top + 16 }]}>
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
              i < step && styles.dotDone,
            ]}
          />
        ))}
      </View>

      {/* Step title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{STEP_META[step].title}</Text>
        <Text style={styles.subtitle}>{STEP_META[step].subtitle}</Text>
      </View>

      {/* Sliding panels */}
      <View style={styles.slideWindow} onLayout={handleSlideLayout}>
        <Animated.View
          style={[styles.slideRow, { width: panelWidth * STEP_COUNT, transform: [{ translateX: slideAnim }] }]}
        >
          {/* ── Step 0: Numbers ─────────────────────────────────────────────── */}
          <ScrollView
            style={[styles.panel, { width: panelWidth }]}
            contentContainerStyle={styles.panelContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <NumberField label="Height" placeholder="e.g. 73" suffix="in"
              value={profile.metrics.height_in}
              onChange={(v) => updateMetric('height_in', v)} />
            <NumberField label="Current weight" placeholder="e.g. 185" suffix="lbs"
              value={profile.metrics.current_weight_lbs}
              onChange={(v) => updateMetric('current_weight_lbs', v)} />
            <NumberField label="Target weight" placeholder="e.g. 165" suffix="lbs"
              value={profile.metrics.target_weight_lbs}
              onChange={(v) => updateMetric('target_weight_lbs', v)} />
            <NumberField label="Age" placeholder="e.g. 20" suffix="yrs"
              value={profile.metrics.age}
              onChange={(v) => updateMetric('age', v)} />
          </ScrollView>

          {/* ── Step 1: Sex ──────────────────────────────────────────────────── */}
          <View style={[styles.panel, { width: panelWidth }]}>
            <View style={styles.sexRow}>
              {(['male', 'female'] as const).map((sex) => {
                const active = profile.metrics.sex === sex;
                return (
                  <TouchableOpacity
                    key={sex}
                    style={[styles.sexCard, active && styles.sexCardActive]}
                    onPress={() => updateMetric('sex', sex)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sexEmoji}>{sex === 'male' ? '♂' : '♀'}</Text>
                    <Text style={[styles.sexLabel, active && styles.sexLabelActive]}>
                      {sex === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Step 2: Activity ─────────────────────────────────────────────── */}
          <ScrollView
            style={[styles.panel, { width: panelWidth }]}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            {ACTIVITY_OPTIONS.map((opt) => {
              const active = profile.metrics.activity_level === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => updateMetric('activity_level', opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionDesc, active && styles.optionDescActive]}>
                      {opt.description}
                    </Text>
                  </View>
                  {active && <View style={styles.activeCheck}><Text style={styles.checkMark}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Step 3: Goal ─────────────────────────────────────────────────── */}
          <ScrollView
            style={[styles.panel, { width: panelWidth }]}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            {GOAL_OPTIONS.map((opt) => {
              const active = profile.metrics.goal_type === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => updateMetric('goal_type', opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionDesc, active && styles.optionDescActive]}>
                      {opt.subtitle}
                    </Text>
                    <Text style={[styles.optionDetail, active && styles.optionDetailActive]}>
                      {opt.detail}
                    </Text>
                  </View>
                  {active && <View style={styles.activeCheck}><Text style={styles.checkMark}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Nav buttons */}
      <View style={[styles.navRow, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.backBtn, step === 0 && styles.backBtnHidden]}
          onPress={() => navigateTo(step - 1)}
          activeOpacity={0.8}
          disabled={step === 0}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, isSaving && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isSaving ? 'Saving…' : step === STEP_COUNT - 1 ? "Let's go 🎉" : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── NumberField ────────────────────────────────────────────────────────────────

function NumberField({
  label, placeholder, suffix, value, onChange,
}: { label: string; placeholder: string; suffix: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value > 0 ? String(value) : '');
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current && value > 0) {
      initialised.current = true;
      setText(String(value));
    }
  }, [value]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as never)]}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={`${Colors.onSurfaceVariant}66`}
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  loadingRoot: { flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: FONTS.medium, color: Colors.onSurfaceVariant },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dotActive: {
    width: 28,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  dotDone: {
    backgroundColor: `${Colors.primary}55`,
  },

  // Title block
  titleBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },

  // Sliding panels
  slideWindow: { flex: 1, overflow: 'hidden' },
  slideRow: {
    flexDirection: 'row',
    flex: 1,
  },
  panel: { flex: 1 },
  panelContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 16, gap: Spacing.md },

  // Number fields
  field: { gap: 6 },
  fieldLabel: { fontFamily: FONTS.extraBold, fontSize: 13, color: Colors.onSurface },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.primary,
    borderRadius: Radii.innerCard,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.extraBold,
    fontSize: 17,
    color: Colors.onSurface,
    paddingVertical: 12,
  },
  suffix: { fontFamily: FONTS.bold, fontSize: 13, color: Colors.onSurfaceVariant },

  // Sex cards
  sexRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  sexCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radii.card,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sexCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}0d`,
  },
  sexEmoji: { fontSize: 52 },
  sexLabel: { fontFamily: FONTS.extraBold, fontSize: 18, color: Colors.onSurfaceVariant },
  sexLabelActive: { color: Colors.primary },

  // Option cards (activity + goal)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.innerCard,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}0d`,
  },
  optionEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.onSurface },
  optionLabelActive: { color: Colors.primary },
  optionDesc: { fontFamily: FONTS.medium, fontSize: 12, color: Colors.onSurfaceVariant },
  optionDescActive: { color: `${Colors.primary}cc` },
  optionDetail: { fontFamily: FONTS.medium, fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  optionDetailActive: { color: `${Colors.primary}99` },
  activeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkMark: { color: Colors.onPrimary, fontSize: 13, fontFamily: FONTS.extraBold },

  // Nav buttons
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backBtnHidden: { opacity: 0 },
  backBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  backBtnText: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.onSurfaceVariant },
  nextBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { fontFamily: FONTS.extraBold, fontSize: 15, color: Colors.onPrimary },
});
