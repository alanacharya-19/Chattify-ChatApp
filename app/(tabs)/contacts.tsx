import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { database } from '@/lib/firebase';
import { ref, onValue, get, update, set } from 'firebase/database';
import { Avatar } from '@/components/Avatar';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserItem {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export default function ContactsScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [friends, setFriends] = useState<UserItem[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<UserItem[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [sortByAlpha, setSortByAlpha] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const loadContacts = useCallback(() => {
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, async (snapshot) => {
      const data = snapshot.val();
      
      const friendsData = data?.friends || {};
      const sentData = data?.sentRequests || {};
      const receivedData = data?.receivedRequests || {};

      setSentRequests(Object.keys(sentData));

      const friendsList: UserItem[] = [];
      const requestsList: UserItem[] = [];

      const allUserIds = [...new Set([...Object.keys(friendsData), ...Object.keys(receivedData)])];

      for (const uid of allUserIds) {
        const friendRef = ref(database, `users/${uid}`);
        const friendSnapshot = await get(friendRef);
        const friendInfo = friendSnapshot.val();
        
        if (friendInfo) {
          const userItem: UserItem = {
            uid,
            displayName: friendInfo.displayName || 'User',
            email: friendInfo.email || '',
            photoURL: friendInfo.photoURL,
            isOnline: friendInfo.isOnline || false,
            lastSeen: friendInfo.lastSeen || 0,
          };

          if (friendsData[uid]) {
            friendsList.push(userItem);
          }
          if (receivedData[uid]) {
            requestsList.push(userItem);
          }
        }
      }

      setFriends(friendsList);
      setReceivedRequests(requestsList);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const searchUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (users) {
      const results: UserItem[] = [];
      Object.entries(users).forEach(([uid, data]: [string, any]) => {
        if (uid !== user?.uid) {
          const nameMatch = data.displayName?.toLowerCase().includes(query.toLowerCase());
          const emailMatch = data.email?.toLowerCase().includes(query.toLowerCase());
          if (nameMatch || emailMatch) {
            results.push({
              uid,
              displayName: data.displayName || 'User',
              email: data.email || '',
              photoURL: data.photoURL,
              isOnline: data.isOnline || false,
              lastSeen: data.lastSeen || 0,
            });
          }
        }
      });
      setSearchResults(results);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendFriendRequest = async (targetUid: string, targetName: string) => {
    if (!user) return;
    try {
      await update(ref(database, `users/${user.uid}/sentRequests`), {
        [targetUid]: { sentAt: Date.now(), displayName: targetName },
      });
      await update(ref(database, `users/${targetUid}/receivedRequests`), {
        [user.uid]: { receivedAt: Date.now(), displayName: user.displayName || 'User' },
      });
      setSentRequests(prev => [...prev, targetUid]);
      Alert.alert('Success', `Friend request sent to ${targetName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send request');
    }
  };

  const cancelFriendRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      await set(ref(database, `users/${user.uid}/sentRequests/${targetUid}`), null);
      await set(ref(database, `users/${targetUid}/receivedRequests/${user.uid}`), null);
      setSentRequests(prev => prev.filter(id => id !== targetUid));
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  const acceptFriendRequest = async (targetUid: string, targetName: string) => {
    if (!user) return;
    try {
      await update(ref(database, `users/${user.uid}/friends`), {
        [targetUid]: { addedAt: Date.now() },
      });
      await update(ref(database, `users/${targetUid}/friends`), {
        [user.uid]: { addedAt: Date.now() },
      });
      await set(ref(database, `users/${user.uid}/receivedRequests/${targetUid}`), null);
      await set(ref(database, `users/${targetUid}/sentRequests/${user.uid}`), null);
      Alert.alert('Success', `You are now friends with ${targetName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const removeFriendRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      await set(ref(database, `users/${user.uid}/receivedRequests/${targetUid}`), null);
      await set(ref(database, `users/${targetUid}/sentRequests/${user.uid}`), null);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove request');
    }
  };

  const sortedFriends = sortByAlpha
    ? [...friends].sort((a, b) => a.displayName.localeCompare(b.displayName))
    : friends;

  const formatStatus = (timestamp: number, isOnline: boolean) => {
    if (isOnline) return 'Active now';
    if (!timestamp) return 'Offline';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (minutes < 1) return 'Active just now';
    if (minutes < 60) return `Active ${minutes}m ago`;
    if (hours < 24) return `Active ${hours}h ago`;
    return 'Offline';
  };

  const renderSearchItem = ({ item }: { item: UserItem }) => {
    const isSent = sentRequests.includes(item.uid);
    const isFriend = friends.some(f => f.uid === item.uid);

    return (
      <View style={[styles.contactItem, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.uid } })}>
          <Avatar uri={item.photoURL} name={item.displayName} size="medium" />
        </TouchableOpacity>
        <View style={styles.contactInfo}>
          <TouchableOpacity onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.uid } })}>
            <Text style={[styles.contactName, { color: theme.textPrimary }]}>{item.displayName}</Text>
            <Text style={[styles.contactEmail, { color: theme.textMuted }]}>{item.email}</Text>
          </TouchableOpacity>
        </View>
        {isFriend ? (
          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: theme.primary }]} onPress={() => router.push(`/chat/${item.uid}`)}>
            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : isSent ? (
          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: `${theme.textMuted}30` }]} onPress={() => cancelFriendRequest(item.uid)}>
            <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: theme.primary }]} onPress={() => sendFriendRequest(item.uid, item.displayName)}>
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRequestItem = ({ item }: { item: UserItem }) => (
    <View style={[styles.contactItem, { borderBottomColor: theme.divider }]}>
      <TouchableOpacity onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.uid } })}>
        <Avatar uri={item.photoURL} name={item.displayName} size="medium" />
      </TouchableOpacity>
      <View style={styles.contactInfo}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.uid } })}>
          <Text style={[styles.contactName, { color: theme.textPrimary }]}>{item.displayName}</Text>
          <Text style={[styles.contactEmail, { color: theme.textMuted }]}>Wants to be your friend</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={[styles.requestBtn, { backgroundColor: theme.primary }]} onPress={() => acceptFriendRequest(item.uid, item.displayName)}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.requestBtn, { backgroundColor: '#FF3B30' }]} onPress={() => removeFriendRequest(item.uid)}>
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriendItem = ({ item }: { item: UserItem }) => (
    <View style={[styles.contactItem, { borderBottomColor: theme.divider }]}>
      <TouchableOpacity onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.uid } })}>
        <Avatar uri={item.photoURL} name={item.displayName} size="medium" showOnline isOnline={item.isOnline} lastSeen={item.lastSeen} />
      </TouchableOpacity>
      <View style={styles.contactInfo}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.uid } })}>
          <Text style={[styles.contactName, { color: theme.textPrimary }]}>{item.displayName}</Text>
          <Text style={[styles.contactStatus, { color: item.isOnline ? theme.online : theme.textMuted }]}>
            {formatStatus(item.lastSeen || Date.now(), item.isOnline || false)}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.messageButton} onPress={() => router.push(`/chat/${item.uid}`)}>
        <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: isDark ? theme.headerBg : '#FFFFFF' }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Contacts</Text>
          <TouchableOpacity
            style={[styles.sortButton, sortByAlpha && { backgroundColor: `${theme.primary}20` }]}
            onPress={() => setSortByAlpha(!sortByAlpha)}
          >
            <Ionicons name="list" size={20} color={sortByAlpha ? theme.primary : theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBox, { backgroundColor: isDark ? theme.inputBg : '#F0F0F0' }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search or add friends..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length >= 3 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.uid}
          renderItem={renderSearchItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>
                {isSearching ? 'Searching...' : 'No users found'}
              </Text>
            </View>
          }
        />
      ) : (
        <>
          {receivedRequests.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>FRIEND REQUESTS</Text>
              <FlatList
                data={receivedRequests}
                keyExtractor={(item) => item.uid}
                renderItem={renderRequestItem}
                scrollEnabled={false}
              />
            </View>
          )}

          {friends.length === 0 && receivedRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="people-outline" size={52} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No friends yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Search to find and add friends</Text>
            </View>
          ) : (
            <FlatList
              data={sortedFriends}
              keyExtractor={(item) => item.uid}
              renderItem={renderFriendItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                friends.length > 0 ? (
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>FRIENDS</Text>
                ) : null
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.hero,
    fontWeight: '700',
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    height: 44,
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 120,
  },
  sectionContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  contactInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactName: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: FontSizes.sm,
  },
  contactStatus: {
    fontSize: FontSizes.sm,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  requestBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
});
