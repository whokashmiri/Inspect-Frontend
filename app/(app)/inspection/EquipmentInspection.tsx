import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useFonts } from "expo-font";
import fonts from "../../fonts/fonts"

export default function EquipmentInspectionScreen() {
  const router = useRouter();
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Equipment Inspection</Text>
      <Text style={styles.subtitle}>This is a placeholder screen for equipment inspections.</Text>
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2A324B",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#767B91",
    textAlign: "center",
    marginBottom: 28,
    maxWidth: 320,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: "#2A324B",
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});