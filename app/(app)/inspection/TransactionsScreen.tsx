import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { transactionApi } from "../../../api/api";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const BG = "#F8F9FC";

export default function TransactionsScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    try {
      const res = await transactionApi.list();
      setTransactions(res.data || []);
    } catch (error) {
      console.log("Failed to load transactions", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const openInspection = (item: any) => {
    router.push({
      pathname: "/inspection/AssetInspection",
      params: {
        transactionId: item.id || item._id,
        projectId: item.projectId || item.templateId || "",
        propertyType: item.evalData?.propertyType || "",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ACC} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Select a transaction to edit inspection</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptyText}>
              Transactions will appear here once available.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const evalData = item.evalData || {};

          return (
            <Pressable onPress={() => openInspection(item)} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.assignment}>
                    Assignment #{item.assignmentNumber || "-"}
                  </Text>
                  <Text style={styles.owner}>
                    {evalData.ownerName || "No owner name"}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.priority || "normal"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{evalData.cityName || "-"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Neighborhood</Text>
                <Text style={styles.infoValue}>
                  {evalData.neighborhoodName || "-"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Property Type</Text>
                <Text style={styles.infoValue}>
                  {evalData.propertyType || "-"}
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Images: {item.imagesCount || 0}
                </Text>

                <Text style={styles.editText}>Edit Inspection →</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontSize: 13,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: "500",
    color: TEXT,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  listContent: {
    padding: 18,
    paddingBottom: 26,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  assignment: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT,
  },
  owner: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  badge: {
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: ACC,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  infoLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: "700",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12.5,
    color: TEXT,
    fontWeight: "700",
  },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: MUTED,
    fontWeight: "700",
  },
  editText: {
    fontSize: 13,
    color: ACC,
    fontWeight: "900",
  },
  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: TEXT,
  },
  emptyText: {
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
    marginTop: 6,
  },
});