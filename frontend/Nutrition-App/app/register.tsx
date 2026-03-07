import { useState, useRef } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { useAuth } from '@/src/contexts/AuthContext';
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
  exercise_days_per_week: number;
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'gain_muscle';
  goal_weight_kg: number;
  weight_loss_per_week: number;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
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
    exercise_days_per_week: 3,
    goal: 'maintain_weight',
    goal_weight_kg: 70,
    weight_loss_per_week: 0.5,
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password
    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least one uppercase letter');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least one special character');
      return;
    }

    // Validate username
    if (!/^[a-zA-Z._]+$/.test(formData.name)) {
      Alert.alert('Error', 'Username can only contain letters, dots, and underscores');
      return;
    }

    // Convert exercise days to activity level
    const getActivityLevel = (days: number) => {
      if (days === 0) return 'sedentary';
      if (days <= 2) return 'lightly_active';
      if (days <= 4) return 'moderately_active';
      if (days <= 6) return 'very_active';
      return 'extra_active';
    };

    const registrationData = {
      ...formData,
      activity_level: getActivityLevel(formData.exercise_days_per_week)
    };

    setLoading(true);
    try {
      await register(registrationData);
      Alert.alert('Success!', 'Your account has been created.');
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
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text.replace(/[^a-zA-Z._]/g, '') })}
              placeholder="Enter username (letters, dots, underscores only)"
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

        {/* Step 4: Exercise Frequency */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Exercise</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Exercise Days Per Week: {formData.exercise_days_per_week}</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={7}
              step={1}
              value={formData.exercise_days_per_week}
              onValueChange={(value) => setFormData({ ...formData, exercise_days_per_week: value })}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.secondary}
              thumbTintColor={Colors.primary}
            />
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
        </View>

        {/* Step 6: Goal Weight */}
        <View style={styles.stepContainer}>
          <ThemedText type="title" style={styles.title}>Target Weight</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Goal Weight: {formData.goal_weight_kg} kg</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={200}
              step={1}
              value={formData.goal_weight_kg}
              onValueChange={(value) => setFormData({ ...formData, goal_weight_kg: value })}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.secondary}
              thumbTintColor={Colors.primary}
            />
          </View>

          {formData.goal === 'lose_weight' && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Weight Loss Per Week: {formData.weight_loss_per_week} kg</ThemedText>
              <Slider
                style={styles.slider}
                minimumValue={0.25}
                maximumValue={1}
                step={0.25}
                value={formData.weight_loss_per_week}
                onValueChange={(value) => setFormData({ ...formData, weight_loss_per_week: value })}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.secondary}
                thumbTintColor={Colors.primary}
              />
            </View>
          )}

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
        {[0, 1, 2, 3, 4, 5].map((step) => (
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
    marginBottom: 50
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.dark,
    lineHeight: 20,
  },
  pickerTextActive: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 20,
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
    marginTop: 30,
    marginBottom: 20,
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
