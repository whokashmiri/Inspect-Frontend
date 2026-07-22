
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

type OtherPhotoSlot = "details" | "brand" | "other";



const otherPreviewSlots = [
  { key: "details", label: "Details", icon: "document-text-outline" },
  { key: "brand", label: "Brand", icon: "pricetag-outline" },
  { key: "other", label: "Other", icon: "images-outline" },
] as const;

function getImageKey(slot: string, uri: string, index = 0) {
  return `${slot}-${index}-${uri}`;
}

type OtherAssetFormProps = {
  draft: AssetDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssetDraft>>;

  subAssetTypes?: string[];

  onRenameSubAssetType?: (
    oldSubAssetType: string,
    newSubAssetType: string
  ) => Promise<void> | void;

  showSnackbar?: (
    message: string,
    type?: "success" | "error" | "info"
  ) => void;

  previewSize: number;
  imageLoadingMap: Record<string, boolean>;
  setImageLoading: (key: string, loading: boolean) => void;
  height: number;

  openOtherPhotoCamera: (slot: OtherPhotoSlot) => void;
};

const cleanAssetRawData = (rawData?: Record<string, any> | null) => {
  const source =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? { ...rawData }
      : {};

  delete source.quantity;
  delete source.subAssetType;
  delete source.customAssetType;

  return source;
};

const formatSubAssetTypeLabel = (value: string) => {
  const text = String(value || "").trim();

  if (!text) return "";

  return text
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export function getOtherAssetQuantity(draft: AssetDraft) {
  const rawQuantity =
    (draft as any).quantity ??
    (draft as any).rawData?.quantity ??
    1;

  const quantity = Number(rawQuantity);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return "1";
  }

  return String(Math.floor(quantity));
}

export function getOtherSubAssetType(draft: AssetDraft) {
  return String((draft as any).subAssetType || "")
    .trim()
    .toLowerCase();
}

