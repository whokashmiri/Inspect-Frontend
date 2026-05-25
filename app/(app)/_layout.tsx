import React from "react";
import { Stack, Redirect } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useAuth } from "../../api/AuthContext";
import { authApi } from "../../api/api";
import { AppHeader } from "../components/AppHeader";

export default function AppLayout() {
  const { user, isAuthenticated, logout, isLoading, refreshSession } = useAuth();

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
    username: user.username,
    name: user.name,
    phone: user.phone,
    companyName: user.companyName,
    serviceCities: user.serviceCities,
    isProfileCompleted: user.isProfileCompleted,
  }}
  onLogout={logout}
  onCompleteProfile={async (payload) => {
    await authApi.completeProfile(payload);
    await refreshSession();
  }}
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