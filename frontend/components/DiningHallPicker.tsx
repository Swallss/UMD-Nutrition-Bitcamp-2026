// Horizontal scrolling filter chips — dining hall selection.
// Active: secondaryFixed (gold). Inactive: surfaceContainerHigh (grey).
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, FONTS, Radii } from '@/constants/Colors';
import { mockDiningHalls } from '@/lib/mockData';

interface Props {
  selected: string | null; // null = All
  onSelect: (id: string | null) => void;
}

export function DiningHallPicker({ selected, onSelect }: Props) {
  const chips = [
    { id: null, label: 'All Halls' },
    ...mockDiningHalls.map((h) => ({ id: h.id, label: h.name })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const isActive = selected === chip.id;
        return (
          <TouchableOpacity
            key={chip.id ?? '__all__'}
            onPress={() => onSelect(chip.id)}
            style={[styles.chip, isActive && styles.activeChip]}
            activeOpacity={0.75}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.chip,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activeChip: {
    backgroundColor: Colors.secondaryFixed,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  activeLabel: {
    color: Colors.onSecondaryFixed,
  },
});
