// Search — browse all UMD dining hall food items with filtering.
import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FONTS, Radii, Spacing } from '@/constants/Colors';
import { FoodCard } from '@/components/FoodCard';
import { DiningHallPicker } from '@/components/DiningHallPicker';
import { mockFoodItems, type FoodItem } from '@/lib/mockData';
import { auth } from '@/lib/firebase';
import { addDailyLog, fetchFoodItems } from '@/lib/firestore';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>(mockFoodItems);

  useEffect(() => {
    fetchFoodItems()
      .then(setFoodItems)
      .catch(() => setFoodItems(mockFoodItems));
  }, []);

  const filtered = foodItems.filter((item) => {
    const matchQuery =
      query.length === 0 || item.name.toLowerCase().includes(query.toLowerCase());
    const matchHall = selectedHall === null || item.diningHallId === selectedHall;
    return matchQuery && matchHall;
  });

  const handleAdd = async (item: FoodItem) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in with Google before saving food logs.');
      return;
    }

    try {
      await addDailyLog(user.uid, item, 1, item.mealTime);
      Alert.alert('Added to log!', item.name, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Could not add item', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const ListHeader = (
    <View style={styles.listHeader}>
      <DiningHallPicker selected={selectedHall} onSelect={setSelectedHall} />
      {query.length > 0 && (
        <Text style={styles.resultCount}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
          {`"${query}"`}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <Text style={styles.headerSub}>Find food across all dining halls</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconWrap}>
            <MaterialIcons name="search" size={20} color={Colors.onSecondaryContainer} />
          </View>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search dishes, cuisines..."
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
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FoodCard item={item} mode="full" onAdd={handleAdd} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={72} color={Colors.surfaceContainerHigh} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptyHint}>
              Try searching for a dish name{'\n'}or select a different dining hall
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
    paddingTop: 4,
  },
  headerTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: Colors.onSurface,
  },
  headerSub: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
  },
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

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  listHeader: { gap: 10, marginBottom: 12 },

  resultCount: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },

  empty: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 17, color: Colors.onSurfaceVariant },
  emptyHint: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
