// Custom bottom tab bar — matches stitch nav design.
// Active: Maryland Red pill (borderRadius 16) with white icon + label.
// Inactive: onSurfaceVariant grey icon + label.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors, FONTS } from '@/constants/Colors';

type TabConfig = {
  routeName: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const TAB_CONFIG: TabConfig[] = [
  { routeName: 'index', label: 'HOME', icon: 'home' },
  { routeName: 'log', label: 'LOG', icon: 'add-circle' },
  { routeName: 'profile', label: 'PROFILE', icon: 'person' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Only render tabs that have a TAB_CONFIG entry (excludes hidden search tab)
  const visibleRoutes = state.routes.filter((route) =>
    TAB_CONFIG.some((c) => c.routeName === route.name),
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
      {visibleRoutes.map((route) => {
        const config = TAB_CONFIG.find((c) => c.routeName === route.name)!;
        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
        const isActive = state.index === routeIndex;

        const onPress = () => {
          if (!isActive) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabOuter}
            android_ripple={null}
          >
            <View style={[styles.tabInner, isActive && styles.tabInnerActive]}>
              <MaterialIcons
                name={config.icon}
                size={22}
                color={isActive ? Colors.onPrimary : Colors.onSurfaceVariant}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {config.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249,249,249,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  tabOuter: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 3,
  },
  tabInnerActive: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  label: {
    fontFamily: FONTS.extraBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: Colors.onSurfaceVariant,
  },
  labelActive: {
    color: Colors.onPrimary,
  },
});
