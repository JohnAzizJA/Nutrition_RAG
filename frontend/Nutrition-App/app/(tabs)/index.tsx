import { StyleSheet } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Welcome!</ThemedText>
      <ThemedText style={styles.subtitle}>Your nutrition journey starts here.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9F7F7',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#112D4E',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#3F72AF',
  },
});
