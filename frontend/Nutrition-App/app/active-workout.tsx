import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, TouchableOpacity, Alert, ScrollView,
  TextInput, Modal, AppState, KeyboardAvoidingView, Platform, BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { SpotifyMiniPlayer } from '@/src/components/SpotifyMiniPlayer';
import { Colors } from '@/constants/theme';
import { useSpotify } from '@/src/contexts/SpotifyContext';
import { workoutService, workoutSessionService, Exercise, WorkoutRoutine } from '@/src/services';
import { getErrorMessage } from '@/src/utils/errorUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoggedSet {
  serverSetId?: number;
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { routineId, routineName } = useLocalSearchParams<{ routineId: string; routineName: string }>();
  const {
    isConnected: spotifyConnected,
    playerState: spotifyPlayerState,
    isSeeking: spotifyIsSeeking,
    togglePlayPause: spotifyTogglePlayPause,
    skipToNext: spotifySkipNext,
    skipToPrevious: spotifySkipPrevious,
    onSeekStart: spotifySeekStart,
    onSeekEnd: spotifySeekEnd,
    toggleShuffle: spotifyToggleShuffle,
    cycleRepeatMode: spotifyCycleRepeat,
    disconnect: spotifyDisconnect,
  } = useSpotify();
  const playerVisible = spotifyConnected && spotifyPlayerState !== null;
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
  const [exerciseTimerPaused, setExerciseTimerPaused] = useState(false);
  const [exerciseTimerRemaining, setExerciseTimerRemaining] = useState(0);
  const [timedExerciseId, setTimedExerciseId] = useState<number | null>(null);
  const [timedExerciseDuration, setTimedExerciseDuration] = useState(0);
  // Ref mirrors pause state — avoids stale closure in setInterval callback
  const exerciseTimerPausedRef = useRef(false);

  // Logged sets
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);

  // Log set modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [inputReps, setInputReps] = useState('');
  const [inputWeight, setInputWeight] = useState('');

  // Edit set modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<LoggedSet | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Cancel alert ─────────────────────────────────────────────────────────────

  const showCancelAlert = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure? Your progress will not be saved.',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Cancel Workout', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  // Android hardware back — show alert, never navigate directly
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      showCancelAlert();
      return true;
    });
    return () => sub.remove();
  }, []);

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
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to start workout session.'), [
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

      // Skip decrement if exercise timer is paused
      if (!exerciseTimerPausedRef.current) {
        setExerciseTimerRemaining(prev => {
          if (prev <= 1) {
            setExerciseTimerActive(false);
            setTimedExerciseId(null);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ─── Exercise timer pause helper ─────────────────────────────────────────────

  const pauseExerciseTimer = () => {
    exerciseTimerPausedRef.current = true;
    setExerciseTimerPaused(true);
  };

  const resumeExerciseTimer = () => {
    exerciseTimerPausedRef.current = false;
    setExerciseTimerPaused(false);
  };

  const stopExerciseTimer = async () => {
    // Calculate how long the user actually held (original - remaining)
    const actualDuration = Math.max(1, timedExerciseDuration - exerciseTimerRemaining);

    // Find the last logged set for this timed exercise and patch its duration
    const lastSet = [...loggedSets].reverse().find(s => s.exerciseId === timedExerciseId);
    if (lastSet && sessionId && lastSet.serverSetId && actualDuration !== timedExerciseDuration) {
      try {
        await workoutSessionService.updateSet(sessionId, lastSet.serverSetId, {
          duration_seconds: actualDuration,
        });
      } catch {
        // Best-effort — update locally regardless
      }
      setLoggedSets(prev => prev.map(s =>
        s === lastSet ? { ...s, durationSeconds: actualDuration } : s
      ));
    }

    exerciseTimerPausedRef.current = false;
    setExerciseTimerPaused(false);
    setExerciseTimerActive(false);
    setExerciseTimerRemaining(0);
    setTimedExerciseId(null);
    setTimedExerciseDuration(0);
  };

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
      weightKg = w;
    }
    const reps = isTimed ? undefined : (parseInt(inputReps) || undefined);
    const durationSeconds = isTimed ? activeExercise.duration_seconds : undefined;

    if (!isTimed && !reps) {
      Alert.alert('Error', 'Please enter reps');
      return;
    }

    try {
      const savedSet = await workoutSessionService.logSet(sessionId, {
        exercise_id: activeExercise.id,
        exercise_name: activeExercise.name,
        set_number: setNumber,
        reps,
        weight_kg: weightKg,
        duration_seconds: durationSeconds,
      });

      setLoggedSets(prev => [...prev, {
        serverSetId: savedSet.id,
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
        setTimedExerciseDuration(activeExercise.duration_seconds);
        setExerciseTimerRemaining(activeExercise.duration_seconds);
        setExerciseTimerActive(true);
        exerciseTimerPausedRef.current = false;
        setExerciseTimerPaused(false);
        setTimedExerciseId(activeExercise.id);
      }
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to log set. Please try again.'));
    }
  };

  // ─── Delete set ───────────────────────────────────────────────────────────────

  const handleDeleteSet = (set: LoggedSet) => {
    Alert.alert(
      'Delete Set',
      `Remove Set ${set.setNumber} of ${set.exerciseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!sessionId || !set.serverSetId) {
              // No server record yet — just remove from local state
              setLoggedSets(prev => prev.filter(s => !(s.exerciseId === set.exerciseId && s.setNumber === set.setNumber)));
              return;
            }
            try {
              await workoutSessionService.deleteSet(sessionId, set.serverSetId);
              setLoggedSets(prev => prev.filter(s => !(s.exerciseId === set.exerciseId && s.setNumber === set.setNumber)));
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err, 'Failed to delete set.'));
            }
          },
        },
      ]
    );
  };

  // ─── Edit set ─────────────────────────────────────────────────────────────────

  const openEditModal = (set: LoggedSet) => {
    setEditingSet(set);
    setEditReps(set.reps?.toString() ?? '');
    setEditWeight(set.weightKg != null ? set.weightKg.toString() : '');
    setEditModalVisible(true);
  };

  const handleUpdateSet = async () => {
    if (!editingSet || !sessionId) return;

    const newReps = editReps ? parseInt(editReps) : undefined;
    const newWeightKg = editWeight ? parseFloat(editWeight) : undefined;

    if (!newReps) {
      Alert.alert('Error', 'Please enter reps');
      return;
    }

    try {
      if (editingSet.serverSetId) {
        await workoutSessionService.updateSet(sessionId, editingSet.serverSetId, {
          reps: newReps,
          weight_kg: newWeightKg,
        });
      }
      setLoggedSets(prev => prev.map(s =>
        (s.exerciseId === editingSet.exerciseId && s.setNumber === editingSet.setNumber)
          ? { ...s, reps: newReps, weightKg: newWeightKg }
          : s
      ));
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to update set.'));
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
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to save session. Please try again.'));
      setFinishing(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const renderExerciseCard = (exercise: Exercise) => {
    const isTimed = !!exercise.duration_seconds;
    const setsLogged = getSetCount(exercise.id);
    const targetSets = exercise.sets;
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
                  {exercise.weight_kg} kg target
                </ThemedText>
              ) : null}
            </>
          )}
        </View>

        {/* Exercise countdown with pause/stop */}
        {isTimerRunning && (
          <View style={styles.exerciseCountdown}>
            <Ionicons name="timer" size={16} color={Colors.primary} />
            <ThemedText style={styles.exerciseCountdownText}>
              {formatTime(exerciseTimerRemaining)} remaining
              {exerciseTimerPaused ? '  (paused)' : ''}
            </ThemedText>
            <View style={styles.timerControls}>
              <TouchableOpacity style={styles.timerControlBtn} onPress={exerciseTimerPaused ? resumeExerciseTimer : pauseExerciseTimer}>
                <Ionicons name={exerciseTimerPaused ? 'play' : 'pause'} size={14} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerControlBtn} onPress={stopExerciseTimer}>
                <Ionicons name="stop" size={14} color={Colors.danger} />
              </TouchableOpacity>
            </View>
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
                    {s.weightKg ? ` · ${s.weightKg} kg` : ''}
                  </ThemedText>
                  {/* Edit/delete only for non-timed sets */}
                  {!s.durationSeconds && (
                    <View style={styles.setActions}>
                      <TouchableOpacity style={styles.setActionBtn} onPress={() => openEditModal(s)}>
                        <Ionicons name="pencil" size={13} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.setActionBtn} onPress={() => handleDeleteSet(s)}>
                        <Ionicons name="trash-outline" size={13} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {s.durationSeconds && (
                    <TouchableOpacity style={styles.setActionBtn} onPress={() => handleDeleteSet(s)}>
                      <Ionicons name="trash-outline" size={13} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
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
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Starting...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </View>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Disable iOS swipe-back — only the X button and Finish can exit */}
      <Stack.Screen options={{ gestureEnabled: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={showCancelAlert}>
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>{routine?.name ?? 'Workout'}</ThemedText>
        <View style={styles.headerSide}>
          <TouchableOpacity
            style={[styles.finishButton, finishing && styles.finishButtonDisabled]}
            onPress={handleFinish}
            disabled={finishing}
          >
            <ThemedText style={styles.finishButtonText}>{finishing ? 'Saving...' : 'Finish'}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stopwatch bar */}
      <View style={styles.statusBar}>
        <Ionicons name="time-outline" size={18} color={Colors.primary} />
        <ThemedText style={styles.stopwatchText}>{formatTime(elapsed)}</ThemedText>
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
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, playerVisible && { paddingBottom: 160 }]}
      >
        {routine?.exercises?.map(renderExerciseCard)}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Spotify mini-player */}
      {playerVisible && (
        <View style={styles.playerContainer}>
          <SpotifyMiniPlayer
            playerState={spotifyPlayerState!}
            isSeeking={spotifyIsSeeking}
            onTogglePlayPause={spotifyTogglePlayPause}
            onSkipNext={spotifySkipNext}
            onSkipPrevious={spotifySkipPrevious}
            onSeekStart={spotifySeekStart}
            onSeekEnd={spotifySeekEnd}
            onToggleShuffle={spotifyToggleShuffle}
            onCycleRepeat={spotifyCycleRepeat}
            onDisconnect={spotifyDisconnect}
          />
        </View>
      )}

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
                    <ThemedText style={styles.modalLabel}>Weight (kg)</ThemedText>
                    <TextInput
                      style={styles.modalInput}
                      value={inputWeight}
                      onChangeText={setInputWeight}
                      placeholder={activeExercise?.weight_kg?.toString() ?? '0'}
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

      {/* Edit Set Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  Edit Set {editingSet?.setNumber} — {editingSet?.exerciseName}
                </ThemedText>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={22} color={Colors.dark} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalField}>
                <ThemedText style={styles.modalLabel}>Reps</ThemedText>
                <TextInput
                  style={styles.modalInput}
                  value={editReps}
                  onChangeText={setEditReps}
                  placeholder="Reps"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="numeric"
                  maxLength={4}
                  autoFocus
                />
              </View>
              <View style={styles.modalField}>
                <ThemedText style={styles.modalLabel}>Weight (kg)</ThemedText>
                <TextInput
                  style={styles.modalInput}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  placeholder="0"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity style={styles.logConfirmButton} onPress={handleUpdateSet}>
                <ThemedText style={styles.logConfirmText}>Update Set</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  playerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerSide: {
    width: 70,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
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
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stopwatchText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
    paddingTop: 5,
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
    flex: 1,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 4,
  },
  timerControlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
  },
  setActions: {
    flexDirection: 'row',
    gap: 4,
  },
  setActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    marginRight: 8,
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
