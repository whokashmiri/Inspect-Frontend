// app/_layout.tsx

import "./sync/projectBackgroundTask";

import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

import { AuthProvider } from "../api/AuthContext";
import { ConnectivityProvider } from "./components/connectivity/ConnectivityContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ConnectivityProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: {
                backgroundColor: "#0c0c0c",
              },
            }}
          />
        </AuthProvider>
      </ConnectivityProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080808",
  },
});
