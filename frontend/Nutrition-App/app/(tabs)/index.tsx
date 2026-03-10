import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { dashboardService, nutritionService } from '@/src/services';

const { width } = Dimensions.get('window');
const WATER_GOAL = 8;
const CARD_HEIGHT = 140;

export default function HomeScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayNutrition, setTodayNutrition] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [dashboardData, nutritionData] = await Promise.all([
        dashboardService.getDashboard(),
        nutritionService.getDailyNutrition(today)
      ]);
      setDashboardData(dashboardData);
      setTodayNutrition(nutritionData);
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
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Dashboard</ThemedText>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  const waterGlasses = dashboardData?.water_intake || 0;
  const waterPct = Math.min(1, waterGlasses / WATER_GOAL);

  const protein = todayNutrition?.totals?.protein_g || 0;
  const carbs = todayNutrition?.totals?.carbs_g || 0;
  const fat = todayNutrition?.totals?.fat_g || 0;
  const macroTotal = protein + carbs + fat || 1;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Dashboard</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Overview Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Overview</ThemedText>

          {/* Weight Progress */}
          <View style={styles.weightGraphContainer}>
            <View style={styles.weightHeader}>
              <ThemedText style={styles.weightText}>Current: {user?.weight_kg || 0} kg</ThemedText>
              <ThemedText style={styles.goalText}>Goal: {user?.goal_weight_kg || 0} kg</ThemedText>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, ((user?.weight_kg || 0) / (user?.goal_weight_kg || 1)) * 100))}%` }
              ]} />
            </View>
            <ThemedText style={styles.progressText}>
              {user?.goal === 'lose_weight'
                ? `${Math.max(0, (user?.weight_kg || 0) - (user?.goal_weight_kg || 0)).toFixed(1)} kg to go`
                : `Progress: ${((user?.weight_kg || 0) / (user?.goal_weight_kg || 1) * 100).toFixed(0)}%`
              }
            </ThemedText>
          </View>

          <View style={styles.overviewRow}>
            <View style={styles.overviewCard}>
              <Ionicons name="flame" size={24} color={Colors.iconStreak} />
              <ThemedText style={styles.cardValue}>{dashboardData?.streak || 0}</ThemedText>
              <ThemedText style={styles.cardLabel}>Day Streak</ThemedText>
            </View>
            <View style={styles.overviewCard}>
              <Ionicons name="barbell" size={24} color={Colors.primary} />
              <ThemedText style={styles.cardValue}>0</ThemedText>
              <ThemedText style={styles.cardLabel}>Workouts</ThemedText>
            </View>
          </View>
        </View>

        {/* Today Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Today</ThemedText>

          <View style={styles.todayGrid}>
            {/* Water Intake — liquid fill */}
            <View style={styles.todayCard}>
              <View style={[styles.liquidFill, { height: waterPct * CARD_HEIGHT, backgroundColor: Colors.iconWater + '30' }]} />
              <View style={styles.cardInner}>
                <Ionicons name="water" size={22} color={Colors.iconWater} />
                <ThemedText style={[styles.cardValue, { color: Colors.iconWater }]}>{waterGlasses}</ThemedText>
                <ThemedText style={styles.cardLabel}>/ {WATER_GOAL} glasses</ThemedText>
                <View style={styles.waterControls}>
                  <TouchableOpacity
                    style={styles.waterButton}
                    onPress={() => updateWater(-1)}
                    disabled={!waterGlasses}
                  >
                    <Ionicons name="remove" size={14} color={waterGlasses ? Colors.primary : Colors.inactive} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.waterButton}
                    onPress={() => updateWater(1)}
                  >
                    <Ionicons name="add" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Macro Breakdown */}
            <View style={styles.todayCard}>
              <View style={styles.cardInner}>
                <Ionicons name="nutrition" size={22} color={Colors.iconNutrition} />
                <View style={styles.macroBreakdown}>
                  {[
                    { label: 'Protein', value: protein, color: Colors.iconProtein },
                    { label: 'Carbs',   value: carbs,   color: Colors.iconCarbs },
                    { label: 'Fats',    value: fat,     color: Colors.iconFats },
                  ].map(({ label, value, color }) => (
                    <View key={label} style={styles.macroRow}>
                      <View style={[styles.macroDot, { backgroundColor: color }]} />
                      <ThemedText style={[styles.macroLabel, { color }]}>{value}g</ThemedText>
                      <View style={styles.macroBarTrack}>
                        <View style={[styles.macroBarFill, { width: `${(value / macroTotal) * 100}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Steps */}
            <View style={styles.todayCard}>
              <View style={styles.cardInner}>
                <Ionicons name="footsteps" size={22} color={Colors.iconSteps} />
                <ThemedText style={styles.cardValue}>0</ThemedText>
                <ThemedText style={styles.cardLabel}>Steps</ThemedText>
              </View>
            </View>

            {/* Calories Burned */}
            <View style={styles.todayCard}>
              <View style={styles.cardInner}>
                <Ionicons name="flame" size={22} color={Colors.iconCalories} />
                <ThemedText style={styles.cardValue}>0</ThemedText>
                <ThemedText style={styles.cardLabel}>Burned</ThemedText>
              </View>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  weightGraphContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weightText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  todayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  todayCard: {
    width: '47%',
    height: CARD_HEIGHT,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cardInner: {
    alignItems: 'center',
    zIndex: 1,
    width: '100%',
    paddingHorizontal: 12,
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
  waterControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  waterButton: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  macroBreakdown: {
    width: '100%',
    marginTop: 8,
    gap: 6,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 32,
  },
  macroBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
