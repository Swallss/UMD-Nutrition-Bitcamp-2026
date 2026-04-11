// Dashboard — daily calorie ring, macro bars, today's log, open dining halls.
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { MacroRing } from '@/components/MacroRing';
import { MacroBar } from '@/components/MacroBar';
import { FoodCard } from '@/components/FoodCard';
import { HeroPattern } from '@/components/HeroPattern';
import { mockUser, mockTodayLog, mockDiningHalls, getTodayTotals, type LogEntry } from '@/lib/mockData';
import { auth } from '@/lib/firebase';
import { calculateNutritionGoals } from '@/lib/nutritionGoals';
import { fetchDailyLogs, fetchUserProfile, removeDailyLog, type DailyLogEntry, type UserProfile } from '@/lib/firestore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [todayLog, setTodayLog] = useState<(LogEntry | DailyLogEntry)[]>(mockTodayLog);
  const totals = getTodayTotals(todayLog);
  const goals = profile
    ? calculateNutritionGoals(profile)
    : {
        calorieGoal: mockUser.calorieGoal,
        proteinGoal: mockUser.proteinGoal,
        carbGoal: mockUser.carbGoal,
        fatGoal: mockUser.fatGoal,
      };
  const openHalls = mockDiningHalls.filter((h) => h.isOpen);
  const displayName = profile?.displayName ?? mockUser.name;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      fetchUserProfile(user.uid).then(setProfile).catch(() => undefined);
      fetchDailyLogs(user.uid).then(setTodayLog).catch(() => setTodayLog(mockTodayLog));
    });
    return unsubscribe;
  }, []);

  const handleRemoveLog = async (item: LogEntry) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await removeDailyLog(item.id);
      setTodayLog((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (error) {
      Alert.alert('Could not remove item', error instanceof Error ? error.message : 'Please try again.');
    }
  };

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
          {/* Ring */}
          <MacroRing consumed={totals.calories} goal={goals.calorieGoal} size={140} strokeWidth={13} />

          {/* Bars */}
          <View style={styles.barsCol}>
            <MacroBar
              label="Protein"
              consumed={totals.protein}
              goal={goals.proteinGoal}
              color={Colors.primary}
            />
            <MacroBar
              label="Carbs"
              consumed={totals.carbs}
              goal={goals.carbGoal}
              color={Colors.secondaryFixedDim}
            />
            <MacroBar
              label="Fat"
              consumed={totals.fat}
              goal={goals.fatGoal}
              color={Colors.tertiary}
            />
          </View>
        </View>

        {/* Calorie summary pills */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryValue}>{totals.calories}</Text>
            <Text style={styles.summaryLabel}>Consumed</Text>
          </View>
          <View style={[styles.summaryPill, styles.summaryPillGoal]}>
            <Text style={[styles.summaryValue, { color: Colors.onSecondaryFixed }]}>
              {goals.calorieGoal - totals.calories}
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
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.logList}>
          {todayLog.map((entry) => {
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
            return <FoodCard key={entry.id} item={item} mode="compact" onRemove={() => handleRemoveLog(entry)} />;
          })}
        </View>
      </View>

      {/* ── Open Dining Halls bento grid ─────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Dining Halls</Text>
        <View style={styles.bentoGrid}>
          {openHalls.map((hall) => (
            <TouchableOpacity key={hall.id} style={styles.bentoCell} activeOpacity={0.85}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>OPEN NOW</Text>
              </View>
              <Text style={styles.bentoName}>{hall.name}</Text>
              <Text style={styles.bentoLocation}>{hall.location}</Text>
              <View style={styles.hoursPill}>
                <Text style={styles.hoursText}>Closes {hall.closingTime}</Text>
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

  // Hero
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

  // Macro card
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

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.innerCard,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  summaryPillGoal: {
    backgroundColor: Colors.secondaryFixed,
  },
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

  // Section
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

  // Bento grid
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.openGreen,
  },
  statusText: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.openGreenText,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hoursText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: Colors.onSurface,
  },
});
