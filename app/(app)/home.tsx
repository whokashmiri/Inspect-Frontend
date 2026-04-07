import { Text, View, StyleSheet } from "react-native";
import { useAuth } from "../../api/AuthContext";

export default function HomeScreen() {
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome back</Text>
      <Text style={styles.company}>
        {user?.companyName ?? "Your company"}
      </Text>
      <Text style={styles.message}>
        We’ll keep this space clean until new features arrive.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  company: {
    fontSize: 16,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.72)",
    marginTop: 12,
    textTransform: "uppercase",
  },
  message: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 8,
  },
});
