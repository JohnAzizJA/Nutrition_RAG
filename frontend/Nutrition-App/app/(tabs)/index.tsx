import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import axios from '@/src/api/axios';

const { width } = Dimensions.get('window');

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
      const [dashboardResponse, nutritionResponse] = await Promise.all([
        axios.get('/api/dashboard'),
        axios.get(`/api/daily-nutrition?date=${today}`)
      ]);
      setDashboardData(dashboardResponse.data);
      setTodayNutrition(nutritionResponse.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Dashboard</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Overview Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Overview</ThemedText>
          
          {/* Weight Trend Graph Placeholder */}
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
            {/* Logging Streak */}
            <View style={styles.overviewCard}>
              <Ionicons name="flame" size={24} color="#FF6B35" />
              <ThemedText style={styles.cardValue}>{dashboardData?.streak || 0}</ThemedText>
              <ThemedText style={styles.cardLabel}>Day Streak</ThemedText>
            </View>
            
            {/* Workouts This Week */}
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
            {/* Water Intake */}
            <View style={styles.todayCard}>
              <Ionicons name="water" size={24} color="#4FC3F7" />
              <ThemedText style={styles.cardValue}>{dashboardData?.water_intake || 0}</ThemedText>
              <ThemedText style={styles.cardLabel}>Glasses</ThemedText>
            </View>
            
            {/* Macro Breakdown */}
            <View style={styles.todayCard}>
              <Ionicons name="nutrition" size={24} color="#66BB6A" />
              <View style={styles.macroBreakdown}>
                <ThemedText style={styles.macroLine}>P: {todayNutrition?.totals?.protein_g || 0}g</ThemedText>
                <ThemedText style={styles.macroLine}>C: {todayNutrition?.totals?.carbs_g || 0}g</ThemedText>
                <ThemedText style={styles.macroLine}>F: {todayNutrition?.totals?.fat_g || 0}g</ThemedText>
              </View>
            </View>
            
            {/* Steps */}
            <View style={styles.todayCard}>
              <Ionicons name="footsteps" size={24} color="#FFA726" />
              <ThemedText style={styles.cardValue}>0</ThemedText>
              <ThemedText style={styles.cardLabel}>Steps</ThemedText>
            </View>
            
            {/* Calories Burned */}
            <View style={styles.todayCard}>
              <Ionicons name="flame" size={24} color="#EF5350" />
              <ThemedText style={styles.cardValue}>0</ThemedText>
              <ThemedText style={styles.cardLabel}>Burned</ThemedText>
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
    color: Colors.secondary,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginVertical: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
  },
  macroLine: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
    marginVertical: 1,
  },
});