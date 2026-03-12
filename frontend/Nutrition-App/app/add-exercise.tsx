import { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { workoutService } from '@/src/services';

export default function AddExerciseScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [isTimed, setIsTimed] = useState(false);
  // Strength fields
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [restMinutes, setRestMinutes] = useState('');
  const [restSeconds, setRestSeconds] = useState('');
  // Timed fields
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [timedSets, setTimedSets] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddExercise = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter exercise name');
      return;
    }

    if (isTimed) {
      const durMin = parseInt(durationMinutes) || 0;
      const durSec = parseInt(durationSeconds) || 0;
      const totalDuration = durMin * 60 + durSec;
      if (totalDuration <= 0) {
        Alert.alert('Error', 'Please enter a valid duration');
        return;
      }
      const timedSetsNum = parseInt(timedSets) || 1;
      if (timedSetsNum <= 0) {
        Alert.alert('Error', 'Please enter a valid number of sets');
        return;
      }
      setLoading(true);
      try {
        await workoutService.addExercise(Number(routineId), {
          name: name.trim(),
          sets: timedSetsNum,
          reps: 1,
          duration_seconds: totalDuration,
        });
        Alert.alert('Success', 'Exercise added successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } catch {
        Alert.alert('Error', 'Failed to add exercise');
      } finally {
        setLoading(false);
      }
      return;
    }

    const setsNum = parseInt(sets);
    const repsNum = parseInt(reps);

    if (!setsNum || setsNum <= 0) {
      Alert.alert('Error', 'Please enter valid number of sets');
      return;
    }
    if (!repsNum || repsNum <= 0) {
      Alert.alert('Error', 'Please enter valid number of reps');
      return;
    }

    const weightNum = weight ? parseFloat(weight) : undefined;
    const restMin = parseInt(restMinutes) || 0;
    const restSec = parseInt(restSeconds) || 0;
    const totalRestSeconds = restMin * 60 + restSec;

    setLoading(true);
    try {
      await workoutService.addExercise(Number(routineId), {
        name: name.trim(),
        sets: setsNum,
        reps: repsNum,
        weight_kg: weightNum,
        rest_time_seconds: totalRestSeconds > 0 ? totalRestSeconds : undefined,
      });
      Alert.alert('Success', 'Exercise added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add exercise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add Exercise</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Ionicons name="fitness" size={64} color={Colors.primary} />
        </View>

        <ThemedText style={styles.title}>Add New Exercise</ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Exercise Name *</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Push-ups, Squats, Plank"
            placeholderTextColor={Colors.placeholder}
            maxLength={100}
          />
        </View>

        {/* Timed exercise toggle */}
        <View style={styles.toggleRow}>
          <View>
            <ThemedText style={styles.label}>Timed Exercise</ThemedText>
            <ThemedText style={styles.toggleSubtext}>Uses a countdown timer instead of sets/reps</ThemedText>
          </View>
          <Switch
            value={isTimed}
            onValueChange={setIsTimed}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        {isTimed ? (
          <>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Sets *</ThemedText>
              <TextInput
                style={styles.input}
                value={timedSets}
                onChangeText={setTimedSets}
                placeholder="3"
                placeholderTextColor={Colors.placeholder}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Duration per Set *</ThemedText>
              <View style={styles.row}>
                <View style={[styles.halfWidth, { marginRight: 8 }]}>
                  <TextInput
                    style={styles.input}
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    placeholder="Minutes"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <TextInput
                    style={styles.input}
                    value={durationSeconds}
                    onChangeText={setDurationSeconds}
                    placeholder="Seconds"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <ThemedText style={styles.label}>Sets *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={sets}
                  onChangeText={setSets}
                  placeholder="3"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <ThemedText style={styles.label}>Reps *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={reps}
                  onChangeText={setReps}
                  placeholder="12"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Weight (kg) - Optional</ThemedText>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="Enter weight in kg"
                placeholderTextColor={Colors.placeholder}
                keyboardType="decimal-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Rest Time - Optional</ThemedText>
              <View style={styles.row}>
                <View style={[styles.halfWidth, { marginRight: 8 }]}>
                  <TextInput
                    style={styles.input}
                    value={restMinutes}
                    onChangeText={setRestMinutes}
                    placeholder="Minutes"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <TextInput
                    style={styles.input}
                    value={restSeconds}
                    onChangeText={setRestSeconds}
                    placeholder="Seconds"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.addButton, loading && styles.buttonDisabled]}
          onPress={handleAddExercise}
          disabled={loading}
        >
          <ThemedText style={styles.addButtonText}>
            {loading ? 'Adding...' : 'Add Exercise'}
          </ThemedText>
        </TouchableOpacity>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
