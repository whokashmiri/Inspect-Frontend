import { Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../api/AuthContext";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";

import '../i18n/i18n';

import React from 'react';

import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
   const { t } = useTranslation();
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();
  const { user } = useAuth();

  if (!loaded) return null;

  const handleCompanyPress = () => {
    router.push("/project");
  };

  return (
    <View style={styles.flex}>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>

          <Text style={styles.title}>{t('companyPage.title')}</Text>
          <Text style={styles.subtitle}>{t('companyPage.description')}</Text>
        </View>

        <Pressable style={styles.companyBtn} onPress={handleCompanyPress}>
          <Text style={styles.companyBtnText}>
            {user?.companyName ?? "Your Company"}
          </Text>
        </Pressable>

        <Text style={styles.message}>
          We’ll keep this space clean until new features arrive.
        </Text>
      </View>
    </View>
  );
}

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },
  header: { alignItems: "center", marginBottom: 20 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: SOFT,
  },
  title: {
    fontFamily: fonts.inter.semiBold as unknown as string,
    fontSize: 22,
    fontWeight: "400",
    color: TEXT,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
  },
  companyBtn: {
    backgroundColor: ACC,
    borderWidth: 0.6,
    borderColor: ACC,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 8,
  },
  companyBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  message: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    marginTop: 10,
  },
});