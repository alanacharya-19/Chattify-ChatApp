import { Avatar } from "@/components/Avatar";
import { BottomSheetMenu } from "@/components/BottomSheetMenu";
import { ChatBubble } from "@/components/ChatBubble";
import { MessageInput } from "@/components/MessageInput";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { database } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const backgrounds = [
  {
    id: "1",
    source: require("../../assets/images/background-1.png"),
    name: "sunny",
  },
  {
    id: "2",
    source: require("../../assets/images/background-2.jpg"),
    name: "light",
  },
  {
    id: "3",
    source: require("../../assets/images/background-3.png"),
    name: "lotus",
  },
  {
    id: "4",
    source: require("../../assets/images/background-4.jpg"),
    name: "noon",
  },
  {
    id: "5",
    source: require("../../assets/images/background-5.jpg"),
    name: "night",
  },
  {
    id: "6",
    source: require("../../assets/images/background-6.jpg"),
    name: "love",
  },
];

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  status?: "sending" | "sent" | "delivered" | "read";
}

interface FriendData {
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export default function ChatScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [friendData, setFriendData] = useState<FriendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [chatBackground, setChatBackground] = useState<string>("default");
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getConversationId = useCallback((uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join("_");
  }, []);

  const formatTime = useCallback((timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, []);

  const formatLastSeen = useCallback((timestamp: number) => {
    if (!timestamp) return "last seen recently";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "last seen just now";
    if (minutes < 60) return `last seen ${minutes} min ago`;
    if (hours < 24) return `last seen ${hours}h ago`;
    if (days === 1) return "last seen yesterday";
    return `last seen ${date.toLocaleDateString()}`;
  }, []);

  useEffect(() => {
    if (!user || !friendId) return;

    const blockedRef = ref(database, `blocked/${user.uid}/${friendId}`);
    const unsubscribe = onValue(blockedRef, (snapshot) => {
      setIsBlocked(snapshot.exists());
    });

    return () => unsubscribe();
  }, [user, friendId]);

  const deleteChat = async () => {
    if (!user || !friendId) return;

    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const convId = getConversationId(user.uid, friendId);
            const messagesRef = ref(database, `messages/${convId}`);
            const unreadRef = ref(database, `unread/${user.uid}/${friendId}`);

            await remove(messagesRef);
            await remove(unreadRef);

            setShowMenu(false);
            setMessages([]);
          },
        },
      ],
    );
  };

  const toggleBlockUser = async () => {
    if (!user || !friendId) return;

    const blockRef = ref(database, `blocked/${user.uid}/${friendId}`);

    if (isBlocked) {
      await remove(blockRef);
      Alert.alert(
        "Unblocked",
        `${friendData?.displayName || "User"} has been unblocked.`,
      );
    } else {
      await set(blockRef, {
        blockedAt: Date.now(),
        displayName: friendData?.displayName || "User",
      });
      Alert.alert(
        "Blocked",
        `${friendData?.displayName || "User"} has been blocked.`,
      );
    }

    setShowMenu(false);
  };

  const selectBackground = async (backgroundId: string) => {
    if (!user || !friendId) return;

    const convId = getConversationId(user.uid, friendId);
    await update(ref(database, `chatSettings/${convId}`), {
      backgroundId,
    });
    setChatBackground(backgroundId);
    setShowBackgroundPicker(false);
  };

  useEffect(() => {
    if (!user || !friendId) return;

    const convId = getConversationId(user.uid, friendId);
    const chatSettingsRef = ref(database, `chatSettings/${convId}`);
    const unsubscribe = onValue(chatSettingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.backgroundId) {
        setChatBackground(data.backgroundId);
      }
    });

    return () => unsubscribe();
  }, [user, friendId, getConversationId]);

  useEffect(() => {
    if (!user || !friendId) return;

    const convId = getConversationId(user.uid, friendId);

    const friendRef = ref(database, `users/${friendId}`);
    const friendUnsubscribe = onValue(friendRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFriendData({
          displayName: data.displayName || "User",
          email: data.email || "",
          photoURL: data.photoURL,
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || 0,
        });
      }
    });

    const messagesRef = ref(database, `messages/${convId}`);
    const messagesQuery = query(
      messagesRef,
      orderByChild("timestamp"),
      limitToLast(100),
    );

    const messagesUnsubscribe = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList: Message[] = Object.entries(data).map(
          ([id, msg]: [string, unknown]) => {
            const message = msg as {
              senderId: string;
              text: string;
              timestamp: number;
              status?: "sending" | "sent" | "delivered" | "read";
            };
            return {
              id,
              senderId: message.senderId,
              text: message.text,
              timestamp: message.timestamp,
              status: message.status || "sent",
            };
          },
        );
        const sorted = messageList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sorted);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });

    const typingRef = ref(database, `typing/${friendId}/${user.uid}`);
    const typingUnsubscribe = onValue(typingRef, (snapshot) => {
      setIsTyping(snapshot.val() === true);
    });

    return () => {
      friendUnsubscribe();
      messagesUnsubscribe();
      typingUnsubscribe();
    };
  }, [user, friendId, getConversationId]);

  useEffect(() => {
    if (!user || !friendId) return;
    const unreadRef = ref(database, `unread/${user.uid}/${friendId}`);
    set(unreadRef, 0);

    const convId = getConversationId(user.uid, friendId);
    const messagesRef = ref(database, `messages/${convId}`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([msgId, msg]: [string, unknown]) => {
          const message = msg as { senderId: string; status?: string };
          if (message.senderId === friendId && message.status !== "read") {
            update(ref(database, `messages/${convId}/${msgId}`), {
              status: "read",
            });
          }
        });
      }
    });
  }, [user, friendId, getConversationId]);

  useEffect(() => {
    if (!user || !friendId) return;

    const typingRef = ref(database, `typing/${user.uid}/${friendId}`);

    if (newMessage.trim()) {
      set(typingRef, true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        set(typingRef, false);
      }, 2000);
    } else {
      set(typingRef, false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage, user, friendId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !friendId) return;

    const convId = getConversationId(user.uid, friendId);
    const messagesRef = ref(database, `messages/${convId}`);
    const typingRef = ref(database, `typing/${user.uid}/${friendId}`);

    await set(typingRef, false);
    const newMessageRef = push(messagesRef, {
      senderId: user.uid,
      text: newMessage.trim(),
      timestamp: Date.now(),
      status: "sent",
    });

    const senderUnreadRef = ref(database, `unread/${friendId}/${user.uid}`);
    const senderSnapshot = await new Promise<unknown>((resolve) => {
      onValue(senderUnreadRef, (snap) => resolve(snap.val()), {
        onlyOnce: true,
      });
    });
    const currentCount = (senderSnapshot as number) || 0;
    await update(ref(database, `unread/${friendId}`), {
      [user.uid]: currentCount + 1,
    });

    setTimeout(() => {
      if (newMessageRef.key) {
        update(ref(database, `messages/${convId}/${newMessageRef.key}`), {
          status: "delivered",
        });
      }
    }, 500);

    setNewMessage("");
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isSent = item.senderId === user?.uid;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const isConsecutive = prevMessage?.senderId === item.senderId;

    return (
      <ChatBubble
        text={item.text}
        time={formatTime(item.timestamp)}
        isSent={isSent}
        isConsecutive={isConsecutive}
        status={item.status || "sent"}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: isDark ? theme.headerBg : "#FFFFFF" },
          headerTintColor: theme.textPrimary,
          headerShadowVisible: false,
          headerTitle: () => (
            <TouchableOpacity
              style={styles.headerTitle}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/user/[userId]",
                  params: { userId: friendId },
                })
              }
            >
              <Avatar
                uri={friendData?.photoURL}
                name={friendData?.displayName || "User"}
                size="small"
                showOnline
                isOnline={friendData?.isOnline}
                lastSeen={friendData?.lastSeen}
              />
              <View style={styles.headerTextContainer}>
                <Text
                  style={[styles.headerName, { color: theme.textPrimary }]}
                  numberOfLines={1}
                >
                  {friendData?.displayName || "Chat"}
                </Text>
                <Text
                  style={[
                    styles.headerStatus,
                    {
                      color: friendData?.isOnline
                        ? theme.online
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {isTyping
                    ? "typing..."
                    : friendData?.isOnline
                      ? "Online"
                      : formatLastSeen(friendData?.lastSeen || Date.now())}
                </Text>
              </View>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons
                  name="call-outline"
                  size={24}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons
                  name="videocam-outline"
                  size={24}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowMenu(true)}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={24}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
            </View>
          ),
          headerBackTitle: "",
        }}
      />

      {chatBackground !== "default" ? (
        <ImageBackground
          source={backgrounds.find((b) => b.id === chatBackground)?.source}
          style={[styles.container]}
          imageStyle={styles.backgroundImage}
        >
          <KeyboardAvoidingView
            style={styles.backgroundOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: "#FFFFFF",
                      textShadowColor: "rgba(0,0,0,0.5)",
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 2,
                    },
                  ]}
                >
                  No messages yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    {
                      color: "#FFFFFF",
                      textShadowColor: "rgba(0,0,0,0.5)",
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 2,
                    },
                  ]}
                >
                  Send a message to start the conversation
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                onLayout={() => flatListRef.current?.scrollToEnd()}
                showsVerticalScrollIndicator={false}
              />
            )}

            {isTyping && (
              <View style={styles.typingContainer}>
                <TypingIndicator name={friendData?.displayName || "User"} />
              </View>
            )}
          </KeyboardAvoidingView>
        </ImageBackground>
      ) : (
        <KeyboardAvoidingView
          style={[
            styles.container,
            { backgroundColor: isDark ? theme.chatBackground : "#E5DDD5" },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                Send a message to start the conversation
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              onLayout={() => flatListRef.current?.scrollToEnd()}
              showsVerticalScrollIndicator={false}
            />
          )}

          {isTyping && (
            <View style={styles.typingContainer}>
              <TypingIndicator name={friendData?.displayName || "User"} />
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      <SafeAreaView edges={["bottom"]}>
        <View style={styles.floatingInputContainer}>
          <MessageInput
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={sendMessage}
            placeholder="Message"
          />
        </View>
      </SafeAreaView>

      <BottomSheetMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        items={[
          {
            icon: "image-outline",
            iconColor: theme.primary,
            label: "Change Background",
            onPress: () => setShowBackgroundPicker(true),
          },
          {
            icon: "trash-outline",
            iconColor: "#FF3B30",
            label: "Delete Chat",
            onPress: deleteChat,
            destructive: true,
          },
          {
            icon: isBlocked ? "person-add-outline" : "person-remove-outline",
            iconColor: "#FF3B30",
            label: isBlocked ? "Unblock User" : "Block User",
            onPress: toggleBlockUser,
            destructive: !isBlocked,
          },
        ]}
      />

      <Modal
        visible={showBackgroundPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBackgroundPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View
            style={[styles.pickerContainer, { backgroundColor: theme.surface }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                Chat Background
              </Text>
              <TouchableOpacity onPress={() => setShowBackgroundPicker(false)}>
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.backgroundGrid}>
              <TouchableOpacity
                style={styles.backgroundItem}
                onPress={() => selectBackground("default")}
              >
                <View
                  style={[
                    styles.defaultBackground,
                    {
                      backgroundColor: isDark
                        ? theme.chatBackground
                        : "#E5DDD5",
                    },
                  ]}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color={theme.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.backgroundName,
                    { color: theme.textSecondary },
                  ]}
                >
                  Default
                </Text>
              </TouchableOpacity>
              {backgrounds.map((bg) => (
                <TouchableOpacity
                  key={bg.id}
                  style={styles.backgroundItem}
                  onPress={() => selectBackground(bg.id)}
                >
                  <ImageBackground
                    source={bg.source}
                    style={[
                      styles.backgroundPreview,
                      chatBackground === bg.id && styles.selectedBackground,
                    ]}
                    imageStyle={styles.backgroundImagePreview}
                  >
                    {chatBackground === bg.id && (
                      <View style={styles.checkmark}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                    )}
                  </ImageBackground>
                  <Text
                    style={[
                      styles.backgroundName,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {bg.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 200,
  },
  headerTextContainer: {
    marginLeft: Spacing.md,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerStatus: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: Spacing.sm,
  },
  messagesList: {
    paddingVertical: Spacing.md,
  },
  typingContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  floatingInputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: 220,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuText: {
    fontSize: 16,
    marginLeft: Spacing.md,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Spacing.xxl,
    maxHeight: "70%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backgroundGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.md,
    justifyContent: "space-around",
  },
  backgroundItem: {
    alignItems: "center",
    margin: Spacing.sm,
    width: 100,
  },
  backgroundPreview: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImagePreview: {
    borderRadius: 12,
  },
  selectedBackground: {
    borderWidth: 3,
    borderColor: "#2AABEE",
  },
  defaultBackground: {
    width: 90,
    height: 90,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.3)",
  },
  checkmark: {
    position: "absolute",
  },
  backgroundName: {
    marginTop: Spacing.xs,
    fontSize: 12,
  },
});
