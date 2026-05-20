

//TransactionScreen.jsx
import React, { useCallback,useEffect, useRef, useState } from "react";
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
  getPendingInspectionSyncItems,
  getPendingInspectionSyncCount,
  markInspectionSyncDone,
  dedupeMedia 
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

const SCREEN_WIDTH = Dimensions.get("window").width;



function MediaVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.videoPlayer}
      nativeControls
    />
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

const [syncingTransactionIds, setSyncingTransactionIds] = useState<Record<string, boolean>>({});


const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const [downloading, setDownloading] = useState(false);


const [isOnline, setIsOnline] = useState(true);
const [pendingSyncCount, setPendingSyncCount] = useState(0);
const [syncing, setSyncing] = useState(false);

const syncingRef = useRef(false);



const dedupeTransactions = (items: any[]) => {
  const map = new Map();

  for (const item of items) {
    const id = String(item.id || item._id);
    if (!id) continue;

    map.set(id, item);
  }

  return Array.from(map.values());
};
const loadTransactions = async ({ reset = true } = {}) => {
  try {
    if (reset) {
      setLoading(true);
      setPage(1);
    }

   
    const net = await NetInfo.fetch();
    const isOnline = !!net.isConnected && net.isInternetReachable !== false;

    if (isOnline) {

;
      const res = await transactionApi.downloadCompany({
        page: reset ? 1 : page,
        limit: 10,
      });



      const downloaded = await downloadTransactionMedia(res.transactions || []);

if (reset) {
  await saveOfflineTransactions(downloaded);
} else {
  const merged = [...transactions, ...downloaded];
  await saveOfflineTransactions(merged);
}

setTransactions((prev) =>
  dedupeTransactions(reset ? downloaded : [...prev, ...downloaded])
);
      setHasMore(Boolean(res.hasMore));
      setPage((prev) => (reset ? 2 : prev + 1));

      return;
    }

    const offlineData = await getOfflineTransactions();

    setTransactions(dedupeTransactions(offlineData));
    setHasMore(false);
  } catch (error) {
    console.log("Failed to load transactions", error);

    const offlineData = await getOfflineTransactions();
    setTransactions(dedupeTransactions(offlineData));
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

const refreshPendingCount = async () => {
  const count = await getPendingInspectionSyncCount();
  setPendingSyncCount(count);
};

const syncPendingInspections = async () => {
  if (syncingRef.current) {
    console.log("[SYNC] skipped because already syncing");
    return;
  }

  syncingRef.current = true;
  setSyncing(true);

  try {
    const net = await NetInfo.fetch();
    const online = !!net.isConnected && net.isInternetReachable !== false;

    setIsOnline(online);

    if (!online) return;

    const pending = await getPendingInspectionSyncItems();

    console.log("[SYNC] pending items", pending.length);

    if (pending.length === 0) {
      setPendingSyncCount(0);
      return;
    }

  for (const item of pending) {
  const transactionId = String(item.transactionId);

  setSyncingTransactionIds((prev) => ({
    ...prev,
    [transactionId]: true,
  }));

  try {
    console.log("[SYNC] processing item", {
      queueId: item.id,
      transactionId: item.transactionId,
    });

    const data = JSON.parse(item.data || "{}");
    const media = dedupeMedia(JSON.parse(item.media || "[]"));

    const payload = { ...data };
    delete payload.projectId;

    await transactionApi.updateInspectionData(item.transactionId, payload);

    const uploadMedia = media.filter((m: any) => {
      return (
        m.isLocalOnly === true &&
        !m.uploadedAt &&
        !m.serverId &&
        !m.id &&
        !m._id &&
        !m.url
      );
    });

    if (uploadMedia.length > 0) {
      await transactionApi.addMedia({
        transactionId,
        media: uploadMedia,
      });
    }

    await markInspectionSyncDone(item.id);

    const remaining = await getPendingInspectionSyncCount();
    setPendingSyncCount(remaining);

    const fresh = await transactionApi.getById(transactionId);
    const serverTx = fresh.data;

    const offlineData = await getOfflineTransactions();

    const updatedOfflineData = offlineData.map((tx: any) => {
      const txId = String(tx.id || tx._id);

      if (txId !== transactionId) return tx;

      const serverMedia = dedupeMedia(serverTx.media || []);

      return {
        ...serverTx,
        media: serverMedia,
        imagesCount: serverMedia.length,
        hasPendingInspectionSync: false,
        lastSyncedAt: new Date().toISOString(),
      };
    });

    await saveOfflineTransactions(updatedOfflineData);
    setTransactions(dedupeTransactions(updatedOfflineData));
  } finally {
    setSyncingTransactionIds((prev) => {
      const next = { ...prev };
      delete next[transactionId];
      return next;
    });
  }
}

    await refreshPendingCount();
  } catch (error) {
    console.log("Sync pending inspections failed:", error);
  } finally {
    syncingRef.current = false;
    setSyncing(false);
  }
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

    setTransactions(dedupeTransactions(downloaded));
    setPage(2);
    setHasMore(Boolean(res.hasMore));
  } catch (error) {
    console.log("Refresh download failed:", error);

    const offlineData = await getOfflineTransactions();
   setTransactions(dedupeTransactions(offlineData));
  } finally {
    setDownloading(false);
  }
};

  

  useEffect(() => {
  refreshPendingCount();

  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = !!state.isConnected && !!state.isInternetReachable;
    setIsOnline(online);

    if (online) {
      syncPendingInspections();
    }
  });

  return unsubscribe;
}, []);


