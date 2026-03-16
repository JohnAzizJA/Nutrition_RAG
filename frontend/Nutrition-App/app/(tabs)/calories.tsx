import { useState, useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Alert, Animated, Modal, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { calculationService, nutritionService, mealPlanService, MealPlan } from '@/src/services';
import { getErrorMessage } from '@/src/utils/errorUtils';
import { VoiceLogResult } from '@/src/services/nutritionService';
import { Swipeable } from 'react-native-gesture-handler';

const MEAL_PLAN_KEY = 'mealPlanEnabled';
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const;

export default function CaloriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [targets, setTargets] = useState<any>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [mealPlanEnabled, setMealPlanEnabled] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [selectedDate])
  );

  const loadAll = async () => {
    const enabled = (await SecureStore.getItemAsync(MEAL_PLAN_KEY)) === 'true';
    setMealPlanEnabled(enabled);
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      const [targetsData, nutritionData] = await Promise.all([
        calculationService.calculateTargets({
          weight_kg: user?.weight_kg!,
          height_cm: user?.height_cm!,
          age: user?.age!,
          gender: user?.gender!,
          activity_level: user?.activity_level!,
          goal: user?.goal!,
          weight_loss_per_week: user?.weight_loss_per_week || 0.5,
        }),
        nutritionService.getDailyNutrition(dateStr),
      ]);
      setTargets(targetsData);
      setNutrition(nutritionData);
      const plansData = await mealPlanService.getPlans(dateStr);
      setPlans(plansData);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
  };

  // ── Voice recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    setVoiceError(null);
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setVoiceError('Microphone permission is required for voice logging.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } catch {
      setVoiceError('Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    setVoiceLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error('No audio recorded.');
      const result = await nutritionService.voiceLog(uri);
      setVoiceResult(result);
      loadAll(); // refresh macros/meals
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Voice logging failed. Please try again.';
      setVoiceError(msg);
      setRecording(null);
    } finally {
      setVoiceLoading(false);
    }
  };

  // ── Date helpers ───────────────────────────────────────────────────────────
  const getWeekDays = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const abbr = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  // ── Meal actions ───────────────────────────────────────────────────────────
  const deleteMeal = async (mealId: number) => {
    try {
      await nutritionService.deleteMeal(mealId);
      loadAll();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to delete meal. Please try again.'));
    }
  };

  const togglePlanComplete = async (plan: MealPlan) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      if (plan.completed) {
        await mealPlanService.unmarkComplete(plan.id, dateStr);
      } else {
        await mealPlanService.markComplete(plan.id, dateStr);
      }
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, completed: !p.completed } : p));
    } catch { /* ignore */ }
  };

  const deletePlan = async (planId: number) => {
    try {
      await mealPlanService.deletePlan(planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to delete meal plan. Please try again.'));
    }
  };

  const renderDeleteAction = (mealId: number) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => deleteMeal(mealId)}>
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

  // ── Section totals ─────────────────────────────────────────────────────────
  const sectionTotals = (type: string) => {
    const items = nutrition?.meals?.filter((m: any) => m.meal_type === type.toLowerCase()) || [];
    return {
      cal: Math.round(items.reduce((s: number, m: any) => s + m.calories, 0)),
      p: +(items.reduce((s: number, m: any) => s + m.protein_g, 0)).toFixed(1),
      c: +(items.reduce((s: number, m: any) => s + m.carbs_g, 0)).toFixed(1),
    };
  };

  // ── Completed plan macro contribution ─────────────────────────────────────
  const completedPlanTotals = plans.filter(p => p.completed).reduce(
    (acc, p) => ({
      calories: acc.calories + p.total_calories,
      protein_g: acc.protein_g + p.total_protein_g,
      carbs_g: acc.carbs_g + p.total_carbs_g,
      fat_g: acc.fat_g + p.total_fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  // ── Shared top section ─────────────────────────────────────────────────────
  const TopSection = (
    <>
      <View style={styles.dateContainerOuter}>
        <BlurView intensity={85} tint="light" style={styles.dateContainer}>
          <View style={styles.glassSheen} />
          <View style={styles.dateHeader}>
            <TouchableOpacity onPress={() => {
              const o = weekOffset - 1;
              setWeekOffset(o);
              const s = new Date(); s.setDate(s.getDate() - s.getDay() + o * 7);
              const last = new Date(s); last.setDate(s.getDate() + 6);
              setSelectedDate(last);
            }}>
              <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <ThemedText style={styles.dateText}>{fmt(selectedDate)}</ThemedText>
            <TouchableOpacity onPress={() => {
              const o = weekOffset + 1;
              setWeekOffset(o);
              const s = new Date(); s.setDate(s.getDate() - s.getDay() + o * 7);
              setSelectedDate(s);
            }}>
              <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekContainer}>
            {getWeekDays().map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayCircle, isSelected(day) && styles.dayCircleSelected, isToday(day) && styles.dayCircleToday]}
                onPress={() => setSelectedDate(day)}
              >
                <ThemedText style={[styles.dayText, isSelected(day) && styles.dayTextSelected]}>
                  {abbr(day)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      </View>

      <View style={styles.macroGrid}>
        {[
          { label: 'Calories', current: (nutrition?.totals?.calories || 0) + completedPlanTotals.calories, target: targets?.target_calories || 0, unit: 'kcal', color: Colors.iconCalories },
          { label: 'Protein', current: (nutrition?.totals?.protein_g || 0) + completedPlanTotals.protein_g, target: targets?.target_protein_g || 0, unit: 'g', color: Colors.iconProtein },
          { label: 'Carbs', current: (nutrition?.totals?.carbs_g || 0) + completedPlanTotals.carbs_g, target: targets?.target_carbs_g || 0, unit: 'g', color: Colors.iconCarbs },
          { label: 'Fats', current: (nutrition?.totals?.fat_g || 0) + completedPlanTotals.fat_g, target: targets?.target_fat_g || 0, unit: 'g', color: Colors.iconFats },
        ].map(({ label, current, target, unit, color }) => {
          const pct = target > 0 ? Math.min(1, current / target) : 0;
          const isOver = target > 0 && current > target;
          const fillColor = isOver ? Colors.danger : color;
          return (
            <View key={label} style={styles.macroBoxOuter}>
              <BlurView intensity={85} tint="light" style={styles.macroBox}>
                <View style={styles.glassSheen} />
                <View style={[styles.macroFill, { height: pct * 140, backgroundColor: fillColor + '30' }]} />
                <View style={styles.macroContent}>
                  <ThemedText style={[styles.macroValue, { color: fillColor }]}>{current}</ThemedText>
                  <ThemedText style={styles.macroGoal}>/ {target} {unit}</ThemedText>
                  <ThemedText style={styles.macroLabel}>{label}</ThemedText>
                </View>
              </BlurView>
            </View>
          );
        })}
      </View>
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.header}>
        <View style={styles.headerSheen} />
        <ThemedText type="title" style={styles.title}>Calorie Tracker</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </BlurView>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      >
        {TopSection}

        {mealPlanEnabled ? (
          // ── Meal Plan mode ────────────────────────────────────────────────
          <View style={styles.planSection}>
            <View style={styles.planSectionHeader}>
              <ThemedText style={styles.sectionTitle}>My Meal Plans</ThemedText>
              <TouchableOpacity
                style={styles.createPlanBtn}
                onPress={() => router.push('/create-meal-plan' as any)}
              >
                <Ionicons name="add" size={16} color={Colors.white} />
                <ThemedText style={styles.createPlanBtnText}>New Plan</ThemedText>
              </TouchableOpacity>
            </View>

            {plans.length === 0 ? (
              <View style={styles.emptyPlans}>
                <Ionicons name="calendar-outline" size={40} color={Colors.inactive} />
                <ThemedText style={styles.emptyPlansText}>No meal plans yet</ThemedText>
                <ThemedText style={styles.emptyPlansSub}>
                  Tap "New Plan" to create your first daily meal plan.
                </ThemedText>
              </View>
            ) : (
              plans.map(plan => (
                <Swipeable
                  key={plan.id}
                  renderRightActions={() => (
                    <TouchableOpacity style={styles.planDeleteAction} onPress={() => deletePlan(plan.id)}>
                      <Ionicons name="trash-outline" size={20} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                >
                  <View style={styles.planCardOuter}>
                    <BlurView intensity={85} tint="light" style={[styles.planCard, plan.completed && styles.planCardDone]}>
                      <View style={styles.glassSheen} />
                      <View style={styles.planCardHeader}>
                        <TouchableOpacity style={styles.checkBtn} onPress={() => togglePlanComplete(plan)}>
                          <Ionicons
                            name={plan.completed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={26}
                            color={plan.completed ? Colors.primary : Colors.inactive}
                          />
                        </TouchableOpacity>
                        <View style={styles.planCardTitle}>
                          <ThemedText style={[styles.planName, plan.completed && styles.planNameDone]}>
                            {plan.name}
                          </ThemedText>
                          <ThemedText style={styles.planTotals}>
                            {Math.round(plan.total_calories)} kcal · {plan.total_protein_g}g P · {plan.total_carbs_g}g C
                          </ThemedText>
                        </View>
                        <TouchableOpacity onPress={() => router.push({
                          pathname: '/create-meal-plan' as any,
                          params: { planId: plan.id, planName: plan.name },
                        })}>
                          <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </View>

                      {plan.foods.map(food => (
                        <View key={food.id} style={styles.planFoodRow}>
                          <ThemedText style={styles.planFoodName} numberOfLines={1}>{food.food_name}</ThemedText>
                          <ThemedText style={styles.planFoodMeta}>
                            {food.grams ? `${Math.round(food.grams)}g · ` : ''}{Math.round(food.calories)} kcal
                          </ThemedText>
                        </View>
                      ))}
                    </BlurView>
                  </View>
                </Swipeable>
              ))
            )}
          </View>
        ) : (
          // ── Normal mode ───────────────────────────────────────────────────
          <View style={styles.mealsSection}>
            {MEAL_TYPES.map(mealType => {
              const mealItems = nutrition?.meals?.filter((m: any) => m.meal_type === mealType.toLowerCase()) || [];
              const totals = sectionTotals(mealType);
              return (
                <View key={mealType} style={styles.mealTypeSection}>
                  <View style={styles.mealTypeHeader}>
                    <View style={styles.mealTypeLeft}>
                      <ThemedText style={styles.mealTypeTitle}>{mealType}</ThemedText>
                      {totals.cal > 0 && (
                        <ThemedText style={styles.mealTypeTotals}>
                          {totals.cal} kcal · {totals.p}g P · {totals.c}g C
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.addMealButton}
                      onPress={() => router.push(`/log-food?mealType=${mealType.toLowerCase()}`)}
                    >
                      <Ionicons name="add" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {mealItems.length > 0 ? (
                    mealItems.map((meal: any) => (
                      <Swipeable key={meal.id} renderRightActions={() => renderDeleteAction(meal.id)}>
                        <View style={styles.mealItemOuter}>
                          <BlurView intensity={85} tint="light" style={styles.mealItem}>
                            <View style={styles.glassSheen} />
                            <ThemedText style={styles.mealName}>{meal.food_name}</ThemedText>
                            <ThemedText style={styles.mealNutrients}>
                              {meal.calories} kcal | {meal.protein_g}g P | {meal.carbs_g}g C | {meal.fat_g}g F
                            </ThemedText>
                          </BlurView>
                        </View>
                      </Swipeable>
                    ))
                  ) : (
                    <View style={styles.emptyMealStateOuter}>
                      <BlurView intensity={85} tint="light" style={styles.emptyMealState}>
                        <View style={styles.glassSheen} />
                        <ThemedText style={styles.emptyMealText}>No {mealType.toLowerCase()} logged</ThemedText>
                      </BlurView>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Mic FAB ─────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.micFab, recording && styles.micFabRecording, { transform: [{ scale: recording ? pulseAnim : 1 }] }]}>
        <TouchableOpacity
          style={styles.micFabInner}
          onPress={recording ? stopRecording : startRecording}
          disabled={voiceLoading}
        >
          {voiceLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name={recording ? 'stop' : 'mic'} size={26} color={Colors.white} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Success Modal ────────────────────────────────────────────────── */}
      <Modal visible={!!voiceResult} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardOuter}>
            <BlurView intensity={65} tint="extraLight" style={styles.modalCard}>
              <View style={styles.glassSheen} />
              <View style={styles.modalIconRow}>
                <Ionicons name="checkmark-circle" size={40} color={Colors.primary} />
              </View>
              <ThemedText style={styles.modalTitle}>Logged via Voice!</ThemedText>
              {voiceResult && (
                <>
                  <ThemedText style={styles.modalTranscript}>"{voiceResult.transcript}"</ThemedText>
                  <ThemedText style={styles.modalFood}>{voiceResult.food_name}</ThemedText>
                  <ThemedText style={styles.modalMacros}>
                    {voiceResult.grams}g · {voiceResult.calories} kcal{'\n'}
                    {voiceResult.protein_g}g P · {voiceResult.carbs_g}g C · {voiceResult.fat_g}g F
                  </ThemedText>
                  <View style={styles.modalMealBadge}>
                    <ThemedText style={styles.modalMealBadgeText}>
                      {voiceResult.meal_type.charAt(0).toUpperCase() + voiceResult.meal_type.slice(1)}
                    </ThemedText>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.modalBtn} onPress={() => setVoiceResult(null)}>
                <ThemedText style={styles.modalBtnText}>Done</ThemedText>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* ── Error Modal ──────────────────────────────────────────────────── */}
      <Modal visible={!!voiceError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardOuter}>
            <BlurView intensity={65} tint="extraLight" style={styles.modalCard}>
              <View style={styles.glassSheen} />
              <View style={styles.modalIconRow}>
                <Ionicons name="alert-circle" size={40} color={Colors.danger} />
              </View>
              <ThemedText style={styles.modalTitle}>Voice Log Failed</ThemedText>
              <ThemedText style={styles.modalErrorText}>{voiceError}</ThemedText>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnDanger]} onPress={() => setVoiceError(null)}>
                <ThemedText style={styles.modalBtnText}>Close</ThemedText>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.60)',
  },
  scrollContainer: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.dark },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Shared glass sheen
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },

  // Calendar
  dateContainerOuter: {
    borderRadius: 16,
    marginBottom: 20,
  },
  dateContainer: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 18, fontWeight: 'bold', color: Colors.dark, textAlign: 'center' },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
    flex: 1, marginHorizontal: 2,
  },
  dayCircleSelected: { backgroundColor: Colors.primary },
  dayCircleToday: { borderWidth: 2, borderColor: Colors.primary },
  dayText: { fontSize: 12, fontWeight: '600', color: Colors.dark },
  dayTextSelected: { color: Colors.white },

  // Macro grid
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  macroBoxOuter: {
    width: '47%',
    borderRadius: 16,
    height: 140,
  },
  macroBox: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  macroFill: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  macroContent: { alignItems: 'center', zIndex: 1 },
  macroValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4, lineHeight: 34 },
  macroGoal: { fontSize: 14, color: Colors.textMuted, marginBottom: 8 },
  macroLabel: { fontSize: 16, fontWeight: '600', color: Colors.dark },

  // Normal meals
  mealsSection: { marginTop: 24 },
  mealTypeSection: { marginBottom: 20 },
  mealTypeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealTypeLeft: { flex: 1 },
  mealTypeTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.dark },
  mealTypeTotals: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  addMealButton: {
    backgroundColor: Colors.white,
    borderRadius: 20, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primary,
  },
  mealItemOuter: { borderRadius: 12, marginBottom: 8 },
  mealItem: { borderRadius: 12, padding: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.70)' },
  mealName: { fontSize: 16, fontWeight: '600', color: Colors.dark, marginBottom: 4 },
  mealNutrients: { fontSize: 14, color: Colors.textMuted },
  emptyMealStateOuter: { borderRadius: 12 },
  emptyMealState: { borderRadius: 12, padding: 16, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.70)' },
  emptyMealText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center', alignItems: 'center',
    width: 80, borderRadius: 12, marginBottom: 8,
  },

  // Meal Plan mode
  planSection: { marginTop: 24 },
  planSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.dark },
  createPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createPlanBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  emptyPlans: { alignItems: 'center', padding: 32, gap: 8 },
  emptyPlansText: { fontSize: 17, fontWeight: '600', color: Colors.dark },
  emptyPlansSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  planCardOuter: { borderRadius: 14, marginBottom: 14 },
  planCard: {
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  planCardDone: { borderColor: Colors.primary + '40' },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  checkBtn: { padding: 2 },
  planCardTitle: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  planNameDone: { color: Colors.primary },
  planTotals: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  planActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  planFoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  planFoodName: { fontSize: 13, color: Colors.dark, flex: 1 },
  planFoodMeta: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  planDeleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 14,
    marginBottom: 14,
  },

  // Mic FAB
  micFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    width: 60,
    height: 60,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  micFabRecording: { backgroundColor: Colors.danger },
  micFabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCardOuter: {
    borderRadius: 20,
    width: '100%',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  modalCard: {
    borderRadius: 20,
    padding: 28,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  modalIconRow: { marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  modalTranscript: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  modalFood: { fontSize: 17, fontWeight: '700', color: Colors.dark, textAlign: 'center' },
  modalMacros: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalMealBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  modalMealBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  modalErrorText: { fontSize: 14, color: Colors.danger, textAlign: 'center', lineHeight: 20 },
  modalBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnDanger: { backgroundColor: Colors.danger },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
