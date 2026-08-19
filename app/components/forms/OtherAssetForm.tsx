//OtherAssetForm.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AssetDraft, AssetMediaInput } from "../utils/types";
import { formStyles as styles, ACC, TEXT } from "./formStyles";
import { useTranslation } from "react-i18next";
import ImageViewer from "react-native-image-zoom-viewer";

type OtherPhotoSlot = "main" | "details" | "brand" | "other";

function getImageKey(slot: string, uri: string, index = 0) {
  return `${slot}-${index}-${uri}`;
}

type OtherAssetFormProps = {
  draft: AssetDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssetDraft>>;

  detailsExpanded: boolean;
  setDetailsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  assetLocations?: {
    value: string;
    source: "normalizedData" | "newAssetLocation";
  }[];

  showSnackbar?: (message: string, type?: "success" | "error" | "info") => void;

  previewSize: number;
  imageLoadingMap: Record<string, boolean>;
  setImageLoading: (key: string, loading: boolean) => void;
  height: number;

  openOtherPhotoCamera: (slot: OtherPhotoSlot) => void;
  onPreviewImage: (uri: string) => void;
};

const cleanAssetRawData = (rawData?: Record<string, any> | null) => {
  const source =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? { ...rawData }
      : {};

  delete source.quantity;
  delete source.asset_location;
  delete source.customAssetType;

  return source;
};

export function getOtherAssetQuantity(draft: AssetDraft) {
  const rawQuantity =
    (draft as any).quantity ?? (draft as any).rawData?.quantity ?? 1;

  const quantity = Number(rawQuantity);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return "1";
  }

  return String(Math.floor(quantity));
}

export function getNormalizedAssetLocation(draft: AssetDraft): string | null {
  const value = (draft as any).normalizedData?.asset_location;

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text || null;
}

export function getNewAssetLocation(draft: AssetDraft): string | null {
  const value = (draft as any).newAssetLocation;

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text || null;
}

export function getEffectiveAssetLocation(draft: AssetDraft): string | null {
  return getNewAssetLocation(draft) || getNormalizedAssetLocation(draft);
}

