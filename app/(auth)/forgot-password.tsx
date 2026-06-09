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
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";
import { useRouter } from "expo-router";
import { ApiError, authApi } from "../../api/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const [step, setStep] = useState<"phone" | "otp" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{
  visible: boolean;
  type: "success" | "error" | "info";
  message: string;
}>({
  visible: false,
  type: "info",
  message: "",
});

function showSnackbar(
  message: string,
  type: "success" | "error" | "info" = "info"
) {
  setSnackbar({ visible: true, type, message });

  setTimeout(() => {
    setSnackbar((prev) => ({ ...prev, visible: false }));
  }, 2500);
}

  async function handleSendOtp() {
    if (!phone.trim()) {
      showSnackbar("Phone number is required.", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.requestResetPasswordOtp({
        phone: phone.trim(),
      });

      setPhone(res.phone || phone.trim());
      setStep("otp");
showSnackbar("OTP sent. Please check your phone.", "success");
    } catch (err) {
      showSnackbar(
        err instanceof ApiError ? err.message : "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      showSnackbar("OTP is required.", "error");
      return;
    }

    if (otp.trim().length !== 4) {
      showSnackbar("OTP must be 4 digits.", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.verifyResetPasswordOtp({
        phone: phone.trim(),
        otp: otp.trim(),
      });

      setResetToken(res.resetToken);
      setStep("password");
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (password.length < 6) {
      Alert.alert("Invalid Password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      
      showSnackbar("Passwords do not match.", "error");
      return;
    }

    try {
      setLoading(true);

      await authApi.resetPassword({
        resetToken,
        password,
      });

      showSnackbar("Password updated. Please login.", "success");

setTimeout(() => {
  router.replace("/login");
}, 900);
     
    } catch (err) {
      showSnackbar(
        err instanceof ApiError ? err.message : "Something went wrong",
        "error"
      );
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Reset your password using your phone number.
          </Text>
        </View>

        <View style={styles.form}>
          {step === "phone" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number</Text>

                <View style={styles.inputRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefixText}>+966</Text>
                  </View>

                  <View style={styles.prefixDivider} />

                  <TextInput
                    style={styles.inputInner}
                    placeholder="5XXXXXXXX"
                    placeholderTextColor="#555"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === "otp" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Verification Code</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter 4-digit OTP"
                  placeholderTextColor="#555"
                  value={otp}
                  onChangeText={(v) =>
                    setOtp(v.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setStep("phone")}
                disabled={loading}
              >
                <Text style={styles.secondaryText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "password" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>New Password</Text>

                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm Password</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#555"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Set New Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.loginText}>Remember password? </Text>
            <Text style={styles.loginLinkText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {snackbar.visible && (
  <View
    style={[
      styles.snackbar,
      snackbar.type === "success" && styles.snackbarSuccess,
      snackbar.type === "error" && styles.snackbarError,
    ]}
  >
    <Text style={styles.snackbarText}>{snackbar.message}</Text>
  </View>
)}
    
    
    </KeyboardAvoidingView>
  );
}

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },

  backBtn: {
    position: "absolute",
    top: 28,
    left: 28,
    zIndex: 10,
  },

  backText: {
    fontSize: 14,
    color: ACC,
    fontWeight: "700",
  },

  snackbar: {
  position: "absolute",
  left: 24,
  right: 24,
  bottom: 34,
  backgroundColor: ACC,
  borderRadius: 14,
  paddingVertical: 14,
  paddingHorizontal: 16,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
},

snackbarSuccess: {
  backgroundColor: "#1F7A4D",
},

snackbarError: {
  backgroundColor: "#B3261E",
},

snackbarText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "700",
  textAlign: "center",
},

  header: {
    alignItems: "center",
    marginBottom: 38,
  },

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
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },

  form: {
    gap: 6,
  },

  fieldGroup: {
    marginBottom: 14,
  },

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

  btn: {
    backgroundColor: ACC,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },

  btnDisabled: {
    opacity: 0.6,
  },

  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },

  secondaryText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "700",
  },

  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  loginText: {
    fontSize: 14,
    color: MUTED,
  },

  loginLinkText: {
    fontSize: 14,
    color: ACC,
    fontWeight: "700",
  },
});