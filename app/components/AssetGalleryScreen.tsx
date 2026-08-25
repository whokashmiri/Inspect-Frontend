import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  assetCategoryApi,
  AssetCategoryItem,
  AssetTypeItem,
  AssetNameItem,
} from "../../api/assetCategory.api";
import { AssetImageItem, AssetItem, projectContentApi } from "../../api/api";

import {
  getAssetTaxonomyOffline,
  getOfflineRecentAssets,
  markOfflineAssetUsed,
  saveAssetTaxonomyOffline,
  useIsOnline,
} from "../offline";

import { isManualOfflineMode } from "../offline/connectivityMode";

// Types

export type PickedAssetCategory = {
  categoryId: string;
  category: string;

  typeId: string;
  type: string;

  nameId: string;
  name: string;
};

type AssetGalleryScreenProps = {
  visible: boolean;
  onClose: () => void;
  onPickAsset?: (asset: PickedAssetCategory) => void;

  projectId?: string;
};
type EditorField = "category" | "type" | "name" | null;
type PickerMode = "category" | "type" | null;

type SelectionSource = "taxonomy" | "recent" | null;
type AssetEditorMode = "add" | "recent";

type RecentViewerItem = {
  key: string;
  url: string;
};

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#D4D8E2";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const BACKGROUND = "#F6F7FA";

const UNKNOWN_ASSET: PickedAssetCategory = {
  categoryId: "unknown",
  category: "",

  typeId: "unknown",
  type: "",

  nameId: "unknown",
  name: "Unknown",
};

// Helpers

