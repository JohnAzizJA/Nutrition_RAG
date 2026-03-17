import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { dashboardService, nutritionService, calculationService } from '@/src/services';
import { DailyNutritionResponse } from '@/src/services/nutritionService';

const SCREEN_W = Dimensions.get('window').width;
const WEIGHT_CHART_W = SCREEN_W - 72;

const formatWeekLabel = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ─── Greeting ─────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ─── Calorie Ring ─────────────────────────────────────────────────────────────

const RING_R = 58;
const RING_W = 10;
const RING_SIZE = (RING_R + RING_W) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const offset = CIRCUMFERENCE * (1 - pct);
  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const ringColor = pct >= 1 ? Colors.iconStreak : Colors.primary;

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={cx} cy={cy} r={RING_R} fill="none"
          stroke={Colors.background} strokeWidth={RING_W} />
        <Circle cx={cx} cy={cy} r={RING_R} fill="none"
          stroke={ringColor as string} strokeWidth={RING_W}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx},${cy}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <ThemedText style={styles.ringCalories}>{consumed}</ThemedText>
        <ThemedText style={styles.ringLabel}>/ {target} kcal</ThemedText>
      </View>
    </View>
  );
}

// ─── Weight Chart ─────────────────────────────────────────────────────────────

const PAD_L = 38;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 20;

