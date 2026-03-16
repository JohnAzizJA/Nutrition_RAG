import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/src/components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: 100 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 0,
        },
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
