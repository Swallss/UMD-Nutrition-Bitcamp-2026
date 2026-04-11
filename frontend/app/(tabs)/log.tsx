// Log Food — search + filter UMD dining items, add to today's log.
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { FoodCard } from '@/components/FoodCard';
import { DiningHallPicker } from '@/components/DiningHallPicker';
import {
  mockFoodItems,
  getTodayTotals,
  getCurrentMealTime,
  type FoodItem,
  type LogEntry,
  type MealTime,
} from '@/lib/mockData';
import { auth } from '@/lib/firebase';
import { addDailyLog, fetchDailyLogs, fetchFoodItems } from '@/lib/firestore';

const MEAL_TIMES: MealTime[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealTime>(getCurrentMealTime());
  const [selectedHall, setSelectedHall] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>(mockFoodItems);
  const [todayLogs, setTodayLogs] = useState<LogEntry[]>([]);
  const [pendingItems, setPendingItems] = useState<Record<string, { item: FoodItem; quantity: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const baseTotals = getTodayTotals(todayLogs);
  const pendingEntries = Object.values(pendingItems);
  const sessionCalories = pendingEntries.reduce((s, entry) => s + entry.item.calories * entry.quantity, 0);
  const runningCalories = baseTotals.calories + sessionCalories;

  useEffect(() => {
    fetchFoodItems()
      .then(setFoodItems)
      .catch(() => setFoodItems(mockFoodItems));

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setTodayLogs([]);
        return;
      }
      fetchDailyLogs(user.uid).then(setTodayLogs).catch(() => setTodayLogs([]));
    });
    return unsubscribe;
  }, []);

  const filtered = foodItems.filter((item) => {
    const matchQuery = item.name.toLowerCase().includes(query.toLowerCase());
    const matchMeal = item.mealTime === selectedMeal;
    const matchHall = selectedHall === null || item.diningHallId === selectedHall;
    return matchQuery && matchMeal && matchHall;
  });

  const handleAdd = useCallback((item: FoodItem) => {
    setPendingItems((prev) => ({
      ...prev,
      [item.id]: { item, quantity: (prev[item.id]?.quantity ?? 0) + 1 },
    }));
  }, []);

  const updateQuantity = (itemId: string, delta: number) => {
    setPendingItems((prev) => {
      const entry = prev[itemId];
      if (!entry) return prev;
      const nextQuantity = entry.quantity + delta;
      if (nextQuantity <= 0) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...entry, quantity: nextQuantity } };
    });
  };

  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in with Google before saving food logs.');
      router.replace('/(auth)/login' as any);
      return;
    }

    try {
      setIsSaving(true);
      await Promise.all(
        pendingEntries.map((entry) => addDailyLog(user.uid, entry.item, entry.quantity, selectedMeal)),
      );
      setPendingItems({});
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Could not save log', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Search */}
      <View style={styles.searchBox}>
        <View style={styles.searchIconWrap}>
          <MaterialIcons name="search" size={20} color={Colors.onSecondaryContainer} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes..."
          placeholderTextColor={Colors.onSurfaceVariant}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={{ paddingHorizontal: 10 }}>
            <MaterialIcons name="close" size={18} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Meal-time chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {MEAL_TIMES.map((meal) => {
          const isActive = selectedMeal === meal;
          return (
            <TouchableOpacity
              key={meal}
              onPress={() => setSelectedMeal(meal)}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {meal.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hall picker */}
      <DiningHallPicker selected={selectedHall} onSelect={setSelectedHall} />

      {pendingEntries.length > 0 && (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingTitle}>Ready to log</Text>
          {pendingEntries.map(({ item, quantity }) => (
            <View key={item.id} style={styles.pendingRow}>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.pendingMeta}>
                  {Math.round(item.calories * quantity)} cal · {quantity} serving{quantity === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.quantityControls}>
                <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.quantityBtn}>
                  <MaterialIcons name={quantity === 1 ? 'delete-outline' : 'remove'} size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.quantityBtn}>
                  <MaterialIcons name="add" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Count */}
      <Text style={styles.countLabel}>
        {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        {selectedHall ? '' : ' across all halls'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Sticky header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Food</Text>
        {runningCalories > 0 && (
          <View style={styles.calorieBadge}>
            <Text style={styles.calorieBadgeText}>{runningCalories} cal today</Text>
          </View>
        )}
      </View>

      {/* Food list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FoodCard
            item={item}
            mode="full"
            onAdd={handleAdd}
            added={Boolean(pendingItems[item.id])}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={56} color={Colors.surfaceContainerHigh} />
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptyHint}>Try a different search or filter</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Confirm FAB */}
      {pendingEntries.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 90 }]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={isSaving}
        >
          <MaterialIcons name="check" size={20} color={Colors.onPrimary} />
          <Text style={styles.fabText}>
            {isSaving ? 'Saving...' : `Log ${pendingEntries.length} ${pendingEntries.length === 1 ? 'item' : 'items'}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: Colors.onSurface,
  },
  calorieBadge: {
    backgroundColor: Colors.secondaryFixed,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  calorieBadgeText: {
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    color: Colors.onSecondaryFixed,
  },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 160 },

  listHeader: { gap: 12, marginBottom: 12 },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.pill,
    paddingLeft: 6,
    paddingRight: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: Colors.onSurface,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.chip,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: Colors.secondaryFixed },
  chipLabel: { fontFamily: FONTS.bold, fontSize: 12, color: Colors.onSurfaceVariant },
  chipLabelActive: { color: Colors.onSecondaryFixed },

  countLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: Colors.primary,
    letterSpacing: 0.3,
  },

  pendingBox: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.innerCard,
    padding: Spacing.md,
    gap: 10,
  },
  pendingTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingInfo: { flex: 1 },
  pendingName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  pendingMeta: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    minWidth: 18,
    textAlign: 'center',
    fontFamily: FONTS.extraBold,
    color: Colors.onSurface,
  },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 16, color: Colors.onSurfaceVariant },
  emptyHint: { fontFamily: FONTS.medium, fontSize: 13, color: Colors.onSurfaceVariant },

  // FAB
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingHorizontal: 28,
    paddingVertical: 15,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  fabText: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: Colors.onPrimary,
    letterSpacing: 0.3,
  },
});
