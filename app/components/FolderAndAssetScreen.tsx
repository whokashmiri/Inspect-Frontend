import CreateAssetWizardModal from "./utils/CreateAssetWizardModal";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {AssetDraft} from "./utils/types";

import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  projectContentApi,
  AssetItem,
  FolderItem,
} from "../../api/api";

import { safeApiCall, getPendingCount, syncQueue } from "../offline";
import { Ionicons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";

type RouteParams = {
  projectId: string;
  projectName: string;
};

type FolderPathItem = {
  id: string | null;
  name: string;
};

type Props = {
  route: {
    params: RouteParams;
  };
};

const ACC = "#D4FF00";

export default function FolderAndAssetScreen({ route }: Props) {
  const folderInputRef = useRef<TextInput>(null);


  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });
  const insets = useSafeAreaInsets();

  const { projectId, projectName } = route.params;

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<FolderPathItem[]>([
    { id: null, name: projectName },
  ]);

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [navigatingFolderId, setNavigatingFolderId] = useState<string | null>(null);

    useEffect(() => {
  if (folderModalVisible) {
    const timer = setTimeout(() => {
      folderInputRef.current?.focus();
    }, 250);

    return () => clearTimeout(timer);
  }
}, [folderModalVisible]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

 const loadContents = useCallback(
  async (
    folderId: string | null,
    options?: { showSkeleton?: boolean }
  ) => {
    if (projectId.startsWith("offline_")) {
      setFolders([]);
      setAssets([]);
      setLoading(false);
      setRefreshing(false);
      setContentLoading(false);
      return;
    }

    try {
      if (options?.showSkeleton) {
        setContentLoading(true);
        setFolders([]);
        setAssets([]);
      }

      const data = await projectContentApi.listContents(projectId, folderId);
      setFolders(data.folders || []);
      setAssets(data.assets || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load contents");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setContentLoading(false);
      setNavigatingFolderId(null);
    }
  },
  [projectId]
);

  useEffect(() => {
    loadContents(null);
  }, [loadContents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncQueue();
    await loadContents(currentFolderId);
  };

  const openFolder = async (folder: FolderItem) => {
    if (navigatingFolderId) return;

    setNavigatingFolderId(folder.id);
    setCurrentFolderId(folder.id);
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);

    await loadContents(folder.id, { showSkeleton: true });
  };

  const goToPathIndex = async (index: number) => {
    if (navigatingFolderId) return;

    const nextPath = path.slice(0, index + 1);
    const selected = nextPath[nextPath.length - 1];
    const folderId = selected.id;

    setPath(nextPath);
    setCurrentFolderId(folderId);
    setNavigatingFolderId(folderId ?? "root");

    await loadContents(folderId, { showSkeleton: true });
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert("Validation", "Folder name is required");
      return;
    }

    const payload = {
      projectId,
      name: folderName.trim(),
      parentId: currentFolderId,
    };

    try {
      const result = await safeApiCall(
        () => projectContentApi.createFolder(payload),
        payload,
        { type: "createFolder", projectId }
      );

      if ("offline" in result) {
        Alert.alert("Offline", result.message);
      } else {
        Alert.alert("Success", "Folder created");
      }

      setFolderName("");
      setFolderModalVisible(false);
      await loadContents(currentFolderId, { showSkeleton: true });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create folder");
    }
  };

 const handleCreateAsset = async (draft: AssetDraft) => {
  const payload = {
    projectId,
    name: draft.name,
    writtenDescription: draft.writtenDescription || null,
    folderId: currentFolderId || undefined,
    images: draft.images || [],
    voiceNotes: draft.voiceNotes || [],
    condition: draft.condition || null,
    assetType: draft.assetType || "Other",
    brand: draft.assetType === "Vehicle" ? draft.brand || null : null,
    manufactureYear:
      draft.assetType === "Vehicle" ? draft.manufactureYear || null : null,
    kilometersDriven:
      draft.assetType === "Vehicle" ? draft.kilometersDriven || null : null,
  };

  try {
    const result = await safeApiCall(
      () => projectContentApi.createAsset(payload),
      payload,
      { type: "createAsset", projectId }
    );

    if ("offline" in result) {
      Alert.alert("Offline", result.message);
    } else {
      Alert.alert("Success", "Asset created");
    }

    setAssetModalVisible(false);
    await loadContents(currentFolderId, { showSkeleton: true });
  } catch (error: any) {
    Alert.alert("Error", error.message || "Failed to create asset");
  }
};

 
  const items = useMemo(() => {
    return [
      ...folders.map((folder) => ({ ...folder, itemType: "folder" as const })),
      ...assets.map((asset) => ({ ...asset, itemType: "asset" as const })),
    ];
  }, [folders, assets]);

  const renderSkeletons = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <View key={index} style={styles.card}>
        <View style={styles.skeletonIcon} />
        <View style={styles.cardBody}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonMeta} />
        </View>
      </View>
    ));
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.container}>
        <Text style={styles.title}>{projectName}</Text>
        <Text style={styles.subtitle}>Folders & Assets</Text>

        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>⏳ {pendingCount} offline items</Text>
            <TouchableOpacity onPress={syncQueue} style={styles.syncBtn}>
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.breadcrumbRow}>
          {path.map((crumb, index) => (
            <TouchableOpacity
              key={`${crumb.id ?? "root"}-${index}`}
              onPress={() => goToPathIndex(index)}
            >
              <Text style={styles.breadcrumbText}>
                {crumb.name}
                {index < path.length - 1 ? " / " : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading || contentLoading ? (
          <View style={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}>
          {renderSkeletons()}
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.itemType}-${item.id}`}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={[
              styles.listContentWithBottomBar,
              { paddingBottom: 120 + insets.bottom },
              ]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No contents yet</Text>
                <Text style={styles.emptyText}>
                  Create a folder or add a new asset.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.itemType === "folder") {
                const isOpening = navigatingFolderId === item.id;

                return (
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => openFolder(item)}
                    disabled={!!navigatingFolderId}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="folder-outline"
                      size={22}
                      color="#b5b0b0"
                      style={styles.cardIcon}
                    />

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardMeta}>Folder</Text>
                    </View>

                    {isOpening ? (
                      <ActivityIndicator color={ACC} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#777" />
                    )}
                  </TouchableOpacity>
                );
              }

              return (
                <View style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {/* <Text style={styles.cardMeta}>SN: {item.serialNumber}</Text> */}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.downloadBtn,
                      downloadingAssetId === item.id && styles.downloadBtnDisabled,
                    ]}
                    // onPress={() => downloadAssetImages(item)}
                    disabled={downloadingAssetId === item.id}
                  >
                    {downloadingAssetId === item.id ? (
                      <Entypo name="hour-glass" size={18} color="white" />
                    ) : (
                      <Entypo name="download" size={18} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}

        <View
            style={[
            styles.bottomActionBar,
            { bottom: Math.max(insets.bottom, 12) + 8 },
            ]}
            >
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setFolderModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>New Folder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setAssetModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>New Asset</Text>
          </TouchableOpacity>
        </View>



            <Modal
  visible={folderModalVisible}
  animationType="slide"
  transparent
  statusBarTranslucent
  onRequestClose={() => setFolderModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        style={styles.modalKeyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Folder</Text>

            <TextInput
              ref={folderInputRef}
              style={styles.input}
              placeholder="Folder Name"
              placeholderTextColor="#777"
              value={folderName}
              onChangeText={setFolderName}
              returnKeyType="done"
              autoFocus
              blurOnSubmit={false}
              onSubmitEditing={handleCreateFolder}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setFolderModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreateFolder}
              >
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>


        <CreateAssetWizardModal
          visible={assetModalVisible}
          onClose={() => setAssetModalVisible(false)}
          onSubmit={handleCreateAsset}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "400",
    color: "#fff",
  },
  subtitle: {
    color: "#999",
    marginTop: 4,
    marginBottom: 10,
    fontSize: 15,
  },
  pendingBadge: {
    flexDirection: "row",
    backgroundColor: "#444",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  pendingText: {
    color: "#D4FF00",
    fontSize: 12,
    flex: 1,
  },
  syncBtn: {
    backgroundColor: "#D4FF00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600",
  },
  breadcrumbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  breadcrumbText: {
    color: ACC,
    fontSize: 10,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 120,
  },
  listContentWithBottomBar: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  cardIcon: {
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "400",
  },
  cardMeta: {
    color: "#888",
    marginTop: 4,
    fontSize: 13,
  },
  downloadBtn: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1c1c1c",
    marginLeft: 8,
  },
  downloadBtnDisabled: {
    opacity: 0.4,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#888",
    marginTop: 8,
    fontSize: 10,
  },
  bottomActionBar: {
     position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 18,
    padding: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: ACC,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 13,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: ACC,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#111",
  },
  secondaryBtnText: {
    color: ACC,
    fontSize: 13,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  skeletonIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#222",
    marginRight: 14,
  },
  skeletonTitle: {
    width: "60%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#222",
    marginBottom: 8,
  },
  skeletonMeta: {
    width: "35%",
    height: 10,
    borderRadius: 6,
    backgroundColor: "#1b1b1b",
  },


  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.7)",
},

modalKeyboardWrap: {
  flex: 1,
  justifyContent: "flex-end",
},

modalCard: {
  backgroundColor: "#111",
  padding: 15,
  paddingBottom: 18,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  borderWidth: 1,
  borderColor: "#1f1f1f",
},
  modalTitle: {
    color: "#fff",
    fontSize: 15,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#1b1b1b",
    color: "#fff",
    fontSize: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#222",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalCancelText: {
    color: "#fff",
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: ACC,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalSaveText: {
    color: "#000",
  },
});