import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AssetDraft } from "../utils/types";
import { formStyles as styles, ACC, TEXT } from "./formStyles";

type OtherAssetFormProps = {
  draft: AssetDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssetDraft>>;

  projectAssetTypes: string[];
  subAssetType: string;

  assetTypeDropdownOpen: boolean;
  setAssetTypeDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;

  setAddTypeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNewSubAssetTypeText: React.Dispatch<React.SetStateAction<string>>;

  editingSubAssetType: string | null;
  setEditingSubAssetType: React.Dispatch<React.SetStateAction<string | null>>;

  editingSubAssetTypeText: string;
  setEditingSubAssetTypeText: React.Dispatch<React.SetStateAction<string>>;

  saveEditedSubAssetType: () => Promise<void> | void;

  getQuantity: () => string;
  updateQuantity: (nextValue: number | string) => void;

  cleanAssetRawData: (
    rawData?: Record<string, any> | null
  ) => Record<string, any>;

  formatSubAssetTypeLabel: (value: string) => string;
};

export default function OtherAssetForm({
  draft,
  setDraft,
  projectAssetTypes,
  subAssetType,
  assetTypeDropdownOpen,
  setAssetTypeDropdownOpen,
  setAddTypeModalOpen,
  setNewSubAssetTypeText,
  editingSubAssetType,
  setEditingSubAssetType,
  editingSubAssetTypeText,
  setEditingSubAssetTypeText,
  saveEditedSubAssetType,
  getQuantity,
  updateQuantity,
  cleanAssetRawData,
  formatSubAssetTypeLabel,
}: OtherAssetFormProps) {
  return (
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
                        <Ionicons name="pencil-outline" size={16} color={ACC} />
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
  );
}