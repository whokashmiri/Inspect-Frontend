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
import { ApiError } from "../../api/api";

export default function LoginScreen() {
      const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

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
    if (!username.trim()) e.username = "Username is required.";
    if (!password) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(username.trim().toLowerCase(), password);
      // Navigation is handled by the root layout based on auth state
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Something went wrong.";
      Alert.alert("Login failed", msg);
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder="Username"
              placeholderTextColor="#555"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                if (errors.username)
                  setErrors((e) => ({ ...e, username: undefined }));
              }}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[styles.inputRow, errors.password && styles.inputError]}
            >
              <TextInput
                style={styles.inputInner}
                placeholder="Your password"
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

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
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
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        {/* <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.footerLink}>Create One</Text>
          </TouchableOpacity>
        </View> */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const ACC = "#C8F135"; // lime accent
const SURFACE = "#111";
const BORDER = "#222";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
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
    backgroundColor: "#000",
  },
  title: {
    fontFamily: fonts.inter.semiBold as unknown as string,
    fontSize: 22,
    fontWeight: "400",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: "#666" },

  form: { gap: 6 },
  fieldGroup: { marginBottom: 14 },
  label: {
    fontSize: 8,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
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
    color: "#fff",
  },
  eyeBtn: { paddingRight: 14 },
  eyeIcon: { fontSize: 18 },
  inputError: { borderColor: "#FF453A" },
  errorText: { fontSize: 12, color: "#FF453A", marginTop: 5, marginLeft: 2 },

  forgotWrap: { alignSelf: "flex-end", marginBottom: 24, marginTop: 4 },
  forgotText: { fontSize: 13, color: ACC, fontWeight: "600" },

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
    color: "#000",
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
  },
  footerText: { fontSize: 14, color: "#555" },
  footerLink: { fontSize: 14, color: ACC, fontWeight: "600" },
});