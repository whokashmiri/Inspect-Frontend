//OtherAssetForm.tsx
import React, { useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const PINNED_LOCATIONS_KEY = "asset_pinned_locations";

const PINNED_EMPLOYERS_KEY = "asset_pinned_employers";

function getImageKey(slot: string, uri: string, index = 0) {
  return `${slot}-${index}-${uri}`;
}

type OtherAssetFormProps = {
  draft: AssetDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssetDraft>>;

  detailsExpanded: boolean;
  setDetailsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  employers?: string[];

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
  // renderBeforeDetailsButton?: () => React.ReactNode;
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
    client_code: (draft as any).client_code?.trim() || null,

    employer: (draft as any).employer?.trim() || null,
    code: draft.code?.trim() || undefined,

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
  employers = [],
  showSnackbar,
  previewSize,
  imageLoadingMap,
  setImageLoading,
  height,
  openOtherPhotoCamera,
  onPreviewImage,
  // renderBeforeDetailsButton,
}: OtherAssetFormProps) {
  const { t, i18n } = useTranslation();
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState("");

  const [employerDropdownOpen, setEmployerDropdownOpen] = useState(false);
  const [employerSearchText, setEmployerSearchText] = useState("");

  const [editingEmployer, setEditingEmployer] = useState<string | null>(null);
  const [editingEmployerText, setEditingEmployerText] = useState("");

  const [newEmployerText, setNewEmployerText] = useState("");

  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);

  const [addEmployerModalOpen, setAddEmployerModalOpen] = useState(false);

  const [pinnedLocations, setPinnedLocations] = useState<string[]>([]);

  const [pinnedEmployers, setPinnedEmployers] = useState<string[]>([]);

  const [newLocationText, setNewLocationText] = useState("");
  const [otherPhotosOpen, setOtherPhotosOpen] = useState(false);

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const [editingLocation, setEditingLocation] = useState<string | null>(null);

  const [editingLocationText, setEditingLocationText] = useState("");

  const normalizedAssetLocation = getNormalizedAssetLocation(draft);

  const newAssetLocation = getNewAssetLocation(draft);

  const selectedLocation = getEffectiveAssetLocation(draft);
  const selectedEmployer = String(
    (draft as any).employer ??
      (draft as any).normalizedData?.employer ??
      (draft as any).rawData?.employer ??
      "",
  ).trim();
  const otherPreviewSlots = [
    { key: "main", label: "asset.mainPhoto", icon: "document-text-outline" },
    { key: "details", label: "asset.details", icon: "document-text-outline" },
    { key: "brand", label: "asset.brand", icon: "pricetag-outline" },
    { key: "other", label: "asset.typeOther", icon: "images-outline" },
  ] as const;

  useEffect(() => {
    const loadPins = async () => {
      try {
        const [savedLocations, savedEmployers] = await Promise.all([
          AsyncStorage.getItem(PINNED_LOCATIONS_KEY),

          AsyncStorage.getItem(PINNED_EMPLOYERS_KEY),
        ]);

        setPinnedLocations(savedLocations ? JSON.parse(savedLocations) : []);

        setPinnedEmployers(savedEmployers ? JSON.parse(savedEmployers) : []);
      } catch (error) {
        console.warn("Could not load pinned asset values", error);
      }
    };

    void loadPins();
  }, []);

  const togglePinnedLocation = async (value: string) => {
    const cleanValue = value.trim();

    if (!cleanValue) return;

    const exists = pinnedLocations.includes(cleanValue);

    const next = exists
      ? pinnedLocations.filter((item) => item !== cleanValue)
      : [cleanValue, ...pinnedLocations];

    setPinnedLocations(next);

    await AsyncStorage.setItem(PINNED_LOCATIONS_KEY, JSON.stringify(next));
  };

  const togglePinnedEmployer = async (value: string) => {
    const cleanValue = value.trim();

    if (!cleanValue) return;

    const exists = pinnedEmployers.includes(cleanValue);

    const next = exists
      ? pinnedEmployers.filter((item) => item !== cleanValue)
      : [cleanValue, ...pinnedEmployers];

    setPinnedEmployers(next);

    await AsyncStorage.setItem(PINNED_EMPLOYERS_KEY, JSON.stringify(next));
  };
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

    addLocation(normalizedAssetLocation, "normalizedData");

    addLocation(newAssetLocation, "newAssetLocation");

    return Array.from(unique.values()).sort((a, b) => {
      const aPinned = pinnedLocations.includes(a.value);

      const bPinned = pinnedLocations.includes(b.value);

      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      return a.value.localeCompare(b.value);
    });
  }, [
    assetLocations,
    normalizedAssetLocation,
    newAssetLocation,
    pinnedLocations,
  ]);

  const filteredProjectAssetLocations = useMemo(() => {
    const search = locationSearchText.trim().toLocaleLowerCase();

    if (!search) {
      return projectAssetLocations;
    }

    return projectAssetLocations.filter((location) =>
      location.value.toLocaleLowerCase().includes(search),
    );
  }, [projectAssetLocations, locationSearchText]);

  const projectEmployers = useMemo(() => {
    const unique = new Map<string, string>();

    const addEmployer = (value?: string | null) => {
      const text = String(value || "").trim();

      if (!text) return;

      const key = text.toLocaleLowerCase();

      if (!unique.has(key)) {
        unique.set(key, text);
      }
    };

    employers.forEach(addEmployer);

    addEmployer(selectedEmployer);

    return Array.from(unique.values()).sort((a, b) => {
      const aPinned = pinnedEmployers.includes(a);

      const bPinned = pinnedEmployers.includes(b);

      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      return a.localeCompare(b);
    });
  }, [employers, selectedEmployer, pinnedEmployers]);

  const filteredProjectEmployers = useMemo(() => {
    const search = employerSearchText.trim().toLocaleLowerCase();

    if (!search) {
      return projectEmployers;
    }

    return projectEmployers.filter((employer) =>
      employer.toLocaleLowerCase().includes(search),
    );
  }, [projectEmployers, employerSearchText]);
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
  const selectEmployer = (value: string) => {
    setDraft(
      (prev) =>
        ({
          ...prev,
          employer: value,
        }) as any,
    );

    setEmployerSearchText("");
    setEmployerDropdownOpen(false);
    Keyboard.dismiss();
  };

  const saveNewEmployer = () => {
    const value = newEmployerText.trim();

    if (!value) {
      showSnackbar?.("Enter an employer", "error");

      return;
    }

    setDraft(
      (prev) =>
        ({
          ...prev,
          employer: value,
        }) as any,
    );

    setNewEmployerText("");

    setAddEmployerModalOpen(false);

    setEmployerDropdownOpen(false);

    Keyboard.dismiss();

    showSnackbar?.("Employer added", "success");
  };
  const saveEditedEmployer = () => {
    const value = editingEmployerText.trim();

    if (!value) {
      showSnackbar?.("Enter an employer", "error");
      return;
    }

    setDraft(
      (prev) =>
        ({
          ...prev,
          employer: value,
        }) as any,
    );

    setEditingEmployer(null);
    setEditingEmployerText("");
    setEmployerDropdownOpen(false);

    showSnackbar?.("Employer updated", "success");
  };

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
        <View style={{ width: "100%" }}>
          <Text style={styles.fieldLabel}>{t("asset.location")}</Text>

          <View style={styles.assetTypeInputLikeWrap}>
            <TouchableOpacity
              style={styles.assetTypeInputChoose}
              onPress={() => {
                setLocationDropdownOpen((prev) => !prev);
                setEmployerDropdownOpen(false);
                setEmployerSearchText("");
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
                setLocationSearchText("");
                setAddLocationModalOpen(true);
                setLocationDropdownOpen(false);
                setEmployerDropdownOpen(false);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={TEXT} />
            </TouchableOpacity>
          </View>

          {locationDropdownOpen && (
            <View style={styles.assetTypeDropdownMenuFull}>
              {/* Search row */}
              <View style={styles.locationSearchRow}>
                <Ionicons name="search-outline" size={17} color="#767B91" />

                <TextInput
                  value={locationSearchText}
                  onChangeText={setLocationSearchText}
                  placeholder="Search location"
                  placeholderTextColor="#767B91"
                  style={styles.locationSearchInput}
                  autoCorrect={false}
                  returnKeyType="search"
                  keyboardType="default"
                />

                {!!locationSearchText && (
                  <TouchableOpacity
                    style={styles.locationSearchClearBtn}
                    onPress={() => setLocationSearchText("")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={18} color="#767B91" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={styles.locationDropdownScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {filteredProjectAssetLocations.length === 0 ? (
                  <View style={styles.locationEmptyRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#767B91"
                    />

                    <Text style={styles.locationEmptyText}>
                      {locationSearchText.trim()
                        ? "No matching locations"
                        : "No locations available"}
                    </Text>
                  </View>
                ) : (
                  filteredProjectAssetLocations.map((location) => {
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
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={ACC}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.assetTypeMiniAction}
                              onPress={() => {
                                setEditingLocation(null);
                                setEditingLocationText("");
                              }}
                              activeOpacity={0.85}
                            >
                              <Ionicons
                                name="close"
                                size={18}
                                color="#FF4444"
                              />
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

                                      newAssetLocation:
                                        location.source === "normalizedData" &&
                                        location.value ===
                                          normalizedAssetLocation
                                          ? null
                                          : location.value,

                                      rawData: cleanAssetRawData(
                                        (prev as any).rawData,
                                      ),
                                    }) as any,
                                );

                                setLocationSearchText("");
                                setLocationDropdownOpen(false);
                                setAddLocationModalOpen(false);

                                Keyboard.dismiss();
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
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color={ACC}
                                />
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.assetTypeMiniAction}
                              onPress={() => {
                                void togglePinnedLocation(location.value);
                              }}
                              activeOpacity={0.85}
                            >
                              <Ionicons
                                name={
                                  pinnedLocations.includes(location.value)
                                    ? "star"
                                    : "star-outline"
                                }
                                size={16}
                                color={ACC}
                              />
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
              </ScrollView>
            </View>
          )}
        </View>

        <View
          style={{
            width: "100%",
            marginTop: 1,
          }}
        >
          <Text style={styles.fieldLabel}>{t("asset.employer")}</Text>

          <View style={styles.assetTypeInputLikeWrap}>
            <TouchableOpacity
              style={styles.assetTypeInputChoose}
              onPress={() => {
                setEmployerDropdownOpen((prev) => !prev);

                setLocationDropdownOpen(false);
                setLocationSearchText("");
                setAddLocationModalOpen(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.assetTypeInputText} numberOfLines={1}>
                {selectedEmployer || t("common.choose")}
              </Text>

              <Ionicons
                name={employerDropdownOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={TEXT}
              />
            </TouchableOpacity>

            <View style={styles.assetTypeInputDivider} />

            <TouchableOpacity
              style={styles.assetTypeInputPlus}
              onPress={() => {
                Keyboard.dismiss();

                setNewEmployerText("");

                setAddEmployerModalOpen(true);

                setEmployerDropdownOpen(false);

                setLocationDropdownOpen(false);

                setEmployerSearchText("");
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={TEXT} />
            </TouchableOpacity>
          </View>
          {employerDropdownOpen && (
            <View style={styles.assetTypeDropdownMenuFull}>
              <View style={styles.locationSearchRow}>
                <Ionicons name="search-outline" size={17} color="#767B91" />

                <TextInput
                  value={employerSearchText}
                  onChangeText={setEmployerSearchText}
                  placeholder={t("asset.searchOrAddEmployer")}
                  placeholderTextColor="#767B91"
                  style={styles.locationSearchInput}
                  autoCorrect={false}
                />

                {!!employerSearchText && (
                  <TouchableOpacity
                    style={styles.locationSearchClearBtn}
                    onPress={() => setEmployerSearchText("")}
                  >
                    <Ionicons name="close-circle" size={18} color="#767B91" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={styles.locationDropdownScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {filteredProjectEmployers.map((employer) => {
                  const isEditing = editingEmployer === employer;

                  const isSelected = selectedEmployer === employer;

                  return (
                    <View
                      key={employer}
                      style={[
                        styles.addTypeDropdownOption,
                        isEditing && styles.addTypeDropdownOptionEditing,
                      ]}
                    >
                      {isEditing ? (
                        <>
                          <TextInput
                            value={editingEmployerText}
                            onChangeText={setEditingEmployerText}
                            style={styles.assetTypeEditInput}
                            autoFocus
                            selectTextOnFocus
                            placeholder="Edit employer"
                            placeholderTextColor="#767B91"
                            onSubmitEditing={saveEditedEmployer}
                          />

                          <TouchableOpacity
                            style={styles.assetTypeMiniAction}
                            onPress={saveEditedEmployer}
                          >
                            <Ionicons name="checkmark" size={18} color={ACC} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.assetTypeMiniAction}
                            onPress={() => {
                              setEditingEmployer(null);
                              setEditingEmployerText("");
                            }}
                          >
                            <Ionicons name="close" size={18} color="#FF4444" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.assetTypeOptionMain}
                            onPress={() => selectEmployer(employer)}
                          >
                            <Text
                              style={[
                                styles.addTypeDropdownOptionText,
                                isSelected &&
                                  styles.addTypeDropdownOptionTextSelected,
                              ]}
                              numberOfLines={2}
                            >
                              {employer}
                            </Text>

                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color={ACC}
                              />
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.assetTypeMiniAction}
                            onPress={() => {
                              void togglePinnedEmployer(employer);
                            }}
                            activeOpacity={0.85}
                          >
                            <Ionicons
                              name={
                                pinnedEmployers.includes(employer)
                                  ? "star"
                                  : "star-outline"
                              }
                              size={16}
                              color={ACC}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.assetTypeMiniAction}
                            onPress={() => {
                              setEditingEmployer(employer);
                              setEditingEmployerText(employer);
                            }}
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
                })}

                {!!employerSearchText.trim() &&
                  !projectEmployers.some(
                    (item) =>
                      item.toLocaleLowerCase() ===
                      employerSearchText.trim().toLocaleLowerCase(),
                  ) && (
                    <TouchableOpacity
                      style={styles.addTypeDropdownOption}
                      onPress={() => {
                        setNewEmployerText(employerSearchText);

                        setDraft(
                          (prev) =>
                            ({
                              ...prev,
                              employer: employerSearchText.trim(),
                            }) as any,
                        );

                        setEmployerSearchText("");
                        setEmployerDropdownOpen(false);
                      }}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={ACC}
                      />

                      <Text style={styles.addTypeDropdownOptionText}>
                        Add "{employerSearchText.trim()}"
                      </Text>
                    </TouchableOpacity>
                  )}
              </ScrollView>
            </View>
          )}
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

        {/* {renderBeforeDetailsButton?.()} */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          <TouchableOpacity
            style={[
              styles.addDetailsBtn,
              {
                flex: 1,
                marginBottom: 0,
              },
            ]}
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

          <View
            style={{
              width: 150,
              transform: [{ translateY: -9 }],
            }}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  fontSize: 10,
                  marginBottom: 3,
                },
              ]}
            >
              {t("asset.quantity")}
            </Text>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityIconBtn}
                onPress={() => updateQuantity(Number(getQuantity()) - 1)}
              >
                <Ionicons name="remove" size={15} color={TEXT} />
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
              >
                <Ionicons name="add" size={15} color={TEXT} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                  <Text style={styles.fieldLabel}>{t("asset.location")}</Text>

                  <TextInput
                    placeholder={t("asset.locationExample")}
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

      <Modal
        visible={addEmployerModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setAddEmployerModalOpen(false);
          setNewEmployerText("");
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setAddEmployerModalOpen(false);
            setNewEmployerText("");
          }}
        >
          <View style={styles.vehicleSelectOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.addTypeModalCard}>
                <View style={styles.vehicleSelectHeader}>
                  <Text style={styles.vehicleSelectTitle}>
                    {t("asset.addEmployer")}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setAddEmployerModalOpen(false);

                      setNewEmployerText("");
                    }}
                    style={styles.vehicleSelectCloseBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={18} color="#2b2b2d" />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    padding: 14,
                  }}
                >
                  <Text style={styles.fieldLabel}>{t("asset.employer")}</Text>

                  <TextInput
                    placeholder="Enter employer"
                    placeholderTextColor="#767B91"
                    value={newEmployerText}
                    onChangeText={setNewEmployerText}
                    style={[
                      styles.input,
                      styles.compactInput,
                      {
                        marginBottom: 16,
                      },
                    ]}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveNewEmployer}
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
                        setAddEmployerModalOpen(false);

                        setNewEmployerText("");
                      }}
                    >
                      <Text style={styles.secondaryText}>
                        {t("common.cancel")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={saveNewEmployer}
                    >
                      <Text style={styles.primaryText}>{t("common.add")}</Text>
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