useFocusEffect(
  useCallback(() => {
    const loadLocalFirst = async () => {
      const offlineData = await getOfflineTransactions();

      if (offlineData.length > 0) {
        setTransactions(dedupeTransactions(offlineData));
        setLoading(false);
      } else {
        await loadTransactions();
      }

      await refreshPendingCount();
      await syncPendingInspections();
    };

    loadLocalFirst();
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

  const projectId = item.projectId;



 const qs = `?transactionId=${encodeURIComponent(String(transactionId))}&projectId=${encodeURIComponent(
  String(projectId || "")
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

const normalizeMedia = (media = []) =>
  dedupeMedia(media)
    .map((m) => ({
      ...m,
      uri: m.uri || m.localUri || m.fileUri || m.url,
      mediaType:
        m.mediaType ||
        m.type ||
        (String(m.mimeType || "").startsWith("video") ? "video" : "image"),
    }))
    .filter((m) => !!m.uri);

const openMediaViewer = async (item:any) => {
  const transactionId = item.id || item._id;
  if (!transactionId) return;

  try {
    setViewerLoading(true);
    setViewerVisible(true);
    setActiveMediaIndex(0);

    let media = item.media || [];

    if (isOnline) {
      const res = await transactionApi.getById(String(transactionId));
      media = res.data?.media || media;
    }

    setViewerMedia(normalizeMedia(media));
  } catch (error) {
    console.log("Failed to load media", error);
    setViewerMedia(normalizeMedia(item.media || []));
  } finally {
    setViewerLoading(false);
  }
};



  return (
    <View style={styles.flex}>
     <View style={styles.header}>
  <View style={styles.headerTop}>
    <View style={styles.headerTitleWrap}>
  <Text style={styles.title} numberOfLines={1}>
    Transactions
  </Text>
</View>

    <View style={styles.headerActions}>
  <View style={styles.netStatus}>
    <Ionicons
      name="wifi"
      size={18}
      color={isOnline ? "#168044" : "#9CA3AF"}
    />
  </View>

 <Pressable
  onPress={syncPendingInspections}
  style={[
    styles.syncBtn,
    (!isOnline || pendingSyncCount === 0) && !syncing && styles.syncBtnDisabled,
  ]}
  disabled={syncing || !isOnline || pendingSyncCount === 0}
>
  <Ionicons name="sync-outline" size={16} color="#fff" />

  <Text style={styles.syncText}>
    {syncing
      ? "Syncing"
      : pendingSyncCount > 0
      ? `${pendingSyncCount}`
      : "Synced"}
  </Text>
</Pressable>

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
</View>

     <FlatList
  data={transactions}
  keyExtractor={(item, index) => `${item.id || item._id}-${index}`}
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
  <View style={styles.imageCountWrap}>
  <Text style={styles.footerText}>
    Images: {dedupeMedia(item.media || []).length || item.imagesCount || 0}
  </Text>

 {syncingTransactionIds[String(item.id || item._id)] ? (
  <Ionicons name="sync-outline" size={16} color={ACC} />
) : item.hasPendingInspectionSync ? (
  <Ionicons name="sync-outline" size={16} color="#9CA3AF" />
) : (
  <View style={styles.syncedTicks}>
    <Ionicons name="checkmark-done" size={17} color="#168044" />
  </View>
)}
</View>

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
    {/* Header */}
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

    {/* Body */}
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
        keyExtractor={(_, index) => `media-${index}`}
        showsVerticalScrollIndicator={false}
        pagingEnabled                          // ✅ replaces snapToInterval
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={({ viewableItems }) => {   // ✅ replaces onMomentumScrollEnd
          if (viewableItems.length > 0) {
            setActiveMediaIndex(viewableItems[0].index ?? 0);
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        contentContainerStyle={{ flexGrow: 1 }}
        renderItem={({ item }) => (             // ✅ inline render like the working modal
          <View
            style={{
              width: SCREEN_WIDTH,
              height: Dimensions.get("window").height,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#000",
            }}
          >
            {item.mediaType === "video" ? (
              <MediaVideoPlayer key={item.uri} uri={item.uri} />
            ) : (
              <Image
                source={{ uri: item.uri }}
                style={{
                  width: SCREEN_WIDTH,
                  height: Dimensions.get("window").height,
                }}
                resizeMode="contain"
              />
            )}
          </View>
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

  syncBtn: {
  height: 36,
  minWidth: 86,
  paddingHorizontal: 12,
  borderRadius: 18,
  backgroundColor: "#168044",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
},
syncedTicks: {
  flexDirection: "row",
  alignItems: "center",
},
header: {
  paddingHorizontal: 16,
  paddingTop: Platform.OS === "ios" ? 14 : 10,
  paddingBottom: 4,
},
  title: {
    fontSize: 20,
    fontWeight: "500",
    color: TEXT,
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
  gap: 10,
},

headerTitleWrap: {
  flex: 1,
  minWidth: 0,
},


refreshBtn: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: ACC,
  alignItems: "center",
  justifyContent: "center",
},


badgesWrap: {
  flexDirection: "row", 
  alignItems: "center", 
  gap: 4,               
  // backgroundColor: "red",
          
},

imageCountWrap: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

headerActions: {
  flexShrink: 0,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
},


netStatus: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
},


syncText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "900",
},

syncBtnDisabled: {
  backgroundColor: "#7A869A",
},

completedBadge: {
  backgroundColor: "#DDF8E7",
  borderColor: "#8CE0AA",
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
  marginBottom:5,
},

completedText: {
  color: "#168044",
  fontSize: 10,
  fontWeight: "500",
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
      marginTop: 4,
    
  },


  videoPlayer: {
  width: "100%",
  height: "100%",
  backgroundColor: "#000",
},
  badgeText: {
    fontSize: 10,
    fontWeight: "500",
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