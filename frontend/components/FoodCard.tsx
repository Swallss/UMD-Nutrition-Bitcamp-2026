// Food item row — used in Log, Search, and Dashboard "Today's Log".
// mode='full'    → hall + meal context + circular + button
// mode='compact' → macro numbers instead of context, no + button
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FONTS, Radii } from '@/constants/Colors';
import type { FoodItem } from '@/lib/mockData';

interface Props {
  item: FoodItem;
  mode?: 'compact' | 'full';
  onAdd?: (item: FoodItem) => void;
  onRemove?: (item: FoodItem) => void;
  added?: boolean;
}

const HALL_NAMES: Record<string, string> = {
  yahentamitsi: 'Yahentamitsi',
  'south-campus': 'South Campus Dining Hall',
  '251-north': '251 North Dining Hall',
};

export function FoodCard({ item, mode = 'full', onAdd, onRemove, added = false }: Props) {
  const isCompact = mode === 'compact';

  return (
    <View style={[styles.card, isCompact && styles.cardCompact]}>
      {/* Thumbnail */}
      <View style={[styles.thumb, isCompact && styles.thumbCompact]}>
        <MaterialIcons name="restaurant" size={isCompact ? 20 : 26} color={Colors.surfaceContainerHigh} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

        {!isCompact && (
          <Text style={styles.context}>
            {HALL_NAMES[item.diningHallId] ?? item.diningHallId} · {item.mealTime}
          </Text>
        )}

        {isCompact ? (
          <Text style={styles.macros}>
            {item.protein}P · {item.carbs}C · {item.fat}F
          </Text>
        ) : (
          item.dietaryTag && (
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{item.dietaryTag.toUpperCase()}</Text>
            </View>
          )
        )}
      </View>

      {/* Right side */}
      <View style={styles.right}>
        <Text style={styles.calories}>{item.calories}</Text>
        <Text style={styles.calLabel}>cal</Text>

        {!isCompact && (
          <TouchableOpacity
            onPress={() => onAdd?.(item)}
            style={[styles.addBtn, added && styles.addBtnAdded]}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={added ? 'check' : 'add'}
              size={18}
              color={added ? Colors.onPrimary : Colors.primary}
            />
          </TouchableOpacity>
        )}

        {isCompact && onRemove && (
          <TouchableOpacity
            onPress={() => onRemove(item)}
            style={styles.removeBtn}
            activeOpacity={0.75}
          >
            <MaterialIcons name="delete-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.innerCard + 4,
    padding: 14,
    gap: 12,
  },
  cardCompact: {
    padding: 10,
    backgroundColor: Colors.surfaceContainerLowest,
  },

  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radii.thumb,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbCompact: {
    width: 44,
    height: 44,
  },

  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  context: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  macros: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  tagPill: {
    backgroundColor: Colors.secondaryFixed,
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    color: Colors.onSecondaryFixed,
    letterSpacing: 0.8,
  },

  right: {
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  calories: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: Colors.primary,
  },
  calLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  addBtnAdded: {
    backgroundColor: Colors.primary,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
