import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSpotify } from '@/src/contexts/SpotifyContext';
import { calculationService, userService } from '@/src/services';
import { getErrorMessage } from '@/src/utils/errorUtils';
import { BlurView } from 'expo-blur';

// Spotify brand green — Spotify Brand Guidelines
const SPOTIFY_GREEN = '#1DB954';

const MEAL_PLAN_KEY = 'mealPlanEnabled';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { isConnected: spotifyConnected, connect: spotifyConnect, disconnect: spotifyDisconnect } = useSpotify();
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{visible: boolean, field: string, value: any}>({visible: false, field: '', value: ''});
  const [saving, setSaving] = useState(false);
  const [mealPlanEnabled, setMealPlanEnabled] = useState(false);

  useEffect(() => {
    fetchTargets();
    SecureStore.getItemAsync(MEAL_PLAN_KEY).then((v: string | null) => setMealPlanEnabled(v === 'true'));
  }, []);

  const toggleMealPlan = async (value: boolean) => {
    setMealPlanEnabled(value);
    await SecureStore.setItemAsync(MEAL_PLAN_KEY, value ? 'true' : 'false');
  };

  const handleSpotifyToggle = async () => {
    setSpotifyLoading(true);
    try {
      if (spotifyConnected) {
        await spotifyDisconnect();
      } else {
        await spotifyConnect();
      }
    } catch {
      Alert.alert('Spotify', 'Something went wrong. Please try again.');
    } finally {
      setSpotifyLoading(false);
    }
  };

  const handleWeekStartChange = async (day: number) => {
    if ((user?.week_start_day ?? 0) === day) return;
    try {
      const updatedUser = await userService.updateProfile({
        age: user?.age!,
        gender: user?.gender! as 'male' | 'female',
        weight_kg: user?.weight_kg!,
        height_cm: user?.height_cm!,
        activity_level: user?.activity_level! as any,
        goal: user?.goal! as any,
        goal_weight_kg: user?.goal_weight_kg!,
        weight_loss_per_week: user?.weight_loss_per_week!,
        week_start_day: day,
      });
      await updateUser(updatedUser);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to update week start day.'));
    }
  };

  const handleEdit = (field: string, currentValue: any) => {
    // Convert activity level to exercise days for slider
    if (field === 'activity_level') {
      const getExerciseDays = (activityLevel: string) => {
        switch (activityLevel) {
          case 'sedentary': return 0;
          case 'lightly_active': return 2;
          case 'moderately_active': return 4;
          case 'very_active': return 6;
          case 'extra_active': return 7;
          default: return 3;
        }
      };
      setEditModal({visible: true, field, value: getExerciseDays(currentValue)});
    } else {
      setEditModal({visible: true, field, value: currentValue});
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const getActivityLevel = (days: number) => {
        if (days === 0) return 'sedentary';
        if (days <= 2) return 'lightly_active';
        if (days <= 4) return 'moderately_active';
        if (days <= 6) return 'very_active';
        return 'extra_active';
      };

      const updateData = {
        age: user?.age!,
        gender: user?.gender! as 'male' | 'female',
        weight_kg: user?.weight_kg!,
        height_cm: user?.height_cm!,
        activity_level: user?.activity_level! as any,
        goal: user?.goal! as any,
        goal_weight_kg: user?.goal_weight_kg!,
        weight_loss_per_week: user?.weight_loss_per_week!,
        week_start_day: user?.week_start_day ?? 0,
        [editModal.field]: editModal.field === 'activity_level' ? getActivityLevel(editModal.value) : editModal.value
      };
      
      const updatedUser = await userService.updateProfile(updateData);
      await updateUser(updatedUser);
      setEditModal({visible: false, field: '', value: ''});
      fetchTargets();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to update profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const data = await calculationService.calculateTargets({
        weight_kg: user?.weight_kg!,
        height_cm: user?.height_cm!,
        age: user?.age!,
        gender: user?.gender!,
        activity_level: user?.activity_level!,
        goal: user?.goal!,
      });
      setTargets(data);
    } catch (error) {
      console.error('Failed to fetch targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteAccount();
              await logout();
              router.replace('/welcome');
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error, 'Failed to delete account. Please try again.'));
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerSheen} />
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <View style={{ width: 24 }} />
      </BlurView>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarInitials}>
              {(user?.name ?? 'U').split(/[\s._]+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')}
            </ThemedText>
          </View>
          <ThemedText style={styles.name}>{user?.name || 'User'}</ThemedText>
          <ThemedText style={styles.email}>{user?.email || ''}</ThemedText>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>My Goals</ThemedText>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.cardsContainerOuter}>
              <BlurView intensity={85} tint="light" style={styles.cardsContainer}>
                <View style={styles.glassSheen} />
              {[
                { label: 'Goal', value: user?.goal?.replace(/_/g, ' ') || 'N/A', icon: 'flag-outline', color: Colors.primary, field: 'goal', editable: true },
                ...(user?.goal === 'lose_weight' ? [{ label: 'Amount to lose per week', value: `${user?.weight_loss_per_week || 0.5} kg/week`, icon: 'trending-down-outline', color: Colors.iconWeightLoss, field: 'weight_loss_per_week', editable: true }] : []),
                { label: 'Daily Calories', value: `${targets?.target_calories || 0} kcal`, icon: 'flame-outline', color: Colors.iconCalories, editable: false },
                { label: 'Protein', value: `${targets?.target_protein_g || 0} g`, icon: 'nutrition-outline', color: Colors.iconProtein, editable: false },
                { label: 'Carbs', value: `${targets?.target_carbs_g || 0} g`, icon: 'leaf-outline', color: Colors.iconCarbs, editable: false },
                { label: 'Fats', value: `${targets?.target_fat_g || 0} g`, icon: 'water-outline', color: Colors.iconFats, editable: false },
              ].map((goal, index) => (
                <TouchableOpacity key={index} style={styles.card} onPress={() => goal.editable && handleEdit(goal.field!, user?.[goal.field! as keyof typeof user])}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: goal.color + '20' }]}>
                      <Ionicons name={goal.icon as any} size={20} color={goal.color} />
                    </View>
                    <View>
                      <ThemedText style={styles.cardLabel}>{goal.label}</ThemedText>
                      <ThemedText style={styles.cardValue}>{goal.value}</ThemedText>
                    </View>
                  </View>
                  {goal.editable && <Ionicons name="pencil" size={16} color={Colors.textMuted} />}
                </TouchableOpacity>
              ))}
              </BlurView>
            </View>
          )}
        </View>

        {/* Metrics Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>My Metrics</ThemedText>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.cardsContainerOuter}>
              <BlurView intensity={85} tint="light" style={styles.cardsContainer}>
                <View style={styles.glassSheen} />
              {[
                { label: 'Age', value: `${user?.age || 0} years`, icon: 'calendar-outline', field: 'age', editable: true },
                { label: 'Gender', value: user?.gender || 'N/A', icon: 'person-outline', field: 'gender', editable: true },
                { label: 'Weight', value: `${user?.weight_kg || 0} kg`, icon: 'fitness-outline', field: 'weight_kg', editable: true },
                { label: 'Height', value: `${user?.height_cm || 0} cm`, icon: 'resize-outline', field: 'height_cm', editable: true },
                { label: 'Activity Level', value: user?.activity_level?.replace(/_/g, ' ') || 'N/A', icon: 'walk-outline', field: 'activity_level', editable: true },
                { label: 'BMI', value: targets?.bmi || 'N/A', icon: 'analytics-outline', editable: false },
                { label: 'BMR', value: `${targets?.bmr || 0} kcal/day`, icon: 'speedometer-outline', editable: false },
                { label: 'TDEE', value: `${targets?.tdee || 0} kcal/day`, icon: 'flash-outline', editable: false },
              ].map((metric, index) => (
                <TouchableOpacity key={index} style={styles.card} onPress={() => metric.editable && handleEdit(metric.field!, user?.[metric.field! as keyof typeof user])}>
                  <View style={styles.cardLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons name={metric.icon as any} size={20} color={Colors.primary} />
                    </View>
                    <View>
                      <ThemedText style={styles.cardLabel}>{metric.label}</ThemedText>
                      <ThemedText style={styles.cardValue}>{metric.value}</ThemedText>
                    </View>
                  </View>
                  {metric.editable && <Ionicons name="pencil" size={16} color={Colors.textMuted} />}
                </TouchableOpacity>
              ))}
              </BlurView>
            </View>
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
          <View style={styles.cardsContainerOuter}>
            <BlurView intensity={85} tint="light" style={styles.cardsContainer}>
              <View style={styles.glassSheen} />
            <View style={styles.card}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '20' }]}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.cardLabel}>Daily Meal Plan</ThemedText>
                  <ThemedText style={styles.cardSubValue}>Plan your meals ahead of time</ThemedText>
                </View>
              </View>
              <Switch
                value={mealPlanEnabled}
                onValueChange={toggleMealPlan}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={mealPlanEnabled ? Colors.primary : Colors.inactive}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.secondary + '20' }]}>
                  <Ionicons name="today-outline" size={20} color={Colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.cardLabel}>Week Starts On</ThemedText>
                  <ThemedText style={styles.cardSubValue}>Affects weekly stats & charts</ThemedText>
                </View>
              </View>
              <View style={styles.weekToggle}>
                {(['Sun', 'Mon'] as const).map((label, idx) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.weekChip, (user?.week_start_day ?? 0) === idx && styles.weekChipActive]}
                    onPress={() => handleWeekStartChange(idx)}
                  >
                    <ThemedText style={(user?.week_start_day ?? 0) === idx ? styles.weekChipTextActive : styles.weekChipText}>
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: SPOTIFY_GREEN + '20' }]}>
                  <Ionicons name="musical-notes" size={20} color={SPOTIFY_GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.cardLabel}>Spotify</ThemedText>
                  <ThemedText style={styles.cardSubValue}>
                    {spotifyConnected ? 'Connected — controls workout music' : 'Connect to control music during workouts'}
                  </ThemedText>
                </View>
              </View>
              {spotifyLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <TouchableOpacity
                  style={[styles.spotifyBtn, { backgroundColor: spotifyConnected ? Colors.background : SPOTIFY_GREEN }]}
                  onPress={handleSpotifyToggle}
                >
                  <ThemedText style={[styles.spotifyBtnText, { color: spotifyConnected ? Colors.textMuted : Colors.white }]}>
                    {spotifyConnected ? 'Disconnect' : 'Connect'}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            </BlurView>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentOuter}>
          <BlurView intensity={65} tint="extraLight" style={styles.modalContent}>
            <View style={styles.glassSheen} />
            <ThemedText style={styles.modalTitle}>Edit {editModal.field?.replace(/_/g, ' ')}</ThemedText>
            
            {editModal.field === 'gender' ? (
              <View style={styles.optionsContainer}>
                {['male', 'female'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionButton, editModal.value === option && styles.selectedOption]}
                    onPress={() => setEditModal({...editModal, value: option})}
                  >
                    <ThemedText style={[styles.optionText, editModal.value === option && styles.selectedText]}>
                      {option === 'male' ? 'Male' : 'Female'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : editModal.field === 'goal' ? (
              <View style={styles.optionsContainer}>
                {[
                  {value: 'lose_weight', label: 'Lose Weight'},
                  {value: 'maintain_weight', label: 'Maintain Weight'},
                  {value: 'gain_weight', label: 'Gain Weight'},
                  {value: 'gain_muscle', label: 'Gain Muscle'}
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionButton, editModal.value === option.value && styles.selectedOption]}
                    onPress={() => setEditModal({...editModal, value: option.value})}
                  >
                    <ThemedText style={[styles.optionText, editModal.value === option.value && styles.selectedText]}>
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : editModal.field === 'activity_level' ? (
              <View style={styles.sliderContainer}>
                <ThemedText style={styles.sliderLabel}>Exercise Days Per Week: {editModal.value}</ThemedText>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={7}
                  step={1}
                  value={editModal.value}
                  onValueChange={(value) => setEditModal({...editModal, value})}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.inactive}
                  thumbTintColor={Colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <ThemedText style={styles.sliderLabelText}>0 days</ThemedText>
                  <ThemedText style={styles.sliderLabelText}>7 days</ThemedText>
                </View>
              </View>
            ) : editModal.field === 'weight_loss_per_week' ? (
              <View style={styles.sliderContainer}>
                <ThemedText style={styles.sliderLabel}>{editModal.value} kg per week</ThemedText>
                <Slider
                  style={styles.slider}
                  minimumValue={0.25}
                  maximumValue={1.0}
                  step={0.25}
                  value={editModal.value}
                  onValueChange={(value) => setEditModal({...editModal, value})}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.inactive}
                  thumbTintColor={Colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <ThemedText style={styles.sliderLabelText}>0.25 kg</ThemedText>
                  <ThemedText style={styles.sliderLabelText}>1.0 kg</ThemedText>
                </View>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={String(editModal.value)}
                onChangeText={(text) => setEditModal({...editModal, value: editModal.field === 'age' ? parseInt(text) || 0 : parseFloat(text) || 0})}
                keyboardType="numeric"
                placeholder={`Enter ${editModal.field?.replace(/_/g, ' ')}`}
              />
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModal({visible: false, field: '', value: ''})}>
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                <ThemedText style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</ThemedText>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.60)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.white,
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInitials: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  cardsContainerOuter: {
    borderRadius: 14,
    marginHorizontal: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardsContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    textTransform: 'capitalize',
  },
  cardSubValue: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentOuter: {
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: Colors.dark,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: Colors.dark,
  },
  selectedText: {
    color: Colors.white,
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  saveText: {
    color: Colors.white,
    fontWeight: '600',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 40,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger,
  },
  weekToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  weekChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  weekChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  weekChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  weekChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  spotifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  spotifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
