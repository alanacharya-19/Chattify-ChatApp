import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
}

interface SettingsItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

function SettingsItem({ icon, iconColor, title, subtitle, onPress, rightElement, showArrow = true }: SettingsItemProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: theme.divider }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightElement || (showArrow && <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />)}
    </TouchableOpacity>
  );
}

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.section}>
      {title && <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>}
      <View style={[styles.sectionContent, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme, themeMode } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (!user) return;
    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData({
          displayName: data.displayName || 'User',
          email: data.email || '',
          photoURL: data.photoURL,
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const showMenu = () => {
    Alert.alert('Settings', '', [
      { text: 'Edit Profile', onPress: () => router.push('/(tabs)/profile') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {
        signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? theme.background : '#F5F5F5' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: isDark ? theme.headerBg : '#FFFFFF' }]}>
        <View style={styles.headerTop}>
          <View style={{ width: 40 }} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
          <TouchableOpacity style={styles.menuButton} onPress={showMenu}>
            <Ionicons name="ellipsis-vertical" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{userData?.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>{userData?.displayName || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{userData?.email || ''}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection>
          <SettingsItem
            icon="person"
            iconColor={theme.primary}
            title="Edit Profile"
            subtitle="Change your name, photo, and bio"
            onPress={() => router.push('/(tabs)/profile')}
          />
          <SettingsItem
            icon="qr-code"
            iconColor="#10B981"
            title="My QR Code"
            subtitle="Share your profile"
            onPress={() => router.push('/qrcode')}
          />
        </SettingsSection>

        <SettingsSection title="APP">
          <SettingsItem
            icon={themeMode === 'dark' ? 'moon' : 'sunny'}
            iconColor="#F59E0B"
            title="Dark Mode"
            subtitle={themeMode === 'dark' ? 'On' : 'Off'}
            showArrow={false}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E5E7EB', true: `${theme.primary}80` }}
                thumbColor={isDark ? theme.primary : '#F4F4F5'}
              />
            }
          />
          <SettingsItem
            icon="chatbox-ellipses"
            iconColor="#3B82F6"
            title="Chat Settings"
            subtitle="Wallpaper, font size, preview"
          />
          <SettingsItem
            icon="notifications"
            iconColor="#EF4444"
            title="Notifications"
            subtitle="Sounds, badges, vibration"
          />
        </SettingsSection>

        <SettingsSection title="PRIVACY">
          <SettingsItem
            icon="lock-closed"
            iconColor="#10B981"
            title="Privacy & Security"
            subtitle="Blocked users, 2-step verification"
          />
          <SettingsItem
            icon="time"
            iconColor="#6B7280"
            title="Last Seen & Online"
            subtitle="Everyone"
          />
          <SettingsItem
            icon="eye-off"
            iconColor="#6B7280"
            title="Profile Photo"
            subtitle="Everyone"
          />
        </SettingsSection>

        <SettingsSection title="SUPPORT">
          <SettingsItem
            icon="help-circle"
            iconColor="#3B82F6"
            title="Help Center"
            subtitle="FAQ, contact us"
          />
          <SettingsItem
            icon="document-text"
            iconColor="#6B7280"
            title="Terms & Privacy Policy"
          />
          <SettingsItem
            icon="information-circle"
            iconColor="#6B7280"
            title="About"
            subtitle="Version 1.0.0"
          />
        </SettingsSection>

        <SettingsSection>
          <SettingsItem
            icon="language"
            iconColor="#6B7280"
            title="Language"
            subtitle="English"
          />
          <SettingsItem
            icon="cloud-download"
            iconColor="#6B7280"
            title="Data & Storage"
            subtitle="Network usage, auto-download"
          />
        </SettingsSection>

        <TouchableOpacity style={[styles.signOutButton, { backgroundColor: `${theme.error}12` }]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={theme.error} />
          <Text style={[styles.signOutText, { color: theme.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>Chattify v1.0.0</Text>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  profileInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  profileName: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: FontSizes.md,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.lg,
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  signOutText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  footerText: {
    fontSize: FontSizes.sm,
  },
});
