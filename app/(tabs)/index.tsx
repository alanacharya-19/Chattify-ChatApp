import { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { database } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Avatar } from '@/components/Avatar';
import { BottomSheetMenu } from '@/components/BottomSheetMenu';
import { Spacing, FontSizes, BorderRadius, Layout } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Friend {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

interface SectionData {
  title: string;
  data: Friend[];
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme, themeMode } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<Friend[]>([]);
  const [contacts, setContacts] = useState<Friend[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ [uid: string]: number }>({});
  const [showMenu, setShowMenu] = useState(false);
  const [, forceUpdate] = useState({});

  const getConversationId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

  const loadData = useCallback(() => {
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, async (snapshot) => {
      const data = snapshot.val();
      if (data?.friends) {
        const friendUids = Object.keys(data.friends);
        const friendsList: Friend[] = [];
        const chatsList: Friend[] = [];

        for (const friendUid of friendUids) {
          const friendRef = ref(database, `users/${friendUid}`);
          const friendSnapshot = await get(friendRef);
          const friendInfo = friendSnapshot.val();
          if (friendInfo) {
            const friendData: Friend = {
              uid: friendUid,
              displayName: friendInfo.displayName || 'User',
              email: friendInfo.email || '',
              photoURL: friendInfo.photoURL,
              isOnline: friendInfo.isOnline || false,
              lastSeen: friendInfo.lastSeen || 0,
            };

            const convId = getConversationId(user.uid, friendUid);
            const messagesRef = ref(database, `messages/${convId}`);
            const messagesSnapshot = await get(messagesRef);
            if (messagesSnapshot.exists()) {
              const messages = messagesSnapshot.val();
              const messageList = Object.values(messages) as any[];
              const sorted = messageList.sort((a, b) => b.timestamp - a.timestamp);
              if (sorted.length > 0) {
                friendData.lastMessage = sorted[0].text;
                friendData.lastMessageTime = sorted[0].timestamp;
                chatsList.push(friendData);
              } else {
                friendsList.push(friendData);
              }
            } else {
              friendsList.push(friendData);
            }
          }
        }

        setChats(chatsList.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)));
        setContacts(friendsList.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      } else {
        setChats([]);
        setContacts([]);
      }
    });

    const convUnreadRef = ref(database, `unread/${user.uid}`);
    const unreadUnsubscribe = onValue(convUnreadRef, (snapshot) => {
      if (snapshot.exists()) {
        setUnreadCounts(snapshot.val());
      }
    });

    return () => {
      unsubscribe();
      unreadUnsubscribe();
    };
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const showHeaderMenu = () => {
    setShowMenu(true);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatStatus = (timestamp: number, isOnline: boolean) => {
    if (isOnline) return 'Online';
    if (!timestamp) return 'Offline';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Active just now';
    if (minutes < 60) return `Active ${minutes}m`;
    if (hours < 24) return `Active ${hours}h`;
    return 'Offline';
  };

  const renderChatItem = ({ item }: { item: Friend }) => {
    const unreadCount = unreadCounts[item.uid] || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: theme.divider }]}
        onPress={() => router.push(`/chat/${item.uid}`)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.photoURL} name={item.displayName} size="medium" showOnline isOnline={item.isOnline} lastSeen={item.lastSeen} />
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, { color: theme.textPrimary }, hasUnread && { fontWeight: '700' }]} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={[styles.chatTime, { color: hasUnread ? theme.primary : theme.textMuted }]}>
              {formatTime(item.lastMessageTime)}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <View style={styles.messagePreview}>
              <Text style={[styles.lastMessage, { color: theme.textSecondary }, hasUnread && { color: theme.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                {item.lastMessage || 'No messages yet'}
              </Text>
              {hasUnread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContactItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.contactItem, { borderBottomColor: theme.divider }]}
      onPress={() => router.push(`/chat/${item.uid}`)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.photoURL} name={item.displayName} size="medium" showOnline isOnline={item.isOnline} lastSeen={item.lastSeen} />
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: theme.textPrimary }]}>{item.displayName}</Text>
        <Text style={[styles.contactStatus, { color: item.isOnline ? theme.online : theme.textMuted }]}>
          {formatStatus(item.lastSeen || Date.now(), item.isOnline || false)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const sections: SectionData[] = [];
  if (chats.length > 0) sections.push({ title: 'CHATS', data: chats });
  if (contacts.length > 0) sections.push({ title: 'CONTACTS', data: contacts });

  const filteredChats = chats.filter(
    (chat) =>
      chat.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSections: SectionData[] = [];
  if (filteredChats.length > 0) filteredSections.push({ title: 'CHATS', data: filteredChats });
  if (filteredContacts.length > 0) filteredSections.push({ title: 'CONTACTS', data: filteredContacts });

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: isDark ? theme.headerBg : '#FFFFFF' }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Chattify</Text>
          <TouchableOpacity style={styles.menuButton} onPress={showHeaderMenu}>
            <Ionicons name="ellipsis-vertical" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBox, { backgroundColor: isDark ? theme.inputBg : '#F0F0F0' }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search or start new chat"
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

      {filteredSections.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: `${theme.primary}15` }]}>
            <Ionicons name="chatbubbles-outline" size={52} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {chats.length === 0 && contacts.length === 0 ? 'No conversations' : 'No results found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {chats.length === 0 && contacts.length === 0 ? 'Start by adding contacts' : 'Try a different search'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => item.uid}
          renderItem={searchQuery ? ({ item, section }) => 
            section.title === 'CHATS' ? renderChatItem({ item }) : renderContactItem({ item })
          : ({ item, section }) => 
            section.title === 'CHATS' ? renderChatItem({ item }) : renderContactItem({ item })
          }
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
        />
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fabSmall, { backgroundColor: isDark ? theme.surface : '#E8E8E8' }]}
          activeOpacity={0.85}
          onPress={() => router.push('/scanner')}
        >
          <Ionicons name="scan-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/contacts')}
        >
          <Ionicons name="chatbox-ellipses" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <BottomSheetMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        items={[
          {
            icon: themeMode === 'dark' ? 'sunny-outline' : 'moon-outline',
            iconColor: '#F59E0B',
            label: themeMode === 'dark' ? 'Day Mode' : 'Night Mode',
            onPress: toggleTheme,
          },
          {
            icon: 'people-outline',
            iconColor: theme.primary,
            label: 'New Group',
            onPress: () => {},
          },
          {
            icon: 'bookmark-outline',
            iconColor: theme.primary,
            label: 'Saved Messages',
            onPress: () => {},
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
  menuButton: {
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
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  chatInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
    flex: 1,
    marginRight: Spacing.sm,
  },
  chatTime: {
    fontSize: FontSizes.sm,
  },
  chatBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lastMessage: {
    fontSize: FontSizes.md,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
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
  contactStatus: {
    fontSize: FontSizes.sm,
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
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  fabSmall: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fab: {
    width: Layout.fabSize,
    height: Layout.fabSize,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
