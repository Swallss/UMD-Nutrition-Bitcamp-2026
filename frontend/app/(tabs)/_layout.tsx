import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* search.tsx is kept on disk but not shown in tab bar */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