const createLocalId = (prefix: string) =>
  `local_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeText = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

const createRandomFeaturedIds = (
  items: AssetNameItem[],
  limit = 10,
): string[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }

  return copy.slice(0, limit).map((item) => item.id);
};

const getInitials = (name?: string | null) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const AVATAR_COLORS = [
  "#2A324B",
  "#52616B",
  "#6B705C",
  "#725A7A",
  "#8A5A44",
  "#4F6D7A",
];

const getAvatarColor = (name?: string | null) => {
  const text = String(name || "");
  const value = text
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return AVATAR_COLORS[value % AVATAR_COLORS.length];
};

const recentAssetToPick = (asset: AssetItem): PickedAssetCategory => ({
  categoryId: asset.categoryId || "unknown",
  category: asset.category || "Unknown",

  typeId: asset.typeId || "unknown",
  type: asset.type || "Unknown",

  nameId: asset.nameId || "unknown",
  name: asset.name || "Unknown",
});

const getTaxonomyAssetImageUrl = (_item: AssetNameItem): string | null => {
  return null;
};

const getMediaUrl = (item?: AssetImageItem | null): string | null => {
  const value = item?.url || item?.uri || "";
  const text = String(value).trim();
  return text || null;
};

const isImageMedia = (item?: AssetImageItem | null) => {
  if (!item) return false;
  return item.mediaType !== "video";
};

const getRecentAssetMainImageUrl = (asset: AssetItem): string | null => {
  const images = asset.images;

  if (!images) return null;

  if (Array.isArray(images)) {
    const firstImage = images.find(
      (item) => isImageMedia(item) && getMediaUrl(item),
    );
    return getMediaUrl(firstImage);
  }

  if (isImageMedia(images.main)) {
    return getMediaUrl(images.main);
  }

  const fallback = [
    images.details,
    images.brand,
    images.plate,
    images.odometer,
    ...(Array.isArray(images.other) ? images.other : []),
  ].find((item) => isImageMedia(item) && getMediaUrl(item));

  return getMediaUrl(fallback);
};

const getRecentAssetImages = (asset: AssetItem): RecentViewerItem[] => {
  const images = asset.images;

  const source: AssetImageItem[] = Array.isArray(images)
    ? images
    : [
        images?.main,
        images?.details,
        images?.brand,
        images?.plate,
        images?.odometer,
        ...(Array.isArray(images?.other) ? images.other : []),
      ].filter((item): item is AssetImageItem => Boolean(item));

  const seen = new Set<string>();
  const result: RecentViewerItem[] = [];

  source.forEach((item, index) => {
    if (!isImageMedia(item)) return;

    const url = getMediaUrl(item);
    if (!url || seen.has(url)) return;

    seen.add(url);
    result.push({
      key: item.id || item.publicId || `${asset.id}-${index}-${url}`,
      url,
    });
  });

  return result;
};

function AssetAvatar({
  name,
  imageUrl,
  small = false,
}: {
  name: string;
  imageUrl?: string | null;
  small?: boolean;
}) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.assetAvatar, small && styles.assetAvatarSmall]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.assetAvatar,
        styles.assetAvatarFallback,
        small && styles.assetAvatarSmall,
        { backgroundColor: getAvatarColor(name) },
      ]}
    >
      <Text
        style={[styles.assetAvatarText, small && styles.assetAvatarTextSmall]}
        numberOfLines={1}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

function AssetGallerySkeleton() {
  return (
    <View style={styles.skeletonScreen}>
      <View style={styles.header}>
        <View style={styles.skeletonBackButton} />

        <View style={styles.headerText}>
          <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
          <View style={[styles.skeletonBlock, styles.skeletonSubtitle]} />
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterColumn}>
          <View style={[styles.skeletonBlock, styles.skeletonFilterLabel]} />
          <View style={styles.skeletonDropdown} />
        </View>

        <View style={styles.filterColumn}>
          <View style={[styles.skeletonBlock, styles.skeletonFilterLabel]} />
          <View style={styles.skeletonDropdown} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.skeletonSearchBox} />
        <View style={styles.skeletonFavoriteFilter} />
      </View>

      <View style={styles.skeletonListContent}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.assetRow}>
            <View style={styles.skeletonStar} />
            <View style={styles.skeletonAvatar} />

            <View style={styles.assetRowBody}>
              <View
                style={[
                  styles.skeletonBlock,
                  styles.skeletonAssetName,
                  item % 2 === 0 && styles.skeletonAssetNameShort,
                ]}
              />
              <View style={[styles.skeletonBlock, styles.skeletonAssetMeta]} />
            </View>

            <View style={styles.skeletonSelectionIcon} />
          </View>
        ))}
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.skeletonContinueButton} />
      </View>
    </View>
  );
}

export default function AssetGalleryScreen({
  visible,
  onClose,
  onPickAsset,
  projectId,
}: AssetGalleryScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isOnline = useIsOnline();

  const shouldUseOffline = !isOnline || isManualOfflineMode();

  const [categories, setCategories] = useState<AssetCategoryItem[]>([]);
  const [types, setTypes] = useState<AssetTypeItem[]>([]);
  const [names, setNames] = useState<AssetNameItem[]>([]);
  const [featuredNameIds, setFeaturedNameIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recentAssets, setRecentAssets] = useState<AssetItem[]>([]);
  const [selectedRecentAssetId, setSelectedRecentAssetId] = useState<
    string | null
  >(null);

  const [recentViewerAsset, setRecentViewerAsset] = useState<AssetItem | null>(
    null,
  );
  const [recentViewerIndex, setRecentViewerIndex] = useState(0);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedNameId, setSelectedNameId] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteNameIds, setFavoriteNameIds] = useState<Set<string>>(
    new Set(),
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryText, setEditingCategoryText] = useState("");
  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<Set<string>>(
    new Set(),
  );

  const [showAddType, setShowAddType] = useState(false);
  const [newTypeText, setNewTypeText] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeText, setEditingTypeText] = useState("");
  const [favoriteTypeIds, setFavoriteTypeIds] = useState<Set<string>>(
    new Set(),
  );

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameText, setEditingNameText] = useState("");

  const [addAssetModalOpen, setAddAssetModalOpen] = useState(false);
  const [assetEditorMode, setAssetEditorMode] =
    useState<AssetEditorMode>("add");
  const [addCategoryText, setAddCategoryText] = useState("");
  const [addTypeText, setAddTypeText] = useState("");
  const [addAssetNameText, setAddAssetNameText] = useState("");

  const categoryInputRef = useRef<TextInput>(null);
  const typeInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  const [focusedEditorField, setFocusedEditorField] =
    useState<EditorField>(null);

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const selectedType = useMemo(
    () => types.find((item) => item.id === selectedTypeId) ?? null,
    [types, selectedTypeId],
  );

  const selectedName = useMemo(
    () => names.find((item) => item.id === selectedNameId) ?? null,
    [names, selectedNameId],
  );

  const selectedRecentAsset = useMemo(
    () =>
      selectedRecentAssetId
        ? (recentAssets.find((item) => item.id === selectedRecentAssetId) ??
          null)
        : null,
    [recentAssets, selectedRecentAssetId],
  );

  const availableTypes = useMemo(() => {
    if (!selectedCategoryId) return [];
    return types.filter((item) => item.categoryId === selectedCategoryId);
  }, [types, selectedCategoryId]);

  const getTypeForName = (name: AssetNameItem) =>
    types.find((item) => item.id === name.typeId) ?? null;

  const getCategoryForName = (name: AssetNameItem) => {
    const type = getTypeForName(name);
    if (!type) return null;

    return categories.find((item) => item.id === type.categoryId) ?? null;
  };

  const resetTransientState = () => {
    setPickerMode(null);
    setPickerSearch("");

    setShowAddCategory(false);
    setNewCategoryText("");
    setEditingCategoryId(null);
    setEditingCategoryText("");

    setShowAddType(false);
    setNewTypeText("");
    setEditingTypeId(null);
    setEditingTypeText("");

    setEditingNameId(null);
    setEditingNameText("");

    setAddAssetModalOpen(false);
    setAssetEditorMode("add");
    setAddCategoryText("");
    setAddTypeText("");
    setAddAssetNameText("");

    setSearchQuery("");
    setFavoritesOnly(false);

    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSelectedNameId(null);
    setSelectionSource(null);
    setSelectedRecentAssetId(null);

    setRecentViewerAsset(null);
    setRecentViewerIndex(0);
  };

  const applyTaxonomyData = (result: {
    categories?: AssetCategoryItem[];
    types?: AssetTypeItem[];
    names?: AssetNameItem[];
  }) => {
    const loadedCategories = result?.categories ?? [];

    const loadedTypes = result?.types ?? [];

    const loadedNames = result?.names ?? [];

    setCategories(loadedCategories);
    setTypes(loadedTypes);
    setNames(loadedNames);

    setFeaturedNameIds(createRandomFeaturedIds(loadedNames, 10));
  };

  const loadData = async (isRefresh = false) => {
    try {
      setError(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // ---------------------------------------------------------
      // OFFLINE / MANUAL OFFLINE
      // ---------------------------------------------------------

      if (shouldUseOffline) {
        const cached = await getAssetTaxonomyOffline();

        if (!cached) {
          setCategories([]);
          setTypes([]);
          setNames([]);
          setFeaturedNameIds([]);

          setError(
            "Asset suggestions are not available offline yet. Download the project while online first.",
          );

          return;
        }

        applyTaxonomyData(cached);

        return;
      }

      // ---------------------------------------------------------
      // ONLINE
      // ---------------------------------------------------------

      try {
        const result = await assetCategoryApi.getAll();

        applyTaxonomyData(result);

        /*
         * Keep the latest successful server taxonomy
         * available for offline usage.
         */
        await saveAssetTaxonomyOffline({
          categories: result?.categories ?? [],

          types: result?.types ?? [],

          names: result?.names ?? [],
        });
      } catch (onlineError) {
        console.warn(
          "[AssetGallery] Online taxonomy load failed. Trying offline cache.",
          onlineError,
        );

        /*
         * Network/API can fail even while NetInfo
         * says we're online.
         */
        const cached = await getAssetTaxonomyOffline();

        if (cached) {
          applyTaxonomyData(cached);

          return;
        }

        throw onlineError;
      }
    } catch (err: any) {
      console.error("[Asset Category Load Error]", err);

      setError(err?.message || "Could not load asset categories.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const isValidTaxonomyValue = (value?: string | null) => {
    const text = String(value || "")
      .trim()
      .toLowerCase();

    return text.length > 0 && text !== "unknown";
  };

  const loadRecentAssets = async () => {
    if (!projectId) {
      setRecentAssets([]);
      return;
    }

    try {
      // ---------------------------------------------------------
      // OFFLINE
      // ---------------------------------------------------------

      if (shouldUseOffline) {
        const assets = await getOfflineRecentAssets(projectId, 8);

        setRecentAssets(assets);

        return;
      }

      // ---------------------------------------------------------
      // ONLINE
      // ---------------------------------------------------------

      try {
        const result = await projectContentApi.getRecentAssets(projectId, 8);

        const assets = (result.assets || []).filter(
          (item) =>
            item.assetType === "other" &&
            isValidTaxonomyValue(item.category) &&
            isValidTaxonomyValue(item.type),
        );

        setRecentAssets(assets);
      } catch (onlineError) {
        console.warn(
          "[AssetGallery] Online recent load failed. Using offline recent assets.",
          onlineError,
        );

        const offlineAssets = await getOfflineRecentAssets(projectId, 8);

        setRecentAssets(offlineAssets);
      }
    } catch (err) {
      console.warn("[AssetGallery] Could not load recent assets", err);

      setRecentAssets([]);
    }
  };
  const refreshAll = async () => {
    setRefreshing(true);

    try {
      await Promise.all([loadData(true), loadRecentAssets()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    resetTransientState();

    void Promise.all([loadData(), loadRecentAssets()]);
  }, [visible, projectId, shouldUseOffline]);

  const filteredRecentAssets = useMemo(() => {
    const query = normalizeText(searchQuery);

    if (!query) return recentAssets;

    return recentAssets.filter(
      (item) =>
        normalizeText(item.name).includes(query) ||
        normalizeText(item.type).includes(query) ||
        normalizeText(item.category).includes(query),
    );
  }, [recentAssets, searchQuery]);

  const displayedNames = useMemo(() => {
    const query = normalizeText(searchQuery);
    let source = names;

    const taxonomyFiltering = selectionSource !== "recent";

    if (taxonomyFiltering && selectedTypeId) {
      source = source.filter((item) => item.typeId === selectedTypeId);
    } else if (taxonomyFiltering && selectedCategoryId) {
      const categoryTypeIds = new Set(
        types
          .filter((item) => item.categoryId === selectedCategoryId)
          .map((item) => item.id),
      );

      source = source.filter((item) => categoryTypeIds.has(item.typeId));
    } else if (!query && !favoritesOnly) {
      const featured = new Set(featuredNameIds);
      source = source.filter((item) => featured.has(item.id));
    }

    source = source.filter((item) => {
      if (favoritesOnly && !favoriteNameIds.has(item.id)) return false;
      if (!query) return true;

      const type = types.find((typeItem) => typeItem.id === item.typeId);
      const category = type
        ? categories.find((categoryItem) => categoryItem.id === type.categoryId)
        : null;

      return (
        normalizeText(item.label).includes(query) ||
        normalizeText(type?.label).includes(query) ||
        normalizeText(category?.label).includes(query)
      );
    });

    return [...source].sort((a, b) => {
      const aFavorite = favoriteNameIds.has(a.id);
      const bFavorite = favoriteNameIds.has(b.id);

      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [
    names,
    types,
    categories,
    selectedCategoryId,
    selectedTypeId,
    selectionSource,
    searchQuery,
    favoritesOnly,
    favoriteNameIds,
    featuredNameIds,
  ]);

  const clearCategoryFilter = () => {
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSelectedNameId(null);
    setSelectionSource(null);
    setSelectedRecentAssetId(null);
    setSearchQuery("");
    setFeaturedNameIds(createRandomFeaturedIds(names, 10));
  };

  const clearTypeFilter = () => {
    setSelectedTypeId(null);
    setSelectedNameId(null);
    setSelectedRecentAssetId(null);
    setSelectionSource(selectedCategoryId ? "taxonomy" : null);
    setSearchQuery("");
  };

  const clearSelection = () => {
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSelectedNameId(null);
    setSelectedRecentAssetId(null);
    setSelectionSource(null);
    setEditingNameId(null);
    setEditingNameText("");
    setSearchQuery("");
    setFeaturedNameIds(createRandomFeaturedIds(names, 10));
  };

  const selectCategory = (category: AssetCategoryItem) => {
    setSelectionSource("taxonomy");
    setSelectedRecentAssetId(null);
    setSelectedCategoryId(category.id);
    setSelectedTypeId(null);
    setSelectedNameId(null);
    setEditingNameId(null);
    setEditingNameText("");
    setSearchQuery("");
    closePicker();
  };

  const selectType = (type: AssetTypeItem) => {
    setSelectionSource("taxonomy");
    setSelectedRecentAssetId(null);
    setSelectedTypeId(type.id);
    setSelectedNameId(null);
    setEditingNameId(null);
    setEditingNameText("");
    setSearchQuery("");
    closePicker();
  };

  const handleSelectName = (item: AssetNameItem) => {
    const type = types.find((typeItem) => typeItem.id === item.typeId);
    if (!type) return;

    const category = categories.find(
      (categoryItem) => categoryItem.id === type.categoryId,
    );
    if (!category) return;

    const alreadySelected =
      selectionSource === "taxonomy" && selectedNameId === item.id;

    if (alreadySelected) {
      setSelectedNameId(null);
      setSelectedRecentAssetId(null);
      setSelectionSource(
        selectedCategoryId || selectedTypeId ? "taxonomy" : null,
      );
      return;
    }

    setSelectionSource("taxonomy");
    setSelectedRecentAssetId(null);
    setSelectedCategoryId(category.id);
    setSelectedTypeId(type.id);
    setSelectedNameId(item.id);
    setEditingNameId(null);
    setEditingNameText("");
  };

  const handleSelectRecentAsset = (asset: AssetItem) => {
    const alreadySelected =
      selectionSource === "recent" && selectedRecentAssetId === asset.id;

    if (alreadySelected) {
      setSelectionSource(null);
      setSelectedRecentAssetId(null);
      setSelectedCategoryId(null);
      setSelectedTypeId(null);
      setSelectedNameId(null);
      setFeaturedNameIds(createRandomFeaturedIds(names, 10));
      return;
    }

    setSelectionSource("recent");
    setSelectedRecentAssetId(asset.id);
    setSelectedCategoryId(asset.categoryId || null);
    setSelectedTypeId(asset.typeId || null);
    setSelectedNameId(asset.nameId || null);
    setEditingNameId(null);
    setEditingNameText("");

    setFeaturedNameIds(createRandomFeaturedIds(names, 10));
  };

  const toggleFavoriteCategory = (categoryId: string) => {
    setFavoriteCategoryIds((prev) => {
      const next = new Set(prev);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  };

  const toggleFavoriteType = (typeId: string) => {
    setFavoriteTypeIds((prev) => {
      const next = new Set(prev);
      next.has(typeId) ? next.delete(typeId) : next.add(typeId);
      return next;
    });
  };

  const toggleFavorite = (nameId: string) => {
    setFavoriteNameIds((prev) => {
      const next = new Set(prev);
      next.has(nameId) ? next.delete(nameId) : next.add(nameId);
      return next;
    });
  };

  const openPicker = (mode: PickerMode) => {
    if (!mode) return;
    if (mode === "type" && !selectedCategory) return;

    setPickerMode(mode);
    setPickerSearch("");

    setEditingCategoryId(null);
    setEditingCategoryText("");
    setEditingTypeId(null);
    setEditingTypeText("");

    setShowAddCategory(false);
    setNewCategoryText("");
    setShowAddType(false);
    setNewTypeText("");
  };

  const closePicker = () => {
    setPickerMode(null);
    setPickerSearch("");

    setEditingCategoryId(null);
    setEditingCategoryText("");
    setEditingTypeId(null);
    setEditingTypeText("");

    setShowAddCategory(false);
    setNewCategoryText("");
    setShowAddType(false);
    setNewTypeText("");
  };

  const pickerItems = useMemo(() => {
    const source =
      pickerMode === "category"
        ? categories
        : pickerMode === "type"
          ? availableTypes
          : [];

    const query = normalizeText(pickerSearch);
    const filtered = !query
      ? source
      : source.filter((item) => normalizeText(item.label).includes(query));

    const favorites =
      pickerMode === "category" ? favoriteCategoryIds : favoriteTypeIds;

    return [...filtered].sort((a, b) => {
      const aFavorite = favorites.has(a.id);
      const bFavorite = favorites.has(b.id);

      if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [
    pickerMode,
    pickerSearch,
    categories,
    availableTypes,
    favoriteCategoryIds,
    favoriteTypeIds,
  ]);

  const handleCategoryAction = () => {
    if (focusedEditorField === "category") {
      if (addCategoryText.trim()) {
        handleEditorAddCategory();
      }

      categoryInputRef.current?.blur();
      setFocusedEditorField(null);
      return;
    }

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(false);
    setNameDropdownOpen(false);

    setFocusedEditorField("category");

    requestAnimationFrame(() => {
      categoryInputRef.current?.focus();
    });
  };

  const handleTypeAction = () => {
    if (!editorSelectedCategory) {
      categoryInputRef.current?.focus();
      setFocusedEditorField("category");
      return;
    }
    if (focusedEditorField === "type") {
      if (addTypeText.trim()) {
        handleEditorAddType();
      }

      typeInputRef.current?.blur();
      setFocusedEditorField(null);
      return;
    }

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(false);
    setNameDropdownOpen(false);

    setFocusedEditorField("type");

    requestAnimationFrame(() => {
      typeInputRef.current?.focus();
    });
  };

  const handleNameAction = () => {
    if (focusedEditorField === "name") {
      if (addAssetNameText.trim()) {
        handleEditorAddName();
      }

      nameInputRef.current?.blur();
      setFocusedEditorField(null);
      return;
    }

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(false);
    setNameDropdownOpen(false);

    setFocusedEditorField("name");

    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
  };

  const handleAddCategory = () => {
    const label = newCategoryText.trim();
    if (!label) return;

    const existing = categories.find(
      (item) => normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      selectCategory(existing);
      return;
    }

    const category: AssetCategoryItem = {
      id: createLocalId("category"),
      label,
    };

    setCategories((prev) => [category, ...prev]);
    setSelectionSource("taxonomy");
    setSelectedRecentAssetId(null);
    setSelectedCategoryId(category.id);
    setSelectedTypeId(null);
    setSelectedNameId(null);
    setNewCategoryText("");
    setShowAddCategory(false);
  };

  const beginEditCategory = (category: AssetCategoryItem) => {
    setShowAddCategory(false);
    setNewCategoryText("");
    setEditingCategoryId(category.id);
    setEditingCategoryText(category.label);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryText("");
  };

  const saveEditedCategory = (categoryId: string) => {
    const label = editingCategoryText.trim();
    if (!label) return;

    setCategories((prev) =>
      prev.map((item) => (item.id === categoryId ? { ...item, label } : item)),
    );

    setEditingCategoryId(null);
    setEditingCategoryText("");
  };

  const handleAddType = () => {
    if (!selectedCategoryId) return;

    const label = newTypeText.trim();
    if (!label) return;

    const existing = availableTypes.find(
      (item) => normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      selectType(existing);
      return;
    }

    const type: AssetTypeItem = {
      id: createLocalId("type"),
      categoryId: selectedCategoryId,
      label,
    };

    setTypes((prev) => [type, ...prev]);
    setSelectionSource("taxonomy");
    setSelectedRecentAssetId(null);
    setSelectedTypeId(type.id);
    setSelectedNameId(null);
    setNewTypeText("");
    setShowAddType(false);
  };

  const beginEditType = (type: AssetTypeItem) => {
    setShowAddType(false);
    setNewTypeText("");
    setEditingTypeId(type.id);
    setEditingTypeText(type.label);
  };

  const cancelEditType = () => {
    setEditingTypeId(null);
    setEditingTypeText("");
  };

  const saveEditedType = (typeId: string) => {
    const label = editingTypeText.trim();
    if (!label) return;

    setTypes((prev) =>
      prev.map((item) => (item.id === typeId ? { ...item, label } : item)),
    );

    setEditingTypeId(null);
    setEditingTypeText("");
  };

  const beginEditName = (item: AssetNameItem) => {
    if (!(selectionSource === "taxonomy" && selectedNameId === item.id)) {
      handleSelectName(item);
    }

    setEditingNameId(item.id);
    setEditingNameText(item.label);
  };

  const cancelEditName = () => {
    setEditingNameId(null);
    setEditingNameText("");
  };

  const saveEditedName = (nameId: string) => {
    const label = editingNameText.trim();
    if (!label) return;

    setNames((prev) =>
      prev.map((item) => (item.id === nameId ? { ...item, label } : item)),
    );

    setEditingNameId(null);
    setEditingNameText("");
  };

  const editorCategoryMatches = useMemo(() => {
    const query = normalizeText(addCategoryText);
    const source = !query
      ? categories
      : categories.filter((item) => normalizeText(item.label).includes(query));

    return [...source]
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [categories, addCategoryText]);

  const editorSelectedCategory = useMemo(
    () =>
      categories.find(
        (item) => normalizeText(item.label) === normalizeText(addCategoryText),
      ) ?? null,
    [categories, addCategoryText],
  );

  const editorTypeMatches = useMemo(() => {
    if (!editorSelectedCategory) return [];

    const query = normalizeText(addTypeText);
    const source = types.filter(
      (item) => item.categoryId === editorSelectedCategory.id,
    );

    return (
      query
        ? source.filter((item) => normalizeText(item.label).includes(query))
        : source
    )
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [types, editorSelectedCategory, addTypeText]);

  const editorSelectedType = useMemo(
    () =>
      editorSelectedCategory
        ? (types.find(
            (item) =>
              item.categoryId === editorSelectedCategory.id &&
              normalizeText(item.label) === normalizeText(addTypeText),
          ) ?? null)
        : null,
    [types, editorSelectedCategory, addTypeText],
  );

  const editorNameMatches = useMemo(() => {
    if (!editorSelectedType) return [];

    const query = normalizeText(addAssetNameText);
    const source = names.filter(
      (item) => item.typeId === editorSelectedType.id,
    );

    return (
      query
        ? source.filter((item) => normalizeText(item.label).includes(query))
        : source
    )
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [names, editorSelectedType, addAssetNameText]);

  const closeAssetEditor = () => {
    setAddAssetModalOpen(false);
    setAssetEditorMode("add");

    setAddCategoryText("");
    setAddTypeText("");
    setAddAssetNameText("");

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(false);
    setNameDropdownOpen(false);

    setFocusedEditorField(null);
  };

  const openAddAssetModal = () => {
    setAssetEditorMode("add");

    setAddCategoryText(
      selectionSource === "recent"
        ? selectedRecentAsset?.category || ""
        : selectedCategory?.label || "",
    );

    setAddTypeText(
      selectionSource === "recent"
        ? selectedRecentAsset?.type || ""
        : selectedType?.label || "",
    );

    setAddAssetNameText("");

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(false);
    setNameDropdownOpen(false);

    setFocusedEditorField(null);

    setAddAssetModalOpen(true);
  };

  const openRecentAssetEditor = (asset: AssetItem) => {
    setAssetEditorMode("recent");

    setAddCategoryText(asset.category || "");
    setAddTypeText(asset.type || "");
    setAddAssetNameText(asset.name || "");

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(false);
    setNameDropdownOpen(false);

    setFocusedEditorField(null);

    setAddAssetModalOpen(true);
  };

  const selectEditorCategory = (category: AssetCategoryItem) => {
    const changed =
      normalizeText(addCategoryText) !== normalizeText(category.label);

    setAddCategoryText(category.label);

    if (changed) {
      setAddTypeText("");
      setAddAssetNameText("");
    }

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(true);
    setNameDropdownOpen(false);
  };

  const selectEditorType = (type: AssetTypeItem) => {
    const changed = normalizeText(addTypeText) !== normalizeText(type.label);

    setAddTypeText(type.label);

    if (changed) {
      setAddAssetNameText("");
    }

    setTypeDropdownOpen(false);
    setNameDropdownOpen(true);
  };

  const selectEditorName = (name: AssetNameItem) => {
    setAddAssetNameText(name.label);
    setNameDropdownOpen(false);
  };

  const handleAddCompleteAsset = () => {
    const categoryLabel = addCategoryText.trim();
    const typeLabel = addTypeText.trim();
    const assetLabel = addAssetNameText.trim();

    if (!categoryLabel || !typeLabel || !assetLabel) {
      return;
    }

    // ---------------------------------------------------------
    // RECENT ASSET
    // Category + Type must stay exactly the same.
    // Only the asset name can be changed.
    // ---------------------------------------------------------

    if (assetEditorMode === "recent" && selectedRecentAsset) {
      const newNameId = createLocalId("name");

      const newName: AssetNameItem = {
        id: newNameId,
        typeId: selectedRecentAsset.typeId || "unknown",
        label: assetLabel,
      };

      setNames((prev) => [newName, ...prev]);

      setSelectionSource("taxonomy");
      setSelectedRecentAssetId(null);

      setSelectedCategoryId(selectedRecentAsset.categoryId || "unknown");

      setSelectedTypeId(selectedRecentAsset.typeId || "unknown");

      setSelectedNameId(newNameId);

      setFeaturedNameIds((prev) =>
        prev.includes(newNameId) ? prev : [newNameId, ...prev].slice(0, 10),
      );

      finishWithAsset({
        categoryId: selectedRecentAsset.categoryId || "unknown",

        category: selectedRecentAsset.category || categoryLabel,

        typeId: selectedRecentAsset.typeId || "unknown",

        type: selectedRecentAsset.type || typeLabel,

        nameId: newNameId,

        name: assetLabel,
      });

      closeAssetEditor();

      return;
    }

    // ---------------------------------------------------------
    // NORMAL ADD ASSET FLOW
    // Category, Type and Name can all be created/changed.
    // ---------------------------------------------------------

    let category = categories.find(
      (item) => normalizeText(item.label) === normalizeText(categoryLabel),
    );

    if (!category) {
      category = {
        id: createLocalId("category"),
        label: categoryLabel,
      };

      setCategories((prev) => [category!, ...prev]);
    }

    let type = types.find(
      (item) =>
        item.categoryId === category!.id &&
        normalizeText(item.label) === normalizeText(typeLabel),
    );

    if (!type) {
      type = {
        id: createLocalId("type"),
        categoryId: category.id,
        label: typeLabel,
      };

      setTypes((prev) => [type!, ...prev]);
    }

    let name = names.find(
      (item) =>
        item.typeId === type!.id &&
        normalizeText(item.label) === normalizeText(assetLabel),
    );

    if (!name) {
      name = {
        id: createLocalId("name"),
        typeId: type.id,
        label: assetLabel,
      };

      setNames((prev) => [name!, ...prev]);
    }

    setSelectionSource("taxonomy");
    setSelectedRecentAssetId(null);

    setSelectedCategoryId(category.id);
    setSelectedTypeId(type.id);
    setSelectedNameId(name.id);

    setFeaturedNameIds((prev) =>
      prev.includes(name!.id) ? prev : [name!.id, ...prev].slice(0, 10),
    );

    closeAssetEditor();
  };

  const handleEditorAddCategory = () => {
    const label = addCategoryText.trim();
    if (!label) return;

    const existing = categories.find(
      (item) => normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      selectEditorCategory(existing);
      setCategoryDropdownOpen(false);
      setTypeDropdownOpen(true);
      return;
    }

    const category: AssetCategoryItem = {
      id: createLocalId("category"),
      label,
    };

    setCategories((prev) => [category, ...prev]);

    setAddCategoryText(category.label);
    setAddTypeText("");
    setAddAssetNameText("");

    setCategoryDropdownOpen(false);
    setTypeDropdownOpen(true);
    setNameDropdownOpen(false);
  };

  const handleEditorAddType = () => {
    if (!editorSelectedCategory) return;

    const label = addTypeText.trim();
    if (!label) return;

    const existing = types.find(
      (item) =>
        item.categoryId === editorSelectedCategory.id &&
        normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      selectEditorType(existing);
      setTypeDropdownOpen(false);
      setNameDropdownOpen(true);
      return;
    }

    const type: AssetTypeItem = {
      id: createLocalId("type"),
      categoryId: editorSelectedCategory.id,
      label,
    };

    setTypes((prev) => [type, ...prev]);

    setAddTypeText(type.label);
    setAddAssetNameText("");

    setTypeDropdownOpen(false);
    setNameDropdownOpen(true);
  };

  const handleEditorAddName = () => {
    if (!editorSelectedType) return;

    const label = addAssetNameText.trim();
    if (!label) return;

    const existing = names.find(
      (item) =>
        item.typeId === editorSelectedType.id &&
        normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      setAddAssetNameText(existing.label);
      setNameDropdownOpen(false);
      return;
    }

    const name: AssetNameItem = {
      id: createLocalId("name"),
      typeId: editorSelectedType.id,
      label,
    };

    setNames((prev) => [name, ...prev]);
    setAddAssetNameText(name.label);
    setNameDropdownOpen(false);
  };

  const finishWithAsset = (picked: PickedAssetCategory) => {
    onPickAsset?.(picked);
    onClose();
  };

  const handleUseRecentAsset = (asset: AssetItem) => {
    if (projectId) {
      if (shouldUseOffline) {
        /*
         * Offline equivalent of markAssetUsed.
         *
         * Only changes local updatedAt so this asset
         * moves to the top of Recent locally.
         */
        void markOfflineAssetUsed(asset.id).catch((err) => {
          console.warn(
            "[AssetGallery] Could not mark offline recent asset used",
            err,
          );
        });
      } else {
        void projectContentApi
          .markAssetUsed(projectId, asset.id)
          .catch(async (err) => {
            console.warn(
              "[AssetGallery] Could not mark recent asset used online",
              err,
            );

            /*
             * Fall back locally if connectivity disappears
             * during the action.
             */
            try {
              await markOfflineAssetUsed(asset.id);
            } catch (offlineError) {
              console.warn(
                "[AssetGallery] Could not mark recent asset used offline either",
                offlineError,
              );
            }
          });
      }
    }

    finishWithAsset(recentAssetToPick(asset));
  };

  const handleUseTaxonomyName = (item: AssetNameItem) => {
    const type = types.find((typeItem) => typeItem.id === item.typeId);
    if (!type) return;

    const category = categories.find(
      (categoryItem) => categoryItem.id === type.categoryId,
    );
    if (!category) return;

    finishWithAsset({
      categoryId: category.id,
      category: category.label,
      typeId: type.id,
      type: type.label,
      nameId: item.id,
      name: item.label,
    });
  };

  const handleContinue = () => {
    finishWithAsset(UNKNOWN_ASSET);
  };

  const assetListTitle = useMemo(() => {
    if (searchQuery.trim()) return "Search Results";
    if (favoritesOnly) return "Favorites";

    if (selectionSource !== "recent" && (selectedCategory || selectedType)) {
      return "Assets";
    }

    return "Suggested Assets";
  }, [
    searchQuery,
    favoritesOnly,
    selectionSource,
    selectedCategory,
    selectedType,
  ]);

  const assetListSubtitle = useMemo(() => {
    if (searchQuery.trim()) {
      if (selectionSource !== "recent" && selectedType) {
        return `Matching ${selectedType.label}`;
      }

      if (selectionSource !== "recent" && selectedCategory) {
        return `Matching ${selectedCategory.label}`;
      }

      return "Matching assets from all categories";
    }

    if (favoritesOnly) return "Your favorite assets";

    if (selectionSource !== "recent" && selectedType) {
      return `${selectedType.label} • ${selectedCategory?.label || ""}`;
    }

    if (selectionSource !== "recent" && selectedCategory) {
      return `${selectedCategory.label} • All types`;
    }

    return "Select one or search all available assets";
  }, [
    searchQuery,
    favoritesOnly,
    selectionSource,
    selectedType,
    selectedCategory,
  ]);

  const recentViewerImages = useMemo(
    () => (recentViewerAsset ? getRecentAssetImages(recentViewerAsset) : []),
    [recentViewerAsset],
  );

  const openRecentImages = (asset: AssetItem) => {
    const images = getRecentAssetImages(asset);
    if (!images.length) return;

    setRecentViewerIndex(0);
    setRecentViewerAsset(asset);
  };

  const renderRecentAsset = (item: AssetItem) => {
    const selected =
      selectionSource === "recent" && selectedRecentAssetId === item.id;

    const mainImageUrl = getRecentAssetMainImageUrl(item);
    const imageCount = getRecentAssetImages(item).length;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.recentRow, selected && styles.recentRowSelected]}
        onPress={() => handleSelectRecentAsset(item)}
        activeOpacity={0.82}
      >
        <TouchableOpacity
          disabled={imageCount === 0}
          onPress={(event) => {
            event.stopPropagation();
            openRecentImages(item);
          }}
          activeOpacity={imageCount > 0 ? 0.8 : 1}
        >
          <AssetAvatar name={item.name} imageUrl={mainImageUrl} small />
        </TouchableOpacity>

        <View style={styles.recentBody}>
          <Text
            style={[styles.recentName, selected && styles.recentNameSelected]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text style={styles.recentMeta} numberOfLines={1}>
            {item.type || "Unknown"} • {item.category || "Unknown"}
          </Text>
        </View>

        {imageCount > 0 && (
          <TouchableOpacity
            style={styles.recentImagesButton}
            onPress={(event) => {
              event.stopPropagation();
              openRecentImages(item);
            }}
          >
            <Ionicons name="images-outline" size={14} color={ACC} />
            <Text style={styles.recentImageCount}>{imageCount}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.rowEditButton}
          onPress={(event) => {
            event.stopPropagation();
            openRecentAssetEditor(item);
          }}
        >
          <Ionicons name="pencil-outline" size={13} color={ACC} />
        </TouchableOpacity>

        {selected ? (
          <TouchableOpacity
            style={styles.rowUseButton}
            onPress={(event) => {
              event.stopPropagation();
              handleUseRecentAsset(item);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.rowUseButtonText}>Use</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectionIcon}>
            <Ionicons name="ellipse-outline" size={16} color="#A0A4AF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        {loading ? (
          <AssetGallerySkeleton />
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={20} color={TEXT} />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text style={styles.title}>Select Asset</Text>
                <Text style={styles.subtitle}>
                  {shouldUseOffline
                    ? "Choose or customize the asset • Offline"
                    : "Choose or customize the asset"}
                </Text>
              </View>

              {!!(
                selectedCategoryId ||
                selectedTypeId ||
                selectedNameId ||
                selectedRecentAssetId
              ) && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#B45309"
                />

                <Text style={styles.errorText}>{error}</Text>

                <TouchableOpacity onPress={() => void refreshAll()}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Category + Type filters */}
                <View style={styles.filterRow}>
                  <View style={styles.filterColumn}>
                    <Text style={styles.filterLabel}>Category</Text>

                    <View style={styles.dropdown}>
                      <TouchableOpacity
                        style={styles.dropdownMain}
                        onPress={() => openPicker("category")}
                      >
                        <Ionicons name="grid-outline" size={14} color={ACC} />

                        <Text style={styles.dropdownText} numberOfLines={1}>
                          {selectionSource === "recent"
                            ? "All categories"
                            : selectedCategory?.label || "All categories"}
                        </Text>

                        <Ionicons name="chevron-down" size={13} color={MUTED} />
                      </TouchableOpacity>

                      {selectionSource !== "recent" && !!selectedCategoryId && (
                        <TouchableOpacity
                          style={styles.dropdownClear}
                          onPress={(event) => {
                            event.stopPropagation();
                            clearCategoryFilter();
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="close-circle"
                            size={17}
                            color={MUTED}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.filterColumn}>
                    <Text style={styles.filterLabel}>Type</Text>

                    <View
                      style={[
                        styles.dropdown,
                        selectionSource !== "recent" &&
                          !selectedCategoryId &&
                          styles.dropdownDisabled,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.dropdownMain}
                        onPress={() => openPicker("type")}
                        disabled={
                          selectionSource !== "recent" && !selectedCategoryId
                        }
                      >
                        <Ionicons
                          name="layers-outline"
                          size={14}
                          color={
                            selectionSource === "recent" || selectedCategoryId
                              ? ACC
                              : "#B8BCC8"
                          }
                        />

                        <Text
                          style={[
                            styles.dropdownText,
                            selectionSource !== "recent" &&
                              !selectedCategoryId &&
                              styles.disabledText,
                          ]}
                          numberOfLines={1}
                        >
                          {selectionSource === "recent"
                            ? "All types"
                            : selectedType?.label || "All types"}
                        </Text>

                        <Ionicons
                          name="chevron-down"
                          size={13}
                          color={
                            selectionSource === "recent" || selectedCategoryId
                              ? MUTED
                              : "#B8BCC8"
                          }
                        />
                      </TouchableOpacity>

                      {selectionSource !== "recent" && !!selectedTypeId && (
                        <TouchableOpacity
                          style={styles.dropdownClear}
                          onPress={(event) => {
                            event.stopPropagation();
                            clearTypeFilter();
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="close-circle"
                            size={17}
                            color={MUTED}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* Search */}
                <View style={styles.searchRow}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={17} color={MUTED} />

                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search assets or recent..."
                      placeholderTextColor="#999EAE"
                      style={styles.searchInput}
                      returnKeyType="search"
                    />

                    {!!searchQuery && (
                      <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons name="close-circle" size={17} color={MUTED} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.favoriteFilter,
                      favoritesOnly && styles.favoriteFilterActive,
                    ]}
                    onPress={() => setFavoritesOnly((prev) => !prev)}
                  >
                    <Ionicons
                      name={favoritesOnly ? "star" : "star-outline"}
                      size={18}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                </View>

                {/* Main list */}
                <FlatList
                  data={displayedNames}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => void refreshAll()}
                    />
                  }
                  contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: 95 + insets.bottom },
                  ]}
                  ListHeaderComponent={
                    <>
                      {/* Recent backend assets */}
                      {filteredRecentAssets.length > 0 && (
                        <View style={styles.recentSection}>
                          <View style={styles.recentHeader}>
                            <View style={styles.recentHeaderLeft}>
                              <Ionicons
                                name="time-outline"
                                size={13}
                                color={MUTED}
                              />
                              <Text style={styles.recentTitle}>Recent</Text>
                            </View>

                            <Text style={styles.recentHint}>
                              Tap image to view photos
                            </Text>
                          </View>

                          <View style={styles.recentList}>
                            {filteredRecentAssets.map(renderRecentAsset)}
                          </View>
                        </View>
                      )}

                      {/* Suggested header + persistent Add button */}
                      <View style={styles.assetListHeader}>
                        <View style={styles.assetListHeaderText}>
                          <Text style={styles.assetListTitle}>
                            {assetListTitle}
                          </Text>

                          <Text
                            style={styles.assetListSubtitle}
                            numberOfLines={1}
                          >
                            {assetListSubtitle}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.addNameButton}
                          onPress={openAddAssetModal}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="add" size={15} color={ACC} />
                          <Text style={styles.addNameButtonText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <View style={styles.emptyIcon}>
                        <Ionicons
                          name={favoritesOnly ? "star-outline" : "cube-outline"}
                          size={23}
                          color={MUTED}
                        />
                      </View>

                      <Text style={styles.emptyTitle}>
                        {favoritesOnly
                          ? "No favorite assets"
                          : "No matching assets"}
                      </Text>

                      <Text style={styles.emptyText}>
                        Try another search or choose a category and type.
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const selected =
                      selectionSource === "taxonomy" &&
                      item.id === selectedNameId;

                    const favorite = favoriteNameIds.has(item.id);
                    const isEditing = editingNameId === item.id;
                    const rowType = getTypeForName(item);
                    const rowCategory = getCategoryForName(item);

                    return (
                      <TouchableOpacity
                        style={[
                          styles.assetRow,
                          selected && styles.assetRowSelected,
                          isEditing && styles.assetRowEditing,
                        ]}
                        onPress={() => {
                          if (isEditing) return;
                          handleSelectName(item);
                        }}
                        activeOpacity={0.84}
                      >
                        <TouchableOpacity
                          style={styles.starButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                        >
                          <Ionicons
                            name={favorite ? "star" : "star-outline"}
                            size={19}
                            color={favorite ? "#F59E0B" : "#A5A9B5"}
                          />
                        </TouchableOpacity>

                        <AssetAvatar
                          name={item.label}
                          imageUrl={getTaxonomyAssetImageUrl(item)}
                        />

                        <View style={styles.assetRowBody}>
                          {isEditing ? (
                            <TextInput
                              value={editingNameText}
                              onChangeText={setEditingNameText}
                              style={styles.rowEditInput}
                              autoFocus
                              selectTextOnFocus
                              returnKeyType="done"
                              onSubmitEditing={() => saveEditedName(item.id)}
                            />
                          ) : (
                            <>
                              <Text
                                style={[
                                  styles.assetName,
                                  selected && styles.assetNameSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {item.label}
                              </Text>

                              <Text style={styles.assetMeta} numberOfLines={1}>
                                {rowType?.label || "Unknown type"}
                                {rowCategory ? ` • ${rowCategory.label}` : ""}
                              </Text>
                            </>
                          )}
                        </View>

                        {isEditing ? (
                          <View style={styles.editActions}>
                            <TouchableOpacity
                              style={styles.rowCancelButton}
                              onPress={(event) => {
                                event.stopPropagation();
                                cancelEditName();
                              }}
                            >
                              <Ionicons name="close" size={15} color={MUTED} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.rowActionButton,
                                !editingNameText.trim() &&
                                  styles.buttonDisabled,
                              ]}
                              disabled={!editingNameText.trim()}
                              onPress={(event) => {
                                event.stopPropagation();
                                saveEditedName(item.id);
                              }}
                            >
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="#fff"
                              />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.rowEditButton}
                              onPress={(event) => {
                                event.stopPropagation();
                                beginEditName(item);
                              }}
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={14}
                                color={ACC}
                              />
                            </TouchableOpacity>

                            {selected ? (
                              <TouchableOpacity
                                style={styles.rowUseButton}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  handleUseTaxonomyName(item);
                                }}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.rowUseButtonText}>Use</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.selectionIcon}>
                                <Ionicons
                                  name="ellipse-outline"
                                  size={16}
                                  color="#A0A4AF"
                                />
                              </View>
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />

                {/* Bottom */}
                <View
                  style={[
                    styles.bottomBar,
                    { paddingBottom: Math.max(insets.bottom, 12) },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                    activeOpacity={0.88}
                  >
                    <View style={styles.continueTextWrap}>
                      <Text style={styles.continueButtonText} numberOfLines={1}>
                        Unknown Asset
                      </Text>

                      <Text style={styles.continueSubText} numberOfLines={1}>
                        Use only when the asset is not identified
                      </Text>
                    </View>

                    <View style={styles.continueAction}>
                      <Text style={styles.continueActionText}>Use Unknown</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* Category / Type picker */}
        <Modal
          visible={pickerMode !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closePicker}
        >
          <KeyboardAvoidingView
            style={styles.modalFlex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable style={styles.backdrop} onPress={closePicker} />

            <View
              style={[
                styles.pickerCard,
                { paddingBottom: Math.max(insets.bottom, 14) },
              ]}
            >
              <View style={styles.pickerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerTitle}>
                    {pickerMode === "category" ? "Category" : "Type"}
                  </Text>

                  <Text style={styles.pickerSubtitle} numberOfLines={1}>
                    {pickerMode === "category"
                      ? "Choose, favorite, edit or add a category"
                      : selectedCategory?.label || ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closePicker}
                >
                  <Ionicons name="close" size={18} color={TEXT} />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerSearchBox}>
                <Ionicons name="search-outline" size={16} color={MUTED} />

                <TextInput
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholder={
                    pickerMode === "category"
                      ? "Search categories..."
                      : "Search types..."
                  }
                  placeholderTextColor={MUTED}
                  style={styles.pickerSearchInput}
                />

                {!!pickerSearch && (
                  <TouchableOpacity onPress={() => setPickerSearch("")}>
                    <Ionicons name="close-circle" size={16} color={MUTED} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.inlineAddToggle}
                onPress={() => {
                  if (pickerMode === "category") {
                    setEditingCategoryId(null);
                    setEditingCategoryText("");
                    setShowAddCategory((prev) => !prev);
                    setNewCategoryText("");
                  } else {
                    setEditingTypeId(null);
                    setEditingTypeText("");
                    setShowAddType((prev) => !prev);
                    setNewTypeText("");
                  }
                }}
              >
                <Ionicons
                  name={
                    pickerMode === "category" && showAddCategory
                      ? "close"
                      : pickerMode === "type" && showAddType
                        ? "close"
                        : "add"
                  }
                  size={16}
                  color={ACC}
                />

                <Text style={styles.inlineAddToggleText}>
                  {pickerMode === "category"
                    ? showAddCategory
                      ? "Cancel"
                      : "Add category"
                    : showAddType
                      ? "Cancel"
                      : "Add type"}
                </Text>
              </TouchableOpacity>

              {pickerMode === "category" && showAddCategory && (
                <View style={styles.inlinePickerAddRow}>
                  <View style={styles.inlineAddIcon}>
                    <Ionicons name="add" size={16} color={ACC} />
                  </View>

                  <TextInput
                    value={newCategoryText}
                    onChangeText={setNewCategoryText}
                    placeholder="New category"
                    placeholderTextColor={MUTED}
                    style={styles.inlinePickerInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAddCategory}
                  />

                  <TouchableOpacity
                    style={[
                      styles.rowActionButton,
                      !newCategoryText.trim() && styles.buttonDisabled,
                    ]}
                    disabled={!newCategoryText.trim()}
                    onPress={handleAddCategory}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {pickerMode === "type" && showAddType && (
                <View style={styles.inlinePickerAddRow}>
                  <View style={styles.inlineAddIcon}>
                    <Ionicons name="add" size={16} color={ACC} />
                  </View>

                  <TextInput
                    value={newTypeText}
                    onChangeText={setNewTypeText}
                    placeholder="New type"
                    placeholderTextColor={MUTED}
                    style={styles.inlinePickerInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAddType}
                  />

                  <TouchableOpacity
                    style={[
                      styles.rowActionButton,
                      !newTypeText.trim() && styles.buttonDisabled,
                    ]}
                    disabled={!newTypeText.trim()}
                    onPress={handleAddType}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={pickerItems}
                keyExtractor={(item) => item.id}
                style={styles.pickerList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>
                      No matching{" "}
                      {pickerMode === "category" ? "categories" : "types"}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isCategory = pickerMode === "category";

                  const selected = isCategory
                    ? item.id === selectedCategoryId
                    : item.id === selectedTypeId;

                  const favorite = isCategory
                    ? favoriteCategoryIds.has(item.id)
                    : favoriteTypeIds.has(item.id);

                  const editing = isCategory
                    ? editingCategoryId === item.id
                    : editingTypeId === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerRow,
                        selected && styles.pickerOptionSelected,
                        editing && styles.pickerRowEditing,
                      ]}
                      onPress={() => {
                        if (editing) return;

                        if (isCategory) {
                          selectCategory(item as AssetCategoryItem);
                        } else {
                          selectType(item as AssetTypeItem);
                        }
                      }}
                    >
                      <TouchableOpacity
                        style={styles.pickerStarButton}
                        onPress={(event) => {
                          event.stopPropagation();

                          if (isCategory) {
                            toggleFavoriteCategory(item.id);
                          } else {
                            toggleFavoriteType(item.id);
                          }
                        }}
                      >
                        <Ionicons
                          name={favorite ? "star" : "star-outline"}
                          size={17}
                          color={favorite ? "#F59E0B" : "#A5A9B5"}
                        />
                      </TouchableOpacity>

                      <View style={styles.pickerRowBody}>
                        {editing ? (
                          <TextInput
                            value={
                              isCategory ? editingCategoryText : editingTypeText
                            }
                            onChangeText={
                              isCategory
                                ? setEditingCategoryText
                                : setEditingTypeText
                            }
                            style={styles.inlinePickerEditInput}
                            autoFocus
                            selectTextOnFocus
                            returnKeyType="done"
                            onSubmitEditing={() => {
                              if (isCategory) {
                                saveEditedCategory(item.id);
                              } else {
                                saveEditedType(item.id);
                              }
                            }}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.pickerOptionText,
                              selected && styles.pickerOptionTextSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {item.label}
                          </Text>
                        )}
                      </View>

                      {editing ? (
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.rowCancelButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              isCategory
                                ? cancelEditCategory()
                                : cancelEditType();
                            }}
                          >
                            <Ionicons name="close" size={15} color={MUTED} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.rowActionButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              isCategory
                                ? saveEditedCategory(item.id)
                                : saveEditedType(item.id);
                            }}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.rowEditButton}
                            onPress={(event) => {
                              event.stopPropagation();

                              if (isCategory) {
                                beginEditCategory(item as AssetCategoryItem);
                              } else {
                                beginEditType(item as AssetTypeItem);
                              }
                            }}
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={13}
                              color={ACC}
                            />
                          </TouchableOpacity>

                          <View style={styles.selectionIcon}>
                            <Ionicons
                              name={
                                selected
                                  ? "checkmark-circle"
                                  : "chevron-forward"
                              }
                              size={selected ? 19 : 15}
                              color={selected ? ACC : "#A0A4AF"}
                            />
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Unified Asset editor */}
        <Modal
          visible={addAssetModalOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closeAssetEditor}
        >
          <KeyboardAvoidingView
            style={styles.addModalKeyboardWrap}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          >
            <TouchableWithoutFeedback onPress={closeAssetEditor}>
              <View style={styles.addModalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.addModalCard}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.addModalScrollContent}
                    >
                      <View style={styles.addModalHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addModalTitle}>
                            {assetEditorMode === "recent"
                              ? "Create from Recent"
                              : "Add Asset"}
                          </Text>
                          <Text style={styles.addModalSubtitle}>
                            {assetEditorMode === "recent"
                              ? "Creates a new asset selection. The Recent database record is not edited."
                              : "Select an existing value or type a new Category, Type and Asset name."}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.closeButton}
                          onPress={closeAssetEditor}
                        >
                          <Ionicons name="close" size={18} color={TEXT} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.addModalField}>
                        <Text style={styles.addModalLabel}>Category</Text>

                        <View
                          style={[
                            styles.editorInputWrap,
                            focusedEditorField === "category" &&
                              styles.editorInputWrapActive,
                          ]}
                        >
                          <Ionicons name="grid-outline" size={14} color={ACC} />

                          <TextInput
                            ref={categoryInputRef}
                            value={addCategoryText}
                            editable={assetEditorMode !== "recent"}
                            onFocus={() => {
                              if (assetEditorMode === "recent") return;

                              setFocusedEditorField("category");
                            }}
                            onBlur={() => {
                              setFocusedEditorField((current) =>
                                current === "category" ? null : current,
                              );
                            }}
                            onChangeText={(text) => {
                              if (assetEditorMode === "recent") return;

                              setAddCategoryText(text);

                              setAddTypeText("");
                              setAddAssetNameText("");

                              setTypeDropdownOpen(false);
                              setNameDropdownOpen(false);
                            }}
                            placeholder="Select or add category"
                            placeholderTextColor={MUTED}
                            style={[
                              styles.editorInput,
                              assetEditorMode === "recent" &&
                                styles.editorInputReadOnly,
                            ]}
                            returnKeyType="done"
                          />

                          {assetEditorMode !== "recent" && (
                            <>
                              <TouchableOpacity
                                style={styles.editorAddButton}
                                onPress={handleCategoryAction}
                                hitSlop={6}
                              >
                                <Ionicons
                                  name={
                                    focusedEditorField === "category"
                                      ? "checkmark"
                                      : "add"
                                  }
                                  size={18}
                                  color={ACC}
                                />
                              </TouchableOpacity>

                              <View style={styles.editorDivider} />

                              <TouchableOpacity
                                style={styles.editorChevronButton}
                                onPress={() => {
                                  categoryInputRef.current?.blur();
                                  setFocusedEditorField(null);

                                  setTypeDropdownOpen(false);
                                  setNameDropdownOpen(false);

                                  setCategoryDropdownOpen(
                                    (previous) => !previous,
                                  );
                                }}
                                hitSlop={6}
                              >
                                <Ionicons
                                  name={
                                    categoryDropdownOpen
                                      ? "chevron-up"
                                      : "chevron-down"
                                  }
                                  size={15}
                                  color={MUTED}
                                />
                              </TouchableOpacity>
                            </>
                          )}
                          <View style={styles.editorDivider} />

                          <TouchableOpacity
                            style={styles.editorChevronButton}
                            onPress={() => {
                              categoryInputRef.current?.blur();
                              setFocusedEditorField(null);

                              setTypeDropdownOpen(false);
                              setNameDropdownOpen(false);

                              setCategoryDropdownOpen((previous) => !previous);
                            }}
                            hitSlop={6}
                          >
                            <Ionicons
                              name={
                                categoryDropdownOpen
                                  ? "chevron-up"
                                  : "chevron-down"
                              }
                              size={15}
                              color={MUTED}
                            />
                          </TouchableOpacity>
                        </View>

                        {assetEditorMode !== "recent" &&
                          categoryDropdownOpen && (
                            <View style={styles.editorDropdown}>
                              {editorCategoryMatches.length > 0 ? (
                                editorCategoryMatches.map((category) => (
                                  <TouchableOpacity
                                    key={category.id}
                                    style={styles.editorDropdownRow}
                                    onPress={() => {
                                      selectEditorCategory(category);

                                      setCategoryDropdownOpen(false);
                                      setFocusedEditorField(null);
                                    }}
                                  >
                                    <Text
                                      style={styles.editorDropdownText}
                                      numberOfLines={1}
                                    >
                                      {category.label}
                                    </Text>

                                    {normalizeText(category.label) ===
                                      normalizeText(addCategoryText) && (
                                      <Ionicons
                                        name="checkmark"
                                        size={14}
                                        color={ACC}
                                      />
                                    )}
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <View style={styles.editorDropdownEmpty}>
                                  <Text style={styles.editorDropdownEmptyText}>
                                    No categories found
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                      </View>
                      <View style={styles.addModalField}>
                        <Text style={styles.addModalLabel}>Type</Text>

                        <View
                          style={[
                            styles.editorInputWrap,
                            !editorSelectedCategory &&
                              styles.editorInputWrapDisabled,
                            focusedEditorField === "type" &&
                              styles.editorInputWrapActive,
                          ]}
                        >
                          <Ionicons
                            name="layers-outline"
                            size={14}
                            color={editorSelectedCategory ? ACC : "#B8BCC8"}
                          />

                          <TextInput
                            ref={typeInputRef}
                            value={addTypeText}
                            editable={
                              assetEditorMode !== "recent" &&
                              !!editorSelectedCategory
                            }
                            onFocus={() => {
                              setFocusedEditorField("type");
                            }}
                            onBlur={() => {
                              setFocusedEditorField((current) =>
                                current === "type" ? null : current,
                              );
                            }}
                            onChangeText={(text) => {
                              if (assetEditorMode === "recent") return;

                              setAddTypeText(text);
                              setAddAssetNameText("");
                              setNameDropdownOpen(false);
                            }}
                            placeholder={
                              editorSelectedCategory
                                ? "Select or add type"
                                : "Select category first"
                            }
                            placeholderTextColor={MUTED}
                            style={styles.editorInput}
                            returnKeyType="done"
                            onSubmitEditing={() => {
                              if (addTypeText.trim()) {
                                handleEditorAddType();
                              }

                              setFocusedEditorField(null);
                            }}
                          />
                          {assetEditorMode !== "recent" && (
                            <>
                              <TouchableOpacity
                                style={styles.editorAddButton}
                                onPress={handleTypeAction}
                                hitSlop={6}
                              >
                                <Ionicons
                                  name={
                                    focusedEditorField === "type"
                                      ? "checkmark"
                                      : "add"
                                  }
                                  size={18}
                                  color={ACC}
                                />
                              </TouchableOpacity>

                              <View style={styles.editorDivider} />

                              <TouchableOpacity
                                style={styles.editorChevronButton}
                                disabled={!editorSelectedCategory}
                                onPress={() => {
                                  typeInputRef.current?.blur();
                                  setFocusedEditorField(null);

                                  setCategoryDropdownOpen(false);
                                  setNameDropdownOpen(false);

                                  setTypeDropdownOpen((previous) => !previous);
                                }}
                                hitSlop={6}
                              >
                                <Ionicons
                                  name={
                                    typeDropdownOpen
                                      ? "chevron-up"
                                      : "chevron-down"
                                  }
                                  size={15}
                                  color={
                                    editorSelectedCategory ? MUTED : "#B8BCC8"
                                  }
                                />
                              </TouchableOpacity>
                            </>
                          )}

                          <View style={styles.editorDivider} />

                          <TouchableOpacity
                            style={styles.editorChevronButton}
                            disabled={!editorSelectedCategory}
                            onPress={() => {
                              typeInputRef.current?.blur();
                              setFocusedEditorField(null);

                              setCategoryDropdownOpen(false);
                              setNameDropdownOpen(false);

                              setTypeDropdownOpen((previous) => !previous);
                            }}
                            hitSlop={6}
                          >
                            <Ionicons
                              name={
                                typeDropdownOpen ? "chevron-up" : "chevron-down"
                              }
                              size={15}
                              color={editorSelectedCategory ? MUTED : "#B8BCC8"}
                            />
                          </TouchableOpacity>
                        </View>

                        {assetEditorMode !== "recent" &&
                          typeDropdownOpen &&
                          editorSelectedCategory && (
                            <View style={styles.editorDropdown}>
                              {editorTypeMatches.length > 0 ? (
                                editorTypeMatches.map((type) => (
                                  <TouchableOpacity
                                    key={type.id}
                                    style={styles.editorDropdownRow}
                                    onPress={() => {
                                      selectEditorType(type);

                                      setTypeDropdownOpen(false);
                                      setFocusedEditorField(null);
                                    }}
                                  >
                                    <Text
                                      style={styles.editorDropdownText}
                                      numberOfLines={1}
                                    >
                                      {type.label}
                                    </Text>

                                    {normalizeText(type.label) ===
                                      normalizeText(addTypeText) && (
                                      <Ionicons
                                        name="checkmark"
                                        size={14}
                                        color={ACC}
                                      />
                                    )}
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <View style={styles.editorDropdownEmpty}>
                                  <Text style={styles.editorDropdownEmptyText}>
                                    No types found
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                      </View>
                      <View style={styles.addModalField}>
                        <Text style={styles.addModalLabel}>Asset name</Text>

                        <View
                          style={[
                            styles.editorInputWrap,
                            !editorSelectedType &&
                              styles.editorInputWrapDisabled,
                            focusedEditorField === "name" &&
                              styles.editorInputWrapActive,
                          ]}
                        >
                          <Ionicons
                            name="cube-outline"
                            size={14}
                            color={editorSelectedType ? ACC : "#B8BCC8"}
                          />

                          <TextInput
                            ref={nameInputRef}
                            value={addAssetNameText}
                            editable={!!editorSelectedType}
                            onFocus={() => {
                              setFocusedEditorField("name");
                            }}
                            onBlur={() => {
                              setFocusedEditorField((current) =>
                                current === "name" ? null : current,
                              );
                            }}
                            onChangeText={setAddAssetNameText}
                            placeholder={
                              editorSelectedType
                                ? "Select or add asset name"
                                : "Select type first"
                            }
                            placeholderTextColor={MUTED}
                            style={styles.editorInput}
                            returnKeyType="done"
                            onSubmitEditing={() => {
                              if (addAssetNameText.trim()) {
                                handleEditorAddName();
                              }

                              setFocusedEditorField(null);
                            }}
                          />

                          <TouchableOpacity
                            style={styles.editorAddButton}
                            onPress={handleNameAction}
                            hitSlop={6}
                          >
                            <Ionicons
                              name={
                                focusedEditorField === "name"
                                  ? "checkmark"
                                  : "add"
                              }
                              size={18}
                              color={ACC}
                            />
                          </TouchableOpacity>

                          <View style={styles.editorDivider} />

                          <TouchableOpacity
                            style={styles.editorChevronButton}
                            disabled={!editorSelectedType}
                            onPress={() => {
                              nameInputRef.current?.blur();
                              setFocusedEditorField(null);

                              setCategoryDropdownOpen(false);
                              setTypeDropdownOpen(false);

                              setNameDropdownOpen((previous) => !previous);
                            }}
                            hitSlop={6}
                          >
                            <Ionicons
                              name={
                                nameDropdownOpen ? "chevron-up" : "chevron-down"
                              }
                              size={15}
                              color={editorSelectedType ? MUTED : "#B8BCC8"}
                            />
                          </TouchableOpacity>
                        </View>

                        {nameDropdownOpen && editorSelectedType && (
                          <View style={styles.editorDropdown}>
                            {editorNameMatches.length > 0 ? (
                              editorNameMatches.map((name) => (
                                <TouchableOpacity
                                  key={name.id}
                                  style={styles.editorDropdownRow}
                                  onPress={() => {
                                    selectEditorName(name);

                                    setNameDropdownOpen(false);
                                    setFocusedEditorField(null);
                                  }}
                                >
                                  <Text
                                    style={styles.editorDropdownText}
                                    numberOfLines={1}
                                  >
                                    {name.label}
                                  </Text>

                                  {normalizeText(name.label) ===
                                    normalizeText(addAssetNameText) && (
                                    <Ionicons
                                      name="checkmark"
                                      size={14}
                                      color={ACC}
                                    />
                                  )}
                                </TouchableOpacity>
                              ))
                            ) : (
                              <View style={styles.editorDropdownEmpty}>
                                <Text style={styles.editorDropdownEmptyText}>
                                  No asset names found
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      <Text style={styles.editorHint}>
                        If a typed value does not exist, it is added locally for
                        this flow.
                      </Text>

                      <View style={styles.addModalActions}>
                        <TouchableOpacity
                          style={styles.addModalCancel}
                          onPress={closeAssetEditor}
                        >
                          <Text style={styles.addModalCancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.addModalSave,
                            (!addCategoryText.trim() ||
                              !addTypeText.trim() ||
                              !addAssetNameText.trim()) &&
                              styles.buttonDisabled,
                          ]}
                          disabled={
                            !addCategoryText.trim() ||
                            !addTypeText.trim() ||
                            !addAssetNameText.trim()
                          }
                          onPress={handleAddCompleteAsset}
                        >
                          <Ionicons
                            name={
                              assetEditorMode === "recent"
                                ? "copy-outline"
                                : "add"
                            }
                            size={16}
                            color="#fff"
                          />
                          <Text style={styles.addModalSaveText}>
                            {assetEditorMode === "recent"
                              ? "Create New"
                              : "Add / Select"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* Recent image viewer */}
        <Modal
          visible={!!recentViewerAsset}
          transparent={false}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setRecentViewerAsset(null)}
        >
          <View style={styles.viewerScreen}>
            {recentViewerImages.length > 0 ? (
              <FlatList
                data={recentViewerImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                onMomentumScrollEnd={(event) => {
                  const width = event.nativeEvent.layoutMeasurement.width || 1;
                  setRecentViewerIndex(
                    Math.round(event.nativeEvent.contentOffset.x / width),
                  );
                }}
                renderItem={({ item }) => (
                  <View style={[styles.viewerPage, { width: screenWidth }]}>
                    <Image
                      source={{ uri: item.url }}
                      style={styles.viewerImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
            ) : (
              <View style={styles.viewerEmpty}>
                <Text style={styles.viewerEmptyText}>No images</Text>
              </View>
            )}

            <View style={styles.viewerTopBar}>
              <View>
                <Text style={styles.viewerTitle} numberOfLines={1}>
                  {recentViewerAsset?.name || "Asset images"}
                </Text>
                <Text style={styles.viewerCounter}>
                  {recentViewerImages.length
                    ? `${recentViewerIndex + 1} / ${recentViewerImages.length}`
                    : "0 / 0"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewerClose}
                onPress={() => {
                  setRecentViewerAsset(null);
                  setRecentViewerIndex(0);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  skeletonScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  // Header

  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  backButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 9,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },

  subtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },

  clearButton: {
    minHeight: 32,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  clearButtonText: {
    color: ACC,
    fontSize: 9.5,
    fontWeight: "800",
  },

  // Filters

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 7,
  },

  filterColumn: {
    flex: 1,
  },

  filterLabel: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "700",
    marginBottom: 4,
    marginLeft: 2,
  },

  dropdown: {
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  editorInputReadOnly: {
    color: MUTED,
    backgroundColor: "#F1F3F6",
  },
  dropdownMain: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    gap: 6,
  },

  dropdownClear: {
    width: 30,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownDisabled: {
    backgroundColor: "#F0F1F4",
  },

  dropdownText: {
    flex: 1,
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  disabledText: {
    color: "#B4B7C1",
  },

  // Search

  searchRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    marginTop: 9,
  },

  addModalScrollContent: {
    flexGrow: 1,
  },

  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 7,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 10.5,
    paddingVertical: 0,
  },

  favoriteFilter: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  favoriteFilterActive: {
    backgroundColor: "#FFF8E8",
    borderColor: "#F4C76A",
  },

  // Main list

  listContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  assetListHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  assetListHeaderText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  assetListTitle: {
    color: TEXT,
    fontSize: 11.5,
    fontWeight: "800",
  },

  assetListSubtitle: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "600",
    marginTop: 2,
  },

  addNameButton: {
    height: 30,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: SURFACE,
  },

  addNameButtonText: {
    color: ACC,
    fontSize: 9,
    fontWeight: "800",
  },

  // Recent

  recentSection: {
    marginBottom: 11,
  },

  recentHeader: {
    minHeight: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  recentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  recentTitle: {
    color: TEXT,
    fontSize: 9.5,
    fontWeight: "800",
  },

  recentHint: {
    color: MUTED,
    fontSize: 7.5,
    fontWeight: "600",
  },

  recentList: {
    gap: 4,
  },

  recentRow: {
    minHeight: 43,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E5EC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 5,
  },

  recentRowSelected: {
    borderColor: ACC,
    backgroundColor: "#F2F3F7",
  },

  recentBody: {
    flex: 1,
    minWidth: 0,
  },

  recentName: {
    color: TEXT,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "700",
  },

  recentNameSelected: {
    fontWeight: "900",
  },

  recentMeta: {
    color: MUTED,
    fontSize: 7.5,
    lineHeight: 10,
    marginTop: 1,
  },

  recentImagesButton: {
    minWidth: 34,
    height: 27,
    borderRadius: 8,
    backgroundColor: "#EEF0F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 6,
    marginLeft: 5,
  },

  recentImageCount: {
    color: ACC,
    fontSize: 7.5,
    fontWeight: "800",
  },

  // Assets

  assetRow: {
    minHeight: 56,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 7,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  assetRowSelected: {
    borderColor: ACC,
    backgroundColor: "#F0F2F6",
  },

  assetRowEditing: {
    borderColor: ACC,
    backgroundColor: "#fff",
  },

  starButton: {
    width: 28,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  assetAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    marginRight: 8,
  },

  assetAvatarSmall: {
    width: 29,
    height: 29,
    borderRadius: 8,
    marginRight: 7,
  },

  assetAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  assetAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  assetAvatarTextSmall: {
    fontSize: 8,
  },

  assetRowBody: {
    flex: 1,
    minWidth: 0,
  },

  assetName: {
    color: TEXT,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },

  assetNameSelected: {
    fontWeight: "900",
  },

  assetMeta: {
    color: MUTED,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  selectionIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  rowUseButton: {
    minWidth: 42,
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACC,
    marginLeft: 6,
  },

  rowUseButtonText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  // Edit

  rowEditInput: {
    height: 35,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ACC,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 10.5,
    fontWeight: "700",
  },

  rowEditButton: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    marginLeft: 6,
  },

  rowActionButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACC,
  },

  rowCancelButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F1F4",
  },

  editActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 6,
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  // Bottom

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BACKGROUND,
  },

  continueButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: ACC,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  continueButtonText: {
    color: "#fff",
    fontSize: 10.5,
    fontWeight: "800",
  },

  continueSubText: {
    color: "#DDE1EA",
    fontSize: 7.8,
    fontWeight: "600",
    marginTop: 2,
  },

  continueAction: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    gap: 4,
  },

  continueActionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  // Picker

  modalFlex: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,35,52,0.28)",
  },

  pickerCard: {
    maxHeight: "72%",
    minHeight: 280,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  pickerHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },

  pickerTitle: {
    color: TEXT,
    fontSize: 13.5,
    fontWeight: "800",
  },

  pickerSubtitle: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "600",
    marginTop: 2,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F2F3F6",
    alignItems: "center",
    justifyContent: "center",
  },

  pickerSearchBox: {
    height: 39,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8F9FB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    gap: 7,
    marginBottom: 8,
  },

  pickerSearchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 10.5,
    paddingVertical: 0,
  },

  pickerList: {
    maxHeight: 350,
  },

  pickerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ECEEF3",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },

  pickerRowEditing: {
    backgroundColor: "#FAFAFC",
  },

  pickerOptionSelected: {
    backgroundColor: "#F2F3F7",
  },

  pickerStarButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 3,
  },

  pickerRowBody: {
    flex: 1,
    minWidth: 0,
  },

  pickerOptionText: {
    flex: 1,
    color: TEXT,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
  },

  pickerOptionTextSelected: {
    fontWeight: "900",
  },

  pickerEmpty: {
    paddingVertical: 30,
    alignItems: "center",
  },

  pickerEmptyText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },

  inlineAddToggle: {
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF0F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 7,
  },

  inlineAddToggleText: {
    color: ACC,
    fontSize: 9.5,
    fontWeight: "800",
  },

  inlinePickerAddRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACC,
    backgroundColor: "#fff",
    marginBottom: 7,
  },

  inlineAddIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },

  inlinePickerInput: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 10,
  },

  inlinePickerEditInput: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ACC,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  editorInputWrapActive: {
    borderColor: ACC,
    backgroundColor: "#fff",
  },

  editorInputWrapDisabled: {
    backgroundColor: "#F0F1F4",
    opacity: 0.7,
  },

  editorAddButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },

  editorChevronButton: {
    width: 27,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  editorDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: BORDER,
  },

  editorCreateRow: {
    minHeight: 38,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  editorCreateText: {
    flex: 1,
    color: ACC,
    fontSize: 9.5,
    fontWeight: "800",
  },

  // Unified Asset editor

  editorInputWrap: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  editorInput: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
  },

  editorDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  editorDropdownRow: {
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECEEF3",
  },

  editorDropdownText: {
    flex: 1,
    color: TEXT,
    fontSize: 9.5,
    fontWeight: "700",
  },

  editorHint: {
    color: MUTED,
    fontSize: 8,
    lineHeight: 12,
    marginTop: -2,
    marginBottom: 10,
  },

  addModalKeyboardWrap: {
    flex: 1,
  },

  addModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,35,52,0.34)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  addModalCard: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    maxHeight: "85%",
  },

  addModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  addModalTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },

  addModalSubtitle: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "600",
    marginTop: 2,
  },

  addModalField: {
    marginBottom: 11,
  },

  addModalLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 5,
  },

  addModalInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8F9FB",
    paddingHorizontal: 10,
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
  },

  addModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },

  addModalCancel: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F1F4",
  },

  addModalCancelText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  addModalSave: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: ACC,
  },

  addModalSaveText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  // Error / empty

  errorBox: {
    margin: 12,
    minHeight: 46,
    borderRadius: 11,
    paddingHorizontal: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  errorText: {
    flex: 1,
    color: "#92400E",
    fontSize: 9.5,
    fontWeight: "600",
  },

  retryText: {
    color: ACC,
    fontSize: 10,
    fontWeight: "800",
  },

  emptyState: {
    paddingTop: 50,
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "800",
  },

  emptyText: {
    color: MUTED,
    fontSize: 9,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 4,
  },

  // Viewer

  viewerScreen: {
    flex: 1,
    backgroundColor: "#000",
  },

  viewerPage: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },

  viewerImage: {
    width: "100%",
    height: "100%",
  },

  viewerTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.48)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewerTitle: {
    maxWidth: 280,
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  viewerCounter: {
    color: "#D6D7DB",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  viewerClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  viewerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerEmptyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Skeleton

  skeletonBlock: {
    backgroundColor: "#E7E9EF",
    borderRadius: 6,
  },

  skeletonBackButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#E7E9EF",
    marginRight: 9,
  },

  skeletonTitle: {
    width: 86,
    height: 12,
  },

  skeletonSubtitle: {
    width: 150,
    height: 7,
    marginTop: 5,
  },

  skeletonFilterLabel: {
    width: 45,
    height: 7,
    marginBottom: 4,
    marginLeft: 2,
  },

  skeletonDropdown: {
    height: 40,
    borderRadius: 11,
    backgroundColor: "#E7E9EF",
  },

  skeletonSearchBox: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#E7E9EF",
  },

  skeletonFavoriteFilter: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#E7E9EF",
  },

  skeletonListContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
  },

  skeletonStar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E7E9EF",
    marginHorizontal: 5,
  },

  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#E7E9EF",
    marginRight: 8,
  },

  skeletonAssetName: {
    width: "72%",
    height: 10,
  },

  skeletonAssetNameShort: {
    width: "55%",
  },

  skeletonAssetMeta: {
    width: "48%",
    height: 7,
    marginTop: 6,
  },

  editorDropdownEmpty: {
    minHeight: 40,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  editorDropdownEmptyText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
  },

  skeletonSelectionIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E7E9EF",
    marginHorizontal: 5,
  },

  skeletonContinueButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#E7E9EF",
  },
});
