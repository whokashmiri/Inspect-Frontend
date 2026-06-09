import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFonts } from 'expo-font';
import  fonts  from '../fonts/fonts';
import { useRouter } from "expo-router";
import { useAuth } from "../../api/AuthContext";
import { ApiError , authApi } from "../../api/api";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
      const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });
const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuth();

 

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>(
    {},
  );

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const e: typeof errors = {};
    if (!username.trim()) e.username = t("login.errors.usernameRequired");
    if (!password) e.password = t("login.errors.passwordRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login("+966" + username.trim(), password);
      // Navigation is handled by the root layout based on auth state
    } catch (err) {
     const msg =
      err instanceof ApiError
    ? err.message
    : t("common.somethingWentWrong");

    Alert.alert(t("login.failedTitle"), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>
          {/* <Text style={styles.title}>{t("login.title")}</Text> */}
          {/* <Text style={styles.subtitle}>{t("login.subtitle")}</Text> */}
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.fieldGroup}>
  <Text style={styles.label}>{t("login.username")}</Text>
  <View style={[styles.inputRow, errors.username && styles.inputError]}>
    <View style={styles.prefixBox}>
      <Text style={styles.prefixText}>+966</Text>
    </View>
    <View style={styles.prefixDivider} />
    <TextInput
      style={styles.inputInner}
      placeholder={t("login.usernamePlaceholder")}
      placeholderTextColor="#555"
      value={username}
      onChangeText={(t) => {
        setUsername(t);
        if (errors.username)
          setErrors((e) => ({ ...e, username: undefined }));
      }}
      keyboardType="phone-pad"
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
  {errors.username && (
    <Text style={styles.errorText}>{errors.username}</Text>
  )}
</View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("login.password")}</Text>
            <View
              style={[styles.inputRow, errors.password && styles.inputError]}
            >
              <TextInput
                style={styles.inputInner}
              placeholder={t("login.passwordPlaceholder")}
                placeholderTextColor="#555"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password)
                    setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password trigger */}
<TouchableOpacity
  style={styles.forgotWrap}
  onPress={() => router.push("/forgot-password")}
>
  <Text style={styles.forgotText}>{t("login.forgotPassword") ?? "Forgot password?"}</Text>
</TouchableOpacity>

        <TouchableOpacity
  style={styles.footer}
  onPress={() => router.push("/signup")}
>
  <Text style={styles.footerText}>Don't have an account? </Text>
  <Text style={styles.footerLink}>Create One</Text>
</TouchableOpacity>


          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>{t("login.signIn")}</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 28 },

  header: { alignItems: "center", marginBottom: 44 },
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
    marginBottom: 1,
  },
  subtitle: { fontSize: 15, color: MUTED },

  form: { gap: 6 },
  fieldGroup: { marginBottom: 14 },
  label: {
    fontSize: 8,
    fontWeight: "600",
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  prefixBox: {
  paddingHorizontal: 12,
  paddingVertical: 12,
  justifyContent: "center",
},
prefixText: {
  fontSize: 15,
  fontWeight: "600",
  color: TEXT,
},
prefixDivider: {
  width: 1,
  height: 20,
  backgroundColor: BORDER,
},
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
  },
  eyeBtn: { paddingRight: 14 },
  eyeIcon: { fontSize: 18, color: MUTED },

  inputError: { borderColor: "#FF453A" },
  errorText: { fontSize: 12, color: "#FF453A", marginTop: 5, marginLeft: 2 },

  forgotWrap: { 
    alignSelf: "flex-end", 
    marginBottom: 10,
    marginTop: 4 
  },
  forgotText: { 
    fontSize: 13,
    color: ACC,
    fontWeight: "600" },

  btn: {
    backgroundColor: ACC,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  footerText: { fontSize: 14, color: MUTED },
  footerLink: { fontSize: 14, color: ACC, fontWeight: "600" },

  forgotBox: {
  backgroundColor: "#F8F9FC",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  padding: 14,
  marginBottom: 18,
  gap: 10,
},

forgotTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: TEXT,
  marginBottom: 4,
},

smallBtn: {
  backgroundColor: ACC,
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: "center",
},

smallBtnText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "700",
},

cancelForgotBtn: {
  alignItems: "center",
  paddingVertical: 6,
},

cancelForgotText: {
  color: MUTED,
  fontSize: 13,
  fontWeight: "600",
},
});