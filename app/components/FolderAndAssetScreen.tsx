import CreateAssetWizardModal from "./CreateAssetWizardModal";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { AssetDraft } from "./utils/types";
import { mapAssetToDraft } from "./utils/assetMapper";
import CodeScannerModal from "../components/CodeScannerModal";
import { normalizeCode } from "../components/utils/codeScannerUtils";

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
  Image,
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
const NUM_COLUMNS = 3;
const FLAT_COLUMNS = 1;
const SCREEN_WIDTH = Dimensions.get("window").width;
const HORIZONTAL_PADDING = 10;
const GRID_GAP = 5;
const ITEM_SIZE =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export default function FolderAndAssetScreen({ route }: Props) {



const [rawDataKeys, setRawDataKeys] = useState<string[]>([]);
const [selectedRawDataKey, setSelectedRawDataKey] = useState<string | null>(null);
const [advancedSearchResults, setAdvancedSearchResults] = useState<AssetItem[]>([]);
const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
const [advancedSearchPage, setAdvancedSearchPage] = useState(1);
const [advancedSearchHasMore, setAdvancedSearchHasMore] = useState(true);
const [rawKeyModalVisible, setRawKeyModalVisible] = useState(false);


const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
const SEARCH_PAGE_SIZE = 15;


const handleBackPress = async () => {
  if (navigatingFolderId) return;

  // If inside a folder, move to previous breadcrumb
  if (path.length > 1) {
    const previousIndex = path.length - 2;
    await goToPathIndex(previousIndex);
    return;
  }

  // If already at root, leave the screen
  router.back();
};




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

  const router = useRouter();

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
  const isRootFolder = currentFolderId === null;

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAssetSaveCount, setPendingAssetSaveCount] = useState(0);
  const [downloadedOffline, setDownloadedOffline] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const snackbarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);

const [codeScannerVisible, setCodeScannerVisible] = useState(false);
const [codeLookupLoading, setCodeLookupLoading] = useState(false);

  const [folderName, setFolderName] = useState("");
  const [navigatingFolderId, setNavigatingFolderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'done' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
  const loadRawDataKeys = async () => {
    if (projectId.startsWith("offline_")) return;

    try {
      const result = await projectContentApi.advancedGetRawDataKeys(projectId);
      setRawDataKeys(result.keys || []);
    } catch (error) {
      console.log("RAW DATA KEYS ERROR:", error);
    }
  };

  loadRawDataKeys();
}, [projectId]);


useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery.trim());
  }, 350);

  return () => clearTimeout(timer);
}, [searchQuery]);

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

  useEffect(() => {
    return () => {
      if (snackbarTimeout.current) {
        clearTimeout(snackbarTimeout.current);
      }
    };
  }, []);



  const showSnackbar = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    if (snackbarTimeout.current) {
      clearTimeout(snackbarTimeout.current);
    }

    setSnackbar({ message, type });
    snackbarTimeout.current = setTimeout(() => setSnackbar(null), 3000);
  };



  const runAdvancedSearch = useCallback(
  async (page = 1, append = false) => {
    const query = debouncedSearchQuery.trim();

    if (!query) {
      setAdvancedSearchResults([]);
      setAdvancedSearchPage(1);
      setAdvancedSearchHasMore(true);
      return;
    }

    try {
      setAdvancedSearchLoading(true);

      const result = await projectContentApi.advancedSearchContents(
        projectId,
        selectedRawDataKey,
        query,
        filter,
        page,
        SEARCH_PAGE_SIZE
      );

      const nextAssets = result.assets || [];

      setAdvancedSearchResults((prev) =>
        append ? [...prev, ...nextAssets] : nextAssets
      );

      setAdvancedSearchPage(page);
      setAdvancedSearchHasMore(nextAssets.length === SEARCH_PAGE_SIZE);
    } catch (error: any) {
      Alert.alert("Search Error", error?.message || "Advanced search failed");
    } finally {
      setAdvancedSearchLoading(false);
    }
  },
  [projectId, selectedRawDataKey, debouncedSearchQuery, filter]
);


  useEffect(() => {
  runAdvancedSearch(1, false);
}, [runAdvancedSearch]);



