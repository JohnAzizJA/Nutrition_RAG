import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { workoutService, workoutSessionService, WorkoutRoutine, WorkoutSession } from '@/src/services';
import { Swipeable } from 'react-native-gesture-handler';

// ─── Format helpers ───────────────────────────────────────────────────────────

const formatDuration = (seconds?: number) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutsScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  const fetchAll = async () => {
    try {
      const [r, s] = await Promise.all([
        workoutService.getRoutines(),
        workoutSessionService.getSessions(),
      ]);
      setRoutines(r);
      setSessions(s.filter(sess => !!sess.ended_at));
    } catch (error) {
      console.error('Failed to fetch workout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRoutine = async (routineId: number) => {
    try {
      await workoutService.deleteRoutine(routineId);
      fetchAll();
    } catch {
      Alert.alert('Error', 'Failed to delete routine');
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      await workoutSessionService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {
      Alert.alert('Error', 'Failed to delete workout');
    }
  };

  const renderDeleteAction = (onPress: () => void) => (
    <TouchableOpacity style={styles.deleteAction} onPress={onPress}>
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

  const renderRoutine = ({ item }: { item: WorkoutRoutine }) => (
    <Swipeable renderRightActions={() => renderDeleteAction(() => deleteRoutine(item.id))}>
      <TouchableOpacity
        style={styles.routineCard}
        onPress={() => router.push(`/workout-detail?id=${item.id}`)}
      >
        <View style={styles.routineHeader}>
          <ThemedText style={styles.routineName}>{item.name}</ThemedText>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </View>
        {item.description && (
          <ThemedText style={styles.routineDescription}>{item.description}</ThemedText>
        )}
        <View style={styles.routineFooter}>
          <View style={styles.statItem}>
            <Ionicons name="fitness" size={16} color={Colors.primary} />
            <ThemedText style={styles.statText}>{item.exercise_count} exercises</ThemedText>
          </View>
          {(item.exercise_count ?? 0) > 0 && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/active-workout?routineId=${item.id}&routineName=${encodeURIComponent(item.name)}`);
              }}
            >
              <Ionicons name="play" size={14} color={Colors.white} />
              <ThemedText style={styles.startButtonText}>Start</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderSession = (item: WorkoutSession) => (
    <Swipeable renderRightActions={() => renderDeleteAction(() => deleteSession(item.id))}>
      <View style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <ThemedText style={styles.sessionName}>{item.routine_name}</ThemedText>
          <ThemedText style={styles.sessionDate}>{formatDate(item.started_at)}</ThemedText>
        </View>

        <View style={styles.sessionStats}>
          <View style={styles.sessionStat}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <ThemedText style={styles.sessionStatText}>{formatDuration(item.duration_seconds)}</ThemedText>
          </View>
          {(item.total_volume_kg ?? 0) > 0 && (
            <View style={styles.sessionStat}>
              <Ionicons name="barbell-outline" size={13} color={Colors.textMuted} />
              <ThemedText style={styles.sessionStatText}>
                {(item.total_volume_kg ?? 0) >= 1000
                  ? `${((item.total_volume_kg ?? 0) / 1000).toFixed(1)}t`
                  : `${item.total_volume_kg}kg`} vol
              </ThemedText>
            </View>
          )}
          <View style={styles.sessionStat}>
            <Ionicons name="checkmark-circle-outline" size={13} color={Colors.textMuted} />
            <ThemedText style={styles.sessionStatText}>{item.set_count} sets</ThemedText>
          </View>
        </View>

        {item.exercises_summary && item.exercises_summary.length > 0 && (
          <View style={styles.exercisePills}>
            {item.exercises_summary.map(ex => (
              <View key={ex.name} style={styles.exercisePill}>
                <ThemedText style={styles.exercisePillText}>
                  {ex.name} × {ex.sets_logged}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Swipeable>
  );

  const ListHeader = () => (
    <>
      {/* Volume Chart */}
      <View style={styles.chartCard}>
        <ThemedText style={styles.chartTitle}>Weekly Volume</ThemedText>
        <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 13, color: Colors.textMuted }}>Graph coming soon</ThemedText>
        </View>
      </View>

      {/* Routines section */}
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>My Routines</ThemedText>
      </View>

      {routines.length === 0 && (
        <View style={styles.emptyRoutines}>
          <Ionicons name="barbell-outline" size={48} color={Colors.inactive} />
          <ThemedText style={styles.emptyTitle}>No Routines Yet</ThemedText>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/create-workout')}
          >
            <ThemedText style={styles.createButtonText}>Create Routine</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const ListFooter = () => (
    <>
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <ThemedText style={styles.sectionTitle}>Workout History</ThemedText>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyHistory}>
          <ThemedText style={styles.emptyHistoryText}>No completed workouts yet</ThemedText>
        </View>
      ) : (
        sessions.map(s => (
          <View key={s.id}>
            {renderSession(s)}
          </View>
        ))
      )}

      <View style={{ height: 100 }} />
    </>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Workouts</ThemedText>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Workouts</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={routines}
        renderItem={renderRoutine}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={<ListFooter />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-workout')}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  routineCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routineName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
  },
  routineDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  routineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyRoutines: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 14,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  createButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
  },
  sessionDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  exercisePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  exercisePill: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  exercisePillText: {
    fontSize: 11,
    color: Colors.dark,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
