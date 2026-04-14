// Dashboard — daily calorie ring, macro bars, today's log, dining halls.
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, ScrollView, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
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
  fetchDiningHallTraffic,
  fetchItemRatings,
  fetchUserProfile,
  removeDailyLog,
  updateLogRating,
  type DailyLogEntry,
  type DiningHallTraffic,
  type UserProfile,
} from '@/lib/firestore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LOG_PREVIEW_COUNT = 3;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const BUSY_HISTOGRAMS: Record<string, number[]> = {
  yahentamitsi: [5, 4, 3, 3, 4, 8, 28, 42, 35, 28, 45, 76, 84, 62, 39, 34, 48, 70, 78, 54, 28, 12, 8, 6],
  'south-campus': [4, 3, 3, 3, 4, 9, 31, 48, 38, 30, 52, 82, 88, 67, 41, 38, 56, 80, 74, 58, 30, 14, 8, 5],
  '251-north': [3, 3, 2, 2, 3, 7, 20, 32, 29, 24, 41, 68, 76, 60, 44, 40, 52, 73, 70, 50, 24, 10, 6, 4],
};

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

function minutesFromTime(time?: string) {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [, hourRaw, minuteRaw, periodRaw] = match;
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const period = periodRaw.toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function isOpenNow(opening?: string, closing?: string) {
  const open = minutesFromTime(opening);
  const close = minutesFromTime(closing);
  if (open === null || close === null) return true;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= open && current < close;
}

function getHourlyTraffic(values: number[]) {
  if (values.length >= 24) return values.slice(0, 24);
  return HOURS.map((_, index) => values[index % Math.max(values.length, 1)] ?? 0);
}

function getOpenHours(opening?: string, closing?: string) {
  const open = minutesFromTime(opening);
  const close = minutesFromTime(closing);
  if (open === null || close === null) return HOURS;

  const openHour = Math.floor(open / 60);
  const closeHour = Math.ceil(close / 60);
  if (openHour === closeHour) return HOURS;
  if (closeHour < openHour) {
    return [
      ...Array.from({ length: 24 - openHour }, (_, index) => openHour + index),
      ...Array.from({ length: closeHour }, (_, index) => index),
    ];
  }
  return Array.from({ length: closeHour - openHour }, (_, index) => openHour + index);
}

function getClosingHour(closing?: string) {
  const close = minutesFromTime(closing);
  if (close === null) return 23;
  return Math.ceil(close / 60) % 24;
}

function formatHourLabel(hour: number) {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function BusyHistogram({
  values,
  opening,
  closing,
  compact = false,
}: {
  values: number[];
  opening?: string;
  closing?: string;
  compact?: boolean;
}) {
  const hourly = getHourlyTraffic(values);
  const openHours = getOpenHours(opening, closing);
  const currentHour = new Date().getHours();
  const bars = openHours.map((hour) => ({ hour, value: hourly[hour] ?? 0 }));
  const closingHour = getClosingHour(closing);
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  return (
    <View>
      <View style={[styles.histogram, compact && styles.histogramCompact]}>
        {bars.map(({ hour, value }) => {
          const isCurrentHour = hour === currentHour;
          return (
            <View key={`${hour}-${value}`} style={styles.histogramSlot}>
              <View
                style={[
                  styles.histogramBar,
                  isCurrentHour && styles.histogramBarNow,
                  { height: Math.max((value / max) * (compact ? 38 : 46), 5) },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.histogramAxis}>
        <Text style={styles.histogramAxisText}>{formatHourLabel(openHours[0] ?? 0)}</Text>
        <Text style={styles.histogramAxisText}>{formatHourLabel(closingHour)}</Text>
      </View>
    </View>
  );
}
function LogFoodCard({
  entry,
  onRemove,
}: {
  entry: LogEntry | DailyLogEntry;
  onRemove: (entry: LogEntry | DailyLogEntry) => void;
}) {
  const [avgRating, setAvgRating] = useState<number | undefined>(undefined);
  const [userRating, setUserRating] = useState<number | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const uid = auth.currentUser?.uid;
    fetchItemRatings(entry.foodItemId, uid)
      .then((r) => {
        if (!mounted) return;
        setAvgRating(r.avgRating ?? undefined);
        setUserRating(r.userRating ?? undefined);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [entry.foodItemId]);

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
  } as any;

  return (
    <FoodCard
      item={item}
      mode="compact"
      userRating={userRating}
      avgRating={avgRating}
      onRemove={() => onRemove(entry)}
    />
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<(LogEntry | DailyLogEntry)[]>([]);
  const [showAllLog, setShowAllLog] = useState(false);
  const [trafficByHall, setTrafficByHall] = useState<DiningHallTraffic>({});

  const totals = getTodayTotals(todayLog);
  const goals = profile
    ? calculateNutritionGoals(profile)
    : { calorieGoal: 2000, proteinGoal: 150, carbGoal: 250, fatGoal: 65 };

  const displayName = profile?.displayName ?? 'Terp';
  const visibleLog = showAllLog ? todayLog : todayLog.slice(0, LOG_PREVIEW_COUNT);
  const isPhoneLayout = width < 700;
  const hallCardWidth = isPhoneLayout ? '100%' : width >= 900 ? '32.5%' : '48.5%';

  const refreshDashboard = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const [nextProfile, nextLog, nextTraffic] = await Promise.all([
      fetchUserProfile(user.uid),
      fetchDailyLogs(user.uid),
      fetchDiningHallTraffic().catch(() => ({})),
    ]);
    setProfile(nextProfile);
    setTodayLog(nextLog);
    setTrafficByHall(nextTraffic);
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
      await removeDailyLog(user.uid, entry.id);
      setTodayLog((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (error) {
      Alert.alert('Could not remove item', error instanceof Error ? error.message : 'Please try again.');
    }
  }, []);



  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
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
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroOverline}>{DAYS[new Date().getDay()].toUpperCase()} - {formatDate().split(',')[1]?.trim()}</Text>
            <Text style={styles.locationText}>College Park, MD</Text>
          </View>
          <TouchableOpacity style={styles.signOutPill} onPress={handleSignOut} activeOpacity={0.85}>
            <MaterialIcons name="logout" size={15} color={Colors.primary} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
            {visibleLog.map((entry) => (
              <LogFoodCard
                key={entry.id}
                entry={entry}
                onRemove={handleRemoveLog}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Dining Halls bento grid ───────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dining Halls</Text>
        <View style={styles.bentoGrid}>
          {mockDiningHalls.map((hall) => {
            const dow = new Date().getDay(); // 0=Sun,1=Mon,..6=Sat
            const isFriSatSun = dow === 5 || dow === 6 || dow === 0;
            const opening = isFriSatSun ? (hall.openingTimeWeekend ?? hall.openingTime) : hall.openingTime;
            const closing = isFriSatSun ? (hall.closingTimeWeekend ?? hall.closingTime) : hall.closingTime;
            const hallIsOpen = hall.isOpen && isOpenNow(opening, closing);
            const histogram = trafficByHall[hall.id] ?? BUSY_HISTOGRAMS[hall.id] ?? [20, 40, 55, 45, 30];
            return (
              <TouchableOpacity
                key={hall.id}
                style={[styles.bentoCell, { width: hallCardWidth }, !hallIsOpen && styles.bentoCellClosed]}
                activeOpacity={0.85}
              >
                <View style={styles.bentoTopRow}>
                  <View style={styles.bentoInfo}>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, !hallIsOpen && styles.statusDotClosed]} />
                      <Text style={[styles.statusText, !hallIsOpen && styles.statusTextClosed]}>
                        {hallIsOpen ? 'OPEN NOW' : 'CLOSED NOW'}
                      </Text>
                    </View>
                    <Text style={styles.bentoName}>{hall.name}</Text>
                    <Text style={styles.bentoLocation}>{hall.location}</Text>
                  </View>
                  {isPhoneLayout ? (
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live</Text>
                    </View>
                  ) : (
                    <View style={styles.busyPanel}>
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live</Text>
                      </View>
                      <BusyHistogram values={histogram} opening={opening} closing={closing} />
                    </View>
                  )}
                </View>
                {isPhoneLayout && (
                  <View style={styles.busyPanelPhone}>
                    <BusyHistogram values={histogram} opening={opening} closing={closing} />
                  </View>
                )}
                <View style={styles.hoursPill}>
                  <Text style={styles.hoursText}>
                    {hallIsOpen ? `Closes ${closing}` : `Opens ${opening ?? 'later'}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
    gap: 6,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  heroOverline: {
    fontFamily: FONTS.extraBold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
  },
  locationText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
  },
  signOutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  signOutText: {
    fontFamily: FONTS.extraBold,
    fontSize: 13,
    color: Colors.primary,
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
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.chip + 4,
    padding: Spacing.md,
    gap: 8,
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
  bentoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  bentoInfo: {
    flex: 0.9,
    minWidth: 0,
    gap: 3,
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
  busyPanel: {
    flex: 1.25,
    minWidth: 140,
    gap: 3,
  },
  busyPanelPhone: {
    width: '100%',
    marginTop: 2,
  },
  livePill: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  liveText: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    color: Colors.primary,
  },
  histogram: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  histogramCompact: {
    height: 42,
    gap: 2,
  },
  histogramSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  histogramBar: {
    width: 9,
    borderRadius: Radii.bar,
    backgroundColor: Colors.secondaryFixedDim,
  },
  histogramBarNow: {
    backgroundColor: Colors.primary,
  },
  histogramAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  histogramAxisText: {
    fontFamily: FONTS.medium,
    fontSize: 8,
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
