import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AssetDraft } from "../utils/types";
import { formStyles as styles, ACC, TEXT } from "./formStyles";

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
    rawData: cleanAssetRawData((draft as any).rawData),
  } as any;
}

export default function OtherAssetForm({
  draft,
  setDraft,
  subAssetTypes = [],
  onRenameSubAssetType,
  showSnackbar,
}: OtherAssetFormProps) {
  const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);
  const [addTypeModalOpen, setAddTypeModalOpen] = useState(false);
  const [newSubAssetTypeText, setNewSubAssetTypeText] = useState("");

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

  return (
    <>
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