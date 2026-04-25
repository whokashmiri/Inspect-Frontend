import React from "react";
import { Stack, Redirect } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useAuth } from "../../api/AuthContext";
import { AppHeader } from "../components/AppHeader";

export default function AppLayout() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <AppHeader
        isAuthenticated={isAuthenticated}
        user={{
          // fullName: user.fullName,
          username: user.username,
          companyName: user.companyName,
          role: user.role,
        }}
        onLogout={logout}
      />

      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
});