// Dashboard — daily calorie ring, macro bars, today's log, dining halls.
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { MacroRing } from '@/components/MacroRing';
import { MacroBar } from '@/components/MacroBar';
import { FoodCard } from '@/components/FoodCard';
import { HeroPattern } from '@/components/HeroPattern';
import { mockDiningHalls, getTodayTotals, type LogEntry } from '@/lib/mockData';
import { auth } from '@/lib/firebase';
import { calculateNutritionGoals } from '@/lib/nutritionGoals';
import {
  fetchDailyLogs,
  fetchUserProfile,
  removeDailyLog,
  updateLogRating,
  type DailyLogEntry,
  type UserProfile,
} from '@/lib/firestore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LOG_PREVIEW_COUNT = 3;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<(LogEntry | DailyLogEntry)[]>([]);
  const [showAllLog, setShowAllLog] = useState(false);

  const totals = getTodayTotals(todayLog);
  const goals = profile
    ? calculateNutritionGoals(profile)
    : { calorieGoal: 2000, proteinGoal: 150, carbGoal: 250, fatGoal: 65 };

  const displayName = profile?.displayName ?? 'Terp';
  const visibleLog = showAllLog ? todayLog : todayLog.slice(0, LOG_PREVIEW_COUNT);

  const refreshDashboard = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const [nextProfile, nextLog] = await Promise.all([
      fetchUserProfile(user.uid),
      fetchDailyLogs(user.uid),
    ]);
    setProfile(nextProfile);
    setTodayLog(nextLog);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      refreshDashboard().catch(() => setTodayLog([]));
    });
    return unsubscribe;
  }, [refreshDashboard]);

  useFocusEffect(
    useCallback(() => {
      refreshDashboard().catch(() => setTodayLog([]));
    }, [refreshDashboard]),
  );

  const handleRemoveLog = useCallback(async (entry: LogEntry | DailyLogEntry) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await removeDailyLog(entry.id);
      setTodayLog((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (error) {
      Alert.alert('Could not remove item', error instanceof Error ? error.message : 'Please try again.');
    }
  }, []);

  const handleRate = useCallback(async (entry: LogEntry | DailyLogEntry, rating: number) => {
    try {
      await updateLogRating(entry.id, rating);
      setTodayLog((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, rating } : e)),
      );
    } catch {
      // Silently fail for ratings
    }
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <HeroPattern opacity={0.13} />
        <Text style={styles.heroOverline}>{DAYS[new Date().getDay()].toUpperCase()} · {formatDate().split(',')[1]?.trim()}</Text>
        <Text style={styles.heroGreeting}>{getGreeting()},</Text>
        <Text style={styles.heroName}>{displayName.split(' ')[0]}!</Text>
      </View>

      {/* ── Calorie + Macro card ──────────────────────────────────────────── */}
      <View style={styles.macroCard}>
        <Text style={styles.cardTitle}>{`Today's Progress`}</Text>
        <View style={styles.macroRow}>
          <MacroRing consumed={totals.calories} goal={goals.calorieGoal} size={140} strokeWidth={13} />
          <View style={styles.barsCol}>
            <MacroBar label="Protein" consumed={totals.protein} goal={goals.proteinGoal} color={Colors.primary} />
            <MacroBar label="Carbs" consumed={totals.carbs} goal={goals.carbGoal} color={Colors.secondaryFixedDim} />
            <MacroBar label="Fat" consumed={totals.fat} goal={goals.fatGoal} color={Colors.tertiary} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{totals.calories}</Text>
            <Text style={styles.summaryLabel}>Consumed</Text>
          </View>
          <View style={[styles.summaryPill, styles.summaryPillGoal]}>
            <Text style={[styles.summaryValue, { color: Colors.onSecondaryFixed }]}>
              {Math.max(0, goals.calorieGoal - totals.calories)}
            </Text>
            <Text style={[styles.summaryLabel, { color: Colors.onSecondaryFixedVariant }]}>Remaining</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{goals.calorieGoal}</Text>
            <Text style={styles.summaryLabel}>Goal</Text>
          </View>
        </View>
      </View>

      {/* ── Today's Log ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{`Today's Log`}</Text>
          {todayLog.length > LOG_PREVIEW_COUNT && (
            <TouchableOpacity onPress={() => setShowAllLog((v) => !v)}>
              <Text style={styles.seeAll}>
                {showAllLog ? 'Show less' : `See all (${todayLog.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {todayLog.length === 0 ? (
          <Text style={styles.emptyLog}>No items logged today. Tap Log to add food!</Text>
        ) : (
          <View style={styles.logList}>
            {visibleLog.map((entry) => {
              const item = {
                id: entry.foodItemId,
                name: entry.foodName,
                calories: entry.calories,
                protein: entry.protein,
                carbs: entry.carbs,
                fat: entry.fat,
                diningHallId: '',
                mealTime: entry.mealTime,
                dietaryTag: null,
                station: '',
              } as const;
              const logRating = (entry as DailyLogEntry).rating ?? 0;
              return (
                <FoodCard
                  key={entry.id}
                  item={item}
                  mode="compact"
                  rating={logRating}
                  onRate={(r) => handleRate(entry, r)}
                  onRemove={() => handleRemoveLog(entry)}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* ── Dining Halls bento grid ───────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dining Halls</Text>
        <View style={styles.bentoGrid}>
          {mockDiningHalls.map((hall) => (
            <TouchableOpacity key={hall.id} style={[styles.bentoCell, !hall.isOpen && styles.bentoCellClosed]} activeOpacity={0.85}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, !hall.isOpen && styles.statusDotClosed]} />
                <Text style={[styles.statusText, !hall.isOpen && styles.statusTextClosed]}>
                  {hall.isOpen ? 'OPEN NOW' : 'CLOSED'}
                </Text>
              </View>
              <Text style={styles.bentoName}>{hall.name}</Text>
              <Text style={styles.bentoLocation}>{hall.location}</Text>
              <View style={styles.hoursPill}>
                <Text style={styles.hoursText}>
                  {hall.isOpen ? `Closes ${hall.closingTime}` : hall.openingTime ?? 'Check schedule'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { gap: 0 },

  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl + 8,
    gap: 2,
    overflow: 'hidden',
  },
  heroOverline: {
    fontFamily: FONTS.extraBold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  heroGreeting: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: Colors.onPrimary,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroName: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: Colors.onPrimary,
    letterSpacing: -0.5,
    lineHeight: 38,
  },

  macroCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.card,
    marginHorizontal: Spacing.md,
    marginTop: -Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  barsCol: { flex: 1 },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryPill: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.innerCard,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  summaryPillGoal: { backgroundColor: Colors.secondaryFixed },
  summaryValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },

  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: Colors.onSurface,
  },
  seeAll: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  logList: { gap: 8 },
  emptyLog: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 20,
  },

  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.chip + 4,
    padding: Spacing.md,
    gap: 4,
  },
  bentoCellClosed: {
    opacity: 0.6,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.openGreen,
  },
  statusDotClosed: {
    backgroundColor: Colors.onSurfaceVariant,
  },
  statusText: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.openGreenText,
  },
  statusTextClosed: {
    color: Colors.onSurfaceVariant,
  },
  bentoName: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  bentoLocation: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  hoursPill: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  hoursText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: Colors.onSurface,
  },
});
