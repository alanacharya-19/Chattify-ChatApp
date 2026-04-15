import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { database } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { onValue, ref } from "firebase/database";
import { useEffect, useState, useCallback } from "react";
import { Image, StyleSheet, useWindowDimensions, View, Text } from "react-native";

interface UserData {
  displayName: string;
  photoURL?: string;
}

interface BadgeIconProps {
  name: string;
  focused: boolean;
  color: string;
  badgeCount?: number;
}

function BadgeIcon({ name, focused, color, badgeCount = 0 }: BadgeIconProps) {
  const icons: { [key: string]: { active: string; inactive: string } } = {
    index: { active: "chatbubbles", inactive: "chatbubbles-outline" },
    contacts: { active: "people", inactive: "people-outline" },
    settings: { active: "settings", inactive: "settings-outline" },
  };

  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={(focused ? icons[name].active : icons[name].inactive) as any}
        size={24}
        color={color}
      />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function ProfileTabIcon({
  focused,
  color,
}: {
  focused: boolean;
  color: string;
}) {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (!user) return;
    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData({
          displayName: data.displayName || "User",
          photoURL: data.photoURL,
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (focused) {
    return (
      <View style={styles.profileAvatarContainer}>
        {userData?.photoURL ? (
          <Image
            source={{ uri: userData.photoURL }}
            style={styles.profileAvatar}
          />
        ) : (
          <View
            style={[
              styles.profileAvatarPlaceholder,
              { backgroundColor: "#2AABEE" },
            ]}
          >
            <Ionicons name="person" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
    );
  }

  return <Ionicons name="person-outline" size={24} color={color} />;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const tabBarWidth = width * 0.85;
  const horizontalMargin = (width - tabBarWidth) / 2;
  
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      import("expo-router").then(({ router }) => {
        router.replace("/(auth)/login");
      });
    }
  }, [user]);

  const loadCounts = useCallback(() => {
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      
      const receivedRequests = data?.receivedRequests || {};
      setFriendRequestCount(Object.keys(receivedRequests).length);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsub = loadCounts();
    return () => { if (unsub) unsub(); };
  }, [loadCounts]);

  useEffect(() => {
    if (!user) return;

    const unreadRef = ref(database, `unread/${user.uid}`);
    const unsubscribe = onValue(unreadRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const totalUnread = Object.values(data).reduce((sum: number, val: any) => sum + (val || 0), 0);
        setUnreadCount(totalUnread);
      } else {
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          justifyContent: "center",
          alignItems: "center",
          marginLeft: 25,
          marginBottom: 10,
          position: "absolute",
          bottom: 15,
          left: horizontalMargin,
          right: horizontalMargin,
          width: tabBarWidth,
          backgroundColor: isDark ? theme.surface : "#FFFFFF",
          borderRadius: 25,
          height: 50,
          paddingBottom: 4,
          paddingTop: 4,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
        headerShown: false,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ focused, color }) => (
            <BadgeIcon name="index" focused={focused} color={color} badgeCount={unreadCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ focused, color }) => (
            <BadgeIcon name="contacts" focused={focused} color={color} badgeCount={friendRequestCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <BadgeIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <ProfileTabIcon focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  profileAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
