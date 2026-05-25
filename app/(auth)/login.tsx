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

  type ForgotStep = "closed" | "phone" | "otp" | "password";

const [forgotStep, setForgotStep] = useState<ForgotStep>("closed");
const [forgotPhone, setForgotPhone] = useState("");
const [forgotOtp, setForgotOtp] = useState("");
const [resetToken, setResetToken] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmNewPassword, setConfirmNewPassword] = useState("");

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
      await login(username.trim().toLowerCase(), password);
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
          <Text style={styles.title}>{t("login.title")}</Text>
          <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("login.username")}</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder={t("login.usernamePlaceholder")}
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

        <TouchableOpacity
  style={styles.footer}
  onPress={() => router.push("/signup")}
>
  <Text style={styles.footerText}>Don't have an account? </Text>
  <Text style={styles.footerLink}>Create One</Text>
</TouchableOpacity>

{forgotStep !== "closed" && (
  <View style={styles.forgotBox}>
    <Text style={styles.forgotTitle}>Reset Password</Text>

    {forgotStep === "phone" && (
      <>
        <TextInput
          style={styles.input}
          placeholder="05XXXXXXXX"
          placeholderTextColor="#555"
          value={forgotPhone}
          onChangeText={setForgotPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={styles.smallBtn}
          onPress={async () => {
            try {
              setLoading(true);
              const res = await authApi.requestResetPasswordOtp({
                phone: forgotPhone.trim(),
              });
              setForgotPhone(res.phone || forgotPhone.trim());
              setForgotStep("otp");
              Alert.alert("OTP Sent", "Please check your phone.");
            } catch (err) {
              Alert.alert(
                "Failed",
                err instanceof ApiError ? err.message : "Something went wrong"
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.smallBtnText}>Send OTP</Text>
        </TouchableOpacity>
      </>
    )}

    {forgotStep === "otp" && (
      <>
        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          placeholderTextColor="#555"
          value={forgotOtp}
          onChangeText={(v) => setForgotOtp(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity
          style={styles.smallBtn}
          onPress={async () => {
            try {
              setLoading(true);
              const res = await authApi.verifyResetPasswordOtp({
                phone: forgotPhone.trim(),
                otp: forgotOtp.trim(),
              });
              setResetToken(res.resetToken);
              setForgotStep("password");
            } catch (err) {
              Alert.alert(
                "Failed",
                err instanceof ApiError ? err.message : "Something went wrong"
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.smallBtnText}>Verify OTP</Text>
        </TouchableOpacity>
      </>
    )}

    {forgotStep === "password" && (
      <>
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor="#555"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#555"
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.smallBtn}
          onPress={async () => {
            if (newPassword.length < 6) {
              Alert.alert("Invalid Password", "Password must be at least 6 characters.");
              return;
            }

            if (newPassword !== confirmNewPassword) {
              Alert.alert("Invalid Password", "Passwords do not match.");
              return;
            }

            try {
              setLoading(true);

              await authApi.resetPassword({
                resetToken,
                password: newPassword,
              });

              Alert.alert("Success", "Password updated. Please login.");

              setForgotStep("closed");
              setForgotPhone("");
              setForgotOtp("");
              setResetToken("");
              setNewPassword("");
              setConfirmNewPassword("");
            } catch (err) {
              Alert.alert(
                "Failed",
                err instanceof ApiError ? err.message : "Something went wrong"
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.smallBtnText}>Set New Password</Text>
        </TouchableOpacity>
      </>
    )}

    <TouchableOpacity
      style={styles.cancelForgotBtn}
      onPress={() => setForgotStep("closed")}
    >
      <Text style={styles.cancelForgotText}>Cancel</Text>
    </TouchableOpacity>
  </View>
)}

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
    marginBottom: 6,
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
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 36,
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