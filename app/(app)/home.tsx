import { Text, View, StyleSheet, Pressable } from "react-native";
import { useAuth } from "../../api/AuthContext";
import { useFonts } from 'expo-font';
import  fonts  from '../fonts/fonts';

export default function HomeScreen() {

       const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });
  const { user } = useAuth();

  const handleCompanyPress = () => {
    console.log("Company pressed");
    // navigate or open modal here
  };

  return (
    <View style={styles.flex}>
      <View style={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Manage your workspace seamlessly
          </Text>
        </View>

        {/* Company Button */}
        <Pressable style={styles.companyBtn} onPress={handleCompanyPress}>
          <Text style={styles.companyBtnText}>
            {user?.companyName ?? "Your Company"}
          </Text>
        </Pressable>

        {/* Message */}
        <Text style={styles.message}>
          We’ll keep this space clean until new features arrive.
        </Text>

      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const ACC = "#C8F135";
const SURFACE = "#111";
const BORDER = "#222";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },

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

  subtitle: {
    fontSize: 15,
    color: "#666",
  },

  // 🔥 Company Button (New)
  companyBtn: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 18,
  },

  companyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: ACC,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
  },
});