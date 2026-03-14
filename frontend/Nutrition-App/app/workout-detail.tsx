import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, FlatList, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { workoutService, WorkoutRoutine, Exercise } from '@/src/services';
import { Swipeable } from 'react-native-gesture-handler';

type EditField = {
  sets: string;
  reps: string;
  weight_kg: string;
  rest_time_seconds: string;
  duration_seconds: string;
};

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<number, EditField>>({});

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

  const enterEditMode = () => {
    if (!routine?.exercises) return;
    const initial: Record<number, EditField> = {};
    for (const ex of routine.exercises) {
      initial[ex.id] = {
        sets: String(ex.sets),
        reps: String(ex.reps),
        weight_kg: ex.weight_kg != null ? String(ex.weight_kg) : '',
        rest_time_seconds: ex.rest_time_seconds != null ? String(ex.rest_time_seconds) : '',
        duration_seconds: ex.duration_seconds != null ? String(ex.duration_seconds) : '',
      };
    }
    setEditData(initial);
    setIsEditing(true);
  };

  const handleDone = async () => {
    if (!routine?.exercises) {
      setIsEditing(false);
      return;
    }
    try {
      await Promise.all(
        routine.exercises.map((ex) => {
          const d = editData[ex.id];
          if (!d) return Promise.resolve();
          return workoutService.updateExercise(Number(id), ex.id, {
            sets: parseInt(d.sets) || ex.sets,
            reps: parseInt(d.reps) || ex.reps,
            weight_kg: d.weight_kg !== '' ? parseFloat(d.weight_kg) : undefined,
            rest_time_seconds: d.rest_time_seconds !== '' ? parseInt(d.rest_time_seconds) : undefined,
            duration_seconds: d.duration_seconds !== '' ? parseInt(d.duration_seconds) : undefined,
          });
        })
      );
      setIsEditing(false);
      fetchRoutine();
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
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

  const updateField = (exerciseId: number, field: keyof EditField, value: string) => {
    setEditData(prev => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: value },
    }));
  };

  const renderExerciseDeleteAction = (exerciseId: number) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteExercise(exerciseId)}
    >
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

  const renderExercise = ({ item }: { item: Exercise }) => {
    if (isEditing) {
      const d = editData[item.id] ?? {
        sets: String(item.sets),
        reps: String(item.reps),
        weight_kg: item.weight_kg != null ? String(item.weight_kg) : '',
        rest_time_seconds: item.rest_time_seconds != null ? String(item.rest_time_seconds) : '',
        duration_seconds: item.duration_seconds != null ? String(item.duration_seconds) : '',
      };
      const isTimed = item.duration_seconds != null;
      return (
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
            {isTimed ? (
              <View style={styles.timedBadge}>
                <Ionicons name="timer-outline" size={12} color={Colors.primary} />
                <ThemedText style={styles.timedBadgeText}>Timed</ThemedText>
              </View>
            ) : null}
          </View>
          <View style={styles.editFieldsGrid}>
            <View style={styles.editField}>
              <ThemedText style={styles.editLabel}>Sets</ThemedText>
              <TextInput
                style={styles.editInput}
                value={d.sets}
                onChangeText={(v) => updateField(item.id, 'sets', v)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
            {isTimed ? (
              <View style={styles.editField}>
                <ThemedText style={styles.editLabel}>Duration (sec)</ThemedText>
                <TextInput
                  style={styles.editInput}
                  value={d.duration_seconds}
                  onChangeText={(v) => updateField(item.id, 'duration_seconds', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            ) : (
              <>
                <View style={styles.editField}>
                  <ThemedText style={styles.editLabel}>Reps</ThemedText>
                  <TextInput
                    style={styles.editInput}
                    value={d.reps}
                    onChangeText={(v) => updateField(item.id, 'reps', v)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.editField}>
                  <ThemedText style={styles.editLabel}>Weight (kg)</ThemedText>
                  <TextInput
                    style={styles.editInput}
                    value={d.weight_kg}
                    onChangeText={(v) => updateField(item.id, 'weight_kg', v)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={Colors.placeholder}
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.editField}>
                  <ThemedText style={styles.editLabel}>Rest (sec)</ThemedText>
                  <TextInput
                    style={styles.editInput}
                    value={d.rest_time_seconds}
                    onChangeText={(v) => updateField(item.id, 'rest_time_seconds', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.placeholder}
                    selectTextOnFocus
                  />
                </View>
              </>
            )}
          </View>
        </View>
      );
    }

    return (
      <Swipeable renderRightActions={() => renderExerciseDeleteAction(item.id)}>
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <ThemedText style={styles.exerciseName}>{item.name}</ThemedText>
            {item.duration_seconds ? (
              <View style={styles.timedBadge}>
                <Ionicons name="timer-outline" size={12} color={Colors.primary} />
                <ThemedText style={styles.timedBadgeText}>Timed</ThemedText>
              </View>
            ) : null}
          </View>
          <View style={styles.exerciseDetails}>
            {item.duration_seconds ? (
              <>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Sets:</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.sets}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Duration:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {Math.floor(item.duration_seconds / 60)}:{(item.duration_seconds % 60).toString().padStart(2, '0')}
                  </ThemedText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Sets:</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.sets}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText style={styles.detailLabel}>Reps:</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.reps}</ThemedText>
                </View>
                {item.weight_kg ? (
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Weight:</ThemedText>
                    <ThemedText style={styles.detailValue}>{item.weight_kg} kg</ThemedText>
                  </View>
                ) : null}
                {item.rest_time_seconds ? (
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Rest:</ThemedText>
                    <ThemedText style={styles.detailValue}>{Math.floor(item.rest_time_seconds / 60)}:{(item.rest_time_seconds % 60).toString().padStart(2, '0')}</ThemedText>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Workout Details</ThemedText>
          <View style={{ width: 40 }} />
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
          <View style={{ width: 40 }} />
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
        {(routine.exercises?.length ?? 0) > 0 ? (
          <TouchableOpacity onPress={isEditing ? handleDone : enterEditMode}>
            <ThemedText style={isEditing ? styles.doneButton : styles.editButton}>
              {isEditing ? 'Done' : 'Edit'}
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routineInfo}>
          <ThemedText style={styles.routineName}>{routine.name}</ThemedText>
          {routine.description && (
            <ThemedText style={styles.routineDescription}>{routine.description}</ThemedText>
          )}
          <ThemedText style={styles.exerciseCount}>
            {routine.exercises?.length ?? 0} exercise{(routine.exercises?.length ?? 0) !== 1 ? 's' : ''}
          </ThemedText>
        </View>

        {!isEditing && (
          <View style={styles.actionsContainer}>
            {routine.exercises.length > 0 && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push(`/active-workout?routineId=${routine.id}&routineName=${encodeURIComponent(routine.name)}`)}
              >
                <Ionicons name="play" size={20} color={Colors.white} />
                <ThemedText style={styles.startButtonText}>Start Workout</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/add-exercise?routineId=${routine.id}`)}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <ThemedText style={styles.addButtonText}>Add Exercise</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {(routine.exercises?.length ?? 0) > 0 ? (
          <FlatList
            data={routine.exercises ?? []}
            renderItem={renderExercise}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.exercisesList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={Colors.inactive} />
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
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
    minWidth: 40,
    textAlign: 'right',
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
    gap: 10,
  },
  startButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  timedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  timedBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
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
  editFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  editField: {
    minWidth: 80,
    flex: 1,
  },
  editLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    backgroundColor: Colors.background,
    textAlign: 'center',
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
