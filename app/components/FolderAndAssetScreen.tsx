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
import { useTranslation } from "react-i18next"; // ← i18n

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
  getOfflineRawDataKeys,
  advancedSearchOfflineAssets,
} from "../offline";
import { Ionicons } from "@expo/vector-icons";

type RouteParams = {
  projectId: string;
  projectName: string;
  offlineMode?: boolean;
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


const NUM_COLUMNS = 3;
const FLAT_COLUMNS = 1;
const SCREEN_WIDTH = Dimensions.get("window").width;
const HORIZONTAL_PADDING = 10;
const GRID_GAP = 5;
const ITEM_SIZE =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export default function FolderAndAssetScreen({ route }: Props) {
  const { t } = useTranslation(); // ← i18n hook

  const [rawDataKeys, setRawDataKeys] = useState<string[]>([]);
  const [selectedRawDataKey, setSelectedRawDataKey] = useState<string | null>(null);
  const [advancedSearchResults, setAdvancedSearchResults] = useState<AssetItem[]>([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const [advancedSearchPage, setAdvancedSearchPage] = useState(1);
  const [advancedSearchHasMore, setAdvancedSearchHasMore] = useState(true);
  const [rawKeyModalVisible, setRawKeyModalVisible] = useState(false);


  const getNestedRawDataValue = (rawData: any, key?: string | null) => {
    if (!rawData || !key) return rawData;
    return key.split(".").reduce((acc, part) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[part];
    }, rawData);
  };

  const rawDataValueMatches = (value: any, search: string): boolean => {
    if (value === null || value === undefined) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value).toLowerCase().includes(needle);
    }
    if (Array.isArray(value)) {
      return value.some((item) => rawDataValueMatches(item, search));
    }
    if (typeof value === "object") {
      return Object.values(value).some((item) => rawDataValueMatches(item, search));
    }
    return false;
  };

  const extractRawDataKeys = (
    obj: any,
    prefix = "",
    keys = new Set<string>()
  ) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return keys;
    Object.keys(obj).forEach((key) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      const value = obj[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        extractRawDataKeys(value, fullKey, keys);
      }
    });
    return keys;
  };

  const getRawDataValue = (rawData: any, key: string) => {
    if (!rawData || !key) return null;
    return key.split(".").reduce((acc, k) => {
      if (acc === null || acc === undefined) return null;
      return acc[k];
    }, rawData);
  };

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const SEARCH_PAGE_SIZE = 15;

 const handleBackPress = async () => {
  if (navigatingFolderId) return;

  if (
    adminRootFolderIdRef.current &&
    currentFolderId === adminRootFolderIdRef.current
  ) {
    router.back();
    return;
  }

  if (path.length > 2) {
    const previousIndex = path.length - 2;
    await goToPathIndex(previousIndex);
    return;
  }

  router.back();
};

  const folderInputRef = useRef<TextInput>(null);
  const isOnline = useIsOnline();

  const autoEnterRootAttemptedRef = useRef(false);
  const adminRootFolderIdRef = useRef<string | null>(null);
  const downloadCheckCompletedRef = useRef(false);

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

  const { projectId, projectName, offlineMode } = route.params;
  const [isSyncing, setIsSyncing] = useState(false);

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
  const [downloadCheckCompleted, setDownloadCheckCompleted] = useState(false);
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
  const [filter, setFilter] = useState<"all" | "done" | "incomplete">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadRawDataKeys = async () => {
      if (projectId.startsWith("offline_")) return;
      try {
        const shouldUseOfflineCache =
          downloadedOffline && (isOnline === false || isOnline === null);
        if (shouldUseOfflineCache) {
          const keys = await getOfflineRawDataKeys(projectId);
          if (shouldUseOfflineCache) {
            setRawDataKeys(keys);
            return;
          }
          const scanFolder = async (parentId: string | null) => {
            const data = await getOfflineContents(projectId, parentId);
            for (const asset of data.assets || []) {
              extractRawDataKeys((asset as any).rawData);
            }
            for (const folder of data.folders || []) {
              await scanFolder(folder.id);
            }
          };
          await scanFolder(null);
          setRawDataKeys(Array.from(keys).sort());
          return;
        }
        const result = await projectContentApi.advancedGetRawDataKeys(projectId);
        setRawDataKeys(result.keys || []);
      } catch (error) {
        console.log("RAW DATA KEYS ERROR:", error);
      }
    };
    loadRawDataKeys();
  }, [projectId, downloadedOffline, isOnline]);

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
    setDownloadCheckCompleted(false);

    if (projectId.startsWith("offline_")) {
      setDownloadedOffline(false);
      downloadCheckCompletedRef.current = true;
      setDownloadCheckCompleted(true);
      return;
    }

    const downloaded = await isProjectDownloaded(projectId);

    setDownloadedOffline(downloaded);
    downloadCheckCompletedRef.current = true;
    setDownloadCheckCompleted(true);
  };

  autoEnterRootAttemptedRef.current = false;
  downloadCheckCompletedRef.current = false;

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

  const refreshPendingCount = useCallback(async () => {
  const count = await getPendingCount();
  setPendingCount(count);
}, []);

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
        const shouldUseOfflineCache =
          downloadedOffline && (isOnline === false || isOnline === null);
        if (shouldUseOfflineCache) {
          const allAssets: AssetItem[] = [];
          const collectAssets = async (parentId: string | null) => {
            const data = await getOfflineContents(projectId, parentId);
            allAssets.push(...((data.assets || []) as AssetItem[]));
            for (const folder of data.folders || []) {
              await collectAssets(folder.id);
            }
          };
          await collectAssets(null);
          let matchedAssets = allAssets.filter((asset: any) => {
            const value = selectedRawDataKey
              ? getNestedRawDataValue(asset.rawData, selectedRawDataKey)
              : asset.rawData;
            return rawDataValueMatches(value, query);
          });
          if (filter === "done") matchedAssets = matchedAssets.filter((a) => a.isDone);
          if (filter === "incomplete") matchedAssets = matchedAssets.filter((a) => !a.isDone);
          const start = (page - 1) * SEARCH_PAGE_SIZE;
          const nextAssets = matchedAssets.slice(start, start + SEARCH_PAGE_SIZE);
          setAdvancedSearchResults((prev) => (append ? [...prev, ...nextAssets] : nextAssets));
          setAdvancedSearchPage(page);
          setAdvancedSearchHasMore(start + SEARCH_PAGE_SIZE < matchedAssets.length);
          return;
        }
        const result = await projectContentApi.advancedSearchContents(
          projectId,
          selectedRawDataKey,
          query,
          filter,
          page,
          SEARCH_PAGE_SIZE
        );
        const nextAssets = result.assets || [];
        setAdvancedSearchResults((prev) => (append ? [...prev, ...nextAssets] : nextAssets));
        setAdvancedSearchPage(page);
        setAdvancedSearchHasMore(
          typeof (result as any).hasMore === "boolean"
            ? (result as any).hasMore
            : nextAssets.length === SEARCH_PAGE_SIZE
        );
      } catch (error: any) {
        Alert.alert(
          t("folderAssetScreen.searchError.title"),
          error?.message || t("folderAssetScreen.searchError.defaultMessage")
        );
      } finally {
        setAdvancedSearchLoading(false);
      }
    },
    [projectId, selectedRawDataKey, debouncedSearchQuery, filter, downloadedOffline, isOnline, t]
  );

  useEffect(() => {
    runAdvancedSearch(1, false);
  }, [runAdvancedSearch]);

  const loadMoreAdvancedResults = () => {
    if (advancedSearchLoading || !advancedSearchHasMore || !debouncedSearchQuery.trim()) return;
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
      const shouldUseOffline =
        offlineMode || (downloadedOffline && (isOnline === false || isOnline === null));
      let result;
      if (shouldUseOffline) {
        result = await advancedSearchOfflineAssets({ projectId, search: code });
      } else {
        result = await projectContentApi.advancedSearchContents(projectId, code);
      }
      setCodeScannerVisible(false);
     const foundAsset = result.assets?.[0];

setCodeScannerVisible(false);

if (!foundAsset) {
  Alert.alert(
    t("folderAssetScreen.codeScanner.notFoundTitle"),
    t("folderAssetScreen.codeScanner.notFoundMessage")
  );
  return;
}

setEditingAsset(foundAsset);
setAssetModalVisible(true);
    } catch (error: any) {
      Alert.alert(
        t("folderAssetScreen.codeScanner.notFoundTitle"),
        error?.message || t("folderAssetScreen.codeScanner.notFoundMessage")
      );
    } finally {
      setCodeLookupLoading(false);
    }
  };



  const fetchContentsData = useCallback(
  async (parent: string | null, ignoreFilters = false) => {
    if (projectId.startsWith("offline_")) {
      return { folders: [], assets: [] };
    }

    const shouldUseOffline =
      offlineMode ||
      (downloadedOffline && (isOnline === false || isOnline === null));

    if (shouldUseOffline) {
      return getOfflineContents(projectId, parent);
    }

    return projectContentApi.listContents(
      projectId,
      parent,
      ignoreFilters ? "all" : filter,
      ignoreFilters ? "" : searchQuery
    );
  },
  [projectId, offlineMode, downloadedOffline, isOnline, filter, searchQuery]
);