export function cleanOtherAssetDraft(draft: AssetDraft): AssetDraft {
  const finalQuantity = Number(getOtherAssetQuantity(draft));

  const newAssetLocation = getNewAssetLocation(draft);

  return {
    ...draft,

    assetType: "other",

    quantity: Math.max(1, finalQuantity),

    newAssetLocation: newAssetLocation || null,

    brand: undefined,
    model: undefined,
    manufactureYear: undefined,
    kilometersDriven: undefined,

    images: {
      ...draft.images,
      plate: null,
      odometer: null,
    },

    rawData: cleanAssetRawData((draft as any).rawData),
  } as any;
}
export default function OtherAssetForm({
  draft,
  setDraft,
  detailsExpanded,
  setDetailsExpanded,
  assetLocations = [],
  showSnackbar,
  previewSize,
  imageLoadingMap,
  setImageLoading,
  height,
  openOtherPhotoCamera,
  onPreviewImage,
}: OtherAssetFormProps) {
  const { t, i18n } = useTranslation();
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);

  const [newLocationText, setNewLocationText] = useState("");
  const [otherPhotosOpen, setOtherPhotosOpen] = useState(false);

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const [editingLocation, setEditingLocation] = useState<string | null>(null);

  const [editingLocationText, setEditingLocationText] = useState("");

  const normalizedAssetLocation = getNormalizedAssetLocation(draft);

  const newAssetLocation = getNewAssetLocation(draft);

  const selectedLocation = getEffectiveAssetLocation(draft);
  const otherPreviewSlots = [
    { key: "main", label: "asset.mainPhoto", icon: "document-text-outline" },
    { key: "details", label: "asset.details", icon: "document-text-outline" },
    { key: "brand", label: "asset.brand", icon: "pricetag-outline" },
    { key: "other", label: "asset.typeOther", icon: "images-outline" },
  ] as const;

  const projectAssetLocations = useMemo(() => {
    const unique = new Map<
      string,
      {
        value: string;
        source: "normalizedData" | "newAssetLocation";
      }
    >();

    const addLocation = (
      value?: string | null,
      source: "normalizedData" | "newAssetLocation" = "normalizedData",
    ) => {
      const text = String(value || "").trim();

      if (!text) {
        return;
      }

      const key = text.toLocaleLowerCase();

      if (!unique.has(key)) {
        unique.set(key, {
          value: text,
          source,
        });
      }
    };

    assetLocations.forEach((item) => {
      addLocation(item.value, item.source);
    });

    /*
     * Ensure this asset's imported location
     * is available even if the project endpoint
     * didn't include it.
     */
    addLocation(normalizedAssetLocation, "normalizedData");

    /*
     * Also include the current user-created value.
     */
    addLocation(newAssetLocation, "newAssetLocation");

    return Array.from(unique.values()).sort((a, b) =>
      a.value.localeCompare(b.value),
    );
  }, [assetLocations, normalizedAssetLocation, newAssetLocation]);
  const getQuantity = () => getOtherAssetQuantity(draft);

  const updateQuantity = (nextValue: number | string) => {
    const cleaned =
      typeof nextValue === "number"
        ? nextValue
        : Number(String(nextValue).replace(/[^0-9]/g, "") || 1);

    const quantity = Math.max(1, Math.floor(cleaned));

    setDraft(
      (prev) =>
        ({
          ...prev,
          assetType: "other",
          quantity,
          rawData: cleanAssetRawData((prev as any).rawData),
        }) as any,
    );
  };

  const saveNewLocation = () => {
    const value = newLocationText.trim();

    if (!value) {
      showSnackbar?.("Enter a location", "error");
      return;
    }

    setDraft(
      (prev) =>
        ({
          ...prev,

          assetType: "other",

          /*
           * User-added location always lives
           * outside normalizedData.
           */
          newAssetLocation: value,

          rawData: cleanAssetRawData((prev as any).rawData),
        }) as any,
    );

    setNewLocationText("");
    setAddLocationModalOpen(false);
    setLocationDropdownOpen(false);
  };

  const saveEditedLocation = () => {
    const value = editingLocationText.trim();

    if (!value) {
      showSnackbar?.("Enter a location", "error");
      return;
    }

    /*
     * Editing NEVER modifies normalizedData.
     *
     * Even when the user edits an imported
     * normalizedData.asset_location, the edited
     * value becomes newAssetLocation.
     */
    setDraft(
      (prev) =>
        ({
          ...prev,

          assetType: "other",

          newAssetLocation: value,

          rawData: cleanAssetRawData((prev as any).rawData),
        }) as any,
    );

    setEditingLocation(null);
    setEditingLocationText("");

    setLocationDropdownOpen(false);

    showSnackbar?.("Location updated", "success");
  };

  const otherPhotos = draft.images.other || [];

  const imageCount =
    Number(Boolean(draft.images.main)) +
    Number(Boolean(draft.images.details)) +
    Number(Boolean(draft.images.brand)) +
    otherPhotos.length;

  const removeSingleSlotImage = (slot: "main" | "details" | "brand") => {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        [slot]: null,
      },
    }));
  };

  const removeOtherImage = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      images: {
        ...prev.images,
        other: prev.images.other.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  return (
    <>
      <View style={styles.otherAssetControls}>
        <View style={styles.assetTypeQuantityRow}>
          <View style={styles.assetTypeFieldWrap}>
            <Text style={styles.fieldLabel}>Location</Text>

            <View style={styles.assetTypeInputLikeWrap}>
              <TouchableOpacity
                style={styles.assetTypeInputChoose}
                onPress={() => {
                  setLocationDropdownOpen((prev) => !prev);

                  setAddLocationModalOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.assetTypeInputText} numberOfLines={1}>
                  {selectedLocation || t("common.choose")}
                </Text>

                <Ionicons
                  name={locationDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={TEXT}
                />
              </TouchableOpacity>

              <View style={styles.assetTypeInputDivider} />

              <TouchableOpacity
                style={styles.assetTypeInputPlus}
                onPress={() => {
                  setNewLocationText("");
                  setAddLocationModalOpen(true);
                  setLocationDropdownOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={TEXT} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.quantityFieldWrap}>
            <Text style={styles.fieldLabel}> {t("asset.quantity")}</Text>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityIconBtn}
                onPress={() => updateQuantity(Number(getQuantity()) - 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="remove" size={16} color={TEXT} />
              </TouchableOpacity>

              <TextInput
                value={getQuantity()}
                onChangeText={updateQuantity}
                keyboardType="numeric"
                style={styles.quantityInput}
                selectTextOnFocus
                textAlign="center"
              />

              <TouchableOpacity
                style={styles.quantityIconBtn}
                onPress={() => updateQuantity(Number(getQuantity()) + 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={TEXT} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.helper}>
          {t("asset.assetPhotos", { count: imageCount })}
        </Text>

        <View style={styles.vehiclePreviewGrid}>
          {otherPreviewSlots.map((slot) => {
            const isOtherSlot = slot.key === "other";
            const image = isOtherSlot
              ? otherPhotos[0] || null
              : draft.images[slot.key];

            const imageUri = image?.uri || image?.url;
            const imageKey = imageUri
              ? getImageKey(slot.key, imageUri)
              : slot.key;
            const isImageLoading = imageUri
              ? imageLoadingMap[imageKey] !== false
              : false;
            const extraCount = isOtherSlot
              ? Math.max(otherPhotos.length - 1, 0)
              : 0;

            return (
              <TouchableOpacity
                key={slot.key}
                style={[
                  styles.vehiclePreviewItem,
                  { width: previewSize, height: previewSize + 18 },
                ]}
                onPress={() => {
                  if (!isOtherSlot && imageUri) {
                    onPreviewImage(imageUri);
                    return;
                  }

                  // Any existing "other" photos (1 or more): open the gallery,
                  // which lets the user view individual photos AND add more.
                  if (isOtherSlot && otherPhotos.length > 0) {
                    setOtherPhotosOpen(true);
                    return;
                  }

                  openOtherPhotoCamera(slot.key);
                }}
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

                      {isOtherSlot && extraCount > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>
                            +{extraCount}
                          </Text>
                        </View>
                      )}

                      {!isOtherSlot && (
                        <TouchableOpacity
                          style={styles.removeBadge}
                          onPress={(event) => {
                            event.stopPropagation();
                            removeSingleSlotImage(
                              slot.key as "main" | "details" | "brand",
                            );
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.removeBadgeText}>✕</Text>
                        </TouchableOpacity>
                      )}

                      {isOtherSlot && (
                        <View style={styles.otherAddBadge}>
                          <Ionicons name="add" size={14} color="#ffffff" />
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.vehiclePlaceholderContent}>
                      <Ionicons
                        name={slot.icon as any}
                        size={20}
                        color="#767B91"
                      />
                      <Ionicons name="add-circle" size={13} color={ACC} />
                    </View>
                  )}
                </View>

                <Text style={styles.vehiclePreviewLabel} numberOfLines={1}>
                  {slot.key === "main"
                    ? t("asset.mainPhoto", {
                        defaultValue: "Main",
                      })
                    : t(slot.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.addDetailsBtn}
          onPress={() => setDetailsExpanded((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={
              detailsExpanded ? "remove-circle-outline" : "add-circle-outline"
            }
            size={18}
            color={ACC}
          />

          <Text style={styles.addDetailsText}>
            {detailsExpanded
              ? t("asset.hideDetails")
              : t("asset.addAssetDetails")}
          </Text>
        </TouchableOpacity>

        {locationDropdownOpen && (
          <View style={styles.assetTypeDropdownMenuFull}>
            {projectAssetLocations.length === 0 ? (
              <View style={styles.addTypeDropdownOption}>
                <Text style={styles.addTypeDropdownOptionText}>
                  No locations available
                </Text>
              </View>
            ) : (
              projectAssetLocations.map((location) => {
                const isEditing = editingLocation === location.value;

                const isSelected = selectedLocation === location.value;

                return (
                  <View
                    key={`${location.source}-${location.value}`}
                    style={[
                      styles.addTypeDropdownOption,

                      isEditing && styles.addTypeDropdownOptionEditing,
                    ]}
                  >
                    {isEditing ? (
                      <>
                        <TextInput
                          value={editingLocationText}
                          onChangeText={setEditingLocationText}
                          style={styles.assetTypeEditInput}
                          autoFocus
                          selectTextOnFocus
                          placeholder="Edit location"
                          placeholderTextColor="#767B91"
                          returnKeyType="done"
                          onSubmitEditing={saveEditedLocation}
                        />

                        <TouchableOpacity
                          style={styles.assetTypeMiniAction}
                          onPress={saveEditedLocation}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="checkmark" size={18} color={ACC} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.assetTypeMiniAction}
                          onPress={() => {
                            setEditingLocation(null);
                            setEditingLocationText("");
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="close" size={18} color="#FF4444" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.assetTypeOptionMain}
                          onPress={() => {
                            setDraft(
                              (prev) =>
                                ({
                                  ...prev,

                                  assetType: "other",

                                  /*
                                   * Selecting the asset's ORIGINAL
                                   * imported location means there
                                   * is no user override.
                                   */
                                  newAssetLocation:
                                    location.source === "normalizedData" &&
                                    location.value === normalizedAssetLocation
                                      ? null
                                      : location.value,

                                  rawData: cleanAssetRawData(
                                    (prev as any).rawData,
                                  ),
                                }) as any,
                            );

                            setLocationDropdownOpen(false);
                            setAddLocationModalOpen(false);
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.addTypeDropdownOptionText,

                                isSelected &&
                                  styles.addTypeDropdownOptionTextSelected,
                              ]}
                              numberOfLines={2}
                            >
                              {location.value}
                            </Text>

                            <Text
                              style={{
                                fontSize: 10,
                                opacity: 0.55,
                                marginTop: 2,
                              }}
                            >
                              {location.source === "normalizedData"
                                ? "Imported location"
                                : "Custom location"}
                            </Text>
                          </View>

                          {isSelected && (
                            <Ionicons name="checkmark" size={16} color={ACC} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.assetTypeMiniAction}
                          onPress={() => {
                            setEditingLocation(location.value);

                            setEditingLocationText(location.value);
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={16}
                            color={ACC}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>

      <Modal
        visible={otherPhotosOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherPhotosOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOtherPhotosOpen(false)}>
          <View style={styles.vehicleSelectOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.vehicleSelectCard,
                  { maxHeight: Math.min(height * 0.65, 460) },
                ]}
              >
                <View style={styles.vehicleSelectHeader}>
                  <Text style={styles.vehicleSelectTitle}>
                    {t("asset.otherPhotos")}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setOtherPhotosOpen(false)}
                    style={styles.vehicleSelectCloseBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={18} color="#2b2a4b" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.otherGrid}
                  showsVerticalScrollIndicator
                >
                  {otherPhotos.map((image: AssetMediaInput, index) => {
                    const imageUri = image.uri || image.url;
                    if (!imageUri) return null;

                    const imageKey = getImageKey("other", imageUri, index);
                    const isImageLoading = imageLoadingMap[imageKey] !== false;

                    return (
                      <TouchableOpacity
                        key={imageKey}
                        style={[
                          styles.previewItem,
                          { width: previewSize, height: previewSize },
                        ]}
                        onPress={() => {
                          setOtherPhotosOpen(false);

                          setTimeout(() => {
                            setSelectedImageUri(imageUri);
                          }, 100);
                        }}
                        activeOpacity={0.9}
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
                          onPress={(event) => {
                            event.stopPropagation();
                            removeOtherImage(index);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.removeBadgeText}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={[
                      styles.addOtherTile,
                      { width: previewSize, height: previewSize },
                    ]}
                    onPress={() => openOtherPhotoCamera("other")}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add-circle-outline" size={26} color={ACC} />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* <Modal
        visible={Boolean(selectedImageUri)}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {selectedImageUri && (
            <Image
              source={{ uri: selectedImageUri }}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="contain"
            />
          )}

          <TouchableOpacity
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => setSelectedImageUri(null)}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Modal> */}

      <Modal
        visible={Boolean(selectedImageUri)}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View style={{ flex: 1, backgroundColor: "#000000" }}>
          {selectedImageUri && (
            <ImageViewer
              imageUrls={[
                {
                  url: selectedImageUri,
                },
              ]}
              index={0}
              enableSwipeDown
              enablePreload
              saveToLocalByLongPress={false}
              backgroundColor="#000000"
              onSwipeDown={() => setSelectedImageUri(null)}
              onCancel={() => setSelectedImageUri(null)}
              loadingRender={() => (
                <ActivityIndicator size="large" color="#ffffff" />
              )}
              renderIndicator={() => <View />}
            />
          )}

          <TouchableOpacity
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(0,0,0,0.65)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 100,
              elevation: 20,
            }}
            onPress={() => setSelectedImageUri(null)}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={addLocationModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setAddLocationModalOpen(false);
          setNewLocationText("");
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setAddLocationModalOpen(false);
            setNewLocationText("");
          }}
        >
          <View style={styles.vehicleSelectOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.addTypeModalCard}>
                <View style={styles.vehicleSelectHeader}>
                  <Text style={styles.vehicleSelectTitle}>
                    {t("asset.addAssetType")}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setAddLocationModalOpen(false);
                      setNewLocationText("");
                    }}
                    style={styles.vehicleSelectCloseBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={18} color="#2b2b2d" />
                  </TouchableOpacity>
                </View>

                <View style={{ padding: 14 }}>
                  <Text style={styles.fieldLabel}>Location</Text>

                  <TextInput
                    placeholder="e.g. Main Building / Floor 3 / HR"
                    placeholderTextColor="#767B91"
                    value={newLocationText}
                    onChangeText={setNewLocationText}
                    style={[
                      styles.input,
                      styles.compactInput,
                      { marginBottom: 16 },
                    ]}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveNewLocation}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => {
                        setAddLocationModalOpen(false);
                        setNewLocationText("");
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.secondaryText}>
                        {t("common.cancel")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={saveNewLocation}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryText}> {t("common.add")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
