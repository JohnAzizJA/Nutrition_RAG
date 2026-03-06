import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import axios from '@/src/api/axios';

export default function MetricsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [calculations, setCalculations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalculations();
  }, []);

  const fetchCalculations = async () => {
    try {
      const response = await axios.post('/api/calculate-targets', {
        weight_kg: user?.weight_kg,
        height_cm: user?.height_cm,
        age: user?.age,
        gender: user?.gender,
        activity_level: user?.activity_level,
        goal: user?.goal,
      });
      setCalculations(response.data);
    } catch (error) {
      console.error('Failed to fetch calculations:', error);
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
          <ThemedText style={styles.headerTitle}>My Metrics</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  const metrics = [
    { label: 'Age', value: `${user?.age || 0} years`, icon: 'calendar-outline' },
    { label: 'Gender', value: user?.gender || 'N/A', icon: 'person-outline' },
    { label: 'Weight', value: `${user?.weight_kg || 0} kg`, icon: 'fitness-outline' },
    { label: 'Height', value: `${user?.height_cm || 0} cm`, icon: 'resize-outline' },
    { label: 'Activity Level', value: user?.activity_level?.replace(/_/g, ' ') || 'N/A', icon: 'walk-outline' },
    { label: 'BMI', value: calculations?.bmi || 'N/A', icon: 'analytics-outline' },
    { label: 'BMR', value: `${calculations?.bmr || 0} kcal/day`, icon: 'speedometer-outline' },
    { label: 'TDEE', value: `${calculations?.tdee || 0} kcal/day`, icon: 'flash-outline' },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Metrics</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.metricLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name={metric.icon as any} size={24} color={Colors.primary} />
              </View>
              <View>
                <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
                <ThemedText style={styles.metricValue}>{metric.value}</ThemedText>
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
  metricCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
    textTransform: 'capitalize',
  },
});