const autoEnterAdminRootFolder = useCallback(async () => {
  if (autoEnterRootAttemptedRef.current) return;

  autoEnterRootAttemptedRef.current = true;

  try {
    setLoading(true);
    setContentLoading(true);
     setFolders([]);
    setAssets([]);

    const rootData = await fetchContentsData(null, true);
    const rootFolders = (rootData.folders || []) as FolderItem[];

    if (!rootFolders.length) {
      setFolders([]);
      setAssets([]);

      showSnackbar(
        "Root folder does not exist. Contact your company admin.",
        "error"
      );

      return;
    }

    const rootFolder = rootFolders[0];

    adminRootFolderIdRef.current = rootFolder.id;

    setCurrentFolderId(rootFolder.id);
    setPath([
      { id: null, name: projectName },
      { id: rootFolder.id, name: rootFolder.name },
    ]);

    const insideRootData = await fetchContentsData(rootFolder.id);

    setFolders((insideRootData.folders || []) as FolderItem[]);
    setAssets((insideRootData.assets || []) as AssetItem[]);
  } catch (error: any) {
    console.log("AUTO ENTER ROOT ERROR:", error);

    showSnackbar(
      error?.message ||
        "Could not open root folder. Contact your company admin.",
      "error"
    );
  } finally {
    setLoading(false);
    setContentLoading(false);
    setRefreshing(false);
    setNavigatingFolderId(null);
  }
}, [fetchContentsData, projectName]);


 const loadContents = useCallback(
  async (parent: string | null, options?: { showSkeleton?: boolean }) => {
    try {
      if (options?.showSkeleton) {
        setContentLoading(true);
        setFolders([]);
        setAssets([]);
      }

      if (projectId.startsWith("offline_")) {
        setFolders([]);
        setAssets([]);
        return;
      }

      const data = await fetchContentsData(parent);

      setFolders((data.folders || []) as FolderItem[]);
      setAssets((data.assets || []) as AssetItem[]);
    } catch (error: any) {
      console.log("LOAD ERROR:", error);

      try {
        const offlineData = await getOfflineContents(projectId, parent);
        setFolders((offlineData.folders || []) as FolderItem[]);
        setAssets((offlineData.assets || []) as AssetItem[]);
      } catch (offlineError) {
        console.log("OFFLINE FALLBACK ERROR:", offlineError);
        console.error(error?.message || "Failed to load data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setContentLoading(false);
      setNavigatingFolderId(null);
    }
  },
  [projectId, fetchContentsData]
);

useEffect(() => {
  if (!downloadCheckCompleted) {
    return;
  }

  if (!autoEnterRootAttemptedRef.current) {
    autoEnterAdminRootFolder();
    return;
  }

  loadContents(currentFolderId);
}, [
  downloadCheckCompleted,
  autoEnterAdminRootFolder,
  loadContents,
  currentFolderId,
  filter,
  searchQuery,
  downloadedOffline,
  isOnline,
]);


const onRefresh = async () => {
    setRefreshing(true);
    if (isOnline) {
      setIsSyncing(true);
      await syncQueue();
      setIsSyncing(false);
    }
    await loadContents(currentFolderId);
  };

const handleSyncNow = useCallback(
  async (silent = false) => {
    const offlineState = isOnline === false || isOnline === null;

    if (offlineState) {
      if (!silent) {
        Alert.alert(
          t("folderAssetScreen.sync.offlineAlert"),
          t("folderAssetScreen.sync.offlineMessage")
        );
      }
      return;
    }

    const latestPendingCount = await getPendingCount();
    setPendingCount(latestPendingCount);

    if (latestPendingCount <= 0) {
      if (!silent) {
        Alert.alert(
          t("folderAssetScreen.sync.allSyncedAlert"),
          t("folderAssetScreen.sync.allSyncedMessage")
        );
      }
      return;
    }

    setIsSyncing(true);

    try {
      await syncQueue();
      await refreshPendingCount();
      await loadContents(currentFolderId);
    } finally {
      setIsSyncing(false);
    }
  },
  [isOnline, currentFolderId, loadContents, refreshPendingCount, t]
);
// Auto-sync whenever we come online and there are pending items
useEffect(() => {
  if (isOnline !== true) return;
  if (pendingCount <= 0) return;
  if (isSyncing) return;

  handleSyncNow(true);
}, [isOnline, pendingCount, isSyncing, handleSyncNow]);
  const openFolder = async (folder: FolderItem) => {
    if (navigatingFolderId) return;
    setNavigatingFolderId(folder.id);
    setCurrentFolderId(folder.id);
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    await loadContents(folder.id, { showSkeleton: true });
  };

  const goToPathIndex = async (index: number) => {
    if (navigatingFolderId) return;
   if (index === 0 && adminRootFolderIdRef.current) {
  return;
}
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
    createdBy: { id: "offline-user", fullName: "You", email: "" },
  });

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert(
        t("folderAssetScreen.folderModal.validationTitle"),
        t("folderAssetScreen.folderModal.validationMessage")
      );
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
      await refreshPendingCount();
      if ("offline" in result) {
        if (downloadedOffline) {
          const localFolder = buildLocalFolder(folderName.trim());
          localFolder.id = result.localId;
          await upsertOfflineFolder(localFolder);
        }
        Alert.alert(t("folderAssetScreen.folderModal.offlineTitle"), result.message);
      } else {
        if (downloadedOffline) {
          await upsertOfflineFolder(result.folder);
        }
        Alert.alert(
          t("folderAssetScreen.folderModal.successTitle"),
          t("folderAssetScreen.folderModal.successMessage")
        );
      }
      setFolderName("");
      setFolderModalVisible(false);
      await loadContents(currentFolderId, { showSkeleton: true });
    } catch (error: any) {
      Alert.alert(
        t("folderAssetScreen.folderModal.errorTitle"),
        error.message || t("folderAssetScreen.folderModal.errorMessage")
      );
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
      rawData: (draft as any).rawData ?? {},
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
      hasNotes:draft.hasNotes ?? false,
      notes: draft.notes || null,
      isPresent: draft.isPresent ?? true,
      createdBy: { id: "offline-user", fullName: "You", email: "" },
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
      rawData: (draft as any).rawData ?? {},
      images: newImages,
      voiceNotes: newVoiceNotes,
      condition: draft.condition || null,
      code: draft.code || null,
      assetType: normalizedAssetType,
      brand: isVehicle ? draft.brand || null : null,
      model: isVehicle ? draft.model || null : null,
      
      hasNotes:draft.hasNotes ?? false,
      notes: draft.notes || null,

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
    
    await refreshPendingCount();
    if ("offline" in result) {
      if (downloadedOffline) {
        const localAsset = buildLocalAsset(draft);
        localAsset.id = result.localId;
        await upsertOfflineAsset(localAsset);
      }
      showSnackbar(result.message, "info");
    } else {
      if (downloadedOffline) await upsertOfflineAsset(result.asset);
      showSnackbar(t("folderAssetScreen.snackbar.assetCreated"), "success");
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
      rawData: (draft as any).rawData ?? {},
      code: draft.code || null,
      condition: draft.condition || null,
      assetType: normalizedAssetType,
      brand: isVehicle ? draft.brand || null : null,
      model: isVehicle ? draft.model || null : null,

      hasNotes:draft.hasNotes ?? false,
      notes: draft.notes || null,

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
    await refreshPendingCount();
    if ("offline" in result) {
      if (downloadedOffline) {
        const existingOfflineAsset =
          (await getOfflineAssetById(editingAsset.id)) ?? editingAsset;
        const updatedOfflineAsset: AssetItem = {
          ...existingOfflineAsset,
          name: draft.name,
          writtenDescription: draft.writtenDescription || null,
          rawData: (draft as any).rawData ?? (existingOfflineAsset as any).rawData ?? {},
          condition: draft.condition || null,
          code: draft.code ?? existingOfflineAsset.code ?? null,
          assetType: normalizedAssetType,
          brand: isVehicle ? draft.brand || null : null,
          model: isVehicle ? draft.model || null : null,

          hasNotes:draft.hasNotes ?? false,
          notes: draft.notes || null,

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
      if (downloadedOffline) await upsertOfflineAsset(result.asset);
      showSnackbar(t("folderAssetScreen.snackbar.assetUpdated"), "success");
    }
    await loadContents(currentFolderId, { showSkeleton: true });
  };

  const submitAssetInBackground = async (draft: AssetDraft, isEdit: boolean) => {
    setPendingAssetSaveCount((count) => count + 1);
    try {
      if (isEdit) {
        await updateAssetAsync(draft);
      } else {
        await createAssetAsync(draft);
      }
    } catch (error: any) {
      showSnackbar(
        error?.message || t("folderAssetScreen.snackbar.saveFailed"),
        "error"
      );
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
    if (filter === "done") filtered = filtered.filter((a) => a.isDone);
    else if (filter === "incomplete") filtered = filtered.filter((a) => !a.isDone);
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(query));
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
    return combined.filter((item) => item.name?.toLowerCase().includes(q));
  }, [folders, filteredAssets, searchQuery]);


  const getAssetImageUri = (asset: AssetItem) => {
  const image = asset.images?.find((img: any) => {
    const uri = img?.url || img?.uri;
    return typeof uri === "string" && uri.trim().length > 0;
  });

  return image?.url || image?.url || null;
};

const getValidAssetImages = (asset: AssetItem) => {
  return (asset.images || []).filter((img: any) => {
    const uri = img?.url || img?.uri;
    return typeof uri === "string" && uri.trim().length > 0;
  });
};

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
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{projectName}</Text>
            <Text style={styles.subtitle}>
              {t("folderAssetScreen.header.subtitle")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={() => router.push("/(app)/project")}
            activeOpacity={0.85}
          >
            <Text style={styles.dashboardBtnText}>
              {t("folderAssetScreen.header.dashboardBtn")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Offline badge ── */}
        {downloadedOffline && !isOnline && (
          <Text style={styles.offlineModeText}>
            {t("folderAssetScreen.offline.badge")}
          </Text>
        )}

        {/* ── Pending / sync bar ── */}
        <View style={styles.pendingBadge}>
          <Ionicons
            name="ellipse"
            size={12}
            color={isOnline ? "#4CAF50" : "#888"}
            style={styles.networkIndicator}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingText}>
              {t("folderAssetScreen.sync.pendingAssets", {
                count: pendingCount,
                plural: pendingCount !== 1 ? "s" : "",
              })}
            </Text>
          </View>
          <TouchableOpacity
           onPress={() => handleSyncNow(false)}
            style={styles.syncBtn}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color="#ffffff" />

                <Text style={styles.syncBtnText}>
                  {" "}{t("folderAssetScreen.sync.syncing")}
                </Text>
              </View>
            ) : (
              <Text style={styles.syncBtnText}>
                {t("folderAssetScreen.sync.syncNow")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Breadcrumb ── */}
        <View style={styles.breadcrumbRow}>

            {path
            .filter((_, index) => !(index === 0 && adminRootFolderIdRef.current))
            .map((crumb, visibleIndex) => {
    const realIndex = adminRootFolderIdRef.current
      ? visibleIndex + 1
      : visibleIndex;

    return (
      <TouchableOpacity
        key={`${crumb.id ?? "root"}-${realIndex}`}
        onPress={() => goToPathIndex(realIndex)}
      >
        <Text style={styles.breadcrumbText}>
          {crumb.name}
          {visibleIndex <
          path.filter((_, index) => !(index === 0 && adminRootFolderIdRef.current)).length - 1
            ? " / "
            : ""}
        </Text>
      </TouchableOpacity>
    );
  })}


        </View>

        {/* ── Filter row ── */}
        <View style={styles.filterRow}>
          {(["all", "done", "incomplete"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {t(`folderAssetScreen.filter.${f}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Advanced search row ── */}
        <View style={styles.advancedSearchRow}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={
              selectedRawDataKey
                ? t("folderAssetScreen.search.placeholderWithKey", {
                    key: selectedRawDataKey,
                  })
                : t("folderAssetScreen.search.placeholderAll")
            }
            placeholderTextColor="#767B91"
            style={styles.advancedSearchInput}
          />
          <TouchableOpacity
            style={styles.rawKeyPicker}
            onPress={() => setRawKeyModalVisible(true)}
          >
            <Text style={styles.rawKeyPickerText} numberOfLines={1}>
              {selectedRawDataKey ||
                t("folderAssetScreen.search.fieldPickerLabel")}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#2A324B" />
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        {loading || contentLoading ? (
          <View
            style={[
              styles.listContent,
              { paddingBottom: 120 + insets.bottom },
            ]}
          >
            <View style={styles.gridWrap}>{renderSkeletons()}</View>
          </View>
        ) : (
          <>
            {isAdvancedSearching ? (
              /* ── Advanced search results list ── */
              <FlatList
                key={`cols-${FLAT_COLUMNS}`}
                data={advancedSearchListItems}
                keyExtractor={(item) =>
                  `advanced-${item.id} +- ${item.updatedAt}`
                }
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
                    <ActivityIndicator
                      color="#2A324B"
                      style={{ marginVertical: 18 }}
                    />
                  ) : null
                }
                ListEmptyComponent={
                  !advancedSearchLoading ? (
                    <View style={styles.emptyWrap}>
                      <Text style={styles.emptyTitle}>
                        {t("folderAssetScreen.advancedSearch.noResultsTitle")}
                      </Text>
                      <Text style={styles.emptyText}>
                        {t("folderAssetScreen.advancedSearch.noResultsText")}
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
                        source={{ uri: getAssetImageUri(item)! }}
                        style={styles.searchResultImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.searchResultIcon}>
                        <Ionicons
                          name="cube-outline"
                          size={28}
                          color="#020202"
                        />
                      </View>
                    )}
                    <View style={styles.searchResultBody}>
                      <Text
                        style={styles.searchResultTitle}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={styles.searchResultLocation}
                        numberOfLines={2}
                      >
                        {getAssetLocationText(item)}
                      </Text>
                      {selectedRawDataKey && (
                        <Text
                          style={styles.searchResultMeta}
                          numberOfLines={1}
                        >
                          {getRawDataValue(item.rawData, selectedRawDataKey) ??
                            "—"}
                        </Text>
                      )}
                      {(item as any).hasNotes && (
                        <View style={styles.searchResultNotesIndicator}>
                          <Ionicons
                            name="document-text"
                            size={12}
                            color="#5B9BD5"
                          />
                          <Text style={styles.searchResultNotesText}>
                            Has notes
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#777" />
                  </TouchableOpacity>
                )}
              />
            ) : (
              /* ── Grid list ── */
              <FlatList
                data={items}
                keyExtractor={(item) => `${item.itemType}-${item.id}`}
                numColumns={NUM_COLUMNS}
                columnWrapperStyle={styles.columnWrapper}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                contentContainerStyle={[
                  styles.listContentWithBottomBar,
                  { paddingBottom: 120 + insets.bottom },
                ]}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>
                      {t("folderAssetScreen.empty.title")}
                    </Text>
                    <Text style={styles.emptyText}>
                      {isRootFolder
                        ? t("folderAssetScreen.empty.messageRoot")
                        : t("folderAssetScreen.empty.messageFolder")}
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
                              <Ionicons
                                name="folder"
                                size={36}
                                color={ACC}
                              />
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
                        {getAssetImageUri(item) ? (
                      <Image
                        source={{ uri: getAssetImageUri(item)! }}
                        style={styles.assetImageBackground}
                        resizeMode="cover"
                        />
                      ) : (
                          <View style={styles.iconWrap}>
                            <Ionicons
                              name="cube-outline"
                              size={36}
                              color={!item.isPresent ? "#FF4444" : "#fff"}
                            />
                          </View>
                        )}
                        {!item.isPresent && (
                          <View style={styles.notPresentOverlay} />
                        )}
                        <View style={styles.assetNameOverlay}>
                          <Text
                            style={styles.gridTitleOverlay}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                        </View>
                        {item.images && item.images.length > 0 && (
                          <View style={styles.photoCountBadge}>
                            <Text style={styles.photoCountText}>
                              {getValidAssetImages(item).length}
                            </Text>
                          </View>
                        )}
                        {(item as any).hasNotes && (
                          <View style={styles.notesBadge}>
                            <Ionicons
                              name="document-text"
                              size={12}
                              color="#fff"
                            />
                          </View>
                        )}
                        <View style={styles.syncTickBadge}>
                          <Ionicons
                            name={
                              item.id?.startsWith("offline_")
                                ? "checkmark"
                                : "checkmark-done"
                            }
                            size={12}
                            color={
                              item.id?.startsWith("offline_")
                                ? "#fff"
                                : "#F7C59F"
                            }
                          />
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </>
        )}

        {/* ── Scan FAB ── */}
        <TouchableOpacity
          style={[
            styles.scanFab,
            { bottom: Math.max(insets.bottom, 0) + 46 },
          ]}
          onPress={() => setCodeScannerVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="barcode-outline" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* ── Pending asset save loader ── */}
        {pendingAssetSaveCount > 0 && (
          <View style={[styles.pendingLoader, { bottom: Math.max(insets.bottom, 0) + 110 }]}>
            <ActivityIndicator size="small" color="#000" />
            <Text style={styles.pendingLoaderText}>{pendingAssetSaveCount}</Text>
          </View>
        )}

        {/* ── Back button ── */}
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={1}
          style={[
            styles.backButton,
            { bottom: Math.max(insets.bottom, 0) + 46 },
          ]}
        >
          <Text style={styles.backText}>
            {t("folderAssetScreen.actions.back")}
          </Text>
        </TouchableOpacity>

        {/* ── Bottom action bar (inside folder only) ── */}
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
              <Text style={styles.primaryBtnText}>
                {t("folderAssetScreen.actions.newFolder")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setEditingAsset(null);
                setAssetModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>
                {t("folderAssetScreen.actions.newAsset")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Create folder modal ── */}
        <Modal
          visible={folderModalVisible}
          animationType="fade"
          transparent
          statusBarTranslucent
          onRequestClose={() => setFolderModalVisible(false)}
          onShow={() => {
            setTimeout(() => folderInputRef.current?.focus(), 80);
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
                    <Text style={styles.modalTitle}>
                      {t("folderAssetScreen.folderModal.title")}
                    </Text>
                    <TextInput
                      ref={folderInputRef}
                      style={styles.input}
                      placeholder={t(
                        "folderAssetScreen.folderModal.placeholder"
                      )}
                     placeholderTextColor="#767B91"
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
                        <Text style={styles.modalCancelText}>
                          {t("folderAssetScreen.folderModal.cancel")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalSaveBtn}
                        onPress={handleCreateFolder}
                      >
                        <Text style={styles.modalSaveText}>
                          {t("folderAssetScreen.folderModal.create")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── Raw key picker modal ── */}
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
                  <Text style={styles.modalTitle}>
                    {t("folderAssetScreen.fieldModal.title")}
                  </Text>
                  <TouchableOpacity
                    style={styles.rawKeyOption}
                    onPress={() => {
                      setSelectedRawDataKey(null);
                      setRawKeyModalVisible(false);
                    }}
                  >
                    <Text style={styles.rawKeyOptionText}>
                      {t("folderAssetScreen.fieldModal.allValues")}
                    </Text>
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

        {/* ── Code scanner modal ── */}
        <CodeScannerModal
          visible={codeScannerVisible}
          loading={codeLookupLoading}
          onClose={() => {
            if (!codeLookupLoading) setCodeScannerVisible(false);
          }}
          onDetected={handleDetectedAssetCode}
        />

        {/* ── Asset wizard modal ── */}
        <CreateAssetWizardModal
          disableAssetName={!!editingAsset}
          visible={assetModalVisible}
          onClose={closeAssetModal}
          onSubmit={(draft) => submitAssetInBackground(draft, !!editingAsset)}
          mode={editingAsset ? "edit" : "create"}
          initialData={editingAsset ? mapAssetToDraft(editingAsset) : undefined}
        />

        {/* ── Snackbar ── */}
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

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, paddingHorizontal: 10, paddingTop: 0 },

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

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: SURFACE,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterBtnActive: { backgroundColor: ACC, borderColor: ACC },
  filterText: { color: MUTED, fontSize: 12, fontWeight: "500" },
  filterTextActive: { color: "#ffffff", fontWeight: "600" },

  searchInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 14,
    marginBottom: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "400",
    color: TEXT,
    marginTop: 4,
    textTransform: "uppercase",
  },
  subtitle: { color: MUTED, marginTop: 0, marginBottom: 4, fontSize: 10 },

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
  dashboardBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },

  offlineModeBadge: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  offlineModeText: { color: MUTED, fontSize: 12 },

  pendingBadge: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  networkIndicator: { marginRight: 8 },
  syncingSubText: { color: MUTED, fontSize: 10, marginTop: 2 },

  syncTickBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: ACC,
    borderRadius: 8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },
  pendingText: { color: TEXT, fontSize: 12, flex: 1 },
  syncBtn: {
    backgroundColor: ACC,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },

  breadcrumbRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  breadcrumbText: { color: MUTED, fontSize: 10, fontWeight: "600" },

  listContent: { paddingBottom: 120 },
  listContentWithBottomBar: { paddingBottom: 120 },
  gridWrap: { flexDirection: "row", flexWrap: "wrap" },

  pendingSaveBanner: {
    backgroundColor: SOFT,
    borderColor: SOFT,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  pendingSaveText: { color: TEXT, fontSize: 12, fontWeight: "600" },

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
  snackbarText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  snackbarSuccess: { backgroundColor: ACC },
  snackbarError: { backgroundColor: "#FF6B6B" },
  snackbarInfo: { backgroundColor: MUTED },

  columnWrapper: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridItem: { width: ITEM_SIZE, marginBottom: GRID_GAP },
  gridCard: {
    width: "100%",
    height: ITEM_SIZE,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
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
    color: TEXT,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
    fontWeight: "500",
  },

  skeletonIconGrid: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: BORDER,
    marginBottom: 10,
  },
  skeletonTitleGrid: {
    width: "80%",
    height: 10,
    borderRadius: 6,
    backgroundColor: BORDER,
  },

  emptyWrap: { paddingTop: 60, alignItems: "center", width: "100%" },
  emptyTitle: { color: TEXT, fontSize: 12, fontWeight: "700" },
  emptyText: { color: MUTED, marginTop: 8, fontSize: 10 },

  bottomActionBar: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 5,
    borderColor: BORDER,
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
    color: "#ffffff",
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
    backgroundColor: "#ffffff",
  },
  secondaryBtnText: {
    color: ACC,
    fontSize: 13,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(42,50,75,0.55)",
    justifyContent: "center",
  },
  modalKeyboardWrap: { flex: 1, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#ffffff",
    padding: 15,
    paddingBottom: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: { color: TEXT, fontSize: 15, marginBottom: 16 },
  input: {
    backgroundColor: SURFACE,
    color: TEXT,
    fontSize: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalCancelText: { color: TEXT },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: ACC,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalSaveText: { color: "#ffffff" },

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
  assetNameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    zIndex: 10,
    backgroundColor: "rgba(42,50,75,0.65)",
  },
  gridTitleOverlay: {
    color: "#ffffff",
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
    borderColor: "#ffffff",
    zIndex: 10,
  },
  photoCountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(42,50,75,0.75)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 10,
  },
  photoCountText: { color: "#ffffff", fontSize: 10, fontWeight: "600" },
  notesBadge: {
    position: "absolute",
    top: 6,
    right: 50,
    backgroundColor: "#5B9BD5",
    borderRadius: 8,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  backButton: {
    backgroundColor: SOFT,
    borderRadius: 10,
    padding: 8,
    position: "absolute",
    left: 20,
    zIndex: 20,
  },
  backText: { fontSize: 16, fontWeight: "600", color: TEXT },

  rawKeyModalCard: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    alignSelf: "center",
    justifyContent: "center",
  },
  rawKeyOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rawKeyOptionText: { color: TEXT, fontSize: 15, fontWeight: "600" },

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
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  rawKeyPicker: {
    height: 44,
    minWidth: 96,
    maxWidth: 140,
    borderRadius: 14,
    backgroundColor: SOFT,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  rawKeyPickerText: {
    color: TEXT,
    fontWeight: "800",
    fontSize: 12,
    maxWidth: 95,
  },

  searchListContent: { paddingTop: 4 },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchResultImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: BORDER,
  },
  searchResultIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultBody: { flex: 1, marginLeft: 12 },
  searchResultTitle: { color: TEXT, fontSize: 14, fontWeight: "800" },
  searchResultLocation: { color: MUTED, fontSize: 12, marginTop: 3 },
  searchResultMeta: {
    color: ACC,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
  },
  searchResultNotesIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  searchResultNotesText: {
    color: "#5B9BD5",
    fontSize: 11,
    fontWeight: "600",
  },

  pendingLoader: {
    position: "absolute",
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SOFT,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    zIndex: 20,
    elevation: 8,
  },
  pendingLoaderText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
});