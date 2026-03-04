import { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { api, RegisterRequest } from '@/src/api/client';

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterRequest>({
    name: '',
    age: 0,
    gender: 'male',
    weight_kg: 0,
    height_cm: 0,
    activity_level: 'moderately_active',
    goal: 'maintain_weight',
  });

  const handleRegister = async () => {
    if (!formData.name || formData.age < 13 || formData.weight_kg <= 0 || formData.height_cm <= 0) {
      Alert.alert('Error', 'Please fill all fields correctly');
      return;
    }

    setLoading(true);
    try {
      const user = await api.register(formData);
      Alert.alert('Success!', `Welcome ${user.name}! Your account has been created.`);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
        
        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Name</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter your name"
            placeholderTextColor="#999"
          />
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Age</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.age ? String(formData.age) : ''}
            onChangeText={(text) => setFormData({ ...formData, age: parseInt(text) || 0 })}
            placeholder="Enter your age"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Gender</ThemedText>
          <ThemedView style={styles.pickerRow}>
            <TouchableOpacity
              style={[styles.pickerButton, formData.gender === 'male' && styles.pickerButtonActive]}
              onPress={() => setFormData({ ...formData, gender: 'male' })}
            >
              <ThemedText style={formData.gender === 'male' ? styles.pickerTextActive : styles.pickerText}>
                Male
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerButton, formData.gender === 'female' && styles.pickerButtonActive]}
              onPress={() => setFormData({ ...formData, gender: 'female' })}
            >
              <ThemedText style={formData.gender === 'female' ? styles.pickerTextActive : styles.pickerText}>
                Female
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Weight (kg)</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.weight_kg ? String(formData.weight_kg) : ''}
            onChangeText={(text) => setFormData({ ...formData, weight_kg: parseFloat(text) || 0 })}
            placeholder="Enter your weight"
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Height (cm)</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.height_cm ? String(formData.height_cm) : ''}
            onChangeText={(text) => setFormData({ ...formData, height_cm: parseFloat(text) || 0 })}
            placeholder="Enter your height"
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Activity Level</ThemedText>
          <ThemedView style={styles.pickerColumn}>
            {[
              { value: 'sedentary', label: 'Sedentary' },
              { value: 'lightly_active', label: 'Lightly Active' },
              { value: 'moderately_active', label: 'Moderately Active' },
              { value: 'very_active', label: 'Very Active' },
              { value: 'extra_active', label: 'Extra Active' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerButton,
                  formData.activity_level === option.value && styles.pickerButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, activity_level: option.value as any })}
              >
                <ThemedText
                  style={
                    formData.activity_level === option.value
                      ? styles.pickerTextActive
                      : styles.pickerText
                  }
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Goal</ThemedText>
          <ThemedView style={styles.pickerColumn}>
            {[
              { value: 'lose_weight', label: 'Lose Weight' },
              { value: 'maintain_weight', label: 'Maintain Weight' },
              { value: 'gain_weight', label: 'Gain Weight' },
              { value: 'gain_muscle', label: 'Gain Muscle' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerButton,
                  formData.goal === option.value && styles.pickerButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, goal: option.value as any })}
              >
                <ThemedText
                  style={formData.goal === option.value ? styles.pickerTextActive : styles.pickerText}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Registering...' : 'Register'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F7',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#112D4E',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#112D4E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DBE2EF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#112D4E',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerColumn: {
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DBE2EF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  pickerButtonActive: {
    backgroundColor: '#3F72AF',
    borderColor: '#3F72AF',
  },
  pickerText: {
    fontSize: 14,
    color: '#112D4E',
  },
  pickerTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3F72AF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
