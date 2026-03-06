import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import axios from '@/src/api/axios';

export default function CaloriesScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [targets, setTargets] = useState<any>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [targetsResponse, nutritionResponse] = await Promise.all([
        axios.post('/api/calculate-targets', {
          weight_kg: user?.weight_kg,
          height_cm: user?.height_cm,
          age: user?.age,
          gender: user?.gender,
          activity_level: user?.activity_level,
          goal: user?.goal,
        }),
        axios.get('/api/daily-nutrition')
      ]);
      setTargets(targetsResponse.data);
      setNutrition(nutritionResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Calorie Tracker</ThemedText>
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
        <ThemedText type="title" style={styles.title}>Calorie Tracker</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.macroGrid}>
        <View style={styles.macroBox}>
          <ThemedText style={styles.macroValue}>{nutrition?.totals?.calories || 0}</ThemedText>
          <ThemedText style={styles.macroGoal}>/ {targets?.target_calories || 0} kcal</ThemedText>
          <ThemedText style={styles.macroLabel}>Calories</ThemedText>
        </View>
        
        <View style={styles.macroBox}>
          <ThemedText style={styles.macroValue}>{nutrition?.totals?.protein_g || 0}</ThemedText>
          <ThemedText style={styles.macroGoal}>/ {targets?.target_protein_g || 0} g</ThemedText>
          <ThemedText style={styles.macroLabel}>Protein</ThemedText>
        </View>
        
        <View style={styles.macroBox}>
          <ThemedText style={styles.macroValue}>{nutrition?.totals?.carbs_g || 0}</ThemedText>
          <ThemedText style={styles.macroGoal}>/ {targets?.target_carbs_g || 0} g</ThemedText>
          <ThemedText style={styles.macroLabel}>Carbs</ThemedText>
        </View>
        
        <View style={styles.macroBox}>
          <ThemedText style={styles.macroValue}>{nutrition?.totals?.fat_g || 0}</ThemedText>
          <ThemedText style={styles.macroGoal}>/ {targets?.target_fat_g || 0} g</ThemedText>
          <ThemedText style={styles.macroLabel}>Fats</ThemedText>
        </View>
      </View>
      
      {nutrition?.meals?.length > 0 && (
        <View style={styles.mealsSection}>
          <ThemedText style={styles.sectionTitle}>Today's Foods</ThemedText>
          {nutrition.meals.map((meal: any) => (
            <View key={meal.id} style={styles.mealItem}>
              <ThemedText style={styles.mealName}>{meal.food_name}</ThemedText>
              <ThemedText style={styles.mealNutrients}>
                {meal.calories} kcal | {meal.protein_g}g P | {meal.carbs_g}g C | {meal.fat_g}g F
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  macroBox: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  macroValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
    lineHeight: 34,
  },
  macroGoal: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  mealsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  mealItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  mealNutrients: {
    fontSize: 14,
    color: Colors.secondary,
  },
});
