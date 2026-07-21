//app/forms/VehiclesAssetForm.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

import { AssetDraft, AssetMediaInput } from "../utils/types";
import {
  vehicleBrands,
  getVehicleModelsByBrand,
} from "../../data/vehicleCatalog";
import { formStyles as styles, ACC, TEXT, MUTED } from "./formStyles";

type VehiclePhotoSlot = "plate" | "details" | "odometer" | "other";

const FAVORITE_VEHICLE_BRANDS_KEY = "favorite_vehicle_brands";
const FAVORITE_VEHICLE_MODELS_KEY = "favorite_vehicle_models_by_brand";

const vehiclePreviewSlots = [
  {
    key: "plate",
    label: "Car Plate",
    icon: "car-sport-outline",
    index: 0,
  },
  {
    key: "details",
    label: "Car Details",
    icon: "document-text",
    index: 1,
  },
  {
    key: "odometer",
    label: "Odometer",
    icon: "speedometer-outline",
    index: 2,
  },
  {
    key: "other",
    label: "Other",
    icon: "images-outline",
    index: null,
  },
] as const;

type VehicleAssetFormProps = {
  draft: AssetDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssetDraft>>;

  detailsExpanded: boolean;
  setDetailsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  previewSize: number;
  imageLoadingMap: Record<string, boolean>;
  setImageLoading: (key: string, loading: boolean) => void;

  manufactureYears: string[];
  height: number;

  openVehiclePhotoCamera: (slot: VehiclePhotoSlot) => void;

  t: any;
};

function normalizeVehicleFavorite(value: string) {
  return String(value || "").trim();
}

