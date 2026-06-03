// signup.tsx
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
} from "react-native";
import { useRouter } from "expo-router";
import { authApi, ApiError } from "../../api/api";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";

type Step = "phone" | "otp" | "password";

export default function SignupScreen() {
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [setupToken, setSetupToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    phone?: string;
    otp?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  if (!loaded) return null;

  function clearMessages() {
    setGlobalError(null);
    setSuccessMessage(null);
  }

  function getErrorMessage(err: unknown) {
    if (err instanceof ApiError) return err.message || "Something went wrong.";
    return "Something went wrong. Please try again.";
  }

  async function handleSendOtp() {
    clearMessages();

    const cleanPhone = phone.trim();
    const e: typeof errors = {};

    if (!cleanPhone) e.phone = "Phone number is required.";

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);

    try {
      const res = await authApi.requestSignupOtp({ phone: cleanPhone });

      setPhone(res.phone || cleanPhone);
      setSuccessMessage("OTP sent successfully.");
      setStep("otp");
    } catch (err) {
      setGlobalError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

 async function handleVerifyOtp() {
  clearMessages();

  const e: typeof errors = {};

  if (!otp.trim()) e.otp = "OTP is required.";
  else if (!/^\d{4}$/.test(otp.trim())) e.otp = "OTP must be 4 digits.";

  setErrors(e);
  if (Object.keys(e).length > 0) return;

  setLoading(true);

  try {
    const res = await authApi.verifySignupOtp({
      phone: phone.trim(),
      otp: otp.trim(),
    });

    setSetupToken(res.setupToken);
    setSuccessMessage("Phone verified. Please set your password.");
    setStep("password");
  } catch (err) {
    setGlobalError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
}

  async function handleSetPassword() {
    clearMessages();

    const e: typeof errors = {};

    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Password must be at least 6 characters.";

    if (!confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (confirmPassword !== password) {
      e.confirmPassword = "Passwords don't match.";
    }

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);

    try {
      await authApi.setSignupPassword({
        setupToken,
        password,
        role: "Freelance Inspector",
      });

      setSuccessMessage("Account created successfully. Complete your profile to work.");

      setTimeout(() => {
        router.replace("/login");
      }, 900);
    } catch (err) {
      setGlobalError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const buttonText =
    step === "phone"
      ? "Send OTP"
      : step === "otp"
      ? "Verify OTP"
      : "Create Account";

  const handlePrimaryPress =
    step === "phone"
      ? handleSendOtp
      : step === "otp"
      ? handleVerifyOtp
      : handleSetPassword;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>

          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.subtitle}>
            {step === "phone"
              ? "Enter your Saudi phone number"
              : step === "otp"
              ? "Enter the OTP sent to your phone"
              : "Set your account password"}
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepActive]} />
          <View style={[styles.stepLine, step !== "phone" && styles.stepActive]} />
          <View style={[styles.stepDot, step !== "phone" && styles.stepActive]} />
          <View style={[styles.stepLine, step === "password" && styles.stepActive]} />
          <View style={[styles.stepDot, step === "password" && styles.stepActive]} />
        </View>

        <View style={styles.form}>
          {globalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{globalError}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </View>
          )}

          {step === "phone" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="05XXXXXXXX"
                placeholderTextColor="#555"
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  clearMessages();
                  if (errors.phone) {
                    setErrors((e) => ({ ...e, phone: undefined }));
                  }
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          )}

          {step === "otp" && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>OTP sent to {phone}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>OTP Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput, errors.otp && styles.inputError]}
                  placeholder="123456"
                  placeholderTextColor="#555"
                  value={otp}
                  onChangeText={(t) => {
                    setOtp(t.replace(/\D/g, "").slice(0, 6));
                    clearMessages();
                    if (errors.otp) {
                      setErrors((e) => ({ ...e, otp: undefined }));
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
              </View>

              <TouchableOpacity
                disabled={loading}
                onPress={handleSendOtp}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "password" && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Complete your profile to work after login.</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputRow, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#555"
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      clearMessages();
                      if (errors.password) {
                        setErrors((e) => ({ ...e, password: undefined }));
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    errors.confirmPassword && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.inputInner}
                    placeholder="Re-enter password"
                    placeholderTextColor="#555"
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      clearMessages();
                      if (errors.confirmPassword) {
                        setErrors((e) => ({ ...e, confirmPassword: undefined }));
                      }
                    }}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((v) => !v)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeIcon}>{showConfirm ? "🙈" : "👁️"}</Text>
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handlePrimaryPress}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>{buttonText}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.loginText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  flex: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 28 },
  backBtn: { marginBottom: 24 },
  backIcon: { fontSize: 22, color: TEXT },

  header: { alignItems: "center", marginBottom: 24 },
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
    textAlign: "center",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: BORDER,
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: BORDER,
    marginHorizontal: 6,
  },
  stepActive: { backgroundColor: ACC },

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
  otpInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: "700",
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

  errorBanner: {
    backgroundColor: "rgba(255, 69, 58, 0.08)",
    borderColor: "#FF453A",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  successBanner: {
    backgroundColor: "rgba(42, 50, 75, 0.08)",
    borderColor: ACC,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  successBannerText: {
    color: ACC,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "600",
  },

  infoBox: {
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
  },

  btn: {
    backgroundColor: ACC,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    fontFamily: fonts.inter.semiBold as unknown as string,
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  secondaryText: {
    color: ACC,
    fontSize: 13,
    fontWeight: "600",
  },

  loginLink: {
    marginTop: 18,
    alignItems: "center",
  },
  loginText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
  },
});