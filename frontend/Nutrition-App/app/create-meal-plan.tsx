import { useState, useEffect } from 'react';
import {
  StyleSheet, View, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { mealPlanService, nutritionService, FoodItem, MealPlanFood } from '@/src/services';

type Unit = 'g' | 'ml' | 'oz' | 'serving';
const UNITS: { key: Unit; label: string }[] = [
  { key: 'g', label: 'g' }, { key: 'ml', label: 'ml' },
  { key: 'oz', label: 'oz' }, { key: 'serving', label: 'srv' },
];
const toGrams = (v: number, u: Unit) => {
  if (u === 'oz') return v * 28.35;
  if (u === 'serving') return v * 100;
  return v;
};

export default function CreateMealPlanScreen() {
  const router = useRouter();
  const { planId, planName: existingName } = useLocalSearchParams();

  const isEditing = !!planId;
  const [name, setName] = useState((existingName as string) || '');
  const [foods, setFoods] = useState<MealPlanFood[]>([]);

  // food search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [amounts, setAmounts] = useState<{ [k: number]: string }>({});
  const [units, setUnits] = useState<{ [k: number]: Unit }>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) loadExistingFoods();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const t = setTimeout(doSearch, 500);
      return () => clearTimeout(t);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadExistingFoods = async () => {
    try {
      const plans = await mealPlanService.getPlans();
      const plan = plans.find(p => p.id === Number(planId));
      if (plan) setFoods(plan.foods);
    } catch { /* ignore */ }
  };

  const doSearch = async () => {
    setSearching(true);
    try {
      const data = await nutritionService.searchFoods(searchQuery);
      setSearchResults(data.foods || []);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  };

  const getUnit = (fdcId: number): Unit => units[fdcId] ?? 'g';

  const calcNutrients = (food: FoodItem, grams: number) => {
    const n = food.foodNutrients;
    const get = (id: number) => n.find(x => x.nutrientId === id)?.value ?? 0;
    return {
      calories: Math.round((get(1008) * grams) / 100),
      protein:  Math.round((get(1003) * grams) / 100 * 10) / 10,
      carbs:    Math.round((get(1005) * grams) / 100 * 10) / 10,
      fat:      Math.round((get(1004) * grams) / 100 * 10) / 10,
    };
  };

  const addFoodToList = async (food: FoodItem) => {
    const raw = parseFloat(amounts[food.fdcId] || '0');
    if (!(raw > 0)) { setError('Enter an amount first.'); return; }
    const grams = toGrams(raw, getUnit(food.fdcId));
    const n = calcNutrients(food, grams);

    if (isEditing) {
      // Plan already exists in DB — add food immediately
      try {
        const res = await mealPlanService.addFood(Number(planId), {
          food_name: food.description,
          calories: n.calories,
          protein_g: n.protein,
          carbs_g: n.carbs,
          fat_g: n.fat,
          grams,
        });
        setFoods(prev => [...prev, {
          id: res.id,
          food_name: food.description,
          calories: n.calories,
          protein_g: n.protein,
          carbs_g: n.carbs,
          fat_g: n.fat,
          grams,
        }]);
      } catch { setError('Failed to add food.'); }
    } else {
      // New plan — buffer locally until Save
      setFoods(prev => [...prev, {
        id: Date.now(), // temp id
        food_name: food.description,
        calories: n.calories,
        protein_g: n.protein,
        carbs_g: n.carbs,
        fat_g: n.fat,
        grams,
      }]);
    }
    setAmounts(prev => ({ ...prev, [food.fdcId]: '' }));
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const removeFood = async (food: MealPlanFood) => {
    if (isEditing) {
      try {
        await mealPlanService.removeFood(Number(planId), food.id);
      } catch { setError('Failed to remove food.'); return; }
    }
    setFoods(prev => prev.filter(f => f.id !== food.id));
  };

  const savePlan = async () => {
    if (!name.trim()) { setError('Please enter a plan name.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await mealPlanService.updatePlan(Number(planId), name.trim());
      } else {
        const created = await mealPlanService.createPlan(name.trim());
        // now add all buffered foods
        for (const food of foods) {
          await mealPlanService.addFood(created.id, {
            food_name: food.food_name,
            calories: food.calories,
            protein_g: food.protein_g,
            carbs_g: food.carbs_g,
            fat_g: food.fat_g,
            grams: food.grams,
          });
        }
      }
      router.back();
    } catch {
      setError('Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const totals = foods.reduce(
    (acc, f) => ({ cal: acc.cal + f.calories, p: acc.p + f.protein_g, c: acc.c + f.carbs_g }),
    { cal: 0, p: 0, c: 0 }
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {isEditing ? 'Edit Meal Plan' : 'Create Meal Plan'}
        </ThemedText>
        <TouchableOpacity onPress={savePlan} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <ThemedText style={styles.saveBtn}>Save</ThemedText>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Plan name */}
        <TextInput
          style={styles.nameInput}
          placeholder="Meal plan name (e.g. My Breakfast)"
          value={name}
          onChangeText={setName}
          placeholderTextColor={Colors.placeholder}
        />

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {/* Added foods */}
        {foods.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Foods</ThemedText>
              <ThemedText style={styles.totalsText}>
                {Math.round(totals.cal)} kcal · {totals.p.toFixed(1)}g P · {totals.c.toFixed(1)}g C
              </ThemedText>
            </View>
            {foods.map(food => (
              <Swipeable
                key={food.id}
                renderRightActions={() => (
                  <TouchableOpacity style={styles.deleteAction} onPress={() => removeFood(food)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.white} />
                  </TouchableOpacity>
                )}
              >
                <View style={styles.foodRow}>
                  <View style={styles.foodRowLeft}>
                    <ThemedText style={styles.foodRowName} numberOfLines={1}>{food.food_name}</ThemedText>
                    <ThemedText style={styles.foodRowMacros}>
                      {Math.round(food.calories)} kcal · {food.protein_g}g P · {food.carbs_g}g C
                      {food.grams ? ` · ${Math.round(food.grams)}g` : ''}
                    </ThemedText>
                  </View>
                </View>
              </Swipeable>
            ))}
          </View>
        )}

        {/* Food search */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Add Food</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Search food..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.placeholder}
          />
          {searching && <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />}
          {searchResults.map(item => {
            const raw   = parseFloat(amounts[item.fdcId] || '0');
            const unit  = getUnit(item.fdcId);
            const grams = raw > 0 ? toGrams(raw, unit) : 0;
            const nutrients = grams > 0 ? calcNutrients(item, grams) : null;
            return (
              <View key={item.fdcId} style={styles.searchResult}>
                <View style={styles.searchResultInfo}>
                  <ThemedText style={styles.searchResultName} numberOfLines={2}>
                    {item.description}
                  </ThemedText>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="Amt"
                      value={amounts[item.fdcId] || ''}
                      onChangeText={t => setAmounts(prev => ({ ...prev, [item.fdcId]: t }))}
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
                  {nutrients && (
                    <ThemedText style={styles.nutrientText}>
                      {nutrients.calories} kcal · {nutrients.protein}g P · {nutrients.carbs}g C
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => addFoodToList(item)}>
                  <Ionicons name="add" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  saveBtn: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  scroll: { flex: 1 },
  nameInput: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 14,
    borderRadius: 10,
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
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  totalsText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  foodRowLeft: { flex: 1 },
  foodRowName: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  foodRowMacros: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  removeBtn: { padding: 4 },
  searchInput: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  searchResultInfo: { flex: 1, marginRight: 10, gap: 6 },
  searchResultName: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountInput: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 13,
    color: Colors.dark,
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitRow: { flexDirection: 'row', gap: 3 },
  unitPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  unitPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  unitLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  unitLabelActive: { color: Colors.primary, fontWeight: '700' },
  nutrientText: { fontSize: 11, color: Colors.textMuted },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 10,
    marginBottom: 8,
  },
});
