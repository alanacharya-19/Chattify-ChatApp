import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function ScannerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQRResult = (data: string) => {
    setGalleryImage(null);
    if (data.startsWith('CHATTIFY:')) {
      const userId = data.replace('CHATTIFY:', '');
      router.replace({ pathname: '/user/[userId]', params: { userId } });
    } else {
      Alert.alert('Invalid QR', 'This QR code is not a valid Chattify user.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || isProcessing) return;
    setScanned(true);
    handleQRResult(result.data);
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setGalleryImage(result.assets[0].uri);
      setScanned(false);
    }
  };

  const resetScanner = () => {
    setGalleryImage(null);
    setScanned(false);
    setIsProcessing(false);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.content}>
          <Ionicons name="camera-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Camera Permission</Text>
          <Text style={[styles.text, { color: theme.textSecondary }]}>
            We need camera access to scan QR codes
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.galleryButton, { backgroundColor: theme.surface }]} onPress={pickImageFromGallery}>
            <Ionicons name="images-outline" size={22} color={theme.primary} />
            <Text style={[styles.galleryButtonText, { color: theme.primary }]}>Choose from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#2AABEE" />
                <Text style={styles.processingText}>Scanning...</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.instruction}>Align QR code within the frame</Text>
            {scanned && !isProcessing && (
              <TouchableOpacity style={styles.rescanButton} onPress={resetScanner}>
                <Text style={styles.rescanText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.galleryLinkButton} onPress={pickImageFromGallery}>
              <Ionicons name="images-outline" size={20} color="#FFFFFF" />
              <Text style={styles.galleryLinkText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>

      {galleryImage && (
        <View style={styles.galleryOverlay}>
          <Image source={{ uri: galleryImage }} style={styles.galleryImage} resizeMode="contain" />
          <View style={styles.galleryInstructions}>
            <Text style={styles.galleryText}>
              Point your camera at this QR code image to scan it
            </Text>
            <TouchableOpacity style={styles.cancelGalleryBtn} onPress={resetScanner}>
              <Text style={styles.cancelGalleryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 16,
    paddingTop: 50,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2AABEE',
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2AABEE',
    borderTopRightRadius: 12,
  },
  cornerBL: {
    position: 'absolute',
    bottom: '30%',
    left: '10%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2AABEE',
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    position: 'absolute',
    bottom: '30%',
    right: '10%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2AABEE',
    borderBottomRightRadius: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
    paddingBottom: 60,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  rescanButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
  },
  rescanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  galleryLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    gap: 8,
  },
  galleryLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  galleryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  galleryImage: {
    width: '100%',
    height: '70%',
  },
  galleryInstructions: {
    alignItems: 'center',
    paddingTop: 20,
  },
  galleryText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelGalleryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  cancelGalleryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