const loadMoreAdvancedResults = () => {
  if (
    advancedSearchLoading ||
    !advancedSearchHasMore ||
    !debouncedSearchQuery.trim()
  ) {
    return;
  }

  runAdvancedSearch(advancedSearchPage + 1, true);
};


const getAssetLocationText = (asset: AssetItem) => {
  if (!asset.parent) return projectName;

  return `${projectName} / Folder`;
};



const isAdvancedSearching = debouncedSearchQuery.trim().length > 0;

const advancedSearchListItems = useMemo(() => {
  return advancedSearchResults.map((asset) => ({
    ...asset,
    itemType: "advancedAsset" as const,
  }));
}, [advancedSearchResults]);


const handleDetectedAssetCode = async (rawCode: string) => {
  const code = normalizeCode(rawCode);
  if (!code) return;

  try {
    setCodeLookupLoading(true);

    const result = await projectContentApi.getAssetByCode(projectId, code);

    setCodeScannerVisible(false);
    setEditingAsset(result.asset);
    setAssetModalVisible(true);
  } catch (error: any) {
    Alert.alert("Not found", error?.message || "Asset not found for this code");
  } finally {
    setCodeLookupLoading(false);
  }
};
 const loadContents = useCallback(
  async (
    parent: string | null,
    options?: { showSkeleton?: boolean }
  ) => {
    const readOffline = async () => {
      const offlineData = await getOfflineContents(projectId, parent);
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

      const data = await projectContentApi.listContents(projectId, parent, filter, searchQuery);
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
  [projectId, isOnline, downloadedOffline, filter, searchQuery]
);

  useEffect(() => {
    loadContents(currentFolderId);
  }, [loadContents, currentFolderId, filter, searchQuery]);

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

const normalizeAssetType = (
  value?: "vehicle" | "other" | "Vehicle" | "Other" | null
): "vehicle" | "other" => {
  return String(value || "").toLowerCase() === "vehicle" ? "vehicle" : "other";
};


const buildLocalAsset = (draft: AssetDraft): AssetItem => {
  const normalizedAssetType = normalizeAssetType(draft.assetType as any);
  const isVehicle = normalizedAssetType === "vehicle";

  return {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: draft.name,
    writtenDescription: draft.writtenDescription || null,
    parent: currentFolderId ?? null,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    condition: draft.condition || null,
    assetType: normalizedAssetType,
    brand: isVehicle ? draft.brand || null : null,
    model: isVehicle ? draft.model || null : null,
    code: draft.code || null,
    manufactureYear: isVehicle ? draft.manufactureYear || null : null,
    kilometersDriven: isVehicle ? draft.kilometersDriven || null : null,
    isDone: draft.isDone ?? false,
    isPresent: draft.isPresent ?? true,
    createdBy: {
      id: "offline-user",
      fullName: "You",
      email: "",
    },
    images: [],
    voiceNotes: [],
  };
};


const createAssetAsync = async (draft: AssetDraft) => {
  const newImages = (draft.images || []).filter(
    (item: any) => item.uri && !item.uri.startsWith("http")
  );

  const newVoiceNotes = (draft.voiceNotes || []).filter(
    (item: any) => item.uri && !item.uri.startsWith("http")
  );

  const normalizedAssetType = normalizeAssetType(draft.assetType as any);
  const isVehicle = normalizedAssetType === "vehicle";

  const payload = {
    projectId,
    name: draft.name,
    writtenDescription: draft.writtenDescription || null,
    parent: currentFolderId || undefined,
    images: newImages,
    voiceNotes: newVoiceNotes,
    condition: draft.condition || null,
    code: draft.code || null,
    assetType: normalizedAssetType,
    brand: isVehicle ? draft.brand || null : null,
    model: isVehicle ? draft.model || null : null,
    manufactureYear: isVehicle ? draft.manufactureYear || null : null,
    kilometersDriven: isVehicle ? draft.kilometersDriven || null : null,
    isDone: draft.isDone ?? false,
    isPresent: draft.isPresent ?? true,
  };

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

    showSnackbar(result.message, "info");
  } else {
    if (downloadedOffline) {
      await upsertOfflineAsset(result.asset);
    }

    showSnackbar("Asset created successfully", "success");
  }

  await loadContents(currentFolderId, { showSkeleton: true });
};

const updateAssetAsync = async (draft: AssetDraft) => {
  if (!editingAsset) return;

  const newImages = (draft.images || []).filter(
    (item: any) => !item.existing && item.uri && !item.uri.startsWith("http")
  );

  const newVoiceNotes = (draft.voiceNotes || []).filter(
    (item: any) => !item.existing && item.uri && !item.uri.startsWith("http")
  );

  const normalizedAssetType = normalizeAssetType(draft.assetType as any);
  const isVehicle = normalizedAssetType === "vehicle";

  const payload = {
    assetId: editingAsset.id,
    name: draft.name,
    writtenDescription: draft.writtenDescription || null,
    images: newImages,
    voiceNotes: newVoiceNotes,
    code: draft.code || null,
    condition: draft.condition || null,
    assetType: normalizedAssetType,
    brand: isVehicle ? draft.brand || null : null,
    model: isVehicle ? draft.model || null : null,
    manufactureYear: isVehicle ? draft.manufactureYear || null : null,
    kilometersDriven: isVehicle ? draft.kilometersDriven || null : null,
    isDone: draft.isDone ?? false,
    isPresent: draft.isPresent ?? true,
  };

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
        name: draft.name,
        writtenDescription: draft.writtenDescription || null,
        condition: draft.condition || null,
        code: draft.code ?? existingOfflineAsset.code ?? null,
        assetType: normalizedAssetType,
        brand: isVehicle ? draft.brand || null : null,
        model: isVehicle ? draft.model || null : null,
        manufactureYear: isVehicle ? draft.manufactureYear || null : null,
        kilometersDriven: isVehicle ? draft.kilometersDriven || null : null,
        isDone: draft.isDone ?? existingOfflineAsset.isDone,
        isPresent: draft.isPresent ?? existingOfflineAsset.isPresent,
        updatedAt: new Date().toISOString(),
      };

      await upsertOfflineAsset(updatedOfflineAsset);
    }

    showSnackbar(result.message, "info");
  } else {
    if (downloadedOffline) {
      await upsertOfflineAsset(result.asset);
    }

    showSnackbar("Asset updated successfully", "success");
  }

  await loadContents(currentFolderId, { showSkeleton: true });
};

  const submitAssetInBackground = async (
    draft: AssetDraft,
    isEdit: boolean
  ) => {
    setPendingAssetSaveCount((count) => count + 1);
    try {
      if (isEdit) {
        await updateAssetAsync(draft);
      } else {
        await createAssetAsync(draft);
      }
    } catch (error: any) {
      showSnackbar(error?.message || "Failed to save asset", "error");
    } finally {
      setPendingAssetSaveCount((count) => Math.max(0, count - 1));
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

  const filteredAssets = useMemo(() => {
    let filtered = assets;
    
    // Apply filter
    if (filter === 'done') {
      filtered = filtered.filter(asset => asset.isDone);
    } else if (filter === 'incomplete') {
      filtered = filtered.filter(asset => !asset.isDone);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [assets, filter, searchQuery]);

const items = useMemo(() => {
  const combined = [
    ...folders.map((folder) => ({ ...folder, itemType: "folder" as const })),
    ...filteredAssets.map((asset) => ({ ...asset, itemType: "asset" as const })),
  ];

  const q = searchQuery.trim().toLowerCase();
  if (!q) return combined;

  return combined.filter((item) =>
    item.name?.toLowerCase().includes(q)
  );
}, [folders, filteredAssets, searchQuery]);

const itemsWithPlaceholders = useMemo(() => {
  return [
    ...items,
    ...Array.from({ length: pendingAssetSaveCount }, (_, index) => ({
      itemType: "placeholder" as const,
      id: `placeholder-${index}`,
    })),
  ];
}, [items, pendingAssetSaveCount]);

  const renderSkeletons = () => {
    return Array.from({ length: 12 }).map((_, index) => (
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{projectName}</Text>
            <Text style={styles.subtitle}>All Folders & Assets of the Project</Text>
          </View>

          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={() => router.push("/(app)/project")}
            activeOpacity={0.85}
          >
            <Text style={styles.dashboardBtnText}>Dashboard</Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === 'done' && styles.filterBtnActive]}
            onPress={() => setFilter('done')}
          >
            <Text style={[styles.filterText, filter === 'done' && styles.filterTextActive]}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filter === 'incomplete' && styles.filterBtnActive]}
            onPress={() => setFilter('incomplete')}
          >
            <Text style={[styles.filterText, filter === 'incomplete' && styles.filterTextActive]}>Incomplete</Text>
          </TouchableOpacity>
        </View>

 <View style={styles.advancedSearchRow}>
  <TextInput
    value={searchQuery}
    onChangeText={setSearchQuery}
    placeholder={
      selectedRawDataKey
        ? `Search ${selectedRawDataKey} value`
        : "Search all raw data values"
    }
    placeholderTextColor="#666"
    style={styles.advancedSearchInput}
  />

  <TouchableOpacity
    style={styles.rawKeyPicker}
   onPress={() => setRawKeyModalVisible(true)}
  >
    <Text style={styles.rawKeyPickerText} numberOfLines={1}>
      {selectedRawDataKey || "All"}
    </Text>
    <Ionicons name="chevron-down" size={14} color="#000" />
  </TouchableOpacity>
</View>

        {loading || contentLoading ? (
          <View style={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}>
            <View style={styles.gridWrap}>{renderSkeletons()}</View>
          </View>
        ) : (
          <>
            {pendingAssetSaveCount > 0 && (
              <View style={styles.pendingSaveBanner}>
                <Text style={styles.pendingSaveText}>
                  Saving {pendingAssetSaveCount} Asset
                  {pendingAssetSaveCount > 1 ? "s" : ""}…
                </Text>
              </View>
            )}




{isAdvancedSearching ? (
  <FlatList
  key={`cols-${FLAT_COLUMNS}`}
    data={advancedSearchListItems}
    keyExtractor={(item) => `advanced-${item.id} +- ${item.updatedAt}`}
    numColumns={FLAT_COLUMNS}
    onEndReached={loadMoreAdvancedResults}
    onEndReachedThreshold={0.4}
    refreshControl={
      <RefreshControl
        refreshing={advancedSearchLoading}
        onRefresh={() => runAdvancedSearch(1, false)}
      />
    }
    contentContainerStyle={[
      styles.searchListContent,
      { paddingBottom: 120 + insets.bottom },
    ]}
    ListFooterComponent={
      advancedSearchLoading ? (
        <ActivityIndicator color={ACC} style={{ marginVertical: 18 }} />
      ) : null
    }
    ListEmptyComponent={
      !advancedSearchLoading ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No matching assets</Text>
          <Text style={styles.emptyText}>
            Try another value or select a different field.
          </Text>
        </View>
      ) : null
    }
    renderItem={({ item }) => (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => openEditAsset(item)}
        activeOpacity={0.85}
      >
        {item.images?.length ? (
          <Image
            source={{ uri: item.images[0].url }}
            style={styles.searchResultImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.searchResultIcon}>
            <Ionicons name="cube-outline" size={28} color="#fff" />
          </View>
        )}

        <View style={styles.searchResultBody}>
          <Text style={styles.searchResultTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.searchResultLocation} numberOfLines={2}>
            {getAssetLocationText(item)}
          </Text>

          {selectedRawDataKey && (
            <Text style={styles.searchResultMeta} numberOfLines={1}>
              Field: {selectedRawDataKey}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#777" />
      </TouchableOpacity>
    )}
  />
) : (






            <FlatList
              data={itemsWithPlaceholders}
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
                  {isRootFolder
                    ? "Open a folder to add folders or assets."
                    : "Create a folder or add a new asset."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.itemType === "placeholder") {
                return (
                  <View style={styles.gridItem}>
                    <View style={styles.gridCard}>
                      <View style={styles.skeletonIconGrid} />
                      <View style={styles.skeletonTitleGrid} />
                    </View>
                  </View>
                );
              }

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
                          <Ionicons name="folder" size={36} color={ACC} />
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
                    {item.images && item.images.length > 0 ? (
                      <Image
                        source={{ uri: item.images[0].url }}
                        style={styles.assetImageBackground}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.iconWrap}>
                        <Ionicons name="cube-outline" size={36} color={!item.isPresent ? "#FF4444" : "#fff"} />
                      </View>
                    )}

                    {!item.isPresent && (
                      <View style={styles.notPresentOverlay} />
                    )}

                    <View style={styles.assetNameOverlay}>
                      <Text style={styles.gridTitleOverlay} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>

                    {item.images && item.images.length > 0 && (
                      <View style={styles.photoCountBadge}>
                        <Text style={styles.photoCountText}>{item.images.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
          
            )}
          </>
        )}

   <TouchableOpacity
  style={[
    styles.scanFab,
    { bottom: Math.max(insets.bottom, 0) + 46 },
  ]}
  onPress={() => setCodeScannerVisible(true)}
  activeOpacity={0.85}
>
  <Ionicons name="barcode-outline" size={22} color="#000" />
</TouchableOpacity>

<TouchableOpacity
  onPress={handleBackPress}
  activeOpacity={0.8}
  style={[
    styles.backButton,
    { bottom: Math.max(insets.bottom, 0) + 46 },
  ]}
>
  <Text  style={styles.backText}>Back</Text>
</TouchableOpacity>

        {!isRootFolder && (
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
        )}




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


        <Modal
  visible={rawKeyModalVisible}
  animationType="fade"
  transparent
  onRequestClose={() => setRawKeyModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={() => setRawKeyModalVisible(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.rawKeyModalCard}>
          <Text style={styles.modalTitle}>Select Search Field</Text>

          <TouchableOpacity
            style={styles.rawKeyOption}
            onPress={() => {
              setSelectedRawDataKey(null);
              setRawKeyModalVisible(false);
            }}
          >
            <Text style={styles.rawKeyOptionText}>All Values</Text>
          </TouchableOpacity>

          <FlatList
            data={rawDataKeys}
            keyExtractor={(item) => item}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.rawKeyOption}
                onPress={() => {
                  setSelectedRawDataKey(item);
                  setRawKeyModalVisible(false);
                }}
              >
                <Text style={styles.rawKeyOptionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>


        <CodeScannerModal
  visible={codeScannerVisible}
  loading={codeLookupLoading}
  onClose={() => {
    if (!codeLookupLoading) setCodeScannerVisible(false);
  }}
  onDetected={handleDetectedAssetCode}
/>

        <CreateAssetWizardModal
          disableAssetName={!!editingAsset}
          visible={assetModalVisible}
          onClose={closeAssetModal}
          onSubmit={(draft) => submitAssetInBackground(draft, !!editingAsset)}
          mode={editingAsset ? "edit" : "create"}
          initialData={editingAsset ? mapAssetToDraft(editingAsset) : undefined}
        />

        {snackbar && (
          <View
            style={[
              styles.snackbar,
              snackbar.type === "error"
                ? styles.snackbarError
                : snackbar.type === "success"
                ? styles.snackbarSuccess
                : styles.snackbarInfo,
            ]}
          >
            <Text style={styles.snackbarText}>{snackbar.message}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 0,
  },

  scanFab: {
  position: "absolute",
  right: 20,
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: ACC,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: ACC,
  zIndex: 20,
  elevation: 8,
},
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#222",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  filterBtnActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },
  filterText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#000",
    fontWeight: "600",
  },
  searchInput: {
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "400",
    color: "#090808",
    marginTop: 4,
    textTransform:"uppercase"
  },
  subtitle: {
    color: "#2a2828",
    marginTop: 0,
    marginBottom: 4,
    fontSize: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dashboardBtn: {
    backgroundColor: ACC,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: ACC,
  },
  dashboardBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
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
    color: "#888",
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
  pendingSaveBanner: {
    backgroundColor: "rgba(212,255,0,0.14)",
    borderColor: "rgba(212,255,0,0.35)",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  pendingSaveText: {
    color: "#090909",
    fontSize: 12,
    fontWeight: "600",
  },
  snackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  snackbarText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },
  snackbarSuccess: {
    backgroundColor: "#D4FF00",
  },
  snackbarError: {
    backgroundColor: "#FF6B6B",
  },
  snackbarInfo: {
    backgroundColor: "#444",
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    marginBottom: GRID_GAP,
  },
  gridCard: {
    width: "100%",
    height: ITEM_SIZE,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  iconWrap: {
    width: 48,
    height: 48,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gridTitle: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
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
    gap: 5,
    borderColor: "#1f1f1f",
    borderRadius: 15,
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
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",   
  // alignItems: "center",       
  },
  modalKeyboardWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    // width: "90%",
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
  // Asset image fills the entire card as background, centered
  assetImageBackground: {
    position: "absolute",
    top: 4,
    left: 9,
    right: 1,
    bottom: 1,
    width: "100%",
    height: "100%",
    borderRadius: 15,
    zIndex: 1,
  },
  // Frosted name bar pinned to bottom of card
  assetNameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 6,
    // backgroundColor: "rgba(0,0,0,0.55)",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    zIndex: 10,
  },
  gridTitleOverlay: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
    fontWeight: "500",
  },
  notPresentOverlay: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF4444",
    borderWidth: 2,
    borderColor: "#111",
    zIndex: 10,
  },
  photoCountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 10,
  },
  photoCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },

backButton: {
  position: "absolute",
  left: 20,
  zIndex: 20,
},

rawKeyModalCard: {
  width: "85%",
  maxHeight: "70%",
  backgroundColor: "#111",
  borderRadius: 20,
  padding: 18,
  borderWidth: 1,
  borderColor: "#222",
  // alignItems: "center",
  alignSelf: "center",
  justifyContent: "center",
  

},

rawKeyOption: {
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#222",
},

rawKeyOptionText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
},

backText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111",
},


advancedSearchRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
},

advancedSearchInput: {
  flex: 1,
  height: 44,
  borderRadius: 14,
  backgroundColor: "#111",
  borderWidth: 1,
  borderColor: "#222",
  color: "#fff",
  paddingHorizontal: 14,
  fontSize: 14,
},

rawKeyPicker: {
  height: 44,
  minWidth: 96,
  maxWidth: 140,
  borderRadius: 14,
  backgroundColor: ACC,
  paddingHorizontal: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
},

rawKeyPickerText: {
  color: "#000",
  fontWeight: "800",
  fontSize: 12,
  maxWidth: 95,
},

searchListContent: {
  paddingTop: 4,
},

searchResultCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#111",
  borderRadius: 16,
  padding: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: "#222",
},

searchResultImage: {
  width: 54,
  height: 54,
  borderRadius: 12,
  backgroundColor: "#222",
},

searchResultIcon: {
  width: 54,
  height: 54,
  borderRadius: 12,
  backgroundColor: "#222",
  alignItems: "center",
  justifyContent: "center",
},

searchResultBody: {
  flex: 1,
  marginLeft: 12,
},

searchResultTitle: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "800",
},

searchResultLocation: {
  color: "#999",
  fontSize: 12,
  marginTop: 3,
},

searchResultMeta: {
  color: ACC,
  fontSize: 11,
  marginTop: 4,
  fontWeight: "700",
},
});