export function cleanOtherAssetDraft(draft: AssetDraft): AssetDraft | null {
  const finalQuantity = Number(getOtherAssetQuantity(draft));
  const finalSubAssetType = getOtherSubAssetType(draft);

  if (!finalSubAssetType) {
    return null;
  }

  return {
    ...draft,
    assetType: "other",
    quantity: Math.max(1, finalQuantity),
    subAssetType: finalSubAssetType,
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
  subAssetTypes = [],
  onRenameSubAssetType,
  showSnackbar,
  previewSize,
  imageLoadingMap,
  setImageLoading,
  height,
  openOtherPhotoCamera,
}: OtherAssetFormProps) {
  const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);
  const [addTypeModalOpen, setAddTypeModalOpen] = useState(false);
  const [newSubAssetTypeText, setNewSubAssetTypeText] = useState("");
  const [otherPhotosOpen, setOtherPhotosOpen] = useState(false);

  const [editingSubAssetType, setEditingSubAssetType] = useState<string | null>(
    null
  );
  const [editingSubAssetTypeText, setEditingSubAssetTypeText] = useState("");

  const subAssetType = getOtherSubAssetType(draft);

  const projectAssetTypes = useMemo(() => {
    const unique = new Map<string, string>();

    subAssetTypes.forEach((item) => {
      const value = String(item || "").trim().toLowerCase();
      if (value) unique.set(value, value);
    });

    if (subAssetType) {
      unique.set(subAssetType, subAssetType);
    }

    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [subAssetTypes, subAssetType]);

  const getQuantity = () => getOtherAssetQuantity(draft);

  const updateQuantity = (nextValue: number | string) => {
    const cleaned =
      typeof nextValue === "number"
        ? nextValue
        : Number(String(nextValue).replace(/[^0-9]/g, "") || 1);

    const quantity = Math.max(1, Math.floor(cleaned));

    setDraft((prev) => ({
      ...prev,
      assetType: "other",
      quantity,
      rawData: cleanAssetRawData((prev as any).rawData),
    } as any));
  };

  const saveNewSubAssetType = () => {
    const value = newSubAssetTypeText.trim().toLowerCase();

    if (!value) {
      showSnackbar?.("Please enter asset type", "error");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      assetType: "other",
      subAssetType: value,
      rawData: cleanAssetRawData((prev as any).rawData),
    } as any));

    setNewSubAssetTypeText("");
    setAddTypeModalOpen(false);
    setAssetTypeDropdownOpen(false);
  };

  const saveEditedSubAssetType = async () => {
    const oldValue = String(editingSubAssetType || "").trim().toLowerCase();
    const newValue = editingSubAssetTypeText.trim().toLowerCase();

    if (!oldValue) return;

    if (!newValue) {
      showSnackbar?.("Please enter asset type", "error");
      return;
    }

    try {
      if (oldValue !== newValue && onRenameSubAssetType) {
        await onRenameSubAssetType(oldValue, newValue);
      }

      setDraft((prev) => ({
        ...prev,
        assetType: "other",
        subAssetType:
          String((prev as any).subAssetType || "").trim().toLowerCase() ===
          oldValue
            ? newValue
            : (prev as any).subAssetType,
        rawData: cleanAssetRawData((prev as any).rawData),
      } as any));

      setEditingSubAssetType(null);
      setEditingSubAssetTypeText("");
      setAssetTypeDropdownOpen(false);

      showSnackbar?.("Asset type updated", "success");
    } catch (error: any) {
      showSnackbar?.(error?.message || "Failed to update asset type", "error");
    }
  };

  const otherPhotos = draft.images.other || [];

  const imageCount =
    Number(Boolean(draft.images.details)) +
    Number(Boolean(draft.images.brand)) +
    otherPhotos.length;

  const removeSingleSlotImage = (slot: "details" | "brand") => {
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
      <Text style={styles.helper}>Asset photos {imageCount}</Text>

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
                        <Text style={styles.countBadgeText}>+{extraCount}</Text>
                      </View>
                    )}

                    {!isOtherSlot && (
                      <TouchableOpacity
                        style={styles.removeBadge}
                        onPress={(event) => {
                          event.stopPropagation();
                          removeSingleSlotImage(slot.key as "details" | "brand");
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
                {slot.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.otherAssetControls}>
        <View style={styles.assetTypeQuantityRow}>
          <View style={styles.assetTypeFieldWrap}>
            <Text style={styles.fieldLabel}>Asset type</Text>

            <View style={styles.assetTypeInputLikeWrap}>
              <TouchableOpacity
                style={styles.assetTypeInputChoose}
                onPress={() => {
                  setAssetTypeDropdownOpen((prev) => !prev);
                  setAddTypeModalOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.assetTypeInputText} numberOfLines={1}>
                  {subAssetType
                    ? formatSubAssetTypeLabel(subAssetType)
                    : "Choose"}
                </Text>

                <Ionicons
                  name={assetTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={TEXT}
                />
              </TouchableOpacity>

              <View style={styles.assetTypeInputDivider} />

              <TouchableOpacity
                style={styles.assetTypeInputPlus}
                onPress={() => {
                  setNewSubAssetTypeText("");
                  setAddTypeModalOpen(true);
                  setAssetTypeDropdownOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={TEXT} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.quantityFieldWrap}>
            <Text style={styles.fieldLabel}>Quantity</Text>

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

        {assetTypeDropdownOpen && (
          <View style={styles.assetTypeDropdownMenuFull}>
            {projectAssetTypes.length === 0 ? (
              <View style={styles.addTypeDropdownOption}>
                <Text style={styles.addTypeDropdownOptionText}>
                  No sub asset types yet
                </Text>
              </View>
            ) : (
              projectAssetTypes.map((type) => {
                const isEditing = editingSubAssetType === type;
                const isSelected = subAssetType === type;

                return (
                  <View
                    key={type}
                    style={[
                      styles.addTypeDropdownOption,
                      isEditing && styles.addTypeDropdownOptionEditing,
                    ]}
                  >
                    {isEditing ? (
                      <>
                        <TextInput
                          value={editingSubAssetTypeText}
                          onChangeText={setEditingSubAssetTypeText}
                          style={styles.assetTypeEditInput}
                          autoFocus
                          selectTextOnFocus
                          placeholder="Edit asset type"
                          placeholderTextColor="#767B91"
                        />

                        <TouchableOpacity
                          style={styles.assetTypeMiniAction}
                          onPress={saveEditedSubAssetType}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="checkmark" size={18} color={ACC} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.assetTypeMiniAction}
                          onPress={() => {
                            setEditingSubAssetType(null);
                            setEditingSubAssetTypeText("");
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
                            setDraft((prev) =>
                              ({
                                ...prev,
                                assetType: "other",
                                subAssetType: type,
                                rawData: cleanAssetRawData(
                                  (prev as any).rawData
                                ),
                              } as any)
                            );

                            setAssetTypeDropdownOpen(false);
                            setAddTypeModalOpen(false);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.addTypeDropdownOptionText,
                              isSelected &&
                                styles.addTypeDropdownOptionTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {formatSubAssetTypeLabel(type)}
                          </Text>

                          {isSelected && (
                            <Ionicons name="checkmark" size={16} color={ACC} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.assetTypeMiniAction}
                          onPress={() => {
                            setEditingSubAssetType(type);
                            setEditingSubAssetTypeText(type);
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
                  <Text style={styles.vehicleSelectTitle}>Other Photos</Text>

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
                      <View
                        key={imageKey}
                        style={[
                          styles.previewItem,
                          { width: previewSize, height: previewSize },
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
                          onPress={() => removeOtherImage(index)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.removeBadgeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
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
                    <Ionicons
                      name="add-circle-outline"
                      size={26}
                      color={ACC}
                    />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={addTypeModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setAddTypeModalOpen(false);
          setNewSubAssetTypeText("");
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setAddTypeModalOpen(false);
            setNewSubAssetTypeText("");
          }}
        >
          <View style={styles.vehicleSelectOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.addTypeModalCard}>
                <View style={styles.vehicleSelectHeader}>
                  <Text style={styles.vehicleSelectTitle}>Add asset type</Text>

                  <TouchableOpacity
                    onPress={() => {
                      setAddTypeModalOpen(false);
                      setNewSubAssetTypeText("");
                    }}
                    style={styles.vehicleSelectCloseBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={18} color="#2b2b2d" />
                  </TouchableOpacity>
                </View>

                <View style={{ padding: 14 }}>
                  <Text style={styles.fieldLabel}>Asset type</Text>

                  <TextInput
                    placeholder="e.g. Sofa, Chair, TV"
                    placeholderTextColor="#767B91"
                    value={newSubAssetTypeText}
                    onChangeText={setNewSubAssetTypeText}
                    style={[
                      styles.input,
                      styles.compactInput,
                      { marginBottom: 16 },
                    ]}
                    autoFocus
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={saveNewSubAssetType}
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
                        setAddTypeModalOpen(false);
                        setNewSubAssetTypeText("");
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.secondaryText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={saveNewSubAssetType}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryText}>Add</Text>
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