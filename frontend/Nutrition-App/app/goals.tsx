import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import axios from '@/src/api/axios';

export default function GoalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await axios.post('/api/calculate-targets', {
        weight_kg: user?.weight_kg,
        height_cm: user?.height_cm,
        age: user?.age,
        gender: user?.gender,
        activity_level: user?.activity_level,
        goal: user?.goal,
      });
      setTargets(response.data);
    } catch (error) {
      console.error('Failed to fetch targets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Goals</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  const goals = [
    { label: 'Goal', value: user?.goal?.replace(/_/g, ' ') || 'N/A', icon: 'flag-outline', color: Colors.primary },
    { label: 'Daily Calories', value: `${targets?.target_calories || 0} kcal`, icon: 'flame-outline', color: '#FF6B6B' },
    { label: 'Protein', value: `${targets?.target_protein_g || 0} g`, icon: 'nutrition-outline', color: '#4ECDC4' },
    { label: 'Carbs', value: `${targets?.target_carbs_g || 0} g`, icon: 'leaf-outline', color: '#95E1D3' },
    { label: 'Fats', value: `${targets?.target_fat_g || 0} g`, icon: 'water-outline', color: '#FFD93D' },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Goals</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {goals.map((goal, index) => (
          <View key={index} style={styles.goalCard}>
            <View style={styles.goalLeft}>
              <View style={[styles.iconContainer, { backgroundColor: goal.color + '20' }]}>
                <Ionicons name={goal.icon as any} size={24} color={goal.color} />
              </View>
              <View>
                <ThemedText style={styles.goalLabel}>{goal.label}</ThemedText>
                <ThemedText style={styles.goalValue}>{goal.value}</ThemedText>
              </View>
            </View>
          </View>
        ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  goalCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    textTransform: 'capitalize',
  },
});
