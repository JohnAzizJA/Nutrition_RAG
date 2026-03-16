import { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { communityService, Community } from '@/src/services/communityService';

export default function CommunityScreen() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunities = useCallback(async () => {
    try {
      const data = await communityService.listCommunities();
      setCommunities(data);
    } catch (err) {
      console.error('Failed to fetch communities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCommunities();
    }, [fetchCommunities])
  );

  const renderCommunity = ({ item }: { item: Community }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.cardOuter}>
        <BlurView intensity={85} tint="light" style={styles.card}>
          <View style={styles.glassSheen} />
          <View style={styles.cardIcon}>
            <Ionicons name="people" size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
            {item.description ? (
              <ThemedText style={styles.cardDesc} numberOfLines={2}>{item.description}</ThemedText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </BlurView>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.header}>
        <View style={styles.headerSheen} />
        <ThemedText type="title" style={styles.title}>Community</ThemedText>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.dark} />
        </TouchableOpacity>
      </BlurView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : communities.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={Colors.inactive} />
          <ThemedText style={styles.emptyTitle}>No Communities</ThemedText>
          <ThemedText style={styles.emptyText}>
            Create a community or ask a friend to add you.
          </ThemedText>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/create-community')}
          >
            <ThemedText style={styles.emptyBtnText}>Create Community</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={communities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCommunity}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/create-community')}
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
  headerSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.60)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 12,
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.12)',
  },
  cardOuter: {
    borderRadius: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
