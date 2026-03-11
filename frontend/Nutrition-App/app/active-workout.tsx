import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, TouchableOpacity, Alert, ScrollView,
  TextInput, Modal, AppState, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { workoutService, workoutSessionService, Exercise, WorkoutRoutine } from '@/src/services';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoggedSet {
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
}

type WeightUnit = 'kg' | 'lbs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const kgToLbs = (kg: number) => Math.round(kg * 2.205 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.205) * 100) / 100;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { routineId, routineName } = useLocalSearchParams<{ routineId: string; routineName: string }>();

  // Session state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  // Stopwatch
  const [elapsed, setElapsed] = useState(0);

  // Rest timer
  const [restActive, setRestActive] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);

  // Exercise timer (timed exercises)
  const [exerciseTimerActive, setExerciseTimerActive] = useState(false);
  const [exerciseTimerRemaining, setExerciseTimerRemaining] = useState(0);
  const [timedExerciseId, setTimedExerciseId] = useState<number | null>(null);

  // Logged sets
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);

  // Weight unit
  const [unit, setUnit] = useState<WeightUnit>('kg');

  // Log set modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [inputReps, setInputReps] = useState('');
  const [inputWeight, setInputWeight] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    initSession();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const initSession = async () => {
    try {
      const [routineData, session] = await Promise.all([
        workoutService.getRoutine(Number(routineId)),
        workoutSessionService.startSession({
          routine_id: Number(routineId),
          routine_name: decodeURIComponent(routineName ?? ''),
        }),
      ]);
      setRoutine(routineData);
      setSessionId(session.id);
    } catch {
      Alert.alert('Error', 'Failed to start workout session', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Single interval: stopwatch + rest + exercise timer ──────────────────────

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);

      setRestRemaining(prev => {
        if (prev <= 1) {
          setRestActive(false);
          return 0;
        }
        return prev - 1;
      });

      setExerciseTimerRemaining(prev => {
        if (prev <= 1) {
          setExerciseTimerActive(false);
          setTimedExerciseId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ─── Set logging ─────────────────────────────────────────────────────────────

  const openLogModal = (exercise: Exercise) => {
    setActiveExercise(exercise);
    setInputReps('');
    setInputWeight('');
    setModalVisible(true);
  };

  const getSetCount = (exerciseId: number) =>
    loggedSets.filter(s => s.exerciseId === exerciseId).length;

  const handleLogSet = async () => {
    if (!activeExercise || !sessionId) return;

    const isTimed = !!activeExercise.duration_seconds;
    const setNumber = getSetCount(activeExercise.id) + 1;

    let weightKg: number | undefined;
    if (!isTimed && inputWeight) {
      const w = parseFloat(inputWeight);
      weightKg = unit === 'lbs' ? lbsToKg(w) : w;
    }
    const reps = isTimed ? undefined : (parseInt(inputReps) || undefined);
    const durationSeconds = isTimed ? activeExercise.duration_seconds : undefined;

    if (!isTimed && !reps) {
      Alert.alert('Error', 'Please enter reps');
      return;
    }

    try {
      await workoutSessionService.logSet(sessionId, {
        exercise_id: activeExercise.id,
        exercise_name: activeExercise.name,
        set_number: setNumber,
        reps,
        weight_kg: weightKg,
        duration_seconds: durationSeconds,
      });

      setLoggedSets(prev => [...prev, {
        exerciseId: activeExercise.id,
        exerciseName: activeExercise.name,
        setNumber,
        reps,
        weightKg,
        durationSeconds,
      }]);

      setModalVisible(false);

      // Start rest timer if exercise has rest time
      if (!isTimed && activeExercise.rest_time_seconds) {
        setRestRemaining(activeExercise.rest_time_seconds);
        setRestActive(true);
      }

      // Start exercise countdown for timed exercises
      if (isTimed && activeExercise.duration_seconds) {
        setExerciseTimerRemaining(activeExercise.duration_seconds);
        setExerciseTimerActive(true);
        setTimedExerciseId(activeExercise.id);
      }
    } catch {
      Alert.alert('Error', 'Failed to log set');
    }
  };

  // ─── Finish workout ───────────────────────────────────────────────────────────

  const handleFinish = () => {
    if (loggedSets.length === 0) {
      Alert.alert(
        'Finish Workout',
        'You haven\'t logged any sets. Are you sure you want to finish?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish', style: 'destructive', onPress: finishWorkout },
        ]
      );
      return;
    }
    Alert.alert(
      'Finish Workout',
      `Great work! You completed ${loggedSets.length} set${loggedSets.length !== 1 ? 's' : ''} in ${formatTime(elapsed)}.`,
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Finish', onPress: finishWorkout },
      ]
    );
  };

  const finishWorkout = async () => {
    if (!sessionId) return;
    setFinishing(true);
    try {
      await workoutSessionService.endSession(sessionId, elapsed);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save session');
      setFinishing(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const renderExerciseCard = (exercise: Exercise) => {
    const isTimed = !!exercise.duration_seconds;
    const setsLogged = getSetCount(exercise.id);
    const targetSets = isTimed ? 1 : exercise.sets;
    const isTimerRunning = exerciseTimerActive && timedExerciseId === exercise.id;

    return (
      <View key={exercise.id} style={styles.exerciseCard}>
        <View style={styles.exerciseCardHeader}>
          <View style={styles.exerciseTitleRow}>
            <ThemedText style={styles.exerciseName}>{exercise.name}</ThemedText>
            {isTimed && (
              <View style={styles.timedBadge}>
                <Ionicons name="timer-outline" size={11} color={Colors.primary} />
                <ThemedText style={styles.timedBadgeText}>Timed</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={styles.setsProgress}>
            {setsLogged}/{targetSets} sets
          </ThemedText>
        </View>

        {/* Exercise meta */}
        <View style={styles.exerciseMeta}>
          {isTimed ? (
            <ThemedText style={styles.metaText}>
              {formatTime(exercise.duration_seconds!)} hold
            </ThemedText>
          ) : (
            <>
              <ThemedText style={styles.metaText}>{exercise.sets} sets × {exercise.reps} reps</ThemedText>
              {exercise.weight_kg ? (
                <ThemedText style={styles.metaText}>
                  {unit === 'lbs' ? `${kgToLbs(exercise.weight_kg)} lbs` : `${exercise.weight_kg} kg`} target
                </ThemedText>
              ) : null}
            </>
          )}
        </View>

        {/* Exercise countdown */}
        {isTimerRunning && (
          <View style={styles.exerciseCountdown}>
            <Ionicons name="timer" size={16} color={Colors.primary} />
            <ThemedText style={styles.exerciseCountdownText}>{formatTime(exerciseTimerRemaining)} remaining</ThemedText>
          </View>
        )}

        {/* Logged sets */}
        {setsLogged > 0 && (
          <View style={styles.loggedSets}>
            {loggedSets
              .filter(s => s.exerciseId === exercise.id)
              .map(s => (
                <View key={s.setNumber} style={styles.loggedSetRow}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                  <ThemedText style={styles.loggedSetText}>
                    Set {s.setNumber}
                    {s.durationSeconds ? ` · ${formatTime(s.durationSeconds)}` : ''}
                    {s.reps ? ` · ${s.reps} reps` : ''}
                    {s.weightKg ? ` · ${unit === 'lbs' ? `${kgToLbs(s.weightKg)} lbs` : `${s.weightKg} kg`}` : ''}
                  </ThemedText>
                </View>
              ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.logSetButton, isTimerRunning && styles.logSetButtonDisabled]}
          onPress={() => openLogModal(exercise)}
          disabled={isTimerRunning}
        >
          <Ionicons name="add" size={16} color={Colors.white} />
          <ThemedText style={styles.logSetButtonText}>
            {isTimed ? 'Log Hold' : 'Log Set'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Starting...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </ThemedView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Cancel Workout', 'Are you sure? Your progress will not be saved.', [
            { text: 'Keep Going', style: 'cancel' },
            { text: 'Cancel Workout', style: 'destructive', onPress: () => router.back() },
          ]);
        }}>
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{routine?.name ?? 'Workout'}</ThemedText>
        <TouchableOpacity
          style={[styles.finishButton, finishing && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={finishing}
        >
          <ThemedText style={styles.finishButtonText}>{finishing ? 'Saving...' : 'Finish'}</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Stopwatch + controls bar */}
      <View style={styles.statusBar}>
        <View style={styles.stopwatchBlock}>
          <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
          <ThemedText style={styles.stopwatchText}>{formatTime(elapsed)}</ThemedText>
        </View>

        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}
            onPress={() => setUnit('kg')}
          >
            <ThemedText style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextActive]}>kg</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitBtn, unit === 'lbs' && styles.unitBtnActive]}
            onPress={() => setUnit('lbs')}
          >
            <ThemedText style={[styles.unitBtnText, unit === 'lbs' && styles.unitBtnTextActive]}>lbs</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rest timer banner */}
      {restActive && (
        <View style={styles.restBanner}>
          <Ionicons name="hourglass-outline" size={16} color={Colors.white} />
          <ThemedText style={styles.restBannerText}>Rest · {formatTime(restRemaining)}</ThemedText>
          <TouchableOpacity onPress={() => { setRestActive(false); setRestRemaining(0); }}>
            <ThemedText style={styles.restSkipText}>Skip</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise list */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {routine?.exercises?.map(renderExerciseCard)}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Log Set Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{activeExercise?.name}</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            {activeExercise?.duration_seconds ? (
              <View style={styles.timedInfo}>
                <Ionicons name="timer-outline" size={20} color={Colors.primary} />
                <ThemedText style={styles.timedInfoText}>
                  Hold for {formatTime(activeExercise.duration_seconds)}. A countdown timer will start automatically.
                </ThemedText>
              </View>
            ) : (
              <>
                <View style={styles.modalField}>
                  <ThemedText style={styles.modalLabel}>
                    Set {(activeExercise ? getSetCount(activeExercise.id) : 0) + 1} — Reps
                  </ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    value={inputReps}
                    onChangeText={setInputReps}
                    placeholder={activeExercise?.reps?.toString() ?? '10'}
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                    maxLength={4}
                    autoFocus
                  />
                </View>
                <View style={styles.modalField}>
                  <ThemedText style={styles.modalLabel}>Weight ({unit})</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    value={inputWeight}
                    onChangeText={setInputWeight}
                    placeholder={
                      activeExercise?.weight_kg
                        ? (unit === 'lbs'
                          ? kgToLbs(activeExercise.weight_kg).toString()
                          : activeExercise.weight_kg.toString())
                        : '0'
                    }
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
              </>
            )}

            <TouchableOpacity style={styles.logConfirmButton} onPress={handleLogSet}>
              <ThemedText style={styles.logConfirmText}>
                {activeExercise?.duration_seconds ? 'Start Timer & Log' : 'Log Set'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  finishButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stopwatchBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopwatchText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
    fontVariant: ['tabular-nums'],
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 8,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  unitBtnActive: {
    backgroundColor: Colors.white,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  unitBtnTextActive: {
    color: Colors.dark,
  },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    gap: 8,
  },
  restBannerText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  restSkipText: {
    color: Colors.white,
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.85,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
    flexShrink: 1,
  },
  setsProgress: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  exerciseMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  exerciseCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  exerciseCountdownText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  loggedSets: {
    marginBottom: 10,
    gap: 4,
  },
  loggedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loggedSetText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  logSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  logSetButtonDisabled: {
    opacity: 0.4,
  },
  logSetButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  timedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  timedBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  timedInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  timedInfoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },
  logConfirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logConfirmText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
