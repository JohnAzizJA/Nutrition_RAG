import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/src/components/FloatingTabBar';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.background, paddingBottom: 100 },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calories" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="community" />
    </Tabs>
  );
}
