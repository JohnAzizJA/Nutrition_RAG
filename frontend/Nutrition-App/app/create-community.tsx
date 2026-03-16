import { useState } from 'react';
import {
  StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { communityService } from '@/src/services/communityService';
import { getErrorMessage } from '@/src/utils/errorUtils';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimName = name.trim();
    if (!trimName) {
      Alert.alert('Validation', 'Community name is required.');
      return;
    }
    setLoading(true);
    try {
      const community = await communityService.createCommunity({
        name: trimName,
        description: description.trim() || undefined,
      });
      router.replace({ pathname: '/community/[id]', params: { id: community.id } });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Failed to create community. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.header}>
        <View style={styles.headerSheen} />
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>New Community</ThemedText>
        <View style={{ width: 24 }} />
      </BlurView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <ThemedText style={styles.label}>Community Name *</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Morning Warriors"
              placeholderTextColor={Colors.placeholder}
              maxLength={100}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Description (optional)</ThemedText>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's this community about?"
              placeholderTextColor={Colors.placeholder}
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <ThemedText style={styles.createBtnText}>
              {loading ? 'Creating...' : 'Create Community'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.60)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark,
  },
  textarea: {
    height: 100,
    paddingTop: 14,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
