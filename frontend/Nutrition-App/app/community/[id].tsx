import { useState, useCallback } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  communityService, CommunityFeed, Announcement, LeaderboardEntry, ReactionType, Reactor,
} from '@/src/services/communityService';
import { BlurView } from 'expo-blur';

const REACTION_OPTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'celebrate', emoji: '🎉' },
  { type: 'love', emoji: '❤️' },
];

const EVENT_META: Record<string, { icon: string; color: string; label: (c: any) => string }> = {
  workout_complete: {
    icon: 'barbell-outline',
    color: Colors.secondary,
    label: (c) => `completed a workout  +${c.points} pts`,
  },
  pr_achieved: {
    icon: 'trophy-outline',
    color: Colors.iconStreak,
    label: (c) =>
      c.weight_kg
        ? `PR on ${c.exercise}: ${c.weight_kg} kg  +${c.points} pts`
        : `PR on ${c.exercise}: ${Math.floor(c.duration_seconds / 60)}m${c.duration_seconds % 60}s  +${c.points} pts`,
  },
  weight_goal: {
    icon: 'checkmark-circle-outline',
    color: Colors.iconNutrition,
    label: (c) => `reached goal weight ${c.goal_weight_kg} kg  +${c.points} pts`,
  },
  streak_bonus: {
    icon: 'flame-outline',
    color: Colors.iconStreak,
    label: (c) => `${c.streak_days}-day streak bonus  +${c.points} pts`,
  },
  streak_break: {
    icon: 'snow-outline',
    color: Colors.textMuted as string,
    label: (c) => `streak broke (was ${c.previous_streak} days)  ${c.points} pts`,
  },
  missed_workouts: {
    icon: 'alert-circle-outline',
    color: Colors.danger,
    label: (c) => `missed ${c.missed}/${c.goal} workouts last week  ${c.points} pts`,
  },
  calorie_miss: {
    icon: 'nutrition-outline',
    color: Colors.iconCalories,
    label: (c) => `calories ${c.direction} by >25% yesterday  ${c.points} pts`,
  },
};

// ── Bar chart for top-3 ───────────────────────────────────────────────────────

