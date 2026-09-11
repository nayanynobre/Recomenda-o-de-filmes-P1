import * as React from "react";
import { StyleSheet, Image } from "react-native";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { View } from "@/components/ui/view";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LogOut, Mail, User as UserIcon } from "lucide-react-native";

export function UserProfile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        {user.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <UserIcon size={40} color={isDark ? "#FFFFFF" : "#1F1F1F"} />
          </View>
        )}

        <Text style={styles.name}>{user.fullName || "User"}</Text>

        <View style={styles.infoRow}>
          <Mail size={16} color={isDark ? "#A1A1AA" : "#71717A"} />
          <Text style={styles.email}>
            {user.primaryEmailAddress?.emailAddress || "No email"}
          </Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <Button
          onPress={handleSignOut}
          variant="secondary"
          icon={LogOut}
          style={styles.signOutButton}
          textStyle={styles.signOutText}
        >
          Sign Out
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: "#71717A",
  },
  actionsSection: {
    marginTop: 32,
    width: "100%",
  },
  signOutButton: {
    width: "100%",
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
});
