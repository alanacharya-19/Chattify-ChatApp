import { View, Text, StyleSheet, Image, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
}

export default function QRCodeScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    if (!user) return;
    import('@/lib/firebase').then(({ database }) => {
      import('firebase/database').then(({ ref, onValue }) => {
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserData({
              displayName: data.displayName || 'User',
              email: data.email || '',
              photoURL: data.photoURL,
            });
          }
        });
      });
    });
  }, [user]);

  const qrData = user ? `CHATTIFY:${user.uid}` : '';
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Add me on Chattify!\nMy username: ${userData?.displayName || 'User'}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: isDark ? theme.headerBg : '#FFFFFF' },
          headerTintColor: theme.textPrimary,
          headerShadowVisible: false,
          headerTitle: 'My QR Code',
        }}
      />

      <View style={styles.content}>
        <View style={[styles.qrCard, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
          <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
            <Image
              source={{ uri: qrImageUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.userInfo, { borderTopColor: theme.divider }]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              {userData?.photoURL ? (
                <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>
                {userData?.displayName || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {userData?.email || ''}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Scan this QR code to add me as a friend
        </Text>

        <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.primary }]} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          <Text style={styles.shareText}>Share QR Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  qrCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  qrContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    width: '100%',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  hint: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
