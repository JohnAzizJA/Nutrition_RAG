import { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import axios from '@/src/api/axios';

interface FoodItem {
  fdcId: number;
  description: string;
  foodNutrients: Array<{
    nutrientId: number;
    value: number;
  }>;
}

export default function LogFoodScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [weights, setWeights] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => {
        searchFoods();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFoods([]);
    }
  }, [searchQuery]);

  const searchFoods = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/search-foods?query=${searchQuery}`);
      setFoods(response.data.foods || []);
    } catch (error) {
      console.error('Failed to search foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNutrients = (food: FoodItem, grams: number) => {
    const nutrients = food.foodNutrients;
    const calories = nutrients.find(n => n.nutrientId === 1008)?.value || 0;
    const protein = nutrients.find(n => n.nutrientId === 1003)?.value || 0;
    const carbs = nutrients.find(n => n.nutrientId === 1005)?.value || 0;
    const fat = nutrients.find(n => n.nutrientId === 1004)?.value || 0;

    return {
      calories: Math.round((calories * grams) / 100),
      protein: Math.round((protein * grams) / 100 * 10) / 10,
      carbs: Math.round((carbs * grams) / 100 * 10) / 10,
      fat: Math.round((fat * grams) / 100 * 10) / 10,
    };
  };

  const addFood = async (food: FoodItem) => {
    const grams = parseFloat(weights[food.fdcId] || '0');
    if (grams <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    const nutrients = calculateNutrients(food, grams);
    
    try {
      await axios.post('/api/log-food', {
        food_name: food.description,
        grams: grams,
        calories: nutrients.calories,
        protein_g: nutrients.protein,
        carbs_g: nutrients.carbs,
        fat_g: nutrients.fat,
      });
      
      Alert.alert('Success', 'Food logged successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to log food');
    }
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const grams = parseFloat(weights[item.fdcId] || '0');
    const nutrients = grams > 0 ? calculateNutrients(item, grams) : null;

    return (
      <View style={styles.foodItem}>
        <View style={styles.foodInfo}>
          <ThemedText style={styles.foodName} numberOfLines={2}>
            {item.description}
          </ThemedText>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="Weight (g)"
              value={weights[item.fdcId] || ''}
              onChangeText={(text) => setWeights(prev => ({...prev, [item.fdcId]: text}))}
              keyboardType="numeric"
              placeholderTextColor={Colors.secondary}
            />
            
            {nutrients && (
              <View style={styles.nutrients}>
                <ThemedText style={styles.nutrientText}>
                  {nutrients.calories} kcal | {nutrients.protein}g P | {nutrients.carbs}g C | {nutrients.fat}g F
                </ThemedText>
              </View>
            )}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => addFood(item)}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Log Food</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for food..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={Colors.secondary}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <FlatList
        data={foods}
        keyExtractor={(item) => item.fdcId.toString()}
        renderItem={renderFoodItem}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
  searchInput: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  foodItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
    marginRight: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightInput: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: Colors.dark,
    minWidth: 80,
    textAlign: 'center',
  },
  nutrients: {
    flex: 1,
  },
  nutrientText: {
    fontSize: 12,
    color: Colors.secondary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});