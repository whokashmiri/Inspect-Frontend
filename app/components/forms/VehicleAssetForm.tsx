import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { AssetDraft } from "../utils/types";
import { formStyles as styles, ACC, TEXT } from "./formStyles";

type VehicleAssetFormProps = {
  draft: AssetDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssetDraft>>;

  brandDropdownOpen: boolean;
  setBrandDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;

  modelDropdownOpen: boolean;
  setModelDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;

  sortedVehicleBrands: string[];
  sortedVehicleModels: string[];

  favoriteBrands: string[];
  selectedBrandFavoriteModels: string[];

  selectedBrand: string;

  selectVehicleBrand: (brand: string) => void;
  selectVehicleModel: (model: string) => void;

  toggleFavoriteBrand: (brand: string) => Promise<void> | void;
  toggleFavoriteModel: (brand: string, model: string) => Promise<void> | void;

  manufactureYears: string[];

  height: number;

  t: any;
};

export default function VehicleAssetForm({
  draft,
  setDraft,
  brandDropdownOpen,
  setBrandDropdownOpen,
  modelDropdownOpen,
  setModelDropdownOpen,
  sortedVehicleBrands,
  sortedVehicleModels,
  favoriteBrands,
  selectedBrandFavoriteModels,
  selectedBrand,
  selectVehicleBrand,
  selectVehicleModel,
  toggleFavoriteBrand,
  toggleFavoriteModel,
  manufactureYears,
  height,
  t,
}: VehicleAssetFormProps) {
  return (
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
          pointerEvents={brandDropdownOpen || modelDropdownOpen ? "none" : "auto"}
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
          pointerEvents={brandDropdownOpen || modelDropdownOpen ? "none" : "auto"}
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