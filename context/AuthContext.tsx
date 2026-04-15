import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ref, set, onValue, update } from 'firebase/database';
import { database } from '../lib/firebase';
import Constants from 'expo-constants';

const CLOUDINARY_CLOUD_NAME = Constants.expoConfig?.extra?.cloudinaryCloudName || 'dvnar4cah';
const CLOUDINARY_API_KEY = Constants.expoConfig?.extra?.cloudinaryApiKey || '836112846191311';
const CLOUDINARY_API_SECRET = Constants.expoConfig?.extra?.cloudinaryApiSecret || 'gczN8vkQw6K2SSBkJPIH035jjmU';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (photoUri: string) => Promise<void>;
  updateUserStatus: () => void;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const snapshot = await new Promise<any>((resolve) => {
          onValue(userRef, (snap) => resolve(snap.val()), { onlyOnce: true });
        });
        if (!snapshot) {
          await set(userRef, {
            displayName: firebaseUser.displayName || 'User',
            email: firebaseUser.email,
            friends: {},
            createdAt: Date.now(),
            lastSeen: Date.now(),
            isOnline: true,
          });
        } else {
          await update(ref(database, `users/${firebaseUser.uid}`), {
            isOnline: true,
            lastSeen: Date.now(),
          });
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const updateStatus = () => {
      update(ref(database, `users/${user.uid}`), {
        isOnline: true,
        lastSeen: Date.now(),
      });
    };

    updateStatus();

    const interval = setInterval(updateStatus, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await set(ref(database, `users/${credential.user.uid}`), {
      displayName,
      email,
      friends: {},
      createdAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: true,
    });
  };

  const signIn = async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (user) {
      await update(ref(database, `users/${user.uid}`), {
        isOnline: false,
        lastSeen: Date.now(),
      });
    }
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (photoUri: string): Promise<void> => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'profile_' + user.uid + '.jpg',
      } as any);
      formData.append('upload_preset', 'chattify_preset');
      formData.append('folder', 'chattify_profiles');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (result.secure_url) {
        await update(ref(database, `users/${user.uid}`), {
          photoURL: result.secure_url,
        });
      } else {
        console.error('Cloudinary error:', result);
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const updateUserStatus = () => {
    if (user) {
      update(ref(database, `users/${user.uid}`), {
        isOnline: true,
        lastSeen: Date.now(),
      });
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!user) return;

    await update(ref(database, `users/${user.uid}`), {
      displayName: name,
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateUserProfile, updateUserStatus, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
