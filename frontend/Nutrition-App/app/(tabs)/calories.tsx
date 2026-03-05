import { StyleSheet } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';

export default function CaloriesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Calorie Tracker</ThemedText>
      <ThemedText style={styles.subtitle}>Monitor your daily nutrition</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary,
  },
});
