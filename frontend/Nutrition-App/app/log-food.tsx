import { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { nutritionService, FoodItem } from '@/src/services';

type Unit = 'g' | 'ml' | 'oz' | 'serving';

const UNITS: { key: Unit; label: string }[] = [
  { key: 'g',       label: 'g' },
  { key: 'ml',      label: 'ml' },
  { key: 'oz',      label: 'oz' },
  { key: 'serving', label: 'srv' },
];

const toGrams = (value: number, unit: Unit): number => {
  switch (unit) {
    case 'oz':      return value * 28.35;
    case 'ml':      return value;
    case 'serving': return value * 100;
    default:        return value;
  }
};

export default function LogFoodScreen() {
  const router = useRouter();
  const { mealType, planId, planFoodMode } = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<{ [key: number]: string }>({});
  const [units, setUnits] = useState<{ [key: number]: Unit }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(searchFoods, 500);
      return () => clearTimeout(timer);
    } else {
      setFoods([]);
    }
  }, [searchQuery]);

  const searchFoods = async () => {
    setLoading(true);
    try {
      const data = await nutritionService.searchFoods(searchQuery);
      setFoods(data.foods || []);
    } catch {
      // silently ignore search errors
    } finally {
      setLoading(false);
    }
  };

  const getUnit = (fdcId: number): Unit => units[fdcId] ?? 'g';

  const calculateNutrients = (food: FoodItem, grams: number) => {
    const n = food.foodNutrients;
    const calories = n.find(x => x.nutrientId === 1008)?.value ?? 0;
    const protein  = n.find(x => x.nutrientId === 1003)?.value ?? 0;
    const carbs    = n.find(x => x.nutrientId === 1005)?.value ?? 0;
    const fat      = n.find(x => x.nutrientId === 1004)?.value ?? 0;
    return {
      calories: Math.round((calories * grams) / 100),
      protein:  Math.round((protein  * grams) / 100 * 10) / 10,
      carbs:    Math.round((carbs    * grams) / 100 * 10) / 10,
      fat:      Math.round((fat      * grams) / 100 * 10) / 10,
    };
  };

  const addFood = async (food: FoodItem) => {
    setError(null);
    const raw = parseFloat(amounts[food.fdcId] || '0');
    if (!(raw > 0)) {
      setError('Enter a valid amount first.');
      return;
    }
    const grams = toGrams(raw, getUnit(food.fdcId));
    const nutrients = calculateNutrients(food, grams);

    try {
      if (planFoodMode === 'true' && planId) {
        // Adding food to a meal plan rather than logging it directly
        const { mealPlanService } = await import('@/src/services');
        await mealPlanService.addFood(Number(planId), {
          food_name: food.description,
          calories: nutrients.calories,
          protein_g: nutrients.protein,
          carbs_g: nutrients.carbs,
          fat_g: nutrients.fat,
          grams,
        });
      } else {
        await nutritionService.logFood({
          food_name: food.description,
          meal_type: (mealType as string) || 'snack',
          grams,
          calories: nutrients.calories,
          protein_g: nutrients.protein,
          carbs_g: nutrients.carbs,
          fat_g: nutrients.fat,
        });
      }
      router.back();
    } catch {
      setError('Failed to add food. Please try again.');
    }
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const raw   = parseFloat(amounts[item.fdcId] || '0');
    const unit  = getUnit(item.fdcId);
    const grams = raw > 0 ? toGrams(raw, unit) : 0;
    const nutrients = grams > 0 ? calculateNutrients(item, grams) : null;
    const showConversion = unit !== 'g' && raw > 0;

    return (
      <View style={styles.foodItem}>
        <View style={styles.foodInfo}>
          <ThemedText style={styles.foodName} numberOfLines={2}>
            {item.description}
          </ThemedText>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              placeholder="Amount"
              value={amounts[item.fdcId] || ''}
              onChangeText={text => setAmounts(prev => ({ ...prev, [item.fdcId]: text }))}
              keyboardType="numeric"
              placeholderTextColor={Colors.placeholder}
            />
            <View style={styles.unitRow}>
              {UNITS.map(u => (
                <TouchableOpacity
                  key={u.key}
                  style={[styles.unitPill, unit === u.key && styles.unitPillActive]}
                  onPress={() => setUnits(prev => ({ ...prev, [item.fdcId]: u.key }))}
                >
                  <ThemedText style={[styles.unitLabel, unit === u.key && styles.unitLabelActive]}>
                    {u.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {showConversion && (
            <ThemedText style={styles.conversionHint}>≈ {Math.round(grams)} g</ThemedText>
          )}

          {nutrients && (
            <ThemedText style={styles.nutrientText}>
              {nutrients.calories} kcal · {nutrients.protein}g P · {nutrients.carbs}g C · {nutrients.fat}g F
            </ThemedText>
          )}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => addFood(item)}>
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  };

  const isPlanMode = planFoodMode === 'true';
  const title = isPlanMode
    ? 'Add to Meal Plan'
    : `Log ${mealType ? (mealType as string).charAt(0).toUpperCase() + (mealType as string).slice(1) : 'Food'}`;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{title}</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for food..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={Colors.placeholder}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <FlatList
        data={foods}
        keyExtractor={item => item.fdcId.toString()}
        renderItem={renderFoodItem}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark },
  searchInput: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.danger + '15',
  },
  errorText: { fontSize: 13, color: Colors.danger, flex: 1 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  list: { flex: 1, paddingHorizontal: 16 },
  foodItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodInfo: { flex: 1, marginRight: 12, gap: 6 },
  foodName: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    color: Colors.dark,
    width: 72,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  unitPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  unitLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  unitLabelActive: { color: Colors.primary, fontWeight: '700' },
  conversionHint: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  nutrientText: { fontSize: 12, color: Colors.textMuted },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
