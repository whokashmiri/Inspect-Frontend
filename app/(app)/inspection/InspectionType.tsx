import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useFonts } from "expo-font";
import fonts from "../../fonts/fonts";
import { transactionApi } from "../../../api/api";
import { useAuth } from "../../../api/AuthContext";

export default function InspectionTypeScreen() {
  const { user, isOnline, selectedCompanyId } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [downloading, setDownloading] = useState(false);

  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  if (!loaded) return null;

const handleRealEstatePress = async () => {
  console.log("AUTH USER:", user);
  console.log("SELECTED COMPANY:", selectedCompanyId);

  if (downloading) return;

  try {
    setDownloading(true);

    if (isOnline) {
      const res = await transactionApi.downloadCompany({
        page: 1,
        limit: 10,
      });

      console.log("DOWNLOAD COMPANY RESPONSE:", {
        success: res.success,
        companyId: res.companyId,
        total: res.total,
        count: res.transactions?.length ?? 0,
        hasMore: res.hasMore,
      });
    }

    router.push("/inspection/TransactionsScreen");
  } catch (error) {
    console.log("Download transactions failed:", error);
    router.push("/inspection/TransactionsScreen");
  } finally {
    setDownloading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inspection Type</Text>
      <Text style={styles.subtitle}>
        Choose the kind of inspection you want to start.
      </Text>

      <Pressable
        style={[styles.button, downloading && styles.disabledButton]}
        onPress={handleRealEstatePress}
        disabled={downloading}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      >
        {downloading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            {t("inspectionType.realEstate")}
          </Text>
        )}
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

  disabledButton: {
  opacity: 0.7,
},
  secondaryButtonText: {
    color: "#2A324B",
  },
});