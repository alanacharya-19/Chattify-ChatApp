import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { database } from '@/lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';
import { useState, useEffect } from 'react';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { BottomSheetMenu } from '@/components/BottomSheetMenu';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

interface FriendRequestStatus {
  sent: boolean;
  received: boolean;
  friends: boolean;
}

export default function UserProfileScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [requestStatus, setRequestStatus] = useState<FriendRequestStatus>({ sent: false, received: false, friends: false });
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    if (!user || !userId) return;

    const targetUserRef = ref(database, `users/${userId}`);
    const unsubscribe = onValue(targetUserRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData({
          displayName: data.displayName || 'User',
          email: data.email || '',
          photoURL: data.photoURL,
          bio: data.bio || 'Hey there! I am using Chattify',
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || 0,
        });
        setFriendsCount(data.friends ? Object.keys(data.friends).length : 0);
      }
      setLoading(false);
    });

    const currentUserRef = ref(database, `users/${user.uid}`);
    onValue(currentUserRef, async (snapshot) => {
      const currentData = snapshot.val();
      const friends = currentData?.friends || {};
      const sentRequests = currentData?.sentRequests || {};
      const receivedRequests = currentData?.receivedRequests || {};

      setRequestStatus({
        friends: !!friends[userId],
        sent: !!sentRequests[userId],
        received: !!receivedRequests[userId],
      });
    });

    return () => unsubscribe();
  }, [user, userId]);

  const sendFriendRequest = async () => {
    if (!user || !userId) return;

    try {
      await update(ref(database, `users/${user.uid}/sentRequests`), {
        [userId]: {
          sentAt: Date.now(),
          displayName: userData?.displayName || 'User',
        },
      });

      await update(ref(database, `users/${userId}/receivedRequests`), {
        [user.uid]: {
          receivedAt: Date.now(),
          displayName: user?.displayName || 'User',
        },
      });

      setRequestStatus(prev => ({ ...prev, sent: true }));
      Alert.alert('Success', `Friend request sent to ${userData?.displayName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const cancelFriendRequest = async () => {
    if (!user || !userId) return;

    try {
      await set(ref(database, `users/${user.uid}/sentRequests/${userId}`), null);
      await set(ref(database, `users/${userId}/receivedRequests/${user.uid}`), null);

      setRequestStatus(prev => ({ ...prev, sent: false }));
      Alert.alert('Cancelled', 'Friend request cancelled');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  const acceptFriendRequest = async () => {
    if (!user || !userId) return;

    try {
      await update(ref(database, `users/${user.uid}/friends`), {
        [userId]: { addedAt: Date.now() },
      });

      await update(ref(database, `users/${userId}/friends`), {
        [user.uid]: { addedAt: Date.now() },
      });

      await set(ref(database, `users/${user.uid}/receivedRequests/${userId}`), null);
      await set(ref(database, `users/${userId}/sentRequests/${user.uid}`), null);

      setRequestStatus({ sent: false, received: false, friends: true });
      Alert.alert('Success', `You are now friends with ${userData?.displayName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const unfriendUser = async () => {
    if (!user || !userId) return;

    Alert.alert('Unfriend', `Remove ${userData?.displayName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfriend',
        style: 'destructive',
        onPress: async () => {
          try {
            await set(ref(database, `users/${user.uid}/friends/${userId}`), null);
            await set(ref(database, `users/${userId}/friends/${user.uid}`), null);
            setRequestStatus({ sent: false, received: false, friends: false });
          } catch (error) {
            Alert.alert('Error', 'Failed to remove friend');
          }
        },
      },
    ]);
  };

  const showProfileMenu = () => {
    setShowMenu(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: isDark ? theme.headerBg : '#FFFFFF' },
          headerTintColor: theme.textPrimary,
          headerShadowVisible: false,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={showProfileMenu} style={styles.headerBtn}>
              <Ionicons name="ellipsis-vertical" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileSection, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>

          <Text style={[styles.name, { color: theme.textPrimary }]}>{userData?.displayName || 'User'}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{userData?.email || ''}</Text>
        </View>

        <View style={[styles.bioSection, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <Text style={[styles.bioLabel, { color: theme.textSecondary }]}>Bio</Text>
          <Text style={[styles.bioText, { color: theme.textPrimary }]}>{userData?.bio}</Text>
        </View>

        <View style={[styles.actionSection, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          {requestStatus.friends ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push(`/chat/${userId}`)}
              >
                <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnOutline, { borderColor: '#FF3B30' }]}
                onPress={unfriendUser}
              >
                <Ionicons name="person-remove-outline" size={18} color="#FF3B30" />
                <Text style={[styles.actionBtnTextOutline, { color: '#FF3B30' }]}>Unfriend</Text>
              </TouchableOpacity>
            </View>
          ) : requestStatus.sent ? (
            <TouchableOpacity
              style={[styles.centeredActionBtn, { borderColor: theme.textMuted }]}
              onPress={cancelFriendRequest}
            >
              <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.actionBtnTextOutline, { color: theme.textMuted }]}>Cancel Request</Text>
            </TouchableOpacity>
          ) : requestStatus.received ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={acceptFriendRequest}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnOutline, { borderColor: theme.textMuted }]}
                onPress={cancelFriendRequest}
              >
                <Ionicons name="close-outline" size={18} color={theme.textMuted} />
                <Text style={[styles.actionBtnTextOutline, { color: theme.textMuted }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.centeredActionBtn, { backgroundColor: theme.primary }]}
              onPress={sendFriendRequest}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Send Friend Request</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statsSection, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>0</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Posts</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{friendsCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Friends</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.postsSection, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Posts</Text>
          <View style={styles.postsPlaceholder}>
            <Ionicons name="images-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.postsPlaceholderText, { color: theme.textMuted }]}>No posts yet</Text>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      <BottomSheetMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        items={[
          {
            icon: 'person-remove-outline',
            iconColor: '#FF3B30',
            label: 'Block User',
            onPress: () => {},
            destructive: true,
          },
          {
            icon: 'flag-outline',
            iconColor: '#FF9500',
            label: 'Report User',
            onPress: () => {},
            destructive: true,
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  headerBtn: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  avatarImage: {
    width: 120,
    height: 120,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '600',
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: FontSizes.md,
  },
  bioSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  bioLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  actionSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  actionBtnTextOutline: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  centeredActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  statsSection: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    marginVertical: Spacing.sm,
  },
  postsSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  postsPlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  postsPlaceholderText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  footer: {
    height: 100,
  },
});
