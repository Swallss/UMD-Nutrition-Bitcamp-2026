// Profile — body stats, nutrition goals, weekly chart, dietary preferences.
import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { MacroRingHero } from '@/components/MacroRing';
import { MacroBar } from '@/components/MacroBar';
import { HeroPattern } from '@/components/HeroPattern';
import {
  mockUser,
  mockTodayLog,
  getTodayTotals,
  formatHeight,
  formatActivityLevel,
  type User,
} from '@/lib/mockData';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User>(mockUser);
  const [isEditing, setIsEditing] = useState(false);
  const totals = getTodayTotals(mockTodayLog);

  const maxBar = Math.max(...user.weeklyCalories, 1);

  const updatePref = (key: keyof User['dietaryPreferences'], value: boolean) => {
    setUser((prev) => ({
      ...prev,
      dietaryPreferences: { ...prev.dietaryPreferences, [key]: value },
    }));
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
        <View style={styles.heroInner}>
          <View style={styles.heroLeft}>
            <View style={styles.idPill}>
              <Text style={styles.idText}>Student ID: {user.id}</Text>
            </View>
            <Text style={styles.heroName}>{user.name}</Text>
            <Text style={styles.heroEmail}>{user.email}</Text>
          </View>
          <MacroRingHero consumed={totals.calories} goal={user.calorieGoal} size={96} strokeWidth={9} />
        </View>
        <Text style={styles.heroSubLabel}>DAILY PROGRESS</Text>
      </View>

      {/* ── Body Stats ────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Body Stats</Text>
          <TouchableOpacity onPress={() => setIsEditing((v) => !v)} style={styles.editBtn}>
            <MaterialIcons
              name={isEditing ? 'check' : 'edit'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatTile
            label="Height"
            value={formatHeight(user.height)}
            editing={isEditing}
            onChangeText={(v) => setUser((p) => ({ ...p, height: parseInt(v) || p.height }))}
            rawValue={String(user.height)}
            hint="inches"
          />
          <StatTile
            label="Weight"
            value={`${user.weight} lbs`}
            editing={isEditing}
            onChangeText={(v) => setUser((p) => ({ ...p, weight: parseInt(v) || p.weight }))}
            rawValue={String(user.weight)}
            hint="lbs"
          />
          <StatTile
            label="Age"
            value={`${user.age} yrs`}
            editing={isEditing}
            onChangeText={(v) => setUser((p) => ({ ...p, age: parseInt(v) || p.age }))}
            rawValue={String(user.age)}
            hint="years"
          />
          <StatTile
            label="Activity"
            value={formatActivityLevel(user.activityLevel)}
            editing={false}
          />
        </View>
      </View>

      {/* ── Nutrition Goals ───────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutrition Goals</Text>

        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>Daily Calories</Text>
          <Text style={styles.goalValue}>{user.calorieGoal} kcal</Text>
        </View>

        <View style={styles.macrosSection}>
          <MacroBar label="Protein" consumed={totals.protein} goal={user.proteinGoal} color={Colors.primary} />
          <MacroBar label="Carbs" consumed={totals.carbs} goal={user.carbGoal} color={Colors.secondaryFixedDim} />
          <MacroBar label="Fat" consumed={totals.fat} goal={user.fatGoal} color={Colors.tertiary} />
        </View>

        <View style={[styles.goalRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow, paddingTop: 12 }]}>
          <Text style={styles.goalLabel}>Target Weight</Text>
          <Text style={styles.goalValue}>{user.weightTarget} lbs</Text>
        </View>
      </View>

      {/* ── Weekly Calorie Chart ──────────────────────────────────────────── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weekly Trend</Text>
        <Text style={styles.chartSub}>
          Avg {Math.round(user.weeklyCalories.reduce((a, b) => a + b, 0) / 7)} kcal/day
        </Text>
        <View style={styles.barChart}>
          {user.weeklyCalories.map((val, i) => {
            const isToday = i === 6;
            const h = Math.max((val / maxBar) * 72, 4);
            return (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: isToday
                        ? `${Colors.onSecondaryFixed}55`
                        : `${Colors.onSecondaryFixed}22`,
                    },
                  ]}
                />
                <Text style={styles.barDay}>{DAYS[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Dietary Preferences ───────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dietary Preferences</Text>
        <View style={styles.prefList}>
          {(
            [
              ['vegetarian', 'Vegetarian'],
              ['vegan', 'Vegan'],
              ['glutenFree', 'Gluten Free'],
              ['dairyFree', 'Dairy Free'],
            ] as [keyof User['dietaryPreferences'], string][]
          ).map(([key, label]) => (
            <View key={key} style={styles.prefRow}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Switch
                value={user.dietaryPreferences[key]}
                onValueChange={(v) => updatePref(key, v)}
                trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primary }}
                thumbColor={Colors.onPrimary}
                ios_backgroundColor={Colors.surfaceContainerHigh}
              />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── StatTile sub-component ────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  editing,
  onChangeText,
  rawValue,
  hint,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (v: string) => void;
  rawValue?: string;
  hint?: string;
}) {
  return (
    <View style={tileStyles.tile}>
      <Text style={tileStyles.label}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={tileStyles.input}
          value={rawValue}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={hint}
          placeholderTextColor={Colors.onSurfaceVariant}
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
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.surface },
  content: { gap: 0 },

  // Hero
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
  idPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  idText: { fontFamily: FONTS.semiBold, fontSize: 11, color: Colors.onPrimary },
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

  // Card
  card: {
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
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Goals
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: Colors.onSurface },
  goalValue: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.primary },
  macrosSection: { gap: 0 },

  // Weekly chart
  chartCard: {
    backgroundColor: Colors.secondaryFixed,
    borderRadius: Radii.card,
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chartTitle: { fontFamily: FONTS.extraBold, fontSize: 17, color: Colors.onSecondaryFixed },
  chartSub: { fontFamily: FONTS.medium, fontSize: 12, color: Colors.onSecondaryFixedVariant },
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

  // Preferences
  prefList: { gap: 4 },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.innerCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  prefLabel: { fontFamily: FONTS.semiBold, fontSize: 14, color: Colors.onSurface },
});
