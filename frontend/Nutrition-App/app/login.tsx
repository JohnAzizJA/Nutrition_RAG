import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>Login</ThemedText>
      <ThemedText style={styles.subtitle}>Coming soon...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.primary,
  },
});
