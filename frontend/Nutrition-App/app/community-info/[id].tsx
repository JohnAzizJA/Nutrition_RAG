import { useState, useCallback } from 'react';
import {
  StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, KeyboardAvoidingView, Platform, Modal, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Colors } from '@/constants/theme';
import { communityService, CommunityInfo, CommunityMember } from '@/src/services/communityService';
import { useAuth } from '@/src/contexts/AuthContext';

export default function CommunityInfoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = Number(id);
  const { user } = useAuth();

  const [info, setInfo] = useState<CommunityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);


  const loadInfo = useCallback(async () => {
    try {
      const data = await communityService.getCommunityInfo(communityId);
      setInfo(data);
    } catch (err) {
      console.error('Failed to load community info:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadInfo();
    }, [loadInfo])
  );

  const handleAddMember = async () => {
    const uname = addUsername.trim();
    if (!uname) return;
    setAdding(true);
    try {
      await communityService.addMember(communityId, uname);
      setAddUsername('');
      setShowAddModal(false);
      loadInfo();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Could not add member.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = (member: CommunityMember) => {
    const isSelf = user?.id === member.user_id;
    Alert.alert(
      isSelf ? 'Leave Community' : 'Remove Member',
      isSelf
        ? 'Are you sure you want to leave this community?'
        : `Remove ${member.username} from this community?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSelf ? 'Leave' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityService.removeMember(communityId, member.user_id);
              if (isSelf) {
                router.replace('/(tabs)/community');
              } else {
                loadInfo();
              }
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to remove member.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCommunity = () => {
    Alert.alert(
      'Delete Community',
      'This will permanently delete the community and all its data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityService.deleteCommunity(communityId);
              router.replace('/(tabs)/community');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to delete community.');
            }
          },
        },
      ]
    );
  };

  const isCreator = info?.creator_id === user?.id;

  const renderMember = ({ item }: { item: CommunityMember }) => {
    const isSelf = user?.id === item.user_id;
    const canRemove = isSelf || isCreator;
    return (
      <View style={styles.memberRow}>
        <View style={styles.memberAvatar}>
          <ThemedText style={styles.memberAvatarText}>
            {item.username.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.memberInfo}>
          <ThemedText style={styles.memberName}>
            {item.username}{isSelf ? ' (you)' : ''}
            {item.user_id === info?.creator_id ? ' 👑' : ''}
          </ThemedText>
          <ThemedText style={styles.memberJoined}>
            Joined {new Date(item.joined_at).toLocaleDateString()}
          </ThemedText>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={() => handleRemoveMember(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isSelf ? 'exit-outline' : 'remove-circle-outline'}
              size={22}
              color={Colors.danger}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading || !info) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Community Info</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Community Info</ThemedText>
        {isCreator ? (
          <TouchableOpacity onPress={handleDeleteCommunity}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <FlatList
        data={info.members}
        keyExtractor={(item) => item.user_id.toString()}
        renderItem={renderMember}
        ListHeaderComponent={
          <>
            {/* Community details */}
            <View style={styles.detailCard}>
              <View style={styles.communityIcon}>
                <Ionicons name="people" size={32} color={Colors.primary} />
              </View>
              <ThemedText style={styles.communityName}>{info.name}</ThemedText>
              {info.description ? (
                <ThemedText style={styles.communityDesc}>{info.description}</ThemedText>
              ) : null}
              <ThemedText style={styles.memberCount}>
                {info.members.length} member{info.members.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>

            {/* Members header + add button */}
            <View style={styles.membersHeader}>
              <ThemedText style={styles.membersTitle}>Members</ThemedText>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="person-add-outline" size={16} color={Colors.white} />
                <ThemedText style={styles.addBtnText}>Add</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add member modal */}
      <Modal transparent visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)}>
            <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
              <ThemedText style={styles.modalTitle}>Add Member by Username</ThemedText>
              <TextInput
                style={styles.modalInput}
                value={addUsername}
                onChangeText={setAddUsername}
                placeholder="Enter username"
                placeholderTextColor={Colors.placeholder}
                autoFocus
                autoCapitalize="none"
                onSubmitEditing={handleAddMember}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => { setShowAddModal(false); setAddUsername(''); }}
                >
                  <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirm, adding && styles.modalConfirmDisabled]}
                  onPress={handleAddMember}
                  disabled={adding}
                >
                  <ThemedText style={styles.modalConfirmText}>
                    {adding ? 'Adding...' : 'Add'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: Colors.white,
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  communityIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  communityName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark,
    textAlign: 'center',
  },
  communityDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  memberCount: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  memberJoined: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: Colors.dark,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '700',
  },
});
