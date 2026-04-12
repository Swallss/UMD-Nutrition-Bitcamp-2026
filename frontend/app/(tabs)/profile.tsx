// Profile - Firestore-backed metrics and derived nutrition goals.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { MacroRingHero } from '@/components/MacroRing';
import { MacroBar } from '@/components/MacroBar';
import { HeroPattern } from '@/components/HeroPattern';
import { getTodayTotals, formatHeight } from '@/lib/mockData';
import { auth } from '@/lib/firebase';
import {
  fetchUserProfile,
  fetchUserLogs,
  getDefaultProfile,
  saveUserProfile,
  todayKey,
  weeklyCaloriesFromLogs,
  type ActivityLevel,
  type DailyLogEntry,
  type GoalType,
  type Sex,
  type UserProfile,
} from '@/lib/firestore';
import { calculateNutritionGoals } from '@/lib/nutritionGoals';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CALENDAR_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
type CalendarCell = { dateKey: string; inMonth: boolean };

function formatHistoryDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const today = todayKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = todayKey(yesterdayDate);
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function totalsForLogs(logs: DailyLogEntry[]) {
  return getTodayTotals(logs);
}

function getMonthDateKeys(seedDateKey: string): CalendarCell[] {
  const seed = new Date(`${seedDateKey}T12:00:00`);
  const year = seed.getFullYear();
  const month = seed.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      dateKey: todayKey(date),
      inMonth: date.getMonth() === month,
    };
  });
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  low: 'Low',
  light: 'Light',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
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
  other: 'Other',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(todayKey());

  const totals = getTodayTotals(logs.filter((e) => e.date === todayKey()));
  const goals = profile ? calculateNutritionGoals(profile) : { calorieGoal: 2000, proteinGoal: 150, carbGoal: 250, fatGoal: 65 };
  const weeklyCalories = logs.length > 0 ? weeklyCaloriesFromLogs(logs) : [0, 0, 0, 0, 0, 0, 0];
  const maxBar = Math.max(...weeklyCalories, 1);
  const monthDates = useMemo(() => getMonthDateKeys(selectedHistoryDate), [selectedHistoryDate]);
  const logsByDate = useMemo(() => {
    return logs.reduce<Record<string, DailyLogEntry[]>>((groups, entry) => {
      groups[entry.date] = [...(groups[entry.date] ?? []), entry];
      return groups;
    }, {});
  }, [logs]);
  const selectedHistoryLogs = logsByDate[selectedHistoryDate] ?? [];
  const selectedHistoryTotals = totalsForLogs(selectedHistoryLogs);
  const selectedMonthLabel = new Date(`${selectedHistoryDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const shiftSelectedMonth = useCallback((delta: number) => {
    setSelectedHistoryDate((dateKey) => {
      const date = new Date(`${dateKey}T12:00:00`);
      return todayKey(new Date(date.getFullYear(), date.getMonth() + delta, 1));
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setProfile(null);
      setLogs([]);
      return;
    }

    const [nextProfile, nextLogs] = await Promise.all([
      fetchUserProfile(user.uid).catch(() => getDefaultProfile(user)),
      fetchUserLogs(user.uid).catch(() => []),
    ]);
    setProfile(nextProfile);
    setLogs(nextLogs);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setProfile(null);
        setLogs([]);
        return;
      }
      refreshProfile();
    });
    return unsubscribe;
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile]),
  );

  const updateMetric = <K extends keyof UserProfile['metrics']>(key: K, value: UserProfile['metrics'][K]) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, metrics: { ...prev.metrics, [key]: value } };
    });
  };

  const handleEditToggle = async () => {
    if (!isEditing && profile) {
      // Entering edit mode — snapshot numeric fields as raw strings so the
      // TextInput is free-form (no per-keystroke rejection).
      setDraftValues({
        height_in:          String(profile.metrics.height_in),
        current_weight_lbs: String(profile.metrics.current_weight_lbs),
        target_weight_lbs:  String(profile.metrics.target_weight_lbs),
        age:                String(profile.metrics.age),
        calorie_override:   profile.metrics.calorie_override ? String(profile.metrics.calorie_override) : '',
      });
      setIsEditing(true);
      return;
    }

    if (isEditing && profile) {
      // Use auth.currentUser directly — never stale unlike the uid state.
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        Alert.alert('Not signed in', 'Please sign in again.');
        return;
      }

      // Parse draft values — fall back to the current metric if input is blank/invalid.
      const parse = (key: string, fallback: number) => {
        const n = parseInt(draftValues[key] ?? '', 10);
        return isNaN(n) || n <= 0 ? fallback : n;
      };
      const rawOverride = parseInt(draftValues.calorie_override ?? '', 10);
      const calorieOverride = !isNaN(rawOverride) && rawOverride >= 1200 ? rawOverride : undefined;
      const updatedProfile: UserProfile = {
        ...profile,
        metrics: {
          ...profile.metrics,
          height_in:          parse('height_in',          profile.metrics.height_in),
          current_weight_lbs: parse('current_weight_lbs', profile.metrics.current_weight_lbs),
          target_weight_lbs:  parse('target_weight_lbs',  profile.metrics.target_weight_lbs),
          age:                parse('age',                profile.metrics.age),
          calorie_override:   calorieOverride,
        },
      };
      try {
        setIsSaving(true);
        // setDoc with merge:true creates the document if it doesn't exist yet,
        // or updates it in place if it does.
        await saveUserProfile(currentUid, updatedProfile);
        setProfile(updatedProfile);
      } catch (error) {
        Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
      return;
    }

    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)/login' as any);
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.medium, color: Colors.onSurfaceVariant }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <HeroPattern opacity={0.13} />
        <View style={styles.heroInner}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroName}>{profile.displayName}</Text>
            <Text style={styles.heroEmail}>{profile.email}</Text>
          </View>
          <MacroRingHero consumed={totals.calories} goal={goals.calorieGoal} size={96} strokeWidth={9} />
        </View>
        <Text style={styles.heroSubLabel}>DAILY PROGRESS</Text>
      </View>

      <View style={[styles.card, styles.heroOverlapCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Body Stats</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSignOut} style={styles.editBtn}>
              <MaterialIcons name="logout" size={16} color={Colors.primary} />
              <Text style={styles.editBtnText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEditToggle} style={styles.editBtn} disabled={isSaving}>
              <MaterialIcons name={isEditing ? 'check' : 'edit'} size={16} color={Colors.primary} />
              <Text style={styles.editBtnText}>{isSaving ? 'Saving…' : isEditing ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatTile
            label="Height"
            value={formatHeight(profile.metrics.height_in)}
            editing={isEditing}
            rawValue={draftValues.height_in ?? String(profile.metrics.height_in)}
            hint="e.g. 73"
            onChangeText={(v) => setDraftValues((d) => ({ ...d, height_in: v }))}
          />
          <StatTile
            label="Weight"
            value={`${profile.metrics.current_weight_lbs} lbs`}
            editing={isEditing}
            rawValue={draftValues.current_weight_lbs ?? String(profile.metrics.current_weight_lbs)}
            hint="e.g. 210"
            onChangeText={(v) => setDraftValues((d) => ({ ...d, current_weight_lbs: v }))}
          />
          <StatTile
            label="Age"
            value={`${profile.metrics.age} yrs`}
            editing={isEditing}
            rawValue={draftValues.age ?? String(profile.metrics.age)}
            hint="e.g. 20"
            onChangeText={(v) => setDraftValues((d) => ({ ...d, age: v }))}
          />
          <StatTile
            label="Target"
            value={`${profile.metrics.target_weight_lbs} lbs`}
            editing={isEditing}
            rawValue={draftValues.target_weight_lbs ?? String(profile.metrics.target_weight_lbs)}
            hint="e.g. 180"
            onChangeText={(v) => setDraftValues((d) => ({ ...d, target_weight_lbs: v }))}
          />
        </View>

        {isEditing ? (
          <>
            <SelectorRow label="Sex" options={Object.keys(SEX_LABELS) as Sex[]} value={profile.metrics.sex} labels={SEX_LABELS} onSelect={(v) => updateMetric('sex', v)} />
            <SelectorRow label="Activity Level" options={Object.keys(ACTIVITY_LABELS) as ActivityLevel[]} value={profile.metrics.activity_level} labels={ACTIVITY_LABELS} onSelect={(v) => updateMetric('activity_level', v)} />
            <SelectorRow label="Goal" options={Object.keys(GOAL_LABELS) as GoalType[]} value={profile.metrics.goal_type} labels={GOAL_LABELS} onSelect={(v) => updateMetric('goal_type', v)} />
          </>
        ) : (
          <View style={styles.staticMetaRow}>
            <Text style={styles.staticMeta}>{SEX_LABELS[profile.metrics.sex]}</Text>
            <Text style={styles.staticMeta}>Activity Level: {ACTIVITY_LABELS[profile.metrics.activity_level]}</Text>
            <Text style={styles.staticMeta}>{GOAL_LABELS[profile.metrics.goal_type]}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutrition Goals</Text>
        <View style={styles.goalRow}>
          <View style={{ gap: 2 }}>
            <Text style={styles.goalLabel}>Daily Calories</Text>
            {isEditing && (
              <Text style={styles.overrideHint}>Leave blank to auto-calculate</Text>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={[styles.calorieInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as never)]}
              value={draftValues.calorie_override ?? ''}
              onChangeText={(v) => setDraftValues((d) => ({ ...d, calorie_override: v }))}
              keyboardType="numeric"
              placeholder={String(goals.calorieGoal)}
              placeholderTextColor={`${Colors.onSurfaceVariant}66`}
              selectionColor={Colors.primary}
            />
          ) : (
            <View style={styles.goalValueRow}>
              <Text style={styles.goalValue}>{goals.calorieGoal} kcal</Text>
              {profile.metrics.calorie_override ? (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>custom</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
        <View style={styles.macrosSection}>
          <MacroBar label="Protein" consumed={totals.protein} goal={goals.proteinGoal} color={Colors.primary} />
          <MacroBar label="Carbs" consumed={totals.carbs} goal={goals.carbGoal} color={Colors.secondaryFixedDim} />
          <MacroBar label="Fat" consumed={totals.fat} goal={goals.fatGoal} color={Colors.tertiary} />
        </View>
        <View style={[styles.goalRow, styles.goalDivider]}>
          <Text style={styles.goalLabel}>Target Weight</Text>
          <Text style={styles.goalValue}>{profile.metrics.target_weight_lbs} lbs</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <TouchableOpacity style={styles.chartHeader} activeOpacity={0.9} onPress={() => setShowHistory((value) => !value)}>
          <View>
            <Text style={styles.chartTitle}>Weekly Trend</Text>
            <Text style={styles.chartSub}>
              Avg {Math.round(weeklyCalories.reduce((a, b) => a + b, 0) / 7)} kcal/day
            </Text>
          </View>
          <Text style={styles.historyToggle}>{showHistory ? 'Hide' : 'History'}</Text>
        </TouchableOpacity>
        <View style={styles.barChart}>
          {weeklyCalories.map((val, i) => {
            const isToday = i === 6;
            const h = Math.max((val / maxBar) * 72, 4);
            return (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: isToday ? `${Colors.onSecondaryFixed}55` : `${Colors.onSecondaryFixed}22`,
                    },
                  ]}
                />
                <Text style={styles.barDay}>{DAYS[i]}</Text>
              </View>
            );
          })}
        </View>

        {showHistory && (
          <View style={styles.historyPanel}>
            <View style={styles.calendarWrap}>
                <View style={styles.calendarTitleRow}>
                  <TouchableOpacity style={styles.calendarNavButton} onPress={() => shiftSelectedMonth(-1)}>
                    <MaterialIcons name="chevron-left" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>{selectedMonthLabel}</Text>
                  <TouchableOpacity style={styles.calendarNavButton} onPress={() => shiftSelectedMonth(1)}>
                    <MaterialIcons name="chevron-right" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekHeader}>
                  {CALENDAR_DAYS.map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.calendarWeekDay}>{day}</Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {monthDates.map(({ dateKey, inMonth }) => {
                    const active = dateKey === selectedHistoryDate;
                    const dayTotals = totalsForLogs(logsByDate[dateKey] ?? []);
                    return (
                      <TouchableOpacity
                        key={dateKey}
                        style={[
                          styles.calendarDay,
                          !inMonth && styles.calendarDayOutside,
                          active && styles.calendarDayActive,
                        ]}
                        onPress={() => setSelectedHistoryDate(dateKey)}
                      >
                        <Text style={[styles.calendarDayNumber, active && styles.calendarDayNumberActive]}>
                          {Number(dateKey.slice(-2))}
                        </Text>
                        {dayTotals.calories > 0 && <Text style={[styles.calendarDayDot, active && styles.calendarDayNumberActive]}>•</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
            </View>
            <View style={styles.historySummary}>
              <Text style={styles.historyTitle}>{formatHistoryDate(selectedHistoryDate)}</Text>
              <Text style={styles.historyMeta}>
                {selectedHistoryTotals.calories} cal - {Math.round(selectedHistoryTotals.protein)}g protein - {Math.round(selectedHistoryTotals.carbs)}g carbs - {Math.round(selectedHistoryTotals.fat)}g fat
              </Text>
            </View>
            {selectedHistoryLogs.length === 0 ? (
              <Text style={styles.historyEmpty}>No meals logged for this day.</Text>
            ) : (
              <View style={styles.historyList}>
                {selectedHistoryLogs.map((entry) => (
                  <View key={entry.id} style={styles.historyItem}>
                    <View style={styles.historyItemMain}>
                      <Text style={styles.historyItemName} numberOfLines={1}>{entry.foodName}</Text>
                      <Text style={styles.historyItemMeta}>{entry.mealTime} - {entry.loggedAt || 'Logged'}</Text>
                    </View>
                    <Text style={styles.historyItemCalories}>{entry.calories} cal</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SelectorRow<T extends string>({
  label, options, value, labels, onSelect,
}: {
  label: string; options: T[]; value: T; labels: Record<T, string>; onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((option) => {
          const isActive = option === value;
          return (
            <TouchableOpacity key={option} onPress={() => onSelect(option)} style={[styles.selectorChip, isActive && styles.selectorChipActive]}>
              <Text style={[styles.selectorChipText, isActive && styles.selectorChipTextActive]}>{labels[option]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StatTile({
  label, value, editing, onChangeText, rawValue, hint,
}: {
  label: string; value: string; editing: boolean;
  onChangeText?: (v: string) => void; rawValue?: string; hint?: string;
}) {
  return (
    <View style={[tileStyles.tile, editing && tileStyles.tileEditing]}>
      <Text style={tileStyles.label}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={[
            tileStyles.input,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as never),
          ]}
          value={rawValue}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={hint}
          placeholderTextColor={`${Colors.onSurfaceVariant}88`}
          selectionColor={Colors.primary}
        />
      ) : (
        <Text style={tileStyles.value}>{value}</Text>
      )}
    </View>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.innerCard,
    padding: Spacing.md,
    gap: 4,
  },
  tileEditing: {
    padding: 8,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  input: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.primary,
    borderRadius: Radii.innerCard,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { gap: 0 },
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl + 8,
    overflow: 'hidden',
    gap: 8,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: { gap: 6, flex: 1 },
  heroName: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    color: Colors.onPrimary,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroEmail: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroSubLabel: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.card,
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: Spacing.md,
  },
  heroOverlapCard: {
    marginTop: -Radii.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 1,
  },
  cardTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 17,
    color: Colors.onSurface,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  editBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  staticMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  staticMeta: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  selectorGroup: { gap: 8 },
  selectorLabel: {
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectorChipActive: { backgroundColor: Colors.secondaryFixed },
  selectorChipText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  selectorChipTextActive: { color: Colors.onSecondaryFixed },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalDivider: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    paddingTop: 12,
  },
  goalLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: Colors.onSurface },
  goalValue: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.primary },
  goalValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overrideHint: { fontFamily: FONTS.medium, fontSize: 11, color: Colors.onSurfaceVariant },
  calorieInput: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.primary,
    borderRadius: Radii.innerCard,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 100,
    textAlign: 'right',
  },
  customBadge: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: Radii.chip,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  customBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: Colors.primary },
  macrosSection: { gap: 0 },
  chartCard: {
    backgroundColor: Colors.secondaryFixed,
    borderRadius: Radii.card,
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  chartTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: Colors.onSecondaryFixed },
  chartSub: { fontFamily: FONTS.medium, fontSize: 12, color: Colors.onSecondaryFixedVariant },
  historyToggle: {
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    color: Colors.onSecondaryFixed,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 4,
    marginTop: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '100%', borderRadius: 4 },
  barDay: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: Colors.onSecondaryFixedVariant,
    letterSpacing: 0.3,
  },
  historyPanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.innerCard,
    padding: 10,
    gap: 10,
    marginTop: 4,
  },
  calendarWrap: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.innerCard,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 6,
    gap: 5,
  },
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.primary}12`,
  },
  calendarTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: Colors.onSurfaceVariant,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.285%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: 'transparent',
  },
  calendarDayActive: { backgroundColor: Colors.primary },
  calendarDayOutside: {
    opacity: 0.35,
  },
  calendarDayNumber: {
    fontFamily: FONTS.extraBold,
    fontSize: 10,
    color: Colors.onSurface,
  },
  calendarDayNumberActive: { color: Colors.onPrimary },
  calendarDayDot: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    lineHeight: 9,
    color: Colors.primary,
  },
  historySummary: { gap: 3 },
  historyTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  historyMeta: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  historyEmpty: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 10,
  },
  historyList: { gap: 8 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.innerCard,
    padding: 12,
  },
  historyItemMain: { flex: 1 },
  historyItemName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  historyItemMeta: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  historyItemCalories: {
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    color: Colors.primary,
  },
});
