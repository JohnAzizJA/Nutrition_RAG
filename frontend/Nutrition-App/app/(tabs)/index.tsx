import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { useAuth } from '@/src/contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Welcome!</ThemedText>
      <ThemedText style={styles.subtitle}>Your nutrition journey starts here.</ThemedText>
      
      {user && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      )}
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
  logoutButton: {
    marginTop: 30,
    backgroundColor: '#3F72AF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
