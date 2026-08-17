import React, { useEffect, useMemo, useState } from "react";
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
  TouchableOpacity,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
};

type PickerMode = "category" | "type" | null;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#D4D8E2";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const BACKGROUND = "#F6F7FA";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

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

/*
 * Later connect this to the asset/image model.
 *
 * Example:
 *
 * return assetImageByNameId[item.id]?.url ?? null;
 */
const getAssetImageUrl = (_item: AssetNameItem): string | null => {
  return null;
};

// ---------------------------------------------------------------------------
// Asset Avatar
// ---------------------------------------------------------------------------

function AssetAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <Image
        source={{
          uri: imageUrl,
        }}
        style={styles.assetAvatar}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.assetAvatar,
        styles.assetAvatarFallback,
        {
          backgroundColor: getAvatarColor(name),
        },
      ]}
    >
      <Text style={styles.assetAvatarText} numberOfLines={1}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

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
        <View style={styles.assetListHeader}>
          <View style={styles.assetListHeaderText}>
            <View style={[styles.skeletonBlock, styles.skeletonListTitle]} />

            <View style={[styles.skeletonBlock, styles.skeletonListSubtitle]} />
          </View>
        </View>

        {[0, 1, 2, 3, 4, 5].map((item) => (
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssetGalleryScreen({
  visible,
  onClose,
  onPickAsset,
}: AssetGalleryScreenProps) {
  const insets = useSafeAreaInsets();

  // -------------------------------------------------------------------------
  // Taxonomy data
  // -------------------------------------------------------------------------

  const [categories, setCategories] = useState<AssetCategoryItem[]>([]);

  const [types, setTypes] = useState<AssetTypeItem[]>([]);

  const [names, setNames] = useState<AssetNameItem[]>([]);

  const [featuredNameIds, setFeaturedNameIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const [selectedNameId, setSelectedNameId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Asset search / favorites
  // -------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");

  const [favoriteNameIds, setFavoriteNameIds] = useState<Set<string>>(
    new Set(),
  );

  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // -------------------------------------------------------------------------
  // Picker
  // -------------------------------------------------------------------------

  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const [pickerSearch, setPickerSearch] = useState("");

  // -------------------------------------------------------------------------
  // Category local UI
  // -------------------------------------------------------------------------

  const [showAddCategory, setShowAddCategory] = useState(false);

  const [newCategoryText, setNewCategoryText] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const [editingCategoryText, setEditingCategoryText] = useState("");

  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<Set<string>>(
    new Set(),
  );

  // -------------------------------------------------------------------------
  // Type local UI
  // -------------------------------------------------------------------------

  const [showAddType, setShowAddType] = useState(false);

  const [newTypeText, setNewTypeText] = useState("");

  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const [editingTypeText, setEditingTypeText] = useState("");

  const [favoriteTypeIds, setFavoriteTypeIds] = useState<Set<string>>(
    new Set(),
  );

  // -------------------------------------------------------------------------
  // Asset local add/edit
  // -------------------------------------------------------------------------

  const [showAddName, setShowAddName] = useState(false);

  const [newNameText, setNewNameText] = useState("");

  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  const [editingNameText, setEditingNameText] = useState("");

  // -------------------------------------------------------------------------
  // Reset transient UI
  // -------------------------------------------------------------------------

  const resetTransientState = () => {
    setPickerMode(null);
    setPickerSearch("");

    setShowAddCategory(false);
    setNewCategoryText("");

    setShowAddType(false);
    setNewTypeText("");

    setEditingCategoryId(null);
    setEditingCategoryText("");

    setEditingTypeId(null);
    setEditingTypeText("");

    setEditingNameId(null);
    setEditingNameText("");

    setShowAddName(false);
    setNewNameText("");

    setSearchQuery("");
    setFavoritesOnly(false);
  };

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  const loadData = async (isRefresh = false) => {
    try {
      setError(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const result = await assetCategoryApi.getAll();

      const loadedCategories = result?.categories ?? [];

      const loadedTypes = result?.types ?? [];

      const loadedNames = result?.names ?? [];

      setCategories(loadedCategories);

      setTypes(loadedTypes);
      setNames(loadedNames);

      setFeaturedNameIds(createRandomFeaturedIds(loadedNames, 10));

      setSelectedCategoryId((current) =>
        current && loadedCategories.some((item) => item.id === current)
          ? current
          : null,
      );

      setSelectedTypeId((current) =>
        current && loadedTypes.some((item) => item.id === current)
          ? current
          : null,
      );

      setSelectedNameId((current) =>
        current && loadedNames.some((item) => item.id === current)
          ? current
          : null,
      );
    } catch (err: any) {
      console.error("[Asset Category Load Error]", err);

      setError(
        err?.message || "Could not load asset categories. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    resetTransientState();

    void loadData();
  }, [visible]);

  // -------------------------------------------------------------------------
  // Selected objects
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Relationships
  // -------------------------------------------------------------------------

  const availableTypes = useMemo(() => {
    if (!selectedCategoryId) {
      return [];
    }

    return types.filter((item) => item.categoryId === selectedCategoryId);
  }, [types, selectedCategoryId]);

  const availableNames = useMemo(() => {
    if (!selectedTypeId) {
      return [];
    }

    return names.filter((item) => item.typeId === selectedTypeId);
  }, [names, selectedTypeId]);

  // -------------------------------------------------------------------------
  // Name relationship helpers
  // -------------------------------------------------------------------------

  const getTypeForName = (name: AssetNameItem) => {
    return types.find((item) => item.id === name.typeId) ?? null;
  };

  const getCategoryForName = (name: AssetNameItem) => {
    const type = getTypeForName(name);

    if (!type) {
      return null;
    }

    return categories.find((item) => item.id === type.categoryId) ?? null;
  };

  // -------------------------------------------------------------------------
  // Displayed assets
  // -------------------------------------------------------------------------

  const displayedNames = useMemo(() => {
    const query = normalizeText(searchQuery);

    let source = selectedTypeId
      ? names.filter((item) => item.typeId === selectedTypeId)
      : names;

    /*
     * Default screen:
     * show only a small random sample.
     */
    if (!selectedTypeId && !query && !favoritesOnly) {
      const featured = new Set(featuredNameIds);

      source = source.filter((item) => featured.has(item.id));
    }

    source = source.filter((item) => {
      if (favoritesOnly && !favoriteNameIds.has(item.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

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

      if (aFavorite !== bFavorite) {
        return aFavorite ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });
  }, [
    names,
    types,
    categories,
    selectedTypeId,
    searchQuery,
    favoritesOnly,
    favoriteNameIds,
    featuredNameIds,
  ]);

  // -------------------------------------------------------------------------
  // Pick category
  // -------------------------------------------------------------------------

  const selectCategory = (category: AssetCategoryItem) => {
    setSelectedCategoryId(category.id);

    setSelectedTypeId(null);
    setSelectedNameId(null);

    setEditingNameId(null);
    setEditingNameText("");

    setShowAddName(false);
    setNewNameText("");

    setShowAddCategory(false);
    setShowAddType(false);

    setSearchQuery("");

    closePicker();
  };

  // -------------------------------------------------------------------------
  // Pick type
  // -------------------------------------------------------------------------

  const selectType = (type: AssetTypeItem) => {
    setSelectedTypeId(type.id);

    setSelectedNameId(null);

    setEditingNameId(null);
    setEditingNameText("");

    setShowAddName(false);
    setNewNameText("");

    setShowAddType(false);

    setSearchQuery("");

    closePicker();
  };

  // -------------------------------------------------------------------------
  // Pick asset
  // -------------------------------------------------------------------------

  const handleSelectName = (item: AssetNameItem) => {
    const type = types.find((typeItem) => typeItem.id === item.typeId);

    if (!type) {
      return;
    }

    const category = categories.find(
      (categoryItem) => categoryItem.id === type.categoryId,
    );

    if (!category) {
      return;
    }

    setSelectedCategoryId(category.id);

    setSelectedTypeId(type.id);

    setSelectedNameId(item.id);

    setEditingNameId(null);
    setEditingNameText("");

    setShowAddName(false);
    setNewNameText("");
  };

  // -------------------------------------------------------------------------
  // Picker
  // -------------------------------------------------------------------------

  const openPicker = (mode: PickerMode) => {
    if (!mode) {
      return;
    }

    if (mode === "type" && !selectedCategory) {
      return;
    }

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

  // -------------------------------------------------------------------------
  // Picker rows
  // -------------------------------------------------------------------------

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

      if (aFavorite !== bFavorite) {
        return aFavorite ? -1 : 1;
      }

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

  // -------------------------------------------------------------------------
  // Category favorite
  // -------------------------------------------------------------------------

  const toggleFavoriteCategory = (categoryId: string) => {
    setFavoriteCategoryIds((prev) => {
      const next = new Set(prev);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Type favorite
  // -------------------------------------------------------------------------

  const toggleFavoriteType = (typeId: string) => {
    setFavoriteTypeIds((prev) => {
      const next = new Set(prev);

      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }

      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Add Category
  // -------------------------------------------------------------------------

  const handleAddCategory = () => {
    const label = newCategoryText.trim();

    if (!label) {
      return;
    }

    const existing = categories.find(
      (item) => normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      setSelectedCategoryId(existing.id);

      setSelectedTypeId(null);
      setSelectedNameId(null);

      setNewCategoryText("");
      setShowAddCategory(false);

      return;
    }

    const category: AssetCategoryItem = {
      id: createLocalId("category"),
      label,
    };

    setCategories((prev) => [category, ...prev]);

    setSelectedCategoryId(category.id);

    setSelectedTypeId(null);
    setSelectedNameId(null);

    setNewCategoryText("");
    setShowAddCategory(false);
  };

  // -------------------------------------------------------------------------
  // Add Type
  // -------------------------------------------------------------------------

  const handleAddType = () => {
    if (!selectedCategoryId) {
      return;
    }

    const label = newTypeText.trim();

    if (!label) {
      return;
    }

    const existing = availableTypes.find(
      (item) => normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      setSelectedTypeId(existing.id);

      setSelectedNameId(null);

      setNewTypeText("");
      setShowAddType(false);

      return;
    }

    const type: AssetTypeItem = {
      id: createLocalId("type"),
      categoryId: selectedCategoryId,
      label,
    };

    setTypes((prev) => [type, ...prev]);

    setSelectedTypeId(type.id);

    setSelectedNameId(null);

    setNewTypeText("");
    setShowAddType(false);
  };

  // -------------------------------------------------------------------------
  // Edit Category
  // -------------------------------------------------------------------------

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

    if (!label) {
      return;
    }

    setCategories((prev) =>
      prev.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              label,
            }
          : item,
      ),
    );

    setEditingCategoryId(null);
    setEditingCategoryText("");
  };

  // -------------------------------------------------------------------------
  // Edit Type
  // -------------------------------------------------------------------------

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

    if (!label) {
      return;
    }

    setTypes((prev) =>
      prev.map((item) =>
        item.id === typeId
          ? {
              ...item,
              label,
            }
          : item,
      ),
    );

    setEditingTypeId(null);
    setEditingTypeText("");
  };

  // -------------------------------------------------------------------------
  // Add asset name
  // -------------------------------------------------------------------------

  const handleAddName = () => {
    if (!selectedTypeId) {
      return;
    }

    const label = newNameText.trim();

    if (!label) {
      return;
    }

    const existing = availableNames.find(
      (item) => normalizeText(item.label) === normalizeText(label),
    );

    if (existing) {
      handleSelectName(existing);

      setNewNameText("");
      setShowAddName(false);

      return;
    }

    const item: AssetNameItem = {
      id: createLocalId("name"),
      typeId: selectedTypeId,
      label,
    };

    setNames((prev) => [item, ...prev]);

    setSelectedNameId(item.id);

    setEditingNameId(null);
    setEditingNameText("");

    setNewNameText("");
    setShowAddName(false);
  };

  // -------------------------------------------------------------------------
  // Edit asset name
  // -------------------------------------------------------------------------

  const beginEditName = (item: AssetNameItem) => {
    setShowAddName(false);
    setNewNameText("");

    handleSelectName(item);

    setEditingNameId(item.id);

    setEditingNameText(item.label);
  };

  const cancelEditName = () => {
    setEditingNameId(null);
    setEditingNameText("");
  };

  const saveEditedName = (nameId: string) => {
    const label = editingNameText.trim();

    if (!label) {
      return;
    }

    setNames((prev) =>
      prev.map((item) =>
        item.id === nameId
          ? {
              ...item,
              label,
            }
          : item,
      ),
    );

    setEditingNameId(null);
    setEditingNameText("");
  };

  // -------------------------------------------------------------------------
  // Asset favorite
  // -------------------------------------------------------------------------

  const toggleFavorite = (nameId: string) => {
    setFavoriteNameIds((prev) => {
      const next = new Set(prev);

      if (next.has(nameId)) {
        next.delete(nameId);
      } else {
        next.add(nameId);
      }

      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Clear
  // -------------------------------------------------------------------------

  const clearSelection = () => {
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSelectedNameId(null);

    setEditingNameId(null);
    setEditingNameText("");

    setShowAddName(false);
    setNewNameText("");

    setSearchQuery("");
  };

  // -------------------------------------------------------------------------
  // Continue
  // -------------------------------------------------------------------------

  const canContinue = !!selectedCategory && !!selectedType && !!selectedName;

  const handleContinue = () => {
    if (!selectedCategory || !selectedType || !selectedName) {
      return;
    }

    onPickAsset?.({
      categoryId: selectedCategory.id,

      category: selectedCategory.label,

      typeId: selectedType.id,

      type: selectedType.label,

      nameId: selectedName.id,

      name: selectedName.label,
    });

    onClose();
  };

  // -------------------------------------------------------------------------
  // Asset list heading
  // -------------------------------------------------------------------------

  const assetListTitle = useMemo(() => {
    if (selectedType) {
      return "Assets";
    }

    if (searchQuery.trim()) {
      return "Search Results";
    }

    if (favoritesOnly) {
      return "Favorites";
    }

    return "Suggested Assets";
  }, [selectedType, searchQuery, favoritesOnly]);

  const assetListSubtitle = selectedType
    ? `${selectedType.label} • ${selectedCategory?.label || ""}`
    : searchQuery.trim()
      ? "Matching assets from all categories"
      : favoritesOnly
        ? "Your favorite assets"
        : "Select one or search all available assets";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        {/* --------------------------------------------------------------- */}
        {/* Global App Header */}
        {/* --------------------------------------------------------------- */}

        {/* --------------------------------------------------------------- */}
        {/* Loading */}
        {/* --------------------------------------------------------------- */}

        {loading ? (
          <AssetGallerySkeleton />
        ) : (
          <>
            {/* ----------------------------------------------------------- */}
            {/* Asset Gallery Header */}
            {/* ----------------------------------------------------------- */}

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
                  Choose or customize the asset
                </Text>
              </View>

              {!!(selectedCategoryId || selectedTypeId || selectedNameId) && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearSelection}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ----------------------------------------------------------- */}
            {/* Error */}
            {/* ----------------------------------------------------------- */}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#B45309"
                />

                <Text style={styles.errorText}>{error}</Text>

                <TouchableOpacity onPress={() => void loadData()}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* ------------------------------------------------------- */}
                {/* Category + Type */}
                {/* ------------------------------------------------------- */}

                <View style={styles.filterRow}>
                  {/* Category */}

                  <View style={styles.filterColumn}>
                    <Text style={styles.filterLabel}>Category</Text>

                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => openPicker("category")}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="grid-outline" size={14} color={ACC} />

                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {selectedCategory?.label || "Select"}
                      </Text>

                      <Ionicons name="chevron-down" size={13} color={MUTED} />
                    </TouchableOpacity>
                  </View>

                  {/* Type */}

                  <View style={styles.filterColumn}>
                    <Text style={styles.filterLabel}>Type</Text>

                    <TouchableOpacity
                      style={[
                        styles.dropdown,

                        !selectedCategory && styles.dropdownDisabled,
                      ]}
                      onPress={() => openPicker("type")}
                      disabled={!selectedCategory}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="layers-outline"
                        size={14}
                        color={selectedCategory ? ACC : "#B8BCC8"}
                      />

                      <Text
                        style={[
                          styles.dropdownText,

                          !selectedCategory && styles.disabledText,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedType?.label || "Select"}
                      </Text>

                      <Ionicons
                        name="chevron-down"
                        size={13}
                        color={selectedCategory ? MUTED : "#B8BCC8"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ------------------------------------------------------- */}
                {/* Search */}
                {/* ------------------------------------------------------- */}

                <View style={styles.searchRow}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={17} color={MUTED} />

                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search assets..."
                      placeholderTextColor="#999EAE"
                      style={styles.searchInput}
                      returnKeyType="search"
                    />

                    {!!searchQuery && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                        hitSlop={8}
                      >
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
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={favoritesOnly ? "star" : "star-outline"}
                      size={18}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                </View>

                {/* ------------------------------------------------------- */}
                {/* Asset List */}
                {/* ------------------------------------------------------- */}

                <FlatList
                  data={displayedNames}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => void loadData(true)}
                    />
                  }
                  contentContainerStyle={[
                    styles.listContent,

                    {
                      paddingBottom: 95 + insets.bottom,
                    },
                  ]}
                  ListHeaderComponent={
                    <>
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

                        {selectedType && (
                          <TouchableOpacity
                            style={styles.addNameButton}
                            onPress={() => {
                              setEditingNameId(null);

                              setEditingNameText("");

                              setShowAddName((prev) => !prev);

                              setNewNameText("");
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={showAddName ? "close" : "add"}
                              size={15}
                              color={ACC}
                            />

                            <Text style={styles.addNameButtonText}>
                              {showAddName ? "Cancel" : "Add"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Add Asset */}

                      {showAddName && selectedType && (
                        <View style={styles.addAssetRow}>
                          <View style={styles.addAssetIcon}>
                            <Ionicons name="add" size={17} color={ACC} />
                          </View>

                          <TextInput
                            value={newNameText}
                            onChangeText={setNewNameText}
                            placeholder="Enter new asset name"
                            placeholderTextColor={MUTED}
                            style={styles.addAssetRowInput}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleAddName}
                          />

                          <TouchableOpacity
                            style={[
                              styles.rowActionButton,

                              !newNameText.trim() && styles.buttonDisabled,
                            ]}
                            disabled={!newNameText.trim()}
                            onPress={handleAddName}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark" size={17} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
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
                          : selectedType
                            ? "No assets found"
                            : "No matching assets"}
                      </Text>

                      <Text style={styles.emptyText}>
                        {favoritesOnly
                          ? "Tap a star beside an asset to add it to your favorites."
                          : selectedType
                            ? "Add a new asset name or search another category."
                            : "Try another search or choose a category and type."}
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const selected = item.id === selectedNameId;

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
                          if (isEditing) {
                            return;
                          }

                          handleSelectName(item);
                        }}
                        activeOpacity={0.82}
                      >
                        {/* Favorite */}

                        <TouchableOpacity
                          style={styles.starButton}
                          onPress={(event) => {
                            event.stopPropagation();

                            toggleFavorite(item.id);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={favorite ? "star" : "star-outline"}
                            size={19}
                            color={favorite ? "#F59E0B" : "#A5A9B5"}
                          />
                        </TouchableOpacity>

                        {/* Image / Initials */}

                        <AssetAvatar
                          name={item.label}
                          imageUrl={getAssetImageUrl(item)}
                        />

                        {/* Name / editor */}

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

                        {/* Actions */}

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

                            <View style={styles.selectionIcon}>
                              <Ionicons
                                name={
                                  selected
                                    ? "checkmark-circle"
                                    : "chevron-forward"
                                }
                                size={selected ? 20 : 16}
                                color={selected ? ACC : "#A0A4AF"}
                              />
                            </View>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />

                {/* ------------------------------------------------------- */}
                {/* Bottom */}
                {/* ------------------------------------------------------- */}

                <View
                  style={[
                    styles.bottomBar,

                    {
                      paddingBottom: Math.max(insets.bottom, 12),
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.continueButton,

                      !canContinue && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!canContinue}
                    activeOpacity={0.85}
                  >
                    <View style={styles.continueTextWrap}>
                      <Text style={styles.continueButtonText} numberOfLines={1}>
                        {canContinue ? selectedName?.label : "Select an asset"}
                      </Text>

                      {canContinue && (
                        <Text style={styles.continueSubText} numberOfLines={1}>
                          {selectedType?.label}
                          {" • "}
                          {selectedCategory?.label}
                        </Text>
                      )}
                    </View>

                    <View style={styles.continueAction}>
                      <Text style={styles.continueActionText}>Use</Text>

                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Category / Type Picker */}
        {/* --------------------------------------------------------------- */}

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

                {
                  paddingBottom: Math.max(insets.bottom, 14),
                },
              ]}
            >
              {/* Header */}

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

              {/* Search */}

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

              {/* Inline Add Toggle */}

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

              {/* Inline Category Add */}

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

              {/* Inline Type Add */}

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

              {/* Picker Rows */}

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
                        if (editing) {
                          return;
                        }

                        if (isCategory) {
                          selectCategory(item as AssetCategoryItem);
                        } else {
                          selectType(item as AssetTypeItem);
                        }
                      }}
                      activeOpacity={0.82}
                    >
                      {/* Favorite */}

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

                      {/* Label / editor */}

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

                      {/* Actions */}

                      {editing ? (
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.rowCancelButton}
                            onPress={(event) => {
                              event.stopPropagation();

                              if (isCategory) {
                                cancelEditCategory();
                              } else {
                                cancelEditType();
                              }
                            }}
                          >
                            <Ionicons name="close" size={15} color={MUTED} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.rowActionButton}
                            onPress={(event) => {
                              event.stopPropagation();

                              if (isCategory) {
                                saveEditedCategory(item.id);
                              } else {
                                saveEditedType(item.id);
                              }
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

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Category / Type
  // -------------------------------------------------------------------------

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
    paddingHorizontal: 9,
    gap: 6,
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

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  searchRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    marginTop: 9,
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

  // -------------------------------------------------------------------------
  // Asset list
  // -------------------------------------------------------------------------

  listContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
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
    paddingHorizontal: 9,
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

  // -------------------------------------------------------------------------
  // Asset row
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Edit row
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Add asset
  // -------------------------------------------------------------------------

  addAssetRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACC,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 7,
    gap: 7,
  },

  addAssetIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },

  addAssetRowInput: {
    flex: 1,
    height: 35,
    borderRadius: 8,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 10.5,
    fontWeight: "600",
  },

  // -------------------------------------------------------------------------
  // Bottom
  // -------------------------------------------------------------------------

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

  buttonDisabled: {
    opacity: 0.4,
  },

  // -------------------------------------------------------------------------
  // Picker Modal
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Skeleton
  // -------------------------------------------------------------------------

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

  skeletonListTitle: {
    width: 92,
    height: 10,
  },

  skeletonListSubtitle: {
    width: 180,
    height: 7,
    marginTop: 5,
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

  // -------------------------------------------------------------------------
  // Error
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Empty
  // -------------------------------------------------------------------------

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
});
