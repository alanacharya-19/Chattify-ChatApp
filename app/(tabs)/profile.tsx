import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

interface StatItemProps {
  icon: string;
  label: string;
  value: string | number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, updateUserProfile } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [, setLoading] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFriendsCount(data.friends ? Object.keys(data.friends).length : 0);
        setUserData({
          displayName: data.displayName || 'User',
          email: data.email || '',
          photoURL: data.photoURL,
          bio: data.bio || 'Hey there! I am using Chattify',
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const showMenu = () => {
    Alert.alert('', '', [
      { text: 'Share', onPress: () => {} },
      { text: 'Edit', onPress: () => {} },
      { text: 'Settings', onPress: () => router.push('/(tabs)/settings') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      try {
        await updateUserProfile(result.assets[0].uri);
        setUserData(prev => prev ? { ...prev, photoURL: result.assets[0].uri } : null);
      } catch {
        Alert.alert('Error', 'Failed to update profile picture.');
      } finally {
        setLoading(false);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      try {
        await updateUserProfile(result.assets[0].uri);
        setUserData(prev => prev ? { ...prev, photoURL: result.assets[0].uri } : null);
      } catch {
        Alert.alert('Error', 'Failed to update profile picture.');
      } finally {
        setLoading(false);
      }
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Change Profile Photo', '', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? theme.background : '#F5F5F5' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: isDark ? theme.headerBg : '#FFFFFF' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.qrButton} onPress={() => router.push('/qrcode')}>
            <Ionicons name="qr-code" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Profile</Text>
          <TouchableOpacity style={styles.menuButton} onPress={showMenu}>
            <Ionicons name="ellipsis-vertical" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={showPhotoOptions} activeOpacity={0.85}>
              {userData?.photoURL ? (
                <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>{getInitials(userData?.displayName || 'U')}</Text>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[styles.profileName, { color: theme.textPrimary }]}>{userData?.displayName || 'User'}</Text>
          <Text style={[styles.profileBio, { color: theme.textSecondary }]}>{userData?.bio || 'Hey there! I am using Chattify'}</Text>
          <Text style={[styles.profileEmail, { color: theme.textMuted }]}>{userData?.email || ''}</Text>

          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="camera" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.actionText, { color: theme.textPrimary }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
              <View style={[styles.actionIcon, { backgroundColor: `${theme.secondary}20` }]}>
                <Ionicons name="create" size={22} color={theme.secondary} />
              </View>
              <Text style={[styles.actionText, { color: theme.textPrimary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/settings')}>
              <View style={[styles.actionIcon, { backgroundColor: `${theme.textMuted}20` }]}>
                <Ionicons name="settings-outline" size={22} color={theme.textMuted} />
              </View>
              <Text style={[styles.actionText, { color: theme.textPrimary }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <StatItem icon="people" label="Friends" value={friendsCount} />
          <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
          <StatItem icon="heart" label="Likes" value="0" />
          <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
          <StatItem icon="chatbubbles" label="Posts" value="0" />
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Media</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mediaPlaceholder}>
            <Ionicons name="images-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.mediaPlaceholderText, { color: theme.textMuted }]}>No media shared</Text>
          </View>
        </View>

        <View style={styles.footer} />
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
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  },
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  avatarSection: {
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '600',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: Spacing.xl,
  },
  profileEmail: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.lg,
  },
  actionIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSizes.sm,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  mediaPlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  mediaPlaceholderText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.sm,
  },
  footer: {
    height: 120,
  },
});