function TopThreeBar({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const top = leaderboard.slice(0, 3);
  if (top.length === 0) return null;

  const maxPts = Math.max(...top.map((e) => e.points), 1);
  // Podium order: 2nd, 1st, 3rd
  const podium = [top[1], top[0], top[2]].filter(Boolean);
  const podiumHeights = [100, 140, 80];
  const podiumColors = [Colors.inactive, Colors.iconStreak, Colors.border];
  const medals = ['🥈', '🥇', '🥉'];

  return (
    <View style={barStyles.container}>
      {podium.map((entry, idx) => {
        const barH = Math.max(40, (entry.points / maxPts) * podiumHeights[idx]);
        return (
          <View key={entry.user_id} style={barStyles.barCol}>
            <ThemedText style={barStyles.pts}>
              {entry.points >= 0 ? '+' : ''}{entry.points}
            </ThemedText>
            <ThemedText style={barStyles.name} numberOfLines={1}>{entry.username}</ThemedText>
            <View style={[barStyles.bar, { height: barH, backgroundColor: podiumColors[idx] }]}>
              <ThemedText style={barStyles.medal}>{medals[idx]}</ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  barCol: {
    alignItems: 'center',
    width: 80,
  },
  pts: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 2,
  },
  name: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
    maxWidth: 72,
    textAlign: 'center',
  },
  bar: {
    width: 56,
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  medal: {
    fontSize: 20,
  },
});

// ── Reaction picker modal ────────────────────────────────────────────────────

function ReactionModal({
  visible,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  current: ReactionType | null;
  onPick: (r: ReactionType) => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <View style={modalStyles.box}>
          <View style={modalStyles.row}>
            {REACTION_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.type}
                style={[modalStyles.emojiBtn, current === r.type && modalStyles.emojiBtnActive]}
                onPress={() => onPick(r.type)}
              >
                <ThemedText style={modalStyles.emoji}>{r.emoji}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: 300,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  emojiBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  emojiBtnActive: {
    backgroundColor: Colors.primary + '25',
  },
  emoji: {
    fontSize: 28,
    lineHeight: 36,
    includeFontPadding: false,
  },
});

// ── Announcement card ─────────────────────────────────────────────────────────

function ReactorsModal({
  visible,
  reactors,
  onClose,
}: {
  visible: boolean;
  reactors: Reactor[];
  onClose: () => void;
}) {
  const EMOJI: Record<ReactionType, string> = { celebrate: '🎉', love: '❤️' };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={reactorStyles.backdrop} onPress={onClose}>
        <Pressable style={reactorStyles.box} onPress={(e) => e.stopPropagation()}>
          <ThemedText style={reactorStyles.title}>Reactions</ThemedText>
          {reactors.length === 0 ? (
            <ThemedText style={reactorStyles.empty}>No reactions yet</ThemedText>
          ) : (
            reactors.map((r, i) => (
              <View key={i} style={reactorStyles.row}>
                <ThemedText style={reactorStyles.emoji}>{EMOJI[r.reaction_type]}</ThemedText>
                <ThemedText style={reactorStyles.name}>{r.username ?? 'Unknown'}</ThemedText>
              </View>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const reactorStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: 280,
    maxHeight: 400,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
    includeFontPadding: false,
  },
  name: {
    fontSize: 15,
    color: Colors.dark,
    fontWeight: '500',
  },
  empty: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

// ── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({
  item,
  communityId,
  onReactionChange,
}: {
  item: Announcement;
  communityId: number;
  onReactionChange: () => void;
}) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [reactorsVisible, setReactorsVisible] = useState(false);
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [pressing, setPressing] = useState(false);
  const meta = EVENT_META[item.event_type];

  const handlePick = async (type: ReactionType) => {
    setPickerVisible(false);
    setPressing(false);
    try {
      if (type === item.my_reaction) {
        await communityService.deleteReaction(communityId, item.id);
      } else {
        await communityService.upsertReaction(communityId, item.id, type);
      }
      onReactionChange();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChipPress = async () => {
    try {
      const data = await communityService.getReactors(communityId, item.id);
      setReactors(data);
      setReactorsVisible(true);
    } catch (e) {
      console.error(e);
    }
  };

  const totalReactions = Object.values(item.reactions).reduce((a, b) => a + b, 0);

  const timeLabel = (() => {
    const diff = Date.now() - new Date(item.created_at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <TouchableOpacity
      style={[pressing && { opacity: 0.45 }]}
      onLongPress={() => { setPressing(true); setPickerVisible(true); }}
      delayLongPress={400}
      activeOpacity={0.4}
    >
      <View style={annStyles.cardOuter}>
        <BlurView intensity={85} tint="light" style={annStyles.card}>
          <View style={annStyles.glassSheen} />
      <View style={[annStyles.iconWrap, { backgroundColor: (meta?.color ?? Colors.primary) + '18' }]}>
        <Ionicons
          name={(meta?.icon ?? 'star-outline') as any}
          size={18}
          color={meta?.color ?? Colors.primary}
        />
      </View>
      <View style={annStyles.body}>
        <View style={annStyles.row}>
          <ThemedText style={annStyles.username}>{item.username ?? 'Unknown'}</ThemedText>
          <ThemedText style={annStyles.time}>{timeLabel}</ThemedText>
        </View>
        <ThemedText style={annStyles.text}>
          {meta ? meta.label(item.content) : item.event_type}
        </ThemedText>
        {totalReactions > 0 && (
          <TouchableOpacity style={annStyles.reactionRow} onPress={handleChipPress} activeOpacity={0.7}>
            {REACTION_OPTIONS.filter((r) => (item.reactions[r.type] ?? 0) > 0).map((r) => (
              <View key={r.type} style={[annStyles.reactionChip, item.my_reaction === r.type && annStyles.reactionChipMine]}>
                <ThemedText style={annStyles.reactionEmoji}>{r.emoji}</ThemedText>
                <ThemedText style={annStyles.reactionCount}>{item.reactions[r.type]}</ThemedText>
              </View>
            ))}
          </TouchableOpacity>
        )}
      </View>
      <ReactionModal
        visible={pickerVisible}
        current={item.my_reaction}
        onPick={handlePick}
        onClose={() => { setPickerVisible(false); setPressing(false); }}
      />
      <ReactorsModal
        visible={reactorsVisible}
        reactors={reactors}
        onClose={() => setReactorsVisible(false)}
      />
        </BlurView>
      </View>
    </TouchableOpacity>
  );
}

const annStyles = StyleSheet.create({
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },
  cardOuter: {
    borderRadius: 14,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  text: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  reactionChipMine: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: Colors.dark,
    fontWeight: '600',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CommunityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = Number(id);
  const [feed, setFeed] = useState<CommunityFeed | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const data = await communityService.getCommunityFeed(communityId);
      setFeed(data);
    } catch (err) {
      console.error('Failed to load community feed:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFeed();
    }, [loadFeed])
  );

  if (loading || !feed) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Community</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>{feed.community.name}</ThemedText>
        <TouchableOpacity onPress={() => router.push({ pathname: '/community-info/[id]', params: { id: communityId } })}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Leaderboard */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Leaderboard</ThemedText>
          <View style={styles.sectionCardOuter}>
            <BlurView intensity={85} tint="light" style={styles.sectionCard}>
              <View style={styles.glassSheen} />
            <TopThreeBar leaderboard={feed.leaderboard} />
            {feed.leaderboard.slice(3).map((entry, i) => (
              <View key={entry.user_id} style={styles.rankRow}>
                <ThemedText style={styles.rankNum}>{i + 4}</ThemedText>
                <ThemedText style={styles.rankName}>{entry.username}</ThemedText>
                <ThemedText style={[styles.rankPts, entry.points < 0 && styles.negPts]}>
                  {entry.points >= 0 ? '+' : ''}{entry.points} pts
                </ThemedText>
              </View>
            ))}
            {feed.leaderboard.length === 0 && (
              <ThemedText style={styles.emptyNote}>No members yet.</ThemedText>
            )}
            </BlurView>
          </View>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Activity Feed</ThemedText>
          {feed.announcements.length === 0 ? (
            <ThemedText style={styles.emptyNote}>No activity yet. Complete a workout to get started!</ThemedText>
          ) : (
            feed.announcements.map((ann) => (
              <AnnouncementCard
                key={ann.id}
                item={ann}
                communityId={communityId}
                onReactionChange={loadFeed}
              />
            ))
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 12,
  },
  sectionCardOuter: {
    borderRadius: 16,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  rankNum: {
    fontSize: 14,
    color: Colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  rankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  rankPts: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  negPts: {
    color: Colors.danger,
  },
  emptyNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
