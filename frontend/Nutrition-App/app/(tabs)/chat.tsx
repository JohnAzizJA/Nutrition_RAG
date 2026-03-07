import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { chatService, ConversationSummary } from '@/src/services';
import { useAuth } from '@/src/contexts/AuthContext';
import { Swipeable } from 'react-native-gesture-handler';

export default function ChatScreen() {
  const router = useRouter();
  const { isLoading: authLoading, logout } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        loadConversations();
      }
    }, [authLoading])
  );

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    router.push('/conversation?new=true');
  };

  const handleOpenChat = (threadId: string) => {
    router.push(`/conversation?threadId=${threadId}`);
  };

  const deleteConversation = async (threadId: string) => {
    try {
      await chatService.deleteConversation(threadId);
      loadConversations();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete conversation');
    }
  };

  const renderDeleteAction = (threadId: string) => (
    <TouchableOpacity 
      style={styles.deleteAction}
      onPress={() => deleteConversation(threadId)}
    >
      <Ionicons name="trash" size={20} color={Colors.white} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Chats</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.secondary} />
          <ThemedText style={styles.emptyText}>No conversations yet</ThemedText>
          <TouchableOpacity style={styles.startButton} onPress={handleNewChat}>
            <ThemedText style={styles.startButtonText}>Start a conversation</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.thread_id}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={() => renderDeleteAction(item.thread_id)}
              >
                <TouchableOpacity
                  style={styles.conversationItem}
                  onPress={() => handleOpenChat(item.thread_id)}
                >
                  <View style={styles.conversationContent}>
                    <ThemedText style={styles.conversationPreview} numberOfLines={2}>
                      {item.last_message}
                    </ThemedText>
                    <ThemedText style={styles.conversationTime}>
                      {new Date(item.last_message_time).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.dark} />
                </TouchableOpacity>
              </Swipeable>
            )}
          />
          
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={handleNewChat}
          >
            <Ionicons name="add" size={28} color={Colors.white} />
          </TouchableOpacity>
        </>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark,
    marginTop: 16,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  conversationContent: {
    flex: 1,
    marginRight: 12,
  },
  conversationPreview: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: 12,
    color: Colors.secondary,
  },
  newChatButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  deleteAction: {
    backgroundColor: '#EF5350',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 20,
  },
});
