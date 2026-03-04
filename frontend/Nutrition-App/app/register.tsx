import { useState, useRef } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { api } from '@/src/api/client';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface FormData {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'gain_muscle';
}

export default function RegisterScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    age: 0,
    gender: 'male',
    weight_kg: 70,
    height_cm: 170,
    activity_level: 'moderately_active',
    goal: 'maintain_weight',
  });

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const step = Math.round(offsetX / width);
    setCurrentStep(step);
  };

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.name) {
      Alert.alert('Error', 'Please fill all required fields');
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
    <View style={styles.container}>
      {/* Swipeable Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {/* Step 1: Email & Password */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Enter your password"
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Step 2: Name, Age, Gender */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Personal Info</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Name</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter your name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Age</ThemedText>
            <TextInput
              style={styles.input}
              value={String(formData.age)}
              onChangeText={(text) => setFormData({ ...formData, age: parseInt(text) || 0 })}
              placeholder="Enter your age"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <View style={styles.pickerRow}>
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
            </View>
          </View>
        </View>

        {/* Step 3: Weight & Height (Sliders) */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Body Metrics</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Weight: {formData.weight_kg} kg</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={200}
              step={1}
              value={formData.weight_kg}
              onValueChange={(value) => setFormData({ ...formData, weight_kg: value })}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.secondary}
              thumbTintColor={Colors.primary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Height: {formData.height_cm} cm</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={250}
              step={1}
              value={formData.height_cm}
              onValueChange={(value) => setFormData({ ...formData, height_cm: value })}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.secondary}
              thumbTintColor={Colors.primary}
            />
          </View>
        </View>

        {/* Step 4: Activity Level */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Goals</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Activity Level</ThemedText>
            <View style={styles.pickerColumn}>
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
            </View>
          </View>
        </View>

        {/* Step 5: Goal */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Goals</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Goal</ThemedText>
            <View style={styles.pickerColumn}>
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
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <ThemedText style={styles.registerButtonText}>
              {loading ? 'Registering...' : 'Register'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              currentStep === step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width,
    padding: 20,
    justifyContent: 'center',
    flex: 1,
  },
  stepScrollContainer: {
    width,
    flex: 1,
  },
  stepScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.dark,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerColumn: {
    gap: 8,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  pickerButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerText: {
    fontSize: 14,
    color: Colors.dark,
  },
  pickerTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
