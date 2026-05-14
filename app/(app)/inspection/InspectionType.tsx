import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useFonts } from "expo-font";
import fonts from "../../fonts/fonts";

export default function InspectionTypeScreen() {
     const { t } = useTranslation(); 
  const router = useRouter();
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inspection Type</Text>
      <Text style={styles.subtitle}>Choose the kind of inspection you want to start.</Text>

     <Pressable
  style={styles.button}
  onPress={() => router.push("/inspection/TransactionsScreen")}
  android_ripple={{ color: "rgba(255,255,255,0.2)" }}
>
  <Text style={styles.buttonText}>{t("inspectionType.realEstate")}</Text>
</Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push("/project")}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          {t("inspectionType.equipment")}
        </Text>
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
    marginBottom: 32,
    maxWidth: 320,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#2A324B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#2A324B",
  },
  secondaryButtonText: {
    color: "#2A324B",
  },
});