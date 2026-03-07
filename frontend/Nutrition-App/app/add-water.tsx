import { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import axios from '@/src/api/axios';

export default function AddWaterScreen() {
  const router = useRouter();
  const [glasses, setGlasses] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddWater = async () => {
    const glassCount = parseInt(glasses);
    if (!glassCount || glassCount <= 0) {
      Alert.alert('Error', 'Please enter a valid number of glasses');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/add-water', { glasses: glassCount });
      Alert.alert('Success', `Added ${glassCount} glasses of water`);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to add water');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add Water</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="water" size={64} color="#4FC3F7" />
        </View>
        
        <ThemedText style={styles.title}>How many glasses?</ThemedText>
        
        <TextInput
          style={styles.input}
          value={glasses}
          onChangeText={setGlasses}
          placeholder="Enter number of glasses"
          keyboardType="numeric"
          placeholderTextColor={Colors.secondary}
          autoFocus
        />
        
        <TouchableOpacity
          style={[styles.addButton, loading && styles.buttonDisabled]}
          onPress={handleAddWater}
          disabled={loading}
        >
          <ThemedText style={styles.addButtonText}>
            {loading ? 'Adding...' : 'Add Water'}
          </ThemedText>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: Colors.dark,
    textAlign: 'center',
    minWidth: 200,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});