import { StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';

const UPCOMING_FEATURES = [
  {
    icon: 'people-outline',
    color: Colors.primary,
    title: 'Follow Friends',
    description: 'Connect with others on the same fitness journey and stay motivated together.',
  },
  {
    icon: 'trophy-outline',
    color: Colors.iconStreak,
    title: 'Leaderboards',
    description: 'Compete on weekly consistency scores, streak rankings, and logged meals.',
  },
  {
    icon: 'pulse-outline',
    color: Colors.iconCalories,
    title: 'Activity Feed',
    description: 'See your friends workouts, meals, and milestones as they happen.',
  },
  {
    icon: 'star-outline',
    color: Colors.iconFats,
    title: 'Consistency Score',
    description: 'Earn and lose points based on logging streaks, workouts, and goal adherence.',
  },
];

export default function CommunityScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Community</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconRing}>
            <Ionicons name="people" size={48} color={Colors.primary} />
          </View>
          <View style={styles.heroBadge}>
            <ThemedText style={styles.heroBadgeText}>Coming Soon</ThemedText>
          </View>
          <ThemedText style={styles.heroTitle}>Better Together</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            The community hub is on its way. Here's a sneak peek at what's coming.
          </ThemedText>
        </View>

        {/* Feature cards */}
        <View style={styles.featuresGrid}>
          {UPCOMING_FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIconBg, { backgroundColor: f.color + '18' }]}>
                <Ionicons name={f.icon as any} size={26} color={f.color} />
              </View>
              <View style={styles.featureTextBlock}>
                <ThemedText style={styles.featureTitle}>{f.title}</ThemedText>
                <ThemedText style={styles.featureDesc}>{f.description}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom note */}
        <View style={styles.noteCard}>
          <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
          <ThemedText style={styles.noteText}>
            You'll be notified as soon as community features go live.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary + '15',
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  featuresGrid: {
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  featureTextBlock: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary + '12',
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 18,
  },
});