function WeightProgressChart({
  data,
  width,
}: {
  data: { week_start: string; weight_kg: number | null }[];
  width: number;
}) {
  const HEIGHT = 120;
  const plotW = width - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;
  const N = data.length;

  const nonNull = data.filter(p => p.weight_kg !== null);
  const weights = nonNull.map(p => p.weight_kg as number);
  let minW = Math.min(...weights);
  let maxW = Math.max(...weights);
  if (minW === maxW) { minW -= 1; maxW += 1; }

  const slotW = plotW / N;
  const toX = (i: number) => PAD_L + slotW * i + slotW / 2;
  const toY = (w: number) => PAD_T + plotH * (1 - (w - minW) / (maxW - minW));

  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < N - 1; i++) {
    if (data[i].weight_kg !== null && data[i + 1].weight_kg !== null) {
      segments.push({
        x1: toX(i), y1: toY(data[i].weight_kg as number),
        x2: toX(i + 1), y2: toY(data[i + 1].weight_kg as number),
      });
    }
  }

  const yTicks = [maxW, (minW + maxW) / 2, minW];

  return (
    <Svg width={width} height={HEIGHT}>
      {yTicks.map((val, i) => {
        const y = toY(val);
        return [
          <Line key={`rule-${i}`} x1={PAD_L} y1={y} x2={width - PAD_R} y2={y}
            stroke={Colors.border as string} strokeWidth={1} />,
          <SvgText key={`ylbl-${i}`} x={PAD_L - 4} y={y + 3} fontSize={9}
            fill={Colors.textMuted as string} textAnchor="end">
            {val.toFixed(1)}
          </SvgText>,
        ];
      })}

      <Line x1={PAD_L} y1={PAD_T + plotH} x2={width - PAD_R} y2={PAD_T + plotH}
        stroke={Colors.border as string} strokeWidth={1} />

      {data.map((p, i) => (
        <SvgText key={`xlbl-${i}`} x={toX(i)} y={HEIGHT - 4} fontSize={8}
          fill={Colors.textMuted as string} textAnchor="middle">
          {formatWeekLabel(p.week_start)}
        </SvgText>
      ))}

      {segments.map((seg, i) => (
        <Line key={`seg-${i}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
          stroke={Colors.primary as string} strokeWidth={2} strokeLinecap="round" />
      ))}

      {data.map((p, i) => p.weight_kg !== null ? (
        <Circle key={`dot-${i}`} cx={toX(i)} cy={toY(p.weight_kg)} r={4}
          fill={Colors.primary as string} />
      ) : null)}
    </Svg>
  );
}

const WATER_GOAL = 8;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayNutrition, setTodayNutrition] = useState<DailyNutritionResponse | null>(null);
  const [targetCalories, setTargetCalories] = useState(0);

  const isFirstLoadRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(isFirstLoadRef.current);
      isFirstLoadRef.current = false;
    }, [])
  );

  const fetchDashboardData = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [dash, nutrition, targets] = await Promise.all([
        dashboardService.getDashboard(),
        nutritionService.getDailyNutrition(today),
        calculationService.calculateTargets({
          weight_kg: user?.weight_kg!,
          height_cm: user?.height_cm!,
          age: user?.age!,
          gender: user?.gender!,
          activity_level: user?.activity_level!,
          goal: user?.goal!,
          weight_loss_per_week: user?.weight_loss_per_week || 0.5,
        }),
      ]);
      setDashboardData(dash);
      setTodayNutrition(nutrition);
      setTargetCalories(targets.target_calories ?? 0);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWater = async (change: number) => {
    try {
      await dashboardService.updateWater(change);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to update water:', error);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <BlurView intensity={80} tint="light" style={styles.header}>
          <View style={styles.headerSheen} />
          <ThemedText type="title" style={styles.title}>Dashboard</ThemedText>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
          </TouchableOpacity>
        </BlurView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  const waterGlasses = dashboardData?.water_intake || 0;
  const waterPct = Math.min(1, waterGlasses / WATER_GOAL);

  const workoutsThisWeek: number = dashboardData?.workouts_this_week || 0;
  const workoutsGoal: number = dashboardData?.workouts_goal || 3;
  const workoutPct = Math.min(1, workoutsThisWeek / workoutsGoal);

  const rawWeightHistory: { week_start: string; weight_kg: number | null }[] =
    dashboardData?.weight_history ?? [];
  const hasAnyWeight = rawWeightHistory.some(p => p.weight_kg !== null);

  const consumedCalories = Math.round(todayNutrition?.totals?.calories ?? 0);

  return (
    <ThemedView style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.header}>
        <View style={styles.headerSheen} />
        <View>
          <ThemedText style={styles.greeting}>{getGreeting()},</ThemedText>
          <ThemedText type="title" style={styles.title}>{user?.name}</ThemedText>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </BlurView>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
      >
        {/* Overview */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Overview</ThemedText>

          {/* Calorie ring card */}
          <View style={styles.calorieCardOuter}>
            <BlurView intensity={85} tint="light" style={styles.calorieCard}>
              <View style={styles.glassSheen} />
              <View style={styles.calorieLeft}>
                <CalorieRing consumed={consumedCalories} target={targetCalories} />
              </View>
              <View style={styles.calorieRight}>
                <ThemedText style={styles.calorieCardTitle}>Calories Today</ThemedText>
                <View style={styles.calorieStatRow}>
                  <ThemedText style={styles.calorieStatValue}>{consumedCalories}</ThemedText>
                  <ThemedText style={styles.calorieStatLabel}> consumed</ThemedText>
                </View>
                <View style={styles.calorieStatRow}>
                  <ThemedText style={[styles.calorieStatValue, { color: Colors.textMuted, fontSize: 16 }]}>
                    {Math.max(0, targetCalories - consumedCalories)}
                  </ThemedText>
                  <ThemedText style={styles.calorieStatLabel}> remaining</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.logMealBtn}
                  onPress={() => router.push('/(tabs)/calories')}
                >
                  <Ionicons name="add" size={14} color={Colors.white} />
                  <ThemedText style={styles.logMealBtnText}>Log Meal</ThemedText>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Weight Progress Graph */}
          <View style={styles.weightCardOuter}>
            <BlurView intensity={85} tint="light" style={styles.weightCard}>
              <View style={styles.glassSheen} />
              <View style={styles.weightHeader}>
                <ThemedText style={styles.weightTitle}>Weight Progress</ThemedText>
                <TouchableOpacity onPress={() => router.push('/profile')}>
                  <ThemedText style={styles.logWeightLink}>+ Log Weight</ThemedText>
                </TouchableOpacity>
              </View>
              {hasAnyWeight ? (
                <WeightProgressChart data={rawWeightHistory} width={WEIGHT_CHART_W} />
              ) : (
                <View style={styles.chartEmpty}>
                  <ThemedText style={styles.chartEmptyText}>Log your weight to see progress</ThemedText>
                </View>
              )}
            </BlurView>
          </View>

          <View style={styles.overviewRow}>
            {/* Streak */}
            <View style={styles.overviewCardOuter}>
              <BlurView intensity={85} tint="light" style={styles.overviewCard}>
                <View style={styles.glassSheen} />
                <Ionicons name="flame" size={24} color={Colors.iconStreak} />
                <ThemedText style={styles.cardValue}>{dashboardData?.streak || 0}</ThemedText>
                <ThemedText style={styles.cardLabel}>Day Streak</ThemedText>
              </BlurView>
            </View>

            {/* Workouts this week */}
            <View style={styles.overviewCardOuter}>
              <BlurView intensity={85} tint="light" style={styles.overviewCard}>
                <View style={styles.glassSheen} />
                <Ionicons name="barbell" size={24} color={Colors.primary} />
                <ThemedText style={styles.cardValue}>
                  {workoutsThisWeek}/{workoutsGoal}
                </ThemedText>
                <ThemedText style={styles.cardLabel}>Workouts / week</ThemedText>
                <View style={styles.workoutBarTrack}>
                  <View style={[
                    styles.workoutBarFill,
                    { width: `${workoutPct * 100}%` as any },
                    workoutPct >= 1 && styles.workoutBarComplete,
                  ]} />
                </View>
              </BlurView>
            </View>
          </View>
        </View>

        {/* Today */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Today</ThemedText>

          {/* Water — full width */}
          <View style={styles.waterCardOuter}>
            <BlurView intensity={85} tint="light" style={styles.waterCard}>
              <View style={styles.glassSheen} />
              <View style={[styles.liquidFill, { height: waterPct * 120, backgroundColor: Colors.iconWater + '25' }]} />
              <View style={styles.waterInner}>
                <View style={styles.waterLeft}>
                  <Ionicons name="water" size={26} color={Colors.iconWater} />
                  <View style={styles.waterTextGroup}>
                    <ThemedText style={[styles.cardValue, { color: Colors.iconWater }]}>
                      {waterGlasses}
                      <ThemedText style={styles.cardLabel}> / {WATER_GOAL}</ThemedText>
                    </ThemedText>
                    <ThemedText style={styles.cardLabel}>glasses of water</ThemedText>
                  </View>
                </View>
                <View style={styles.waterControls}>
                  <TouchableOpacity
                    style={styles.waterButton}
                    onPress={() => updateWater(-1)}
                    disabled={!waterGlasses}
                  >
                    <Ionicons name="remove" size={16} color={waterGlasses ? Colors.primary : Colors.inactive} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.waterButton} onPress={() => updateWater(1)}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Apple Health coming soon */}
          <View style={styles.comingSoonCardOuter}>
            <BlurView intensity={85} tint="light" style={styles.comingSoonCard}>
              <View style={styles.glassSheen} />
              <Ionicons name="heart-circle-outline" size={22} color={Colors.danger} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.comingSoonTitle}>Apple Health Sync</ThemedText>
                <ThemedText style={styles.comingSoonSub}>Steps, sleep & calories burned — coming soon</ThemedText>
              </View>
              <View style={styles.comingSoonBadge}>
                <ThemedText style={styles.comingSoonBadgeText}>Soon</ThemedText>
              </View>
            </BlurView>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.60)',
  },
  greeting: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 14,
  },
  // ─── Shared glass sheen ───
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },
  // ─── Calorie ring card ───
  calorieCardOuter: {
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calorieCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  calorieLeft: {
    marginRight: 20,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringCalories: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
  },
  ringLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  calorieRight: {
    flex: 1,
  },
  calorieCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  calorieStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  calorieStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
  },
  calorieStatLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  logMealBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  // ─── Weight chart ───
  weightCardOuter: {
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weightCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  chartEmpty: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  logWeightLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  // ─── Streak / workouts row ───
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewCardOuter: {
    flex: 1,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginVertical: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  workoutBarTrack: {
    width: '80%',
    height: 5,
    backgroundColor: Colors.background,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  workoutBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  workoutBarComplete: {
    backgroundColor: Colors.iconStreak,
  },
  // ─── Water card (full width) ───
  waterCardOuter: {
    borderRadius: 16,
    height: 120,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  waterCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  liquidFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  waterInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  waterTextGroup: {
    gap: 2,
  },
  waterControls: {
    flexDirection: 'row',
    gap: 8,
  },
  waterButton: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  // ─── Coming soon banner ───
  comingSoonCardOuter: {
    borderRadius: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  comingSoonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 2,
  },
  comingSoonSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  comingSoonBadge: {
    backgroundColor: Colors.secondary + '18',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
  },
});
