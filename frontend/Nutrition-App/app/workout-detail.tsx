import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { workoutService, WorkoutRoutine, Exercise } from '@/src/services';
import { Swipeable } from 'react-native-gesture-handler';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRoutine();
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchRoutine();
      }
    }, [id])
  );

  const fetchRoutine = async () => {
    try {
      const data = await workoutService.getRoutine(Number(id));
      setRoutine(data);
    } catch (error) {
      console.error('Failed to fetch routine:', error);
      Alert.alert('Error', 'Failed to load workout routine');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoutine = () => {
    Alert.alert(
      'Delete Routine',
      'Are you sure you want to delete this workout routine? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteRoutine }
      ]
    );
  };

  const deleteRoutine = async () => {
    try {
      await workoutService.deleteRoutine(Number(id));
      Alert.alert('Success', 'Workout routine deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete workout routine');
    }
  };

  const deleteExercise = async (exerciseId: number) => {
    try {
      await workoutService.deleteExercise(Number(id), exerciseId);
      fetchRoutine();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete exercise');
    }
  };

  const renderExerciseDeleteAction = (exerciseId: number) => (
    <TouchableOpacity 
      style={styles.deleteAction}
      onPress={() => deleteExercise(exerciseId)}
    >
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

  const renderExercise = ({ item }: { item: Exercise }) => (
    <Swipeable
      renderRightActions={() => renderExerciseDeleteAction(item.id)}
    >
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
        </View>
        <View style={styles.exerciseDetails}>
          <View style={styles.detailItem}>
            <ThemedText style={styles.detailLabel}>Sets:</ThemedText>
            <ThemedText style={styles.detailValue}>{item.sets}</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <ThemedText style={styles.detailLabel}>Reps:</ThemedText>
            <ThemedText style={styles.detailValue}>{item.reps}</ThemedText>
          </View>
          {item.weight_kg && (
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Weight:</ThemedText>
              <ThemedText style={styles.detailValue}>{item.weight_kg} kg</ThemedText>
            </View>
          )}
          {item.rest_time_seconds && (
            <View style={styles.detailItem}>
              <ThemedText style={styles.detailLabel}>Rest:</ThemedText>
              <ThemedText style={styles.detailValue}>{Math.floor(item.rest_time_seconds / 60)}:{(item.rest_time_seconds % 60).toString().padStart(2, '0')}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Workout Details</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </ThemedView>
    );
  }

  if (!routine) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Workout Details</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Workout routine not found</ThemedText>
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
        <ThemedText style={styles.headerTitle}>Workout Details</ThemedText>
        <TouchableOpacity onPress={handleDeleteRoutine}>
          <Ionicons name="trash-outline" size={24} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routineInfo}>
          <ThemedText style={styles.routineName}>{routine.name}</ThemedText>
          {routine.description && (
            <ThemedText style={styles.routineDescription}>{routine.description}</ThemedText>
          )}
          <ThemedText style={styles.exerciseCount}>
            {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push(`/add-exercise?routineId=${routine.id}`)}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
            <ThemedText style={styles.addButtonText}>Add Exercise</ThemedText>
          </TouchableOpacity>
        </View>

        {routine.exercises.length > 0 ? (
          <FlatList
            data={routine.exercises}
            renderItem={renderExercise}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.exercisesList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={Colors.secondary} />
            <ThemedText style={styles.emptyTitle}>No Exercises</ThemedText>
            <ThemedText style={styles.emptyText}>Add exercises to this routine to get started</ThemedText>
          </View>
        )}
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  routineInfo: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  routineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  routineDescription: {
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 22,
  },
  exerciseCount: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exercisesList: {
    paddingBottom: 20,
  },
  exerciseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
});