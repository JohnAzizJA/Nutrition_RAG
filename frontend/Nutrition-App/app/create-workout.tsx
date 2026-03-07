import { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import axios from '@/src/api/axios';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoutine = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/workouts', {
        name: name.trim(),
        description: description.trim() || undefined
      });
      
      Alert.alert('Success', 'Workout routine created successfully', [
        { text: 'OK', onPress: () => router.replace(`/workout-detail?id=${response.data.id}`) }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create workout routine');
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
        <ThemedText style={styles.headerTitle}>Create Workout</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Ionicons name="barbell" size={64} color={Colors.primary} />
        </View>
        
        <ThemedText style={styles.title}>Create New Routine</ThemedText>
        
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Routine Name *</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter routine name"
            placeholderTextColor={Colors.secondary}
            maxLength={100}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your workout routine"
            placeholderTextColor={Colors.secondary}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>
        
        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreateRoutine}
          disabled={loading}
        >
          <ThemedText style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Routine'}
          </ThemedText>
        </TouchableOpacity>
        
        <ThemedText style={styles.note}>
          After creating your routine, you can add exercises to it.
        </ThemedText>
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
    borderBottomColor: Colors.secondary,
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
    marginBottom: 24,
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
    borderColor: Colors.secondary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  note: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});