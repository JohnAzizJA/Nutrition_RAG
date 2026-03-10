import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { calculationService, nutritionService } from '@/src/services';
import { Swipeable } from 'react-native-gesture-handler';

export default function CaloriesScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [targets, setTargets] = useState<any>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [selectedDate])
  );

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7)); // Apply week offset
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDayAbbr = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const fetchData = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
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
        nutritionService.getDailyNutrition(dateStr)
      ]);
      setTargets(targetsData);
      setNutrition(nutritionData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId: number) => {
    try {
      await nutritionService.deleteMeal(mealId);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete meal');
    }
  };

  const renderDeleteAction = (mealId: number) => (
    <TouchableOpacity 
      style={styles.deleteAction}
      onPress={() => deleteMeal(mealId)}
    >
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

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
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Date Selector */}
        <View style={styles.dateContainer}>
          <View style={styles.dateHeader}>
            <TouchableOpacity onPress={() => {
              const newOffset = weekOffset - 1;
              setWeekOffset(newOffset);
              // Calculate new week days with updated offset
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + (newOffset * 7));
              const lastDay = new Date(startOfWeek);
              lastDay.setDate(startOfWeek.getDate() + 6);
              setSelectedDate(lastDay);
            }}>
              <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <ThemedText style={styles.dateText}>{formatDate(selectedDate)}</ThemedText>
            <TouchableOpacity onPress={() => {
              const newOffset = weekOffset + 1;
              setWeekOffset(newOffset);
              // Calculate new week days with updated offset
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + (newOffset * 7));
              setSelectedDate(startOfWeek);
            }}>
              <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekContainer}>
            {getWeekDays().map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCircle,
                  isSelected(day) && styles.dayCircleSelected,
                  isToday(day) && styles.dayCircleToday
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <ThemedText style={[
                  styles.dayText,
                  isSelected(day) && styles.dayTextSelected
                ]}>
                  {getDayAbbr(day)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      
      <View style={styles.macroGrid}>
        {[
          { label: 'Calories', current: nutrition?.totals?.calories || 0, target: targets?.target_calories || 0, unit: 'kcal', color: Colors.iconCalories },
          { label: 'Protein',  current: nutrition?.totals?.protein_g || 0, target: targets?.target_protein_g || 0, unit: 'g', color: Colors.iconProtein },
          { label: 'Carbs',    current: nutrition?.totals?.carbs_g || 0,   target: targets?.target_carbs_g || 0,   unit: 'g', color: Colors.iconCarbs },
          { label: 'Fats',     current: nutrition?.totals?.fat_g || 0,     target: targets?.target_fat_g || 0,     unit: 'g', color: Colors.iconFats },
        ].map(({ label, current, target, unit, color }) => {
          const pct = target > 0 ? Math.min(1, current / target) : 0;
          const isOver = target > 0 && current > target;
          const fillColor = isOver ? Colors.danger : color;
          return (
            <View key={label} style={styles.macroBox}>
              {/* Liquid fill — rises from bottom */}
              <View style={[styles.macroFill, { height: pct * 140, backgroundColor: fillColor + '30' }]} />
              {/* Content above fill */}
              <View style={styles.macroContent}>
                <ThemedText style={[styles.macroValue, { color: fillColor }]}>{current}</ThemedText>
                <ThemedText style={styles.macroGoal}>/ {target} {unit}</ThemedText>
                <ThemedText style={styles.macroLabel}>{label}</ThemedText>
              </View>
            </View>
          );
        })}
      </View>
      
      {nutrition?.meals?.length > 0 ? (
        <View style={styles.mealsSection}>
          {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((mealType) => {
            const mealItems = nutrition.meals.filter((meal: any) => meal.meal_type === mealType.toLowerCase());
            return (
              <View key={mealType} style={styles.mealTypeSection}>
                <View style={styles.mealTypeHeader}>
                  <ThemedText style={styles.mealTypeTitle}>{mealType}</ThemedText>
                  <TouchableOpacity 
                    style={styles.addMealButton}
                    onPress={() => router.push(`/log-food?mealType=${mealType.toLowerCase()}`)}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                {mealItems.length > 0 ? (
                  mealItems.map((meal: any) => (
                    <Swipeable
                      key={meal.id}
                      renderRightActions={() => renderDeleteAction(meal.id)}
                    >
                      <View style={styles.mealItem}>
                        <ThemedText style={styles.mealName}>{meal.food_name}</ThemedText>
                        <ThemedText style={styles.mealNutrients}>
                          {meal.calories} kcal | {meal.protein_g}g P | {meal.carbs_g}g C | {meal.fat_g}g F
                        </ThemedText>
                      </View>
                    </Swipeable>
                  ))
                ) : (
                  <View style={styles.emptyMealState}>
                    <ThemedText style={styles.emptyMealText}>No {mealType.toLowerCase()} logged</ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.mealsSection}>
          {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((mealType) => (
            <View key={mealType} style={styles.mealTypeSection}>
              <View style={styles.mealTypeHeader}>
                <ThemedText style={styles.mealTypeTitle}>{mealType}</ThemedText>
                <TouchableOpacity 
                  style={styles.addMealButton}
                  onPress={() => router.push(`/log-food?mealType=${mealType.toLowerCase()}`)}
                >
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.emptyMealState}>
                <ThemedText style={styles.emptyMealText}>No {mealType.toLowerCase()} logged</ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}
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
    height: 140,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  macroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  macroValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 34,
  },
  macroGoal: {
    fontSize: 14,
    color: Colors.textMuted,
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
    color: Colors.textMuted,
  },
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  dayCircleSelected: {
    backgroundColor: Colors.primary,
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  dayTextSelected: {
    color: Colors.white,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 8,
  },
  mealTypeSection: {
    marginBottom: 20,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  addMealButton: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  emptyMealState: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyMealText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
