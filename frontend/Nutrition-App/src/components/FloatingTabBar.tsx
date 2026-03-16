import { View, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_INSET = 24;
const BAR_WIDTH = SCREEN_WIDTH - H_INSET * 2;
const BAR_HEIGHT = 64;

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index: { active: 'home', inactive: 'home-outline' },
  calories: { active: 'nutrition', inactive: 'nutrition-outline' },
  workouts: { active: 'barbell', inactive: 'barbell-outline' },
  chat: { active: 'chatbubble', inactive: 'chatbubble-outline' },
  community: { active: 'people', inactive: 'people-outline' },
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  calories: 'Calories',
  workouts: 'Workouts',
  chat: 'Chat',
  community: 'Community',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const navigateTo = (index: number) => {
    const route = state.routes[index];
    const isFocused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom }]}>
      <BlurView intensity={95} tint="light" style={styles.blur}>
        <View style={styles.sheen} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
            const label = TAB_LABELS[route.name] ?? route.name;

            return (
              <Pressable
                key={route.key}
                style={styles.tab}
                onPress={() => navigateTo(index)}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
              >
                {focused && <View style={styles.activeCircle} />}
                <Ionicons
                  name={(focused ? icons.active : icons.inactive) as any}
                  size={22}
                  color={focused ? Colors.primary : Colors.textMuted}
                />
                <ThemedText style={[styles.label, focused && styles.labelActive]}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: H_INSET,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  blur: {
    flex: 1,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    overflow: 'hidden',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(255,255,255,0.60)'
      : 'rgba(255,255,255,0.12)',
    borderRadius: BAR_HEIGHT / 2,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeCircle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
