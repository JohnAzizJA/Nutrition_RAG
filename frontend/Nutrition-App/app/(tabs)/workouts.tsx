import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { workoutService, WorkoutRoutine } from '@/src/services';
import { Swipeable } from 'react-native-gesture-handler';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    try {
      const data = await workoutService.getRoutines();
      setRoutines(data);
    } catch (error) {
      console.error('Failed to fetch routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRoutine = async (routineId: number) => {
    try {
      await workoutService.deleteRoutine(routineId);
      fetchRoutines();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete routine');
    }
  };

  const renderDeleteAction = (routineId: number) => (
    <TouchableOpacity 
      style={styles.deleteAction}
      onPress={() => deleteRoutine(routineId)}
    >
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

  const renderRoutine = ({ item }: { item: WorkoutRoutine }) => (
    <Swipeable
      renderRightActions={() => renderDeleteAction(item.id)}
    >
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
      
      <View style={styles.content}>
        {routines.length > 0 ? (
          <>
            <FlatList
              data={routines}
              renderItem={renderRoutine}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
            
            <TouchableOpacity 
              style={styles.newWorkoutButton}
              onPress={() => router.push('/create-workout')}
            >
              <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color={Colors.secondary} />
            <ThemedText style={styles.emptyTitle}>No Workout Routines</ThemedText>
            <ThemedText style={styles.emptyText}>Create your first workout routine to get started</ThemedText>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/create-workout')}
            >
              <Ionicons name="add" size={24} color={Colors.white} />
              <ThemedText style={styles.createButtonText}>Create New Routine</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  routineDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  routineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  newWorkoutButton: {
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
