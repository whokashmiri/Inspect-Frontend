import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useFocusEffect, useRouter } from "expo-router";
import { transactionApi } from "../../../api/api";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const BG = "#F8F9FC";

function MediaViewerItem({ item }: { item: any }) {
  const screen = Dimensions.get("window");
  const isVideo = item.mediaType === "video";

  const player = useVideoPlayer(isVideo ? item.url : null, (player) => {
    player.loop = false;
  });

  return (
    <View style={[styles.viewerPage, { height: screen.height }]}>
      {isVideo ? (
        <VideoView
          player={player}
          style={styles.viewerMedia}
          nativeControls
          contentFit="contain"
        />
      ) : (
        <Image
          source={{ uri: item.url || item.uri }}
          style={styles.viewerMedia}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

export default function TransactionsScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
const [viewerLoading, setViewerLoading] = useState(false);
const [viewerMedia, setViewerMedia] = useState<any[]>([]);
const [activeMediaIndex, setActiveMediaIndex] = useState(0);

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
  const transactionId = item.id || item._id;

  if (!transactionId) {
    console.log("Missing transaction id:", item);
    return;
  }

  const qs = `?transactionId=${encodeURIComponent(String(transactionId))}&projectId=${encodeURIComponent(
    String(item.projectId || transactionId)
  )}&propertyType=${encodeURIComponent(
    String(item.evalData?.propertyType || "Not available")
  )}`;

  // console.log("Navigating to AssetInspection with:", { item, qs });

  router.push(`/inspection/AssetInspection${qs}`);
};

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ACC} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  const openMediaViewer = async (item: any) => {
  const transactionId = item.id || item._id;

  if (!transactionId) return;

  try {
    setViewerLoading(true);
    setViewerVisible(true);
    setActiveMediaIndex(0);

    const res = await transactionApi.getById(String(transactionId));
    const media = res.data?.media || [];

    setViewerMedia(Array.isArray(media) ? media : []);
  } catch (error) {
    console.log("Failed to load media", error);
    setViewerMedia([]);
  } finally {
    setViewerLoading(false);
  }
};

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

  <View style={styles.footerActions}>
    <Pressable
      onPress={() => openMediaViewer(item)}
      style={styles.eyeBtn}
    >
      <Ionicons name="eye-outline" size={18} color={ACC} />
      <Text style={styles.eyeText}>View</Text>
    </Pressable>

    <Text style={styles.editText}>Edit Inspection →</Text>
  </View>
</View>
            </Pressable>
          );
        }}
      />

      <Modal
  visible={viewerVisible}
  transparent={false}
  animationType="slide"
  onRequestClose={() => setViewerVisible(false)}
>
  <View style={styles.viewerWrap}>
    <View style={styles.viewerHeader}>
      <Pressable
        onPress={() => setViewerVisible(false)}
        style={styles.viewerClose}
      >
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      <Text style={styles.viewerCount}>
        {viewerMedia.length > 0
          ? `${activeMediaIndex + 1} / ${viewerMedia.length}`
          : "No media"}
      </Text>
    </View>

    {viewerLoading ? (
      <View style={styles.viewerCenter}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.viewerEmptyText}>Loading media...</Text>
      </View>
    ) : viewerMedia.length === 0 ? (
      <View style={styles.viewerCenter}>
        <Ionicons name="images-outline" size={46} color="#fff" />
        <Text style={styles.viewerEmptyText}>No images or videos found</Text>
      </View>
    ) : (
      <FlatList
        data={viewerMedia}
        keyExtractor={(item, index) => `${item.id || item.url}-${index}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const height = Dimensions.get("window").height;
          const index = Math.round(e.nativeEvent.contentOffset.y / height);
          setActiveMediaIndex(index);
        }}
        renderItem={({ item }) => (
          <MediaViewerItem item={item} />
        )}
      />
    )}
  </View>
</Modal>
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

  footerActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
},

eyeBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  backgroundColor: SURFACE,
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 999,
},

eyeText: {
  color: ACC,
  fontSize: 12,
  fontWeight: "900",
},

viewerWrap: {
  flex: 1,
  backgroundColor: "#000",
},

viewerHeader: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  paddingTop: 46,
  paddingHorizontal: 18,
  paddingBottom: 12,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.35)",
},

viewerClose: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: "rgba(255,255,255,0.18)",
  alignItems: "center",
  justifyContent: "center",
},

viewerCount: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "900",
},

viewerCenter: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
},

viewerEmptyText: {
  color: "#fff",
  marginTop: 12,
  fontSize: 14,
  fontWeight: "700",
},

viewerPage: {
  width: "100%",
  backgroundColor: "#000",
  alignItems: "center",
  justifyContent: "center",
},

viewerMedia: {
  width: "100%",
  height: "100%",
},
});