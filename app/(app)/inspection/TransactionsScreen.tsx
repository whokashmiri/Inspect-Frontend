

//TransactionScreen.jsx
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
  useWindowDimensions,
  Platform,
} from "react-native";

import NetInfo from "@react-native-community/netinfo";
import {
  getOfflineTransactions,
  saveOfflineTransactions,
  downloadTransactionMedia,
} from "../../offline/transactionsOffline";

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
  const { width, height } = useWindowDimensions();

  const isVideo =
    item.mediaType === "video" ||
    item.mimeType?.startsWith?.("video");

  const uri = item.localUri || item.url || item.uri;

  const mediaWidth = width;
  const mediaHeight = height * 0.76;

  const player = useVideoPlayer(isVideo ? uri : null, (player) => {
    player.loop = false;
  });

  return (
    <View style={[styles.viewerPage, { width, height }]}>
      <View style={styles.viewerMediaCenter}>
        {isVideo ? (
          <VideoView
            player={player}
            style={{
              width: mediaWidth,
              height: mediaHeight,
            }}
            nativeControls
            contentFit="contain"
          />
        ) : (
          <Image
            source={{ uri }}
            style={{
              width: mediaWidth,
              height: mediaHeight,
            }}
            resizeMode="contain"
          />
        )}
      </View>
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


const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const [downloading, setDownloading] = useState(false);

const loadTransactions = async ({ reset = true } = {}) => {
  try {
    if (reset) {
      setLoading(true);
      setPage(1);
    }

   
    const net = await NetInfo.fetch();
    const isOnline = !!net.isConnected && !!net.isInternetReachable;

    if (isOnline) {

;
      const res = await transactionApi.downloadCompany({
        page: reset ? 1 : page,
        limit: 10,
      });

            console.log("TRANSACTION DOWNLOAD:", {
  success: res.success,
  companyId: res.companyId,
  total: res.total,
  count: res.transactions?.length ?? 0,
  hasMore: res.hasMore,
})

      const downloaded = await downloadTransactionMedia(res.transactions || []);

if (reset) {
  await saveOfflineTransactions(downloaded);
} else {
  const merged = [...transactions, ...downloaded];
  await saveOfflineTransactions(merged);
}

setTransactions((prev) =>
  reset ? downloaded : [...prev, ...downloaded]
);
      setHasMore(Boolean(res.hasMore));
      setPage((prev) => (reset ? 2 : prev + 1));

      return;
    }

    const offlineData = await getOfflineTransactions();

    setTransactions(offlineData);
    setHasMore(false);
  } catch (error) {
    console.log("Failed to load transactions", error);

    const offlineData = await getOfflineTransactions();
    setTransactions(offlineData);
    setHasMore(false);
  } finally {
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }
};

const loadMoreTransactions = () => {
  if (loadingMore || loading || refreshing || !hasMore) return;

  setLoadingMore(true);
  loadTransactions({ reset: false });
};

const refreshAndDownload = async () => {
  try {
    setDownloading(true);

    const res = await transactionApi.downloadCompany({
      
      page: 1,
      limit: 10,
    });

    const downloaded = await downloadTransactionMedia(res.transactions || []);
    await saveOfflineTransactions(downloaded);

    setTransactions(downloaded);
    setPage(2);
    setHasMore(Boolean(res.hasMore));
  } catch (error) {
    console.log("Refresh download failed:", error);

    const offlineData = await getOfflineTransactions();
    setTransactions(offlineData);
  } finally {
    setDownloading(false);
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
  <View style={styles.headerTop}>
    <View>
      <Text style={styles.title}>Transactions</Text>
      <Text style={styles.subtitle}>
        Select a transaction to edit inspection
      </Text>
    </View>

    <Pressable
      onPress={refreshAndDownload}
      style={styles.refreshBtn}
      disabled={downloading}
    >
      {downloading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Ionicons name="download-outline" size={20} color="#fff" />
      )}
    </Pressable>
  </View>
</View>

     <FlatList
  data={transactions}
  keyExtractor={(item) => String(item.id || item._id)}
  contentContainerStyle={styles.listContent}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  onEndReached={loadMoreTransactions}
  onEndReachedThreshold={0.4}
         ListFooterComponent={
    loadingMore ? (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator color={ACC} />
      </View>
    ) : null
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

                <View style={styles.badgesWrap}>
  {item.isCompleted ? (
    <View style={styles.completedBadge}>
      <Text style={styles.completedText}>Completed</Text>
    </View>
  ) : null}

  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      {item.priority || "normal"}
    </Text>
  </View>
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
  snapToInterval={Dimensions.get("window").height}
  snapToAlignment="start"
  decelerationRate="fast"
  disableIntervalMomentum
  showsVerticalScrollIndicator={false}
  removeClippedSubviews={false}
  getItemLayout={(_, index) => ({
    length: Dimensions.get("window").height,
    offset: Dimensions.get("window").height * index,
    index,
  })}
  onMomentumScrollEnd={(e) => {
    const height = Dimensions.get("window").height;
    const index = Math.round(e.nativeEvent.contentOffset.y / height);
    setActiveMediaIndex(index);
  }}
  renderItem={({ item }) => <MediaViewerItem item={item} />}
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



headerTop: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

refreshBtn: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: ACC,
  alignItems: "center",
  justifyContent: "center",
},

badgesWrap: {
  alignItems: "flex-end",
  gap: 8,
},

completedBadge: {
  backgroundColor: "#DDF8E7",
  borderColor: "#8CE0AA",
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
},

completedText: {
  color: "#168044",
  fontSize: 12,
  fontWeight: "700",
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
  paddingTop: Platform.OS === "ios" ? 54 : 34,
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
  backgroundColor: "#000",
  alignItems: "center",
  justifyContent: "center",
},

viewerMediaCenter: {
  flex: 1,
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
},

viewerMedia: {
  width: "100%",
  height: "76%",
},
});