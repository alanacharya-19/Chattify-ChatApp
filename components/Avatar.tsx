import { Layout } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  showOnline?: boolean;
  isOnline?: boolean;
  lastSeen?: number;
}

export function Avatar({
  uri,
  name = "",
  size = "medium",
  showOnline = false,
  isOnline = false,
  lastSeen,
}: AvatarProps) {
  const { theme } = useTheme();

  const sizeMap = {
    small: Layout.avatarSmall,
    medium: Layout.avatarMedium,
    large: Layout.avatarLarge,
    xlarge: Layout.avatarXLarge,
  };

  const fontSizeMap = {
    small: 14,
    medium: 18,
    large: 32,
    xlarge: 40,
  };

  const avatarSize = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    return `${hours}h`;
  };

  return (
    <View style={[styles.container, { width: avatarSize, height: avatarSize }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: avatarSize / 2.2,
              height: avatarSize / 2.2,
              borderRadius: avatarSize / 4.4,
              backgroundColor: isOnline ? theme.online : "#000000",
              borderColor: "#000000",
              borderWidth: 1.5,
              bottom: 0,
              right: 0,
              justifyContent: "center",
              alignItems: "center",
              padding: 0,
            },
          ]}
        >
          {isOnline ? (
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: "#FFFFFF",
                  width: avatarSize / 7,
                  height: avatarSize / 7,
                },
              ]}
            />
          ) : (
            lastSeen && (
              <Text style={[styles.timeText, { fontSize: Math.max(6, avatarSize / 6) }]}>
                {getTimeAgo(lastSeen)}
              </Text>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  avatar: {
    resizeMode: "cover",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    borderRadius: 10,
  },
  timeText: {
    color: "#00FF00",
    fontWeight: "600",
    fontSize: 8,
  },
});
