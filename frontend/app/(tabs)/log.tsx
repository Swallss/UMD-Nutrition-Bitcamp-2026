// Log Food — shows 5 items by default; search/filter to see any item in Firestore.
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
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
  getTodayTotals,
  getCurrentMealTime,
  type FoodItem,
  type LogEntry,
  type MealTime,
} from '@/lib/mockData';
import { auth } from '@/lib/firebase';
import { addDailyLog, fetchDailyLogs, fetchFoodItems } from '@/lib/firestore';

// How many items to show when the user hasn't searched yet
const BROWSE_LIMIT = 5;

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState<string | null>(null);
  // All food items fetched from Firestore (kept in memory for instant search)
  const [allFoodItems, setAllFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [todayLogs, setTodayLogs] = useState<LogEntry[]>([]);
  const [pendingItems, setPendingItems] = useState<Record<string, { item: FoodItem; quantity: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const baseTotals = getTodayTotals(todayLogs);
  const pendingEntries = Object.values(pendingItems);
  const sessionCalories = pendingEntries.reduce((s, e) => s + e.item.calories * e.quantity, 0);
  const runningCalories = baseTotals.calories + sessionCalories;

  // True when the user is actively searching or filtering — show all results.
  const isSearching = query.length > 0 || selectedHall !== null;

  // Items to display in the list
  const displayed = useMemo(() => {
    if (!isSearching) {
      // No filter active — show a small preview from the full dataset
      return allFoodItems.slice(0, BROWSE_LIMIT);
    }
    return allFoodItems.filter((item) => {
      const matchQuery = query.length === 0 || item.name.toLowerCase().includes(query.toLowerCase());
      const matchHall  = selectedHall === null  || item.diningHallId === selectedHall;
      return matchQuery && matchHall;
    });
  }, [allFoodItems, query, selectedHall, isSearching]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchFoodItems()
      .then((items) => {
        setAllFoodItems(items);
        setLoadError(null);
      })
      .catch((err) => {
        console.error('[LogScreen] fetchFoodItems error:', err);
        setLoadError(
          'Could not load food items. Check Firestore security rules:\n' +
          'match /items/{id} { allow read: if true; }',
        );
      })
      .finally(() => setIsLoading(false));

    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) { setTodayLogs([]); return; }
      fetchDailyLogs(user.uid).then(setTodayLogs).catch(() => setTodayLogs([]));
    });
    return unsub;
  }, []);

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
      const next = entry.quantity + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { ...entry, quantity: next } };
    });
  };

  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before saving food logs.');
      router.replace('/(auth)/login' as any);
      return;
    }
    try {
      setIsSaving(true);
      const mealTime: MealTime = getCurrentMealTime();
      await Promise.all(
        pendingEntries.map((e) => addDailyLog(user.uid, e.item, e.quantity, mealTime)),
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
      {/* Search bar */}
      <View style={styles.searchBox}>
        <View style={styles.searchIconWrap}>
          <MaterialIcons name="search" size={20} color={Colors.onSecondaryContainer} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search all dishes..."
          placeholderTextColor={Colors.onSurfaceVariant}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={{ paddingHorizontal: 10 }}>
            <MaterialIcons name="close" size={18} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dining hall filter */}
      <DiningHallPicker selected={selectedHall} onSelect={setSelectedHall} />

      {/* Ready-to-log pending items */}
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
              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                  <MaterialIcons name={quantity === 1 ? 'delete-outline' : 'remove'} size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                  <MaterialIcons name="add" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Result count / hint */}
      {!isLoading && !loadError && (
        <Text style={styles.countLabel}>
          {isSearching
            ? `${displayed.length} result${displayed.length === 1 ? '' : 's'}`
            : `Showing ${Math.min(BROWSE_LIMIT, allFoodItems.length)} of ${allFoodItems.length} items — search to find any dish`}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Food</Text>
        {runningCalories > 0 && (
          <View style={styles.calorieBadge}>
            <Text style={styles.calorieBadgeText}>{runningCalories} cal today</Text>
          </View>
        )}
      </View>

      <FlatList
        data={displayed}
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
            {loadError ? (
              <>
                <MaterialIcons name="error-outline" size={48} color={Colors.primary} />
                <Text style={styles.emptyText}>Could not load menu</Text>
                <Text style={[styles.emptyHint, { color: Colors.primary }]}>{loadError}</Text>
              </>
            ) : isLoading ? (
              <>
                <MaterialIcons name="hourglass-empty" size={48} color={Colors.surfaceContainerHigh} />
                <Text style={styles.emptyText}>Loading menu from Firestore…</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="search-off" size={48} color={Colors.surfaceContainerHigh} />
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptyHint}>Try a different search or dining hall</Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {pendingEntries.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 90 }]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={isSaving}
        >
          <MaterialIcons name="check" size={20} color={Colors.onPrimary} />
          <Text style={styles.fabText}>
            {isSaving ? 'Saving…' : `Log ${pendingEntries.length} item${pendingEntries.length === 1 ? '' : 's'}`}
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
  headerTitle: { fontFamily: FONTS.extraBold, fontSize: 22, color: Colors.onSurface },
  calorieBadge: {
    backgroundColor: Colors.secondaryFixed,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  calorieBadgeText: { fontFamily: FONTS.extraBold, fontSize: 12, color: Colors.onSecondaryFixed },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 160 },
  listHeader: { gap: 12, marginBottom: 12 },

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
  pendingTitle: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.onSurface },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingInfo: { flex: 1 },
  pendingName: { fontFamily: FONTS.bold, fontSize: 13, color: Colors.onSurface },
  pendingMeta: { fontFamily: FONTS.medium, fontSize: 11, color: Colors.onSurfaceVariant },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { minWidth: 18, textAlign: 'center', fontFamily: FONTS.extraBold, color: Colors.onSurface },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 16, color: Colors.onSurfaceVariant },
  emptyHint: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

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
  fabText: { fontFamily: FONTS.extraBold, fontSize: 14, color: Colors.onPrimary, letterSpacing: 0.3 },
});
