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
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useAuth } from "../../api/AuthContext";
import { ApiError } from "../../api/api";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";

type UserRole = "Manager" | "Inspector" | "Valuator";

function defaultCompanyName(email: string): string {
  const prefix = email.split("@")[0];
  if (!prefix) return "";
  return prefix.charAt(0).toUpperCase() + prefix.slice(1) + "'s company";
}

export default function SignupScreen() {
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();
  const { signup } = useAuth();

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("Inspector");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyTouched, setCompanyTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    role?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    companyName?: string;
  }>({});

  const companyPlaceholder = email.includes("@")
    ? defaultCompanyName(email)
    : "e.g. Acme Corp";

  const resolvedCompany = companyTouched
    ? companyName.trim()
    : defaultCompanyName(email);

  if (!loaded) return null;

  function clearGlobalMessages() {
    if (globalError) setGlobalError(null);
    if (successMessage) setSuccessMessage(null);
  }

  function validate() {
    const e: typeof errors = {};

    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!role) e.role = "Role is required.";

    if (!email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email.";

    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "At least 8 characters.";

    if (!confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (confirmPassword !== password) {
      e.confirmPassword = "Passwords don't match.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    clearGlobalMessages();

    if (!validate()) return;

    setLoading(true);

    try {
      await signup({
        fullName: fullName.trim(),
        role,
        email: email.trim().toLowerCase(),
        password,
        companyName: resolvedCompany,
      });

      setSuccessMessage("Account created successfully. Redirecting to login...");
      setTimeout(() => {
        router.replace("/login");
      }, 700);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.message || "Something went wrong.";
        const lower = message.toLowerCase();

        if (lower.includes("email")) {
          setErrors((prev) => ({
            ...prev,
            email: message,
          }));
        } else if (lower.includes("password")) {
          setErrors((prev) => ({
            ...prev,
            password: message,
          }));
        } else if (lower.includes("full name")) {
          setErrors((prev) => ({
            ...prev,
            fullName: message,
          }));
        } else if (lower.includes("company")) {
          setGlobalError(message);
        } else if (lower.includes("manager")) {
          setGlobalError(message);
        } else {
          setGlobalError(message);
        }
      } else {
        setGlobalError("Something went wrong. Please try again.");
      }
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="Enter Your Full Name"
              placeholderTextColor="#555"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                clearGlobalMessages();
                if (errors.fullName) {
                  setErrors((e) => ({ ...e, fullName: undefined }));
                }
              }}
              autoCapitalize="words"
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={[styles.pickerWrap, errors.role && styles.inputError]}>
              <Picker
                selectedValue={role}
                mode="dropdown"
                onValueChange={(itemValue) => {
                  setRole(itemValue as UserRole);
                  clearGlobalMessages();
                  if (errors.role) {
                    setErrors((e) => ({ ...e, role: undefined }));
                  }
                }}
                dropdownIconColor="#fff"
                style={styles.picker}
              >
                <Picker.Item label="Manager" value="Manager" />
                <Picker.Item label="Inspector" value="Inspector" />
                <Picker.Item label="Valuator" value="Valuator" />
              </Picker>
            </View>
            {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor="#555"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearGlobalMessages();
                if (errors.email) {
                  setErrors((e) => ({ ...e, email: undefined }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, errors.password && styles.inputError]}>
              <TextInput
                style={styles.inputInner}
                placeholder="Min. 8 characters"
                placeholderTextColor="#555"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearGlobalMessages();
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
                  clearGlobalMessages();
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

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Company Name</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>optional</Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder={companyPlaceholder}
              placeholderTextColor="#444"
              value={companyName}
              onChangeText={(t) => {
                setCompanyName(t);
                setCompanyTouched(true);
                clearGlobalMessages();
              }}
              onBlur={() => {
                if (!companyName.trim()) setCompanyTouched(false);
              }}
              autoCapitalize="words"
            />
            {!companyTouched && email.includes("@") && (
              <Text style={styles.hintText}>
                Defaults to "{companyPlaceholder}"
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ACC = "#C8F135";
const SURFACE = "#111";
const BORDER = "#222";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 40 },
  backBtn: { marginBottom: 24 },
  backIcon: { fontSize: 22, color: "#fff" },
  header: { alignItems: "center", marginBottom: 36 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
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
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: "#666" },
  form: { gap: 4 },
  fieldGroup: { marginBottom: 14 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 8,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  optionalBadge: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionalText: { fontSize: 7, color: "#555", fontWeight: "600" },
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
  pickerWrap: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    height: 48,
    borderRadius: 12,
  },
  picker: {
    color: "#fff",
    height: 58,
    width: "100%",
    overflow: "hidden",
    marginLeft: 0,
    marginTop: Platform.OS === "android" ? -4 : 0,
  },
  eyeBtn: { paddingRight: 14 },
  eyeIcon: { fontSize: 18 },
  inputError: { borderColor: "#FF453A" },
  errorText: { fontSize: 12, color: "#FF453A", marginTop: 5, marginLeft: 2 },
  hintText: { fontSize: 12, color: "#444", marginTop: 5, marginLeft: 2 },

  errorBanner: {
    backgroundColor: "rgba(255, 69, 58, 0.12)",
    borderColor: "#FF453A",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#FF7B72",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  successBanner: {
    backgroundColor: "rgba(200, 241, 53, 0.12)",
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
    fontSize: 14,
    color: "#000",
    letterSpacing: 0.2,
  },
});