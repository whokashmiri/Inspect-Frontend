import CreateAssetWizardModal from "./utils/CreateAssetWizardModal";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { AssetDraft } from "./utils/types";
import { mapAssetToDraft } from "./utils/assetMapper";

import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
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
  Dimensions,
} from "react-native";
import {
  projectContentApi,
  AssetItem,
  FolderItem,
} from "../../api/api";

import {
  safeApiCall,
  getPendingCount,
  syncQueue,
  useIsOnline,
  isProjectDownloaded,
  getOfflineContents,
  upsertOfflineFolder,
  upsertOfflineAsset,
  getOfflineAssetById,
} from "../offline";
import { Ionicons } from "@expo/vector-icons";

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
const NUM_COLUMNS = 4;
const SCREEN_WIDTH = Dimensions.get("window").width;
const HORIZONTAL_PADDING = 15 * 2;
const GRID_GAP = 5;
const ITEM_SIZE =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export default function FolderAndAssetScreen({ route }: Props) {
  const folderInputRef = useRef<TextInput>(null);
  const isOnline = useIsOnline();

  const openFolderModal = () => {
    setFolderModalVisible(true);
    setFolderName("");

    requestAnimationFrame(() => {
      setTimeout(() => {
        folderInputRef.current?.focus();
      }, 350);
    });
  };

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
  const [downloadedOffline, setDownloadedOffline] = useState(false);

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);

  const [folderName, setFolderName] = useState("");
  const [navigatingFolderId, setNavigatingFolderId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkDownloaded = async () => {
      if (projectId.startsWith("offline_")) {
        setDownloadedOffline(false);
        return;
      }

      const downloaded = await isProjectDownloaded(projectId);
      setDownloadedOffline(downloaded);
    };

    checkDownloaded();
  }, [projectId]);



 const loadContents = useCallback(
  async (
    folderId: string | null,
    options?: { showSkeleton?: boolean }
  ) => {
    const readOffline = async () => {
      const offlineData = await getOfflineContents(projectId, folderId);
      setFolders((offlineData.folders || []) as FolderItem[]);
      setAssets((offlineData.assets || []) as AssetItem[]);
    };

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

      const shouldUseOfflineCache =
        downloadedOffline && (isOnline === false || isOnline === null);

      if (shouldUseOfflineCache) {
        await readOffline();
        return;
      }

      const data = await projectContentApi.listContents(projectId, folderId);
      setFolders(data.folders || []);
      setAssets(data.assets || []);
    } catch (error: any) {
      console.log("LOAD ERROR:", error);

      if (downloadedOffline) {
        try {
          await readOffline();
          return;
        } catch (offlineError: any) {
          console.log("OFFLINE FALLBACK ERROR:", offlineError);
          Alert.alert(
            "Offline Error",
            String(offlineError?.message || offlineError || "Offline fallback failed")
          );
          return;
        }
      }

      Alert.alert("Error", String(error?.message || "Unable to load project"));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setContentLoading(false);
      setNavigatingFolderId(null);
    }
  },
  [projectId, isOnline, downloadedOffline]
);

  useEffect(() => {
    loadContents(currentFolderId);
  }, [loadContents, currentFolderId]);

  const onRefresh = async () => {
    setRefreshing(true);

    if (isOnline) {
      await syncQueue();
    }

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


  const buildLocalFolder = (name: string): FolderItem => ({
  id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  name,
  parentId: currentFolderId ?? null,
  projectId,
  createdAt: new Date().toISOString(),
  createdBy: {
    id: "offline-user",
    fullName: "You",
    email: "",
  },
});
  


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
      if (downloadedOffline) {
        const localFolder = buildLocalFolder(folderName.trim());
        localFolder.id = result.localId;

        await upsertOfflineFolder(localFolder);
      }

      Alert.alert("Offline", result.message);
    } else {
      if (downloadedOffline) {
        await upsertOfflineFolder(result.folder);
      }

      Alert.alert("Success", "Folder created");
    }

    setFolderName("");
    setFolderModalVisible(false);
    await loadContents(currentFolderId, { showSkeleton: true });
  } catch (error: any) {
    Alert.alert("Error", error.message || "Failed to create folder");
  }
}; 



  const buildLocalAsset = (draft: AssetDraft): AssetItem => ({
  id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  name: draft.name,
  writtenDescription: draft.writtenDescription || null,
  folderId: currentFolderId ?? null,
  projectId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  condition: draft.condition || null,
  assetType: draft.assetType || "Other",
  brand: draft.brand || null,
  model: draft.model || null,
  manufactureYear: draft.manufactureYear || null,
  kilometersDriven: draft.kilometersDriven || null,
  createdBy: {
    id: "offline-user",
    fullName: "You",
    email: "",
  },
  images: [],
  voiceNotes: [],
});


  const handleCreateAsset = async (draft: AssetDraft) => {
  const newImages = (draft.images || []).filter(
    (item: any) => item.uri && !item.uri.startsWith("http")
  );

  const newVoiceNotes = (draft.voiceNotes || []).filter(
    (item: any) => item.uri && !item.uri.startsWith("http")
  );

  const payload = {
    projectId,
    name: draft.name,
    writtenDescription: draft.writtenDescription || null,
    folderId: currentFolderId || undefined,
    images: newImages,
    voiceNotes: newVoiceNotes,
    condition: draft.condition || null,
    assetType: draft.assetType || "Other",
    brand: draft.assetType === "Vehicle" ? draft.brand || null : null,
    model: draft.assetType === "Vehicle" ? draft.model || null : null,
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
      if (downloadedOffline) {
        const localAsset = buildLocalAsset(draft);
        localAsset.id = result.localId;

        await upsertOfflineAsset(localAsset);
      }

      Alert.alert("Offline", result.message);
    } else {
      if (downloadedOffline) {
        await upsertOfflineAsset(result.asset);
      }

      Alert.alert("Success", "Asset created");
    }

    setAssetModalVisible(false);
    await loadContents(currentFolderId, { showSkeleton: true });
  } catch (error: any) {
    Alert.alert("Error", error.message || "Failed to create asset");
  }
};


 const handleUpdateAsset = async (draft: AssetDraft) => {
  if (!editingAsset) return;

  const newImages = (draft.images || []).filter(
    (item: any) => !item.existing && item.uri && !item.uri.startsWith("http")
  );

  const newVoiceNotes = (draft.voiceNotes || []).filter(
    (item: any) => !item.existing && item.uri && !item.uri.startsWith("http")
  );

  const payload = {
    assetId: editingAsset.id,
    writtenDescription: draft.writtenDescription || null,
    images: newImages,
    voiceNotes: newVoiceNotes,
    condition: draft.condition || null,
    assetType: draft.assetType || "Other",
    brand: draft.assetType === "Vehicle" ? draft.brand || null : null,
    model: draft.assetType === "Vehicle" ? draft.model || null : null,
    manufactureYear:
      draft.assetType === "Vehicle" ? draft.manufactureYear || null : null,
    kilometersDriven:
      draft.assetType === "Vehicle" ? draft.kilometersDriven || null : null,
  };

  try {
    const result = await safeApiCall(
      () => projectContentApi.updateAsset(payload),
      payload,
      { type: "updateAsset", projectId }
    );

    if ("offline" in result) {
      if (downloadedOffline) {
        const existingOfflineAsset =
          (await getOfflineAssetById(editingAsset.id)) ?? editingAsset;

        const updatedOfflineAsset: AssetItem = {
          ...existingOfflineAsset,
          writtenDescription: draft.writtenDescription || null,
          condition: draft.condition || null,
          assetType: draft.assetType || "Other",
          brand: draft.assetType === "Vehicle" ? draft.brand || null : null,
          model: draft.assetType === "Vehicle" ? draft.model || null : null,
          manufactureYear:
            draft.assetType === "Vehicle" ? draft.manufactureYear || null : null,
          kilometersDriven:
            draft.assetType === "Vehicle" ? draft.kilometersDriven || null : null,
          updatedAt: new Date().toISOString(),
        };

        await upsertOfflineAsset(updatedOfflineAsset);
      }

      Alert.alert("Offline", result.message);
    } else {
      if (downloadedOffline) {
        await upsertOfflineAsset(result.asset);
      }

      Alert.alert("Success", "Asset updated");
    }

    setEditingAsset(null);
    setAssetModalVisible(false);
    await loadContents(currentFolderId, { showSkeleton: true });
  } catch (error: any) {
    Alert.alert("Error", error.message || "Failed to update asset");
  }
};

  const openEditAsset = (asset: AssetItem) => {
    setEditingAsset(asset);
    setAssetModalVisible(true);
  };

  const closeAssetModal = () => {
    setEditingAsset(null);
    setAssetModalVisible(false);
  };

  const items = useMemo(() => {
    return [
      ...folders.map((folder) => ({ ...folder, itemType: "folder" as const })),
      ...assets.map((asset) => ({ ...asset, itemType: "asset" as const })),
    ];
  }, [folders, assets]);

  const renderSkeletons = () => {
    return Array.from({ length: 10 }).map((_, index) => (
      <View key={index} style={styles.gridItem}>
        <View style={styles.gridCard}>
          <View style={styles.skeletonIconGrid} />
          <View style={styles.skeletonTitleGrid} />
        </View>
      </View>
    ));
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.flex} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>{projectName}</Text>
        <Text style={styles.subtitle}>Folders & Assets</Text>

        {downloadedOffline && !isOnline && (
  <Text style={styles.offlineModeText}>OFFLINE</Text>
)}

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
            <View style={styles.gridWrap}>{renderSkeletons()}</View>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.itemType}-${item.id}`}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
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
                  <View style={styles.gridItem}>
                    <TouchableOpacity
                      style={styles.gridCard}
                      onPress={() => openFolder(item)}
                      disabled={!!navigatingFolderId}
                      activeOpacity={0.85}
                    >
                      <View style={styles.iconWrap}>
                        {isOpening ? (
                          <ActivityIndicator size="small" color={ACC} />
                        ) : (
                          <Ionicons name="folder" size={26} color={ACC} />
                        )}
                      </View>

                      <Text style={styles.gridTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View style={styles.gridItem}>
                  <TouchableOpacity
                    style={styles.gridCard}
                    onPress={() => openEditAsset(item)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name="cube-outline" size={24} color="#fff" />
                    </View>

                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {item.name}
                    </Text>

                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={ACC}
                      style={styles.editBadge}
                    />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.bottomActionBar,
            { bottom: Math.max(insets.bottom, 0) - 30 },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openFolderModal}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>New Folder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setEditingAsset(null);
              setAssetModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>New Asset</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={folderModalVisible}
          animationType="fade"
          transparent
          statusBarTranslucent
          onRequestClose={() => setFolderModalVisible(false)}
          onShow={() => {
            setTimeout(() => {
              folderInputRef.current?.focus();
            }, 80);
          }}
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
                      blurOnSubmit={false}
                      showSoftInputOnFocus
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
          disableAssetName={!!editingAsset}
          visible={assetModalVisible}
          onClose={closeAssetModal}
          onSubmit={editingAsset ? handleUpdateAsset : handleCreateAsset}
          mode={editingAsset ? "edit" : "create"}
          initialData={editingAsset ? mapAssetToDraft(editingAsset) : undefined}
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
    paddingTop: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "400",
    color: "#fff",
    marginTop: 4,
  },
  subtitle: {
    color: "#999",
    marginTop: 0,
    marginBottom: 10,
    fontSize: 15,
  },
  offlineModeBadge: {
    backgroundColor: "rgba(212,255,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,255,0,0.35)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  offlineModeText: {
    color: ACC,
    fontSize: 12,
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
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    marginBottom: GRID_GAP,
    marginRight: GRID_GAP,
  },
  gridCard: {
    width: "100%",
    minHeight: ITEM_SIZE,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconWrap: {
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitle: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  editBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  skeletonIconGrid: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#222",
    marginBottom: 10,
  },
  skeletonTitleGrid: {
    width: "80%",
    height: 10,
    borderRadius: 6,
    backgroundColor: "#222",
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    width: "100%",
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
    borderRadius: 15,
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