function sortVehicleText(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function moveFavoritesToTop(items: string[], favorites: string[]) {
  const uniqueItems = Array.from(
    new Set(items.map(normalizeVehicleFavorite).filter(Boolean))
  ).sort(sortVehicleText);

  const cleanFavorites = Array.from(
    new Set(favorites.map(normalizeVehicleFavorite).filter(Boolean))
  ).sort(sortVehicleText);

  const favoriteSet = new Set(cleanFavorites);

  const favoriteItems = cleanFavorites.filter((item) =>
    uniqueItems.includes(item)
  );

  const normalItems = uniqueItems.filter((item) => !favoriteSet.has(item));

  return [...favoriteItems, ...normalItems];
}

function getImageKey(uri: string, index: number) {
  return `${uri}-${index}`;
}

export default function VehicleAssetForm({
  draft,
  setDraft,
  detailsExpanded,
  setDetailsExpanded,
  previewSize,
  imageLoadingMap,
  setImageLoading,
  manufactureYears,
  height,
  openVehiclePhotoCamera,
  t,
}: VehicleAssetFormProps) {
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [favoriteModelsByBrand, setFavoriteModelsByBrand] = useState<
    Record<string, string[]>
  >({});

  React.useEffect(() => {
    const loadVehicleFavorites = async () => {
      try {
        const savedBrands = await AsyncStorage.getItem(
          FAVORITE_VEHICLE_BRANDS_KEY
        );

        const savedModels = await AsyncStorage.getItem(
          FAVORITE_VEHICLE_MODELS_KEY
        );

        setFavoriteBrands(savedBrands ? JSON.parse(savedBrands) : []);
        setFavoriteModelsByBrand(savedModels ? JSON.parse(savedModels) : {});
      } catch (error) {
        console.log("Failed to load vehicle favorites", error);
      }
    };

    loadVehicleFavorites();
  }, []);

  const selectedBrand = String((draft as any).brand || "").trim();

  const availableVehicleModels = getVehicleModelsByBrand(selectedBrand);

  const sortedVehicleBrands = useMemo(
    () => moveFavoritesToTop(vehicleBrands, favoriteBrands),
    [favoriteBrands]
  );

  const selectedBrandFavoriteModels = selectedBrand
    ? favoriteModelsByBrand[selectedBrand] || []
    : [];

  const sortedVehicleModels = useMemo(
    () => moveFavoritesToTop(availableVehicleModels, selectedBrandFavoriteModels),
    [availableVehicleModels, selectedBrandFavoriteModels]
  );

  const selectVehicleBrand = (brand: string) => {
    setDraft((prev) => ({
      ...prev,
      brand,
      model: "",
    }));

    setBrandDropdownOpen(false);
    setModelDropdownOpen(false);
  };

  const selectVehicleModel = (model: string) => {
    setDraft((prev) => ({
      ...prev,
      model,
    }));

    setModelDropdownOpen(false);
  };

  const toggleFavoriteBrand = async (brand: string) => {
    const cleanBrand = normalizeVehicleFavorite(brand);
    if (!cleanBrand) return;

    try {
      const exists = favoriteBrands.includes(cleanBrand);

      const nextFavorites = exists
        ? favoriteBrands.filter((item) => item !== cleanBrand)
        : [cleanBrand, ...favoriteBrands];

      setFavoriteBrands(nextFavorites);

      await AsyncStorage.setItem(
        FAVORITE_VEHICLE_BRANDS_KEY,
        JSON.stringify(nextFavorites)
      );
    } catch (error) {
      console.log("Failed to save favorite brand", error);
    }
  };

  const toggleFavoriteModel = async (brand: string, model: string) => {
    const cleanBrand = normalizeVehicleFavorite(brand);
    const cleanModel = normalizeVehicleFavorite(model);

    if (!cleanBrand || !cleanModel) return;

    try {
      const currentFavorites = favoriteModelsByBrand[cleanBrand] || [];
      const exists = currentFavorites.includes(cleanModel);

      const nextBrandFavorites = exists
        ? currentFavorites.filter((item) => item !== cleanModel)
        : [cleanModel, ...currentFavorites];

      const nextFavoritesByBrand = {
        ...favoriteModelsByBrand,
        [cleanBrand]: nextBrandFavorites,
      };

      setFavoriteModelsByBrand(nextFavoritesByBrand);

      await AsyncStorage.setItem(
        FAVORITE_VEHICLE_MODELS_KEY,
        JSON.stringify(nextFavoritesByBrand)
      );
    } catch (error) {
      console.log("Failed to save favorite model", error);
    }
  };

  const removeImage = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      <Text style={styles.helper}>Vehicle photos {draft.images.length}</Text>

      <View style={styles.vehiclePreviewGrid}>
        {vehiclePreviewSlots.map((slot) => {
          const img =
            slot.index === null ? draft.images[3] : draft.images[slot.index];

          const imageUri = img?.uri || img?.url;
          const realIndex = slot.index === null ? 3 : slot.index;
          const imageKey = imageUri ? getImageKey(imageUri, realIndex) : slot.key;

          const isImageLoading = imageUri
            ? imageLoadingMap[imageKey] !== false
            : false;

          return (
            <TouchableOpacity
              key={slot.key}
              style={[
                styles.vehiclePreviewItem,
                {
                  width: previewSize,
                  height: previewSize + 18,
                },
              ]}
              onPress={() => openVehiclePhotoCamera(slot.key)}
              activeOpacity={0.85}
            >
              <View style={styles.vehiclePreviewBox}>
                {imageUri ? (
                  <>
                    <Image
                      source={{ uri: imageUri }}
                      style={[
                        styles.previewImage,
                        isImageLoading && styles.previewImageLoading,
                      ]}
                      resizeMode="cover"
                      fadeDuration={150}
                      onLoadStart={() => setImageLoading(imageKey, true)}
                      onLoadEnd={() => setImageLoading(imageKey, false)}
                      onError={() => setImageLoading(imageKey, false)}
                    />

                    {isImageLoading && (
                      <View style={styles.imageLoaderOverlay}>
                        <ActivityIndicator size="small" color="#ffffff" />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.removeBadge}
                      onPress={(e) => {
                        e.stopPropagation();
                        removeImage(realIndex);
                      }}
                    >
                      <Text style={styles.removeBadgeText}>✕</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.vehiclePlaceholderContent}>
                    <Ionicons name={slot.icon as any} size={20} color={MUTED} />
                    <Ionicons name="add-circle" size={13} color={ACC} />
                  </View>
                )}
              </View>

              <Text style={styles.vehiclePreviewLabel} numberOfLines={1}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {draft.images.slice(4).map((img: AssetMediaInput, extraIndex) => {
          const realIndex = extraIndex + 4;
          const imageUri = img.uri || img.url;
          if (!imageUri) return null;

          const imageKey = getImageKey(imageUri, realIndex);
          const isImageLoading = imageLoadingMap[imageKey] !== false;

          return (
            <View
              key={imageKey}
              style={[
                styles.previewItem,
                {
                  width: previewSize,
                  height: previewSize,
                },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.previewImage,
                  isImageLoading && styles.previewImageLoading,
                ]}
                resizeMode="cover"
                fadeDuration={150}
                onLoadStart={() => setImageLoading(imageKey, true)}
                onLoadEnd={() => setImageLoading(imageKey, false)}
                onError={() => setImageLoading(imageKey, false)}
              />

              {isImageLoading && (
                <View style={styles.imageLoaderOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}

              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => removeImage(realIndex)}
              >
                <Text style={styles.removeBadgeText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.addDetailsBtn}
        onPress={() => setDetailsExpanded((prev) => !prev)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={detailsExpanded ? "remove-circle-outline" : "add-circle-outline"}
          size={18}
          color={ACC}
        />

        <Text style={styles.addDetailsText}>
          {detailsExpanded ? "Hide details" : "Add vehicle details"}
        </Text>
      </TouchableOpacity>

      {detailsExpanded && (
        <>
          <View style={styles.vehicleGrid}>
            <View style={[styles.vehicleField, styles.vehicleFieldDropdownTop]}>
              <Text style={styles.fieldLabel}>{t("asset.brand")}</Text>

              <TouchableOpacity
                style={[
                  styles.input,
                  styles.compactInput,
                  styles.vehicleDropdownInput,
                ]}
                onPress={() => {
                  setBrandDropdownOpen((prev) => !prev);
                  setModelDropdownOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.vehicleDropdownText,
                    !draft.brand && styles.vehicleDropdownPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {draft.brand || t("asset.brand")}
                </Text>

                <Ionicons
                  name={brandDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={TEXT}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.vehicleField, styles.vehicleFieldDropdownTop]}>
              <Text style={styles.fieldLabel}>{t("asset.model")}</Text>

              <TouchableOpacity
                style={[
                  styles.input,
                  styles.compactInput,
                  styles.vehicleDropdownInput,
                  !draft.brand && styles.vehicleDropdownDisabled,
                ]}
                onPress={() => {
                  if (!draft.brand) return;
                  setModelDropdownOpen((prev) => !prev);
                  setBrandDropdownOpen(false);
                }}
                activeOpacity={0.85}
                disabled={!draft.brand}
              >
                <Text
                  style={[
                    styles.vehicleDropdownText,
                    !draft.model && styles.vehicleDropdownPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {draft.model ||
                    (draft.brand ? t("asset.model") : "Choose brand first")}
                </Text>

                <Ionicons
                  name={modelDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={!draft.brand ? "#9CA3AF" : TEXT}
                />
              </TouchableOpacity>
            </View>

            <View
              pointerEvents={
                brandDropdownOpen || modelDropdownOpen ? "none" : "auto"
              }
              style={styles.vehicleField}
            >
              <Text style={styles.fieldLabel}>{t("asset.manufactureYear")}</Text>

              <View style={styles.vehicleYearPickerWrap}>
                <Picker
                  selectedValue={draft.manufactureYear || ""}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      manufactureYear: value,
                    }))
                  }
                  dropdownIconColor={TEXT}
                  style={styles.vehicleYearPicker}
                  itemStyle={styles.vehicleYearPickerItem}
                >
                  <Picker.Item label="Year" value="" />
                  {manufactureYears.map((year) => (
                    <Picker.Item key={year} label={year} value={year} />
                  ))}
                </Picker>
              </View>
            </View>

            <View
              pointerEvents={
                brandDropdownOpen || modelDropdownOpen ? "none" : "auto"
              }
              style={styles.vehicleField}
            >
              <Text style={styles.fieldLabel}>{t("asset.kilometersDriven")}</Text>

              <TextInput
                placeholder={t("asset.kilometersDriven")}
                placeholderTextColor="#767B91"
                value={draft.kilometersDriven}
                keyboardType="numeric"
                onChangeText={(text) =>
                  setDraft((prev) => ({
                    ...prev,
                    kilometersDriven: text,
                  }))
                }
                style={[styles.input, styles.compactInput]}
              />
            </View>
          </View>
        </>
      )}

      <Modal
        visible={brandDropdownOpen || modelDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBrandDropdownOpen(false);
          setModelDropdownOpen(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setBrandDropdownOpen(false);
            setModelDropdownOpen(false);
          }}
        >
          <View style={styles.vehicleSelectOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.vehicleSelectCard,
                  {
                    maxHeight: Math.min(height * 0.55, 360),
                  },
                ]}
              >
                <View style={styles.vehicleSelectHeader}>
                  <Text style={styles.vehicleSelectTitle}>
                    {brandDropdownOpen ? t("asset.brand") : t("asset.model")}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setBrandDropdownOpen(false);
                      setModelDropdownOpen(false);
                    }}
                    style={styles.vehicleSelectCloseBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={18} color="#2b2a4b" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.vehicleSelectScroll}
                  contentContainerStyle={styles.vehicleSelectScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {(brandDropdownOpen
                    ? sortedVehicleBrands
                    : sortedVehicleModels
                  ).map((item) => {
                    const isBrandList = brandDropdownOpen;

                    const isSelected = isBrandList
                      ? draft.brand === item
                      : draft.model === item;

                    const isFavorite = isBrandList
                      ? favoriteBrands.includes(item)
                      : selectedBrandFavoriteModels.includes(item);

                    return (
                      <View key={item} style={styles.vehicleSelectOptionRow}>
                        <TouchableOpacity
                          style={styles.vehicleSelectOptionMain}
                          onPress={() => {
                            if (isBrandList) {
                              selectVehicleBrand(item);
                            } else {
                              selectVehicleModel(item);
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.vehicleSelectOptionText}>
                            {item}
                          </Text>

                          {isSelected && (
                            <Ionicons name="checkmark" size={18} color={ACC} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.vehicleFavoriteBtn}
                          onPress={() => {
                            if (isBrandList) {
                              toggleFavoriteBrand(item);
                            } else {
                              toggleFavoriteModel(selectedBrand, item);
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name={isFavorite ? "star" : "star-outline"}
                            size={19}
                            color={isFavorite ? "#F59E0B" : "#8A91A3"}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}