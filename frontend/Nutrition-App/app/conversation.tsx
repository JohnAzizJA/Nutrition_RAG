import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { chatService, Message } from '@/src/services';

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 150),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      <View style={styles.typingDots}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const router = useRouter();
  const { threadId, new: isNew } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentThreadId = useRef<string | null>(threadId as string || null);

  useEffect(() => {
    if (threadId && !isNew) {
      loadMessages();
    }
  }, [threadId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await chatService.getConversationHistory(threadId as string);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = inputText.trim();
    setInputText('');
    setSending(true);

    const tempUserMsg: Message = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await chatService.sendMessage({
        message: userMessage,
        thread_id: currentThreadId.current || undefined,
      });

      if (!currentThreadId.current) {
        currentThreadId.current = response.thread_id;
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>AI Coach</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.aiAvatar}>
              <Ionicons name="leaf" size={16} color={Colors.white} />
            </View>
            <ThemedText style={styles.headerTitle}>AI Coach</ThemedText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        {messages.length === 0 && !sending ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyAvatar}>
              <Ionicons name="leaf" size={40} color={Colors.white} />
            </View>
            <ThemedText style={styles.emptyTitle}>Hi, I'm your AI Coach</ThemedText>
            <ThemedText style={styles.emptySubtitle}>Ask me anything about nutrition, workouts, or your goals.</ThemedText>
            <View style={styles.suggestionsContainer}>
              {[
                'What should I eat for breakfast?',
                'How much protein do I need?',
                'Suggest a workout plan for me',
              ].map((s) => (
                <TouchableOpacity key={s} style={styles.suggestion} onPress={() => setInputText(s)}>
                  <ThemedText style={styles.suggestionText}>{s}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View style={item.role === 'user' ? styles.userRow : styles.aiRow}>
                {item.role === 'assistant' && (
                  <View style={styles.aiBubbleAvatar}>
                    <Ionicons name="leaf" size={12} color={Colors.white} />
                  </View>
                )}
                <View style={styles.bubbleWrapper}>
                  <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                    <ThemedText style={[styles.messageText, item.role === 'user' ? styles.userText : styles.aiText]}>
                      {item.content}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.timestamp, item.role === 'user' ? styles.timestampRight : styles.timestampLeft]}>
                    {formatTime(item.created_at)}
                  </ThemedText>
                </View>
              </View>
            )}
            ListFooterComponent={sending ? <TypingIndicator /> : null}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about nutrition..."
            placeholderTextColor={Colors.placeholder}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
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
    borderBottomColor: Colors.border,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: '30%',
    padding: 32,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 8,
  },
  suggestion: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 6,
  },
  aiBubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bubbleWrapper: {
    maxWidth: '78%',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: Colors.white,
  },
  aiText: {
    color: Colors.dark,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  timestampRight: {
    textAlign: 'right',
  },
  timestampLeft: {
    textAlign: 'left',
    marginLeft: 4,
  },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    marginBottom: 12,
    marginLeft: 30,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: Colors.dark,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
