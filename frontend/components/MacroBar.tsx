// Horizontal labeled progress bar for protein / carbs / fat.
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FONTS, Radii } from '@/constants/Colors';

interface Props {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, consumed, goal, color, unit = 'g' }: Props) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {fmt(consumed)}{unit} / {fmt(goal)}{unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  value: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  track: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.bar,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.bar,
  },
});
