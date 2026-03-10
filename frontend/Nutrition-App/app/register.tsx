import { useState, useRef } from 'react';
import { StyleSheet, TextInput, ScrollView, TouchableOpacity, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  'Account',
  'Profile',
  'Body',
  'Activity',
  'Goal',
  'Target',
];

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
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

  const goToStep = (step: number) => {
    scrollViewRef.current?.scrollTo({ x: step * width, animated: true });
    setCurrentStep(step);
    setError(null);
  };

  const validateStep = (): string | null => {
    switch (currentStep) {
      case 0: {
        if (!formData.email || !formData.password) return 'Please fill in all fields';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) return 'Please enter a valid email address';
        if (formData.password.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(formData.password)) return 'Password needs at least one uppercase letter';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) return 'Password needs at least one special character';
        return null;
      }
      case 1: {
        if (!formData.name) return 'Please enter a username';
        if (!/^[a-zA-Z._]+$/.test(formData.name)) return 'Username can only contain letters, dots, and underscores';
        if (!formData.age || formData.age < 10 || formData.age > 120) return 'Please enter a valid age';
        return null;
      }
      default:
        return null;
    }
  };

  const handleNext = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    goToStep(currentStep + 1);
  };

  const handleRegister = async () => {
    setError(null);

    const getActivityLevel = (days: number) => {
      if (days === 0) return 'sedentary';
      if (days <= 2) return 'lightly_active';
      if (days <= 4) return 'moderately_active';
      if (days <= 6) return 'very_active';
      return 'extra_active';
    };

    setLoading(true);
    try {
      await register({
        ...formData,
        activity_level: getActivityLevel(formData.exercise_days_per_week),
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentStep > 0 ? (
          <TouchableOpacity onPress={() => goToStep(currentStep - 1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
        )}
        <ThemedText style={styles.stepLabel}>Step {currentStep + 1} of {STEPS.length}</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
      </View>

      {/* Scrollable steps */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Step 1: Account */}
        <View style={styles.stepContainer}>
          <ThemedText style={styles.stepTitle}>Create Account</ThemedText>
          <ThemedText style={styles.stepSubtitle}>Your login credentials</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(t) => update('email', t)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={formData.password}
                onChangeText={(t) => update('password', t)}
                placeholder="Min 8 chars, uppercase & symbol"
                secureTextEntry={!showPassword}
                placeholderTextColor={Colors.placeholder}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(v => !v)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Step 2: Personal Info */}
        <View style={styles.stepContainer}>
          <ThemedText style={styles.stepTitle}>Personal Info</ThemedText>
          <ThemedText style={styles.stepSubtitle}>Tell us about yourself</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(t) => update('name', t.replace(/[^a-zA-Z._]/g, ''))}
              placeholder="Letters, dots, underscores only"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Age</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.age ? String(formData.age) : ''}
              onChangeText={(t) => update('age', parseInt(t) || 0)}
              placeholder="Enter your age"
              keyboardType="numeric"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <View style={styles.pickerRow}>
              {(['male', 'female'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.pickerButton, formData.gender === g && styles.pickerButtonActive]}
                  onPress={() => update('gender', g)}
                >
                  <ThemedText style={formData.gender === g ? styles.pickerTextActive : styles.pickerText}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Step 3: Body Metrics */}
        <View style={styles.stepContainer}>
          <ThemedText style={styles.stepTitle}>Body Metrics</ThemedText>
          <ThemedText style={styles.stepSubtitle}>Used to calculate your calorie needs</ThemedText>

          <View style={styles.inputGroup}>
            <View style={styles.sliderLabelRow}>
              <ThemedText style={styles.label}>Weight</ThemedText>
              <ThemedText style={styles.sliderValue}>{formData.weight_kg} kg</ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={200}
              step={1}
              value={formData.weight_kg}
              onValueChange={(v) => update('weight_kg', v)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.inactive}
              thumbTintColor={Colors.primary}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.sliderLabelRow}>
              <ThemedText style={styles.label}>Height</ThemedText>
              <ThemedText style={styles.sliderValue}>{formData.height_cm} cm</ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={250}
              step={1}
              value={formData.height_cm}
              onValueChange={(v) => update('height_cm', v)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.inactive}
              thumbTintColor={Colors.primary}
            />
          </View>
        </View>

        {/* Step 4: Exercise */}
        <View style={styles.stepContainer}>
          <ThemedText style={styles.stepTitle}>Activity Level</ThemedText>
          <ThemedText style={styles.stepSubtitle}>How often do you exercise per week?</ThemedText>

          <View style={styles.inputGroup}>
            <View style={styles.sliderLabelRow}>
              <ThemedText style={styles.label}>Days per week</ThemedText>
              <ThemedText style={styles.sliderValue}>{formData.exercise_days_per_week} days</ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={7}
              step={1}
              value={formData.exercise_days_per_week}
              onValueChange={(v) => update('exercise_days_per_week', v)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.inactive}
              thumbTintColor={Colors.primary}
            />
            <ThemedText style={styles.sliderHint}>
              {formData.exercise_days_per_week === 0 ? 'Sedentary'
                : formData.exercise_days_per_week <= 2 ? 'Lightly active'
                : formData.exercise_days_per_week <= 4 ? 'Moderately active'
                : formData.exercise_days_per_week <= 6 ? 'Very active'
                : 'Extra active'}
            </ThemedText>
          </View>
        </View>

        {/* Step 5: Goal */}
        <View style={styles.stepContainer}>
          <ThemedText style={styles.stepTitle}>Your Goal</ThemedText>
          <ThemedText style={styles.stepSubtitle}>What are you working towards?</ThemedText>

          <View style={styles.pickerColumn}>
            {[
              { value: 'lose_weight', label: 'Lose Weight', icon: 'trending-down' },
              { value: 'maintain_weight', label: 'Maintain Weight', icon: 'remove' },
              { value: 'gain_weight', label: 'Gain Weight', icon: 'trending-up' },
              { value: 'gain_muscle', label: 'Gain Muscle', icon: 'barbell' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.goalButton, formData.goal === option.value && styles.goalButtonActive]}
                onPress={() => update('goal', option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={formData.goal === option.value ? Colors.white : Colors.primary}
                />
                <ThemedText style={formData.goal === option.value ? styles.pickerTextActive : styles.pickerText}>
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 6: Target Weight */}
        <View style={styles.stepContainer}>
          <ThemedText style={styles.stepTitle}>Target Weight</ThemedText>
          <ThemedText style={styles.stepSubtitle}>Set your goal weight</ThemedText>

          <View style={styles.inputGroup}>
            <View style={styles.sliderLabelRow}>
              <ThemedText style={styles.label}>Goal weight</ThemedText>
              <ThemedText style={styles.sliderValue}>{formData.goal_weight_kg} kg</ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={200}
              step={1}
              value={formData.goal_weight_kg}
              onValueChange={(v) => update('goal_weight_kg', v)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.inactive}
              thumbTintColor={Colors.primary}
            />
          </View>

          {formData.goal === 'lose_weight' && (
            <View style={styles.inputGroup}>
              <View style={styles.sliderLabelRow}>
                <ThemedText style={styles.label}>Weekly loss rate</ThemedText>
                <ThemedText style={styles.sliderValue}>{formData.weight_loss_per_week} kg/wk</ThemedText>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.25}
                maximumValue={1}
                step={0.25}
                value={formData.weight_loss_per_week}
                onValueChange={(v) => update('weight_loss_per_week', v)}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.inactive}
                thumbTintColor={Colors.primary}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Inline error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={Colors.danger} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        {currentStep < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <ThemedText style={styles.nextButtonText}>Next</ThemedText>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <ThemedText style={styles.nextButtonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </ThemedText>
            {!loading && <Ionicons name="checkmark" size={18} color={Colors.white} />}
          </TouchableOpacity>
        )}

        {currentStep === 0 && (
          <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')}>
            <ThemedText style={styles.loginLinkText}>
              Already have an account? <ThemedText style={styles.loginLinkBold}>Sign in</ThemedText>
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width,
    flex: 1,
    padding: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.dark,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  sliderHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
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
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  goalButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.dark,
  },
  pickerTextActive: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.danger + '15',
    borderRadius: 8,
    marginHorizontal: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  bottomNav: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
    gap: 12,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  loginLinkBold: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
