import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaItem = {
  id: string;
  uri: string;
  type: "image" | "video";
};

type AssetSpecs = {
  material: string;
  size: string;
  quantity: string;
};

type AssetItem = {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  thumbnail: string | null;
  media: MediaItem[];
  specs: AssetSpecs;
  isFavorite: boolean;
};

type PickedAsset = {
  name: string;
  category: string;
  subCategory?: string;
};

type AssetGalleryScreenProps = {
  visible: boolean;
  onClose: () => void;
  onPickAsset?: (asset: PickedAsset) => void;
};

// ---------------------------------------------------------------------------
// Dummy data
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  "Furniture",
  "Electronics",
  "Vehicle",
  "Appliances",
];

const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Furniture: ["Chair", "Table", "Sofa"],
  Electronics: ["AC", "TV"],
  Vehicle: ["Car", "Bike"],
  Appliances: ["Fridge", "Washer"],
};

const DUMMY_ASSETS: AssetItem[] = [
  {
    id: "a1",
    name: "Office Chair",
    category: "Furniture",
    subCategory: "Chair",
    thumbnail: "https://picsum.photos/seed/chair1/200/200",
    media: [],
    specs: {
      material: "Mesh & steel",
      size: "60 x 60 x 110 cm",
      quantity: "1",
    },
    isFavorite: false,
  },
  {
    id: "a2",
    name: "Split AC",
    category: "Electronics",
    subCategory: "AC",
    thumbnail: "https://picsum.photos/seed/ac1/200/200",
    media: [],
    specs: {
      material: "Plastic housing",
      size: "1.5 Ton",
      quantity: "2",
    },
    isFavorite: false,
  },
  {
    id: "a3",
    name: "Dining Table",
    category: "Furniture",
    subCategory: "Table",
    thumbnail: null,
    media: [],
    specs: {
      material: "Solid wood",
      size: "180 x 90 cm",
      quantity: "1",
    },
    isFavorite: false,
  },
  {
    id: "a4",
    name: "Refrigerator",
    category: "Appliances",
    subCategory: "Fridge",
    thumbnail: "https://picsum.photos/seed/fridge1/200/200",
    media: [],
    specs: {
      material: "Steel",
      size: "300 L",
      quantity: "1",
    },
    isFavorite: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getInitials = (name: string) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const AVATAR_PALETTE = [
  "#2A324B",
  "#8C6A5B",
  "#4E6C50",
  "#7A5C99",
  "#B0553A",
];

const getAvatarColor = (name: string) => {
  const sum = String(name || "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
};

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
  // Assets
  // -------------------------------------------------------------------------

  const [assets, setAssets] = useState<AssetItem[]>(DUMMY_ASSETS);

  // -------------------------------------------------------------------------
  // Search / filters
  // -------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);

  const [selectedSubTypeFilter, setSelectedSubTypeFilter] = useState<
    string | null
  >(null);

  // -------------------------------------------------------------------------
  // Categories / types
  // -------------------------------------------------------------------------

  const [categories, setCategories] = useState<string[]>(
    DEFAULT_CATEGORIES,
  );

  const [categorySubTypes, setCategorySubTypes] = useState<
    Record<string, string[]>
  >(DEFAULT_SUBCATEGORIES);

  // -------------------------------------------------------------------------
  // Add item
  // -------------------------------------------------------------------------

  const [showAddItem, setShowAddItem] = useState(false);
  const [newAssetNameText, setNewAssetNameText] = useState("");

  // -------------------------------------------------------------------------
  // Category dropdown
  // -------------------------------------------------------------------------

  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [addCategoryMode, setAddCategoryMode] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState("");

  // -------------------------------------------------------------------------
  // Type dropdown
  // -------------------------------------------------------------------------

  const [subTypeDropdownVisible, setSubTypeDropdownVisible] = useState(false);
  const [addSubTypeMode, setAddSubTypeMode] = useState(false);
  const [newSubTypeText, setNewSubTypeText] = useState("");

  // -------------------------------------------------------------------------
  // Dropdown positioning
  // -------------------------------------------------------------------------

  const categoryDropdownRef = useRef<any>(null);
  const subTypeDropdownRef = useRef<any>(null);

  const [categoryAnchor, setCategoryAnchor] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [subTypeAnchor, setSubTypeAnchor] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // -------------------------------------------------------------------------
  // Dropdown helpers
  // -------------------------------------------------------------------------

  const measureDropdown = (
    ref: React.MutableRefObject<any>,
    setAnchor: React.Dispatch<
      React.SetStateAction<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>
    >,
    callback: () => void,
  ) => {
    ref.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        setAnchor({
          x,
          y,
          width,
          height,
        });

        callback();
      },
    );
  };

  // -------------------------------------------------------------------------
  // Category dropdown
  // -------------------------------------------------------------------------

  const openCategoryDropdown = () => {
    setAddCategoryMode(false);
    setNewCategoryText("");

    measureDropdown(
      categoryDropdownRef,
      setCategoryAnchor,
      () => setCategoryDropdownVisible(true),
    );
  };

  const openAddCategory = () => {
    setAddCategoryMode(true);
    setNewCategoryText("");

    measureDropdown(
      categoryDropdownRef,
      setCategoryAnchor,
      () => setCategoryDropdownVisible(true),
    );
  };

  const selectCategory = (category: string | null) => {
    setSelectedCategoryFilter(category);
    setSelectedSubTypeFilter(null);
    setCategoryDropdownVisible(false);
    setAddCategoryMode(false);
  };

  const handleAddCategory = () => {
    const value = newCategoryText.trim();

    if (!value) return;

    const existingCategory = categories.find(
      (category) => category.toLowerCase() === value.toLowerCase(),
    );

    const finalCategory = existingCategory || value;

    if (!existingCategory) {
      setCategories((prev) => [...prev, value]);
    }

    setCategorySubTypes((prev) => ({
      ...prev,
      [finalCategory]: prev[finalCategory] || [],
    }));

    setSelectedCategoryFilter(finalCategory);
    setSelectedSubTypeFilter(null);

    setNewCategoryText("");
    setAddCategoryMode(false);
    setCategoryDropdownVisible(false);
  };

  // -------------------------------------------------------------------------
  // Type dropdown
  // -------------------------------------------------------------------------

  const openSubTypeDropdown = () => {
    if (!selectedCategoryFilter) return;

    setAddSubTypeMode(false);
    setNewSubTypeText("");

    measureDropdown(
      subTypeDropdownRef,
      setSubTypeAnchor,
      () => setSubTypeDropdownVisible(true),
    );
  };

  const openAddSubType = () => {
    if (!selectedCategoryFilter) return;

    setAddSubTypeMode(true);
    setNewSubTypeText("");

    measureDropdown(
      subTypeDropdownRef,
      setSubTypeAnchor,
      () => setSubTypeDropdownVisible(true),
    );
  };

  const selectSubType = (subType: string | null) => {
    setSelectedSubTypeFilter(subType);
    setSubTypeDropdownVisible(false);
    setAddSubTypeMode(false);
  };

  const handleAddSubType = () => {
    if (!selectedCategoryFilter) return;

    const value = newSubTypeText.trim();

    if (!value) return;

    const existingTypes = categorySubTypes[selectedCategoryFilter] || [];

    const existingType = existingTypes.find(
      (type) => type.toLowerCase() === value.toLowerCase(),
    );

    const finalType = existingType || value;

    if (!existingType) {
      setCategorySubTypes((prev) => ({
        ...prev,
        [selectedCategoryFilter]: [...existingTypes, value],
      }));
    }

    setSelectedSubTypeFilter(finalType);

    setNewSubTypeText("");
    setAddSubTypeMode(false);
    setSubTypeDropdownVisible(false);
  };

  // -------------------------------------------------------------------------
  // Add item
  // -------------------------------------------------------------------------

  const openAddItem = () => {
    setShowAddItem((prev) => !prev);

    if (showAddItem) {
      setNewAssetNameText("");
    }
  };

  const handleSaveAsset = () => {
    if (!selectedCategoryFilter) return;

    const name = newAssetNameText.trim();

    if (!name) return;

    const newAsset: AssetItem = {
      id: `a_${Date.now()}`,
      name,
      category: selectedCategoryFilter,
      subCategory: selectedSubTypeFilter || "",
      thumbnail: null,
      media: [],
      specs: {
        material: "",
        size: "",
        quantity: "1",
      },
      isFavorite: false,
    };

    setAssets((prev) => [newAsset, ...prev]);

    setNewAssetNameText("");
    setShowAddItem(false);

    if (onPickAsset) {
      onPickAsset({
        name: newAsset.name,
        category: newAsset.category,
        subCategory: newAsset.subCategory,
      });

      onClose();
    }
  };

  // -------------------------------------------------------------------------
  // Favorite
  // -------------------------------------------------------------------------

  const toggleFavorite = (assetId: string) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              isFavorite: !asset.isFavorite,
            }
          : asset,
      ),
    );
  };

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesSearch =
        !query ||
        asset.name.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query) ||
        asset.subCategory.toLowerCase().includes(query);

      const matchesFavorite =
        !showFavoritesOnly || asset.isFavorite;

      const matchesCategory =
        !selectedCategoryFilter ||
        asset.category === selectedCategoryFilter;

      const matchesSubType =
        !selectedSubTypeFilter ||
        asset.subCategory === selectedSubTypeFilter;

      return (
        matchesSearch &&
        matchesFavorite &&
        matchesCategory &&
        matchesSubType
      );
    });
  }, [
    assets,
    searchQuery,
    showFavoritesOnly,
    selectedCategoryFilter,
    selectedSubTypeFilter,
  ]);

  const subTypesForSelectedCategory = selectedCategoryFilter
    ? categorySubTypes[selectedCategoryFilter] || []
    : [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        {/* -----------------------------------------------------------------
            Header
        ------------------------------------------------------------------ */}

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={TEXT}
              />
            </TouchableOpacity>

            <View>
              <Text style={styles.headerTitle}>My Assets</Text>

              <Text style={styles.headerSubtitle}>
                Manage your assets
              </Text>
            </View>
          </View>
        </View>

        {/* -----------------------------------------------------------------
            Search
        ------------------------------------------------------------------ */}

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={19}
              color={MUTED}
            />

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search assets..."
              placeholderTextColor={MUTED}
              style={styles.searchInput}
              returnKeyType="search"
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={MUTED}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.favoriteFilterBtn,
              showFavoritesOnly &&
                styles.favoriteFilterBtnActive,
            ]}
            onPress={() =>
              setShowFavoritesOnly((prev) => !prev)
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name={
                showFavoritesOnly
                  ? "star"
                  : "star-outline"
              }
              size={18}
              color={
                showFavoritesOnly
                  ? "#F59E0B"
                  : MUTED
              }
            />
          </TouchableOpacity>
        </View>

        {/* -----------------------------------------------------------------
            Category + Type filters
        ------------------------------------------------------------------ */}

        <View style={styles.filterRow}>
          {/* Category */}

          <View style={styles.filterControl}>
            <TouchableOpacity
              ref={categoryDropdownRef}
              style={styles.filterDropdown}
              onPress={openCategoryDropdown}
              activeOpacity={0.85}
            >
              <Text
                style={styles.filterDropdownText}
                numberOfLines={1}
              >
                {selectedCategoryFilter ||
                  "All Categories"}
              </Text>

              <View style={styles.dropdownRight}>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    openAddCategory();
                  }}
                  hitSlop={8}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="add"
                    size={19}
                    color={ACC}
                  />
                </TouchableOpacity>

                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={MUTED}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Type */}

          <View style={styles.filterControl}>
            <TouchableOpacity
              ref={subTypeDropdownRef}
              style={[
                styles.filterDropdown,
                !selectedCategoryFilter &&
                  styles.filterDropdownDisabled,
              ]}
              onPress={openSubTypeDropdown}
              disabled={!selectedCategoryFilter}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterDropdownText,
                  !selectedCategoryFilter &&
                    styles.filterDropdownTextDisabled,
                ]}
                numberOfLines={1}
              >
                {selectedSubTypeFilter || "All Types"}
              </Text>

              <View style={styles.dropdownRight}>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    openAddSubType();
                  }}
                  disabled={!selectedCategoryFilter}
                  hitSlop={8}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="add"
                    size={19}
                    color={
                      selectedCategoryFilter
                        ? ACC
                        : "#C7CCDB"
                    }
                  />
                </TouchableOpacity>

                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={
                    selectedCategoryFilter
                      ? MUTED
                      : "#C7CCDB"
                  }
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* -----------------------------------------------------------------
            Add item input
        ------------------------------------------------------------------ */}

        {showAddItem && (
          <View style={styles.addItemSection}>
            {!selectedCategoryFilter ? (
              <View style={styles.addItemHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color={MUTED}
                />

                <Text style={styles.addItemHintText}>
                  Select a category first
                </Text>
              </View>
            ) : (
              <View style={styles.addItemInputRow}>
                <TextInput
                  value={newAssetNameText}
                  onChangeText={setNewAssetNameText}
                  placeholder={
                    selectedSubTypeFilter
                      ? `Enter new ${selectedSubTypeFilter} name`
                      : `Enter new ${selectedCategoryFilter} item`
                  }
                  placeholderTextColor={MUTED}
                  style={styles.addItemInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveAsset}
                />

                <TouchableOpacity
                  style={[
                    styles.addItemSaveBtn,
                    !newAssetNameText.trim() &&
                      styles.addItemSaveBtnDisabled,
                  ]}
                  onPress={handleSaveAsset}
                  disabled={!newAssetNameText.trim()}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="checkmark"
                    size={19}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* -----------------------------------------------------------------
            Asset list
        ------------------------------------------------------------------ */}

        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                100 + insets.bottom,
            },
          ]}
          ItemSeparatorComponent={() => (
            <View style={{ height: 10 }} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="cube-outline"
                  size={25}
                  color={MUTED}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No assets found
              </Text>

              <Text style={styles.emptyText}>
                {selectedCategoryFilter
                  ? `No ${
                      selectedSubTypeFilter
                        ? `${selectedSubTypeFilter} `
                        : ""
                    }${selectedCategoryFilter} items yet.`
                  : "Add your first asset to get started."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AssetRow
              asset={item}
              onPress={() => {
                if (onPickAsset) {
                  onPickAsset({
                    name: item.name,
                    category: item.category,
                    subCategory: item.subCategory,
                  });

                  onClose();
                }
              }}
              onToggleFavorite={() =>
                toggleFavorite(item.id)
              }
            />
          )}
        />

        {/* -----------------------------------------------------------------
            Bottom Add Item button
        ------------------------------------------------------------------ */}

        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom:
                Math.max(insets.bottom, 14),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.bottomAddBtn,
              showAddItem &&
                styles.bottomAddBtnActive,
            ]}
            onPress={openAddItem}
            activeOpacity={0.85}
          >
            <Ionicons
              name={showAddItem ? "close" : "add"}
              size={20}
              color="#fff"
            />

            <Text style={styles.bottomAddBtnText}>
              {showAddItem
                ? "Cancel"
                : "Add Item"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* -----------------------------------------------------------------
            Category Dropdown
        ------------------------------------------------------------------ */}

        <Modal
          visible={categoryDropdownVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setCategoryDropdownVisible(false)
          }
        >
          <TouchableWithoutFeedback
            onPress={() =>
              setCategoryDropdownVisible(false)
            }
          >
            <View style={styles.overlay}>
              <TouchableWithoutFeedback
                onPress={() => {}}
              >
                <View
                  style={[
                    styles.dropdownCard,
                    {
                      left: categoryAnchor.x,
                      top:
                        categoryAnchor.y +
                        categoryAnchor.height +
                        6,
                      width: categoryAnchor.width,
                    },
                  ]}
                >
                  {!addCategoryMode ? (
                    <>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>
                          Category
                        </Text>

                        <TouchableOpacity
                          onPress={() =>
                            setCategoryDropdownVisible(
                              false,
                            )
                          }
                          style={styles.dropdownClose}
                        >
                          <Ionicons
                            name="close"
                            size={17}
                            color={TEXT}
                          />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() =>
                          selectCategory(null)
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.optionText}>
                          All Categories
                        </Text>

                        {!selectedCategoryFilter && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={ACC}
                          />
                        )}
                      </TouchableOpacity>

                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={styles.dropdownOption}
                          onPress={() =>
                            selectCategory(category)
                          }
                          activeOpacity={0.8}
                        >
                          <View
                            style={
                              styles.optionLeft
                            }
                          >
                            <View
                              style={
                                styles.categoryDot
                              }
                            />

                            <Text
                              style={
                                styles.optionText
                              }
                            >
                              {category}
                            </Text>
                          </View>

                          {selectedCategoryFilter ===
                            category && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={ACC}
                            />
                          )}
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        style={styles.addDropdownOption}
                        onPress={openAddCategory}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={19}
                          color={ACC}
                        />

                        <Text
                          style={
                            styles.addDropdownOptionText
                          }
                        >
                          Add Category
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.dropdownHeader}>
                        <View>
                          <Text
                            style={
                              styles.dropdownTitle
                            }
                          >
                            Add Category
                          </Text>

                          <Text
                            style={
                              styles.dropdownSubtitle
                            }
                          >
                            Create a new category
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            setAddCategoryMode(false);
                            setNewCategoryText("");
                          }}
                          style={styles.dropdownClose}
                        >
                          <Ionicons
                            name="close"
                            size={17}
                            color={TEXT}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.addDropdownInputRow}>
                        <TextInput
                          value={newCategoryText}
                          onChangeText={
                            setNewCategoryText
                          }
                          placeholder="Category name"
                          placeholderTextColor={MUTED}
                          style={
                            styles.addDropdownInput
                          }
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={
                            handleAddCategory
                          }
                        />

                        <TouchableOpacity
                          style={[
                            styles.addDropdownSave,
                            !newCategoryText.trim() &&
                              styles.addDropdownSaveDisabled,
                          ]}
                          onPress={
                            handleAddCategory
                          }
                          disabled={
                            !newCategoryText.trim()
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="checkmark"
                            size={19}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* -----------------------------------------------------------------
            Type Dropdown
        ------------------------------------------------------------------ */}

        <Modal
          visible={subTypeDropdownVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setSubTypeDropdownVisible(false)
          }
        >
          <TouchableWithoutFeedback
            onPress={() =>
              setSubTypeDropdownVisible(false)
            }
          >
            <View style={styles.overlay}>
              <TouchableWithoutFeedback
                onPress={() => {}}
              >
                <View
                  style={[
                    styles.dropdownCard,
                    {
                      left: subTypeAnchor.x,
                      top:
                        subTypeAnchor.y +
                        subTypeAnchor.height +
                        6,
                      width: subTypeAnchor.width,
                    },
                  ]}
                >
                  {!addSubTypeMode ? (
                    <>
                      <View style={styles.dropdownHeader}>
                        <View>
                          <Text
                            style={
                              styles.dropdownTitle
                            }
                          >
                            Type
                          </Text>

                          <Text
                            style={
                              styles.dropdownSubtitle
                            }
                          >
                            {selectedCategoryFilter}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() =>
                            setSubTypeDropdownVisible(
                              false,
                            )
                          }
                          style={styles.dropdownClose}
                        >
                          <Ionicons
                            name="close"
                            size={17}
                            color={TEXT}
                          />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() =>
                          selectSubType(null)
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.optionText}>
                          All Types
                        </Text>

                        {!selectedSubTypeFilter && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={ACC}
                          />
                        )}
                      </TouchableOpacity>

                      {subTypesForSelectedCategory.map(
                        (subType) => (
                          <TouchableOpacity
                            key={subType}
                            style={
                              styles.dropdownOption
                            }
                            onPress={() =>
                              selectSubType(
                                subType,
                              )
                            }
                            activeOpacity={0.8}
                          >
                            <View
                              style={
                                styles.optionLeft
                              }
                            >
                              <View
                                style={
                                  styles.categoryDot
                                }
                              />

                              <Text
                                style={
                                  styles.optionText
                                }
                              >
                                {subType}
                              </Text>
                            </View>

                            {selectedSubTypeFilter ===
                              subType && (
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={ACC}
                              />
                            )}
                          </TouchableOpacity>
                        ),
                      )}

                      <TouchableOpacity
                        style={styles.addDropdownOption}
                        onPress={openAddSubType}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={19}
                          color={ACC}
                        />

                        <Text
                          style={
                            styles.addDropdownOptionText
                          }
                        >
                          Add Type
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.dropdownHeader}>
                        <View>
                          <Text
                            style={
                              styles.dropdownTitle
                            }
                          >
                            Add Type
                          </Text>

                          <Text
                            style={
                              styles.dropdownSubtitle
                            }
                          >
                            Add a type to{" "}
                            {selectedCategoryFilter}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            setAddSubTypeMode(false);
                            setNewSubTypeText("");
                          }}
                          style={styles.dropdownClose}
                        >
                          <Ionicons
                            name="close"
                            size={17}
                            color={TEXT}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.addDropdownInputRow}>
                        <TextInput
                          value={newSubTypeText}
                          onChangeText={
                            setNewSubTypeText
                          }
                          placeholder="Type name"
                          placeholderTextColor={MUTED}
                          style={
                            styles.addDropdownInput
                          }
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={
                            handleAddSubType
                          }
                        />

                        <TouchableOpacity
                          style={[
                            styles.addDropdownSave,
                            !newSubTypeText.trim() &&
                              styles.addDropdownSaveDisabled,
                          ]}
                          onPress={
                            handleAddSubType
                          }
                          disabled={
                            !newSubTypeText.trim()
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="checkmark"
                            size={19}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Asset Row
// ---------------------------------------------------------------------------

function AssetRow({
  asset,
  onPress,
  onToggleFavorite,
}: {
  asset: AssetItem;
  onPress?: () => void;
  onToggleFavorite: () => void;
}) {
  const avatarColor = useMemo(
    () => getAvatarColor(asset.name),
    [asset.name],
  );

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!onPress}
    >
      {asset.thumbnail ? (
        <Image
          source={{ uri: asset.thumbnail }}
          style={styles.rowThumb}
        />
      ) : (
        <View
          style={[
            styles.rowThumb,
            styles.rowThumbInitials,
            {
              backgroundColor: avatarColor,
            },
          ]}
        >
          <Text
            style={styles.rowThumbInitialsText}
          >
            {getInitials(asset.name)}
          </Text>
        </View>
      )}

      <View style={styles.rowTextWrap}>
        <Text
          style={styles.rowName}
          numberOfLines={1}
        >
          {asset.name}
        </Text>

        <View style={styles.rowCategoryPill}>
          <Text
            style={styles.rowCategoryText}
            numberOfLines={1}
          >
            {asset.category}
            {asset.subCategory
              ? ` • ${asset.subCategory}`
              : ""}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.favoriteBtn}
        onPress={onToggleFavorite}
        activeOpacity={0.8}
        hitSlop={8}
      >
        <Ionicons
          name={
            asset.isFavorite
              ? "star"
              : "star-outline"
          }
          size={21}
          color={
            asset.isFavorite
              ? "#F59E0B"
              : MUTED
          }
        />
      </TouchableOpacity>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={MUTED}
      />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  headerTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  // Search
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  searchBar: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 0,
  },

  favoriteFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
  },

  favoriteFilterBtnActive: {
    backgroundColor: "#FFF7E6",
    borderColor: "#F5C46B",
  },

  // Filters
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  filterControl: {
    flex: 1,
  },

  filterDropdown: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 6,
  },

  filterDropdownDisabled: {
    backgroundColor: "#F7F8FB",
  },

  filterDropdownText: {
    flex: 1,
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  filterDropdownTextDisabled: {
    color: "#C7CCDB",
  },

  dropdownRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Add item
  addItemSection: {
    marginBottom: 10,
  },

  addItemInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  addItemInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: ACC,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

  addItemSaveBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },

  addItemSaveBtnDisabled: {
    opacity: 0.45,
  },

  addItemHint: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: "#EEF1F6",
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  addItemHintText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },

  // List
  listContent: {
    paddingTop: 4,
  },

  emptyWrap: {
    paddingTop: 50,
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },

  emptyText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // Asset row
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 12,
  },

  rowThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: SURFACE,
  },

  rowThumbInitials: {
    alignItems: "center",
    justifyContent: "center",
  },

  rowThumbInitialsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  rowName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },

  rowCategoryPill: {
    alignSelf: "flex-start",
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    maxWidth: "100%",
  },

  rowCategoryText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  favoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FB",
  },

  // Bottom
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: "#F5F6FA",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  bottomAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: ACC,
    minHeight: 50,
    borderRadius: 14,
  },

  bottomAddBtnActive: {
    backgroundColor: "#4D566F",
  },

  bottomAddBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  // Dropdown modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(42,50,75,0.18)",
  },

  dropdownCard: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 8,
  },

  dropdownHeader: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  dropdownTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
  },

  dropdownSubtitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  dropdownClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACC,
  },

  optionText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  addDropdownOption: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(247,197,159,0.22)",
  },

  addDropdownOptionText: {
    color: ACC,
    fontSize: 12,
    fontWeight: "800",
  },

  addDropdownInputRow: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(247,197,159,0.22)",
  },

  addDropdownInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

  addDropdownSave: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },

  addDropdownSaveDisabled: {
    opacity: 0.45,
  },
});