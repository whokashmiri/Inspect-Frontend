import CreateAssetWizardModal from "./asset/CreateAssetWizardModal";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";

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
} from "react-native";
import {
  projectContentApi,
  AssetItem,
  FolderItem,
} from "../../api/api";
import * as MediaLibrary from "expo-media-library";
import { File, Directory, Paths } from "expo-file-system";
import { safeApiCall, OfflineResult, getPendingCount, syncQueue } from "../offline";
import { Ionicons } from "@expo/vector-icons";
import { Entypo } from '@expo/vector-icons';


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
const GALLERY_ALBUM_NAME = "BatchCam Assets";

export default function FolderAndAssetScreen({ route }: Props) {
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });
  const { projectId, projectName } = route.params;

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<FolderPathItem[]>([
    { id: null, name: projectName },
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

    const loadContents = useCallback(
    async (folderId?: string | null) => {
      const resolvedFolderId =
        typeof folderId === "undefined" ? currentFolderId : folderId;

      if (projectId.startsWith("offline_")) {
        setFolders([]);
        setAssets([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await projectContentApi.listContents(projectId, resolvedFolderId);
        setFolders(data.folders || []);
        setAssets(data.assets || []);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to load contents");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId, currentFolderId]
  );

useEffect(() => {
    loadContents(null);
  }, [loadContents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncQueue();  // Sync first
    loadContents();
  };

  const openFolder = async (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setLoading(true);

    if (projectId.startsWith("offline_")) {
      setLoading(false);
      return;
    }

    try {
      const data = await projectContentApi.listContents(projectId, folder.id);
      setFolders(data.folders || []);
      setAssets(data.assets || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to open folder");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const goToPathIndex = async (index: number) => {
    const nextPath = path.slice(0, index + 1);
    const selected = nextPath[nextPath.length - 1];
    const folderId = selected.id;

    setPath(nextPath);
    setCurrentFolderId(folderId);
    setLoading(true);

    if (projectId.startsWith("offline_")) {
      setLoading(false);
      return;
    }

    try {
      const data = await projectContentApi.listContents(projectId, folderId);
      setFolders(data.folders || []);
      setAssets(data.assets || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to navigate");
    } finally {
      setLoading(false);
    }
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
        { type: "createFolder", projectId },
      );

      if ("offline" in result) {
        Alert.alert("Offline", result.message);
      } else {
        Alert.alert("Success", "Folder created");
      }

      setFolderName("");
      setFolderModalVisible(false);
      setLoading(true);

      if (!("offline" in result)) {
        await loadContents(currentFolderId);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create folder");
    }
  };

  const handleCreateAsset = async (draft: any) => {
    const payload = {
      projectId,
      name: draft.name,
      serialNumber: draft.serialNumber,
      writtenDescription: draft.writtenDescription || null,
      folderId: currentFolderId || undefined,
      images: draft.images || [],
      voiceNotes: draft.voiceNotes || [],
    };

    try {
      const result = await safeApiCall(
        () => projectContentApi.createAsset(payload),
        payload,
        { type: "createAsset", projectId },
      );

      if ("offline" in result) {
        Alert.alert("Offline", result.message);
      } else {
        Alert.alert("Success", "Asset created");
      }

      setAssetModalVisible(false);
      setLoading(true);

      if (!("offline" in result)) {
        await loadContents(currentFolderId);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create asset");
    }
  };

  const downloadAssetImages = useCallback(async (asset: AssetItem) => {
    // ... existing download logic unchanged ...
    if (!asset.images?.length) {
      Alert.alert("No images", "This asset has no images to download.");
      return;
    }

    const permissions = await MediaLibrary.requestPermissionsAsync();
    if (permissions.status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Allow storage access so we can save the images to your gallery.",
      );
      return;
    }

    const downloadDirectory = new Directory(Paths.document, "asset-downloads");

    setDownloadingAssetId(asset.id);
    try {
      await downloadDirectory.create({
        intermediates: true,
        idempotent: true,
      });

      const downloadedFiles: File[] = [];
      for (const [index, image] of asset.images.entries()) {
        const matched = image.url.match(/\\.([a-z0-9]+)(?:[?#]|$)/i);
        const extension = matched ? matched[1] : "jpg";
        const filename = `${asset.serialNumber || asset.id}_${index + 1}.${extension}`;
        const destination = new File(downloadDirectory, filename);
        const downloadedFile = await File.downloadFileAsync(image.url, destination, {
          idempotent: true,
        });
        downloadedFiles.push(downloadedFile);
      }

      const savedAssets = [];
      for (const downloadedFile of downloadedFiles) {
        const mediaAsset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
        savedAssets.push(mediaAsset);
      }

      if (savedAssets.length) {
        let album = await MediaLibrary.getAlbumAsync(GALLERY_ALBUM_NAME);
        if (!album) {
          album = await MediaLibrary.createAlbumAsync(
            GALLERY_ALBUM_NAME,
            savedAssets[0],
            false,
          );
          if (savedAssets.length > 1) {
            await MediaLibrary.addAssetsToAlbumAsync(
              savedAssets.slice(1),
              album,
              false,
            );
          }
        } else {
          await MediaLibrary.addAssetsToAlbumAsync(savedAssets, album, false);
        }
      }

      Alert.alert(
        "Downloaded",
        `Saved ${savedAssets.length} image(s) to the ${GALLERY_ALBUM_NAME} album.`,
      );
    } catch (error: any) {
      Alert.alert(
        "Download failed",
        error?.message || "Unable to save the asset images.",
      );
    } finally {
      setDownloadingAssetId(null);
    }
  }, []);

  const items = useMemo(() => {
    return [
      ...folders.map((folder) => ({ ...folder, itemType: "folder" as const })),
      ...assets.map((asset) => ({ ...asset, itemType: "asset" as const })),
    ];
  }, [folders, assets]);

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

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setFolderModalVisible(true)}
          >
            <Text style={styles.primaryBtnText}>New Folder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setAssetModalVisible(true)}
          >
            <Text style={styles.secondaryBtnText}>New Asset</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No contents yet</Text>
                <Text style={styles.emptyText}>
                  Create a folder or add a new asset.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.itemType === "folder") {
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => openFolder(item)}
                >
                  <Ionicons name="folder-outline" size={22} color="#b5b0b0" style={styles.cardIcon} />
                  
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardMeta}>Folder</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <View style={styles.card}>
                {/* <Text style={styles.cardIcon}>📦</Text> */}
                {/* <Ionicons name="log-out-outline" size={18} color="#b5b0b0" /> */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>SN: {item.serialNumber}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.downloadBtn,
                    downloadingAssetId === item.id && styles.downloadBtnDisabled,
                  ]}
                  onPress={() => downloadAssetImages(item)}
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

        <Modal
          visible={folderModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFolderModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create New Folder</Text>
              <TextInput
                style={styles.input}
                placeholder="Folder Name"
                placeholderTextColor="#777"
                value={folderName}
                onChangeText={setFolderName}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setFolderModalVisible(false)}
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
          </View>
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
    flexDirection: 'row',
    backgroundColor: '#444',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  pendingText: {
    color: '#D4FF00',
    fontSize: 12,
    flex: 1,
  },
  syncBtn: {
    backgroundColor: '#D4FF00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  breadcrumbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  breadcrumbText: {
    color: ACC,
    fontSize: 10,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: ACC,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: ACC,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: ACC,
    fontSize: 10,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  listContent: {
    paddingBottom: 30,
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
    fontSize: 24,
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
  downloadIcon: {
    color: ACC,
    fontSize: 20,
  },
  cardMeta: {
    color: "#888",
    marginTop: 4,
    fontSize: 13,
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
    fontSize: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    marginBottom: 50,
  },
  modalCard: {
    backgroundColor: "#111",
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
