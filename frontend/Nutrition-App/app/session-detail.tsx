import { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { workoutSessionService, WorkoutSession, WorkoutSessionSet } from '@/src/services';
import { BlurView } from 'expo-blur';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDuration = (seconds?: number) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

const formatSetDetail = (set: WorkoutSessionSet) => {
  if (set.duration_seconds) {
    const m = Math.floor(set.duration_seconds / 60);
    const s = set.duration_seconds % 60;
    return m > 0 ? `${m}m ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`;
  }
  const repsStr = set.reps ? `${set.reps} reps` : '—';
  const weightStr = set.weight_kg ? ` @ ${set.weight_kg} kg` : '';
  return `${repsStr}${weightStr}`;
};

// Group flat set list by exercise name, preserving order of first appearance
const groupByExercise = (sets: WorkoutSessionSet[]): { name: string; sets: WorkoutSessionSet[] }[] => {
  const map = new Map<string, WorkoutSessionSet[]>();
  for (const set of sets) {
    if (!map.has(set.exercise_name)) map.set(set.exercise_name, []);
    map.get(set.exercise_name)!.push(set);
  }
  return Array.from(map.entries()).map(([name, sets]) => ({ name, sets }));
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (id) fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const data = await workoutSessionService.getSession(Number(id));
      setSession(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const exerciseGroups = session?.sets ? groupByExercise(session.sets) : [];

  const totalVolume = session?.sets
    ? session.sets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    : 0;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <BlurView intensity={80} tint="light" style={styles.header}>
        <View style={styles.headerSheen} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {session?.routine_name ?? 'Workout'}
        </ThemedText>
        <View style={{ width: 38 }} />
      </BlurView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error || !session ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.inactive} />
          <ThemedText style={styles.errorText}>Could not load session</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Meta card */}
          <View style={styles.metaCardOuter}>
            <BlurView intensity={85} tint="light" style={styles.metaCard}>
              <View style={styles.glassSheen} />
            <ThemedText style={styles.metaDate}>{formatDate(session.started_at)}</ThemedText>
            <View style={styles.metaRow}>
              <View style={styles.metaStat}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <ThemedText style={styles.metaValue}>{formatDuration(session.duration_seconds)}</ThemedText>
                <ThemedText style={styles.metaLabel}>Duration</ThemedText>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaStat}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
                <ThemedText style={styles.metaValue}>{session.sets?.length ?? 0}</ThemedText>
                <ThemedText style={styles.metaLabel}>Sets</ThemedText>
              </View>
              {totalVolume > 0 && (
                <>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaStat}>
                    <Ionicons name="barbell-outline" size={18} color={Colors.primary} />
                    <ThemedText style={styles.metaValue}>
                      {totalVolume >= 1000
                        ? `${(totalVolume / 1000).toFixed(1)}t`
                        : `${Math.round(totalVolume)}kg`}
                    </ThemedText>
                    <ThemedText style={styles.metaLabel}>Volume</ThemedText>
                  </View>
                </>
              )}
            </View>
            </BlurView>
          </View>

          {/* Exercise groups */}
          {exerciseGroups.length === 0 ? (
            <View style={styles.emptyExercises}>
              <ThemedText style={styles.emptyText}>No sets recorded</ThemedText>
            </View>
          ) : (
            exerciseGroups.map((group) => (
              <View key={group.name} style={styles.exerciseCardOuter}>
                <BlurView intensity={85} tint="light" style={styles.exerciseCard}>
                  <View style={styles.glassSheen} />
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseIconWrap}>
                    <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                  </View>
                  <ThemedText style={styles.exerciseName}>{group.name}</ThemedText>
                  <ThemedText style={styles.exerciseSetCount}>
                    {group.sets.length} {group.sets.length === 1 ? 'set' : 'sets'}
                  </ThemedText>
                </View>

                {/* Column header */}
                {(() => {
                  const isTimed = !!group.sets[0]?.duration_seconds;
                  return (
                    <>
                      <View style={styles.setHeaderRow}>
                        <ThemedText style={[styles.setColSet, styles.setHeaderText]}>SET</ThemedText>
                        <ThemedText style={[styles.setColMain, styles.setHeaderText]}>
                          {isTimed ? 'DURATION' : 'REPS'}
                        </ThemedText>
                        {!isTimed && (
                          <ThemedText style={[styles.setColWeight, styles.setHeaderText]}>WEIGHT</ThemedText>
                        )}
                      </View>

                      {group.sets.map((set) => (
                        <View key={set.id} style={styles.setRow}>
                          <View style={styles.setColSet}>
                            <View style={styles.setBadge}>
                              <ThemedText style={styles.setBadgeText}>{set.set_number}</ThemedText>
                            </View>
                          </View>
                          <ThemedText style={styles.setColMain}>
                            {isTimed ? formatSetDetail(set) : (set.reps ?? '—')}
                          </ThemedText>
                          {!isTimed && (
                            <ThemedText style={styles.setColWeight}>
                              {set.weight_kg ? `${set.weight_kg} kg` : '—'}
                            </ThemedText>
                          )}
                        </View>
                      ))}
                    </>
                  );
                })()}
                </BlurView>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.60)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  content: {
    padding: 16,
  },
  // ─── Meta card ───
  metaCardOuter: {
    borderRadius: 14,
    marginBottom: 16,
  },
  metaCard: {
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },
  metaDate: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metaStat: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  // ─── Exercise card ───
  exerciseCardOuter: {
    borderRadius: 14,
    marginBottom: 12,
  },
  exerciseCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  exerciseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
  },
  exerciseSetCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Fixed-width columns — header and data rows share the same style objects
  setColSet: {
    width: 48,
    alignItems: 'center',
  },
  setColMain: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
  },
  setColWeight: {
    width: 80,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
