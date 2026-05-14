import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { transactionApi } from "../../../api/api";
import AssetCameraModal from "../../components/AssetCameraModal";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const BG = "#F8F9FC";

type CheckedState = Record<string, boolean>;
type CameraMode = "photos" | "scan";

const ENVIRONMENT_OPTIONS = [
  ["mosque", "Mosque"],
  ["commercialMarket", "Commercial Market"],
  ["park", "Park"],
  ["governmentFacility", "Government Facility"],
  ["highSpeedRoad", "High-Speed Road"],
  ["otherServices", "Other Services"],
  ["educationalFacility", "Educational Facility"],
  ["securityFacility", "Security Facility"],
  ["medicalFacility", "Medical Facility"],
] as const;

export default function AssetInspection() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    transactionId?: string;
    projectId?: string;
    propertyType?: string;
  }>();

  const transactionId = params.transactionId || "";
  const projectId = params.projectId || "";
  const propertyType = params.propertyType || "Not available";

  const [saving, setSaving] = useState(false);

  const [buildingCondition, setBuildingCondition] = useState<
  "underConstruction" | "used" | "new" | "other" | ""
>("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("photos");

  const [buildingCompletion, setBuildingCompletion] = useState("");
  const [otherBuildingCondition, setOtherBuildingCondition] = useState("");

  const [checked, setChecked] = useState<CheckedState>({
    

    mosque: false,
    commercialMarket: false,
    park: false,
    governmentFacility: false,
    highSpeedRoad: false,
    otherServices: false,
    educationalFacility: false,
    securityFacility: false,
    medicalFacility: false,

    electricity: false,
    sanitaryDrainage: false,
    telephoneLine: false,
    waterMeters: false,
    electricityMeters: false,
  });

  const [electricityUnits, setElectricityUnits] = useState("");
  const [waterMetersCount, setWaterMetersCount] = useState("");
  const [electricityMetersCount, setElectricityMetersCount] = useState("");

  const [media, setMedia] = useState<any[]>([]);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedEnvironment = useMemo(() => {
    return ENVIRONMENT_OPTIONS.filter(([key]) => checked[key]).map(
      ([, label]) => label
    );
  }, [checked]);
const getBuildingStatus = () => {
  switch (buildingCondition) {
    case "underConstruction":
      return "Under Construction";
    case "used":
      return "Used";
    case "new":
      return "New";
    case "other":
      return "Other";
    default:
      return "";
  }
};

  const openCamera = () => {
    setCameraMode("photos");
    setCameraOpen(true);
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow media access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled) return;

    const selected = result.assets.map((asset, index) => {
      const isVideo = asset.type === "video";

      return {
        uri: asset.uri,
        name:
          asset.fileName ||
          `${isVideo ? "video" : "photo"}_${Date.now()}_${index}.${
            isVideo ? "mp4" : "jpg"
          }`,
        type: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        mimeType: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        mediaType: isVideo ? "video" : "image",
        size: asset.fileSize || 0,
        width: asset.width || null,
        height: asset.height || null,
        duration: asset.duration || null,
      };
    });

    setMedia((prev) => [...prev, ...selected]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCameraDone = (capturedMedia: any[]) => {
    if (cameraMode !== "photos") return;

    const mapped = capturedMedia.map((item: any, index: number) => {
      const isVideo = item.mediaType === "video";

      return {
        uri: item.path?.startsWith("file://") ? item.path : `file://${item.path}`,
        name: isVideo
          ? `video_${Date.now()}_${index}.mp4`
          : `photo_${Date.now()}_${index}.jpg`,
        type: isVideo ? "video/mp4" : "image/jpeg",
        mimeType: isVideo ? "video/mp4" : "image/jpeg",
        mediaType: isVideo ? "video" : "image",
        duration: item.duration || null,
        width: item.width || null,
        height: item.height || null,
        size: item.size || 0,
      };
    });

    setMedia((prev) => [...prev, ...mapped]);
    setCameraOpen(false);
  };

  const handleSubmit = async () => {
    if (!transactionId) {
      Alert.alert("Missing transaction", "transactionId is required.");
      return;
    }

    try {
      setSaving(true);

      await transactionApi.updateInspectionData(transactionId, {
        buildingCondition: {
          status: getBuildingStatus(),
          completionPct: buildingCompletion ? Number(buildingCompletion) : null,
          otherText: checked.other ? otherBuildingCondition : "",
        },

        surroundingEnvironment: selectedEnvironment,

        availableServices: {
          electricity: checked.electricity,
          electricityUnits: electricityUnits ? Number(electricityUnits) : null,

          sanitaryDrainage: checked.sanitaryDrainage,
          telephoneLine: checked.telephoneLine,

          waterMetersCount:
            checked.waterMeters && waterMetersCount
              ? Number(waterMetersCount)
              : null,

          electricityMetersCount:
            checked.electricityMeters && electricityMetersCount
              ? Number(electricityMetersCount)
              : null,
        },
      });

      if (media.length > 0) {
        if (!projectId) {
          Alert.alert("Missing project", "projectId is required for upload.");
          return;
        }

        await transactionApi.addMedia({
          transactionId,
          projectId,
          media,
        });
      }

      Alert.alert("Success", "Transaction inspection saved successfully.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Asset Inspection</Text>
            <Text style={styles.subtitle}>
              Capture images/videos and update inspection details.
            </Text>
          </View>
        </View>

        <Section title="Images & Videos">
          <View style={styles.mediaActions}>
            <Pressable onPress={openCamera} style={styles.mediaActionBtn}>
              <Text style={styles.mediaActionText}>Camera</Text>
            </Pressable>

            <Pressable
              onPress={pickMedia}
              style={[styles.mediaActionBtn, styles.secondaryActionBtn]}
            >
              <Text style={[styles.mediaActionText, styles.secondaryActionText]}>
                Gallery
              </Text>
            </Pressable>
          </View>

          {media.length > 0 ? (
            <View style={styles.mediaGrid}>
              {media.map((item, index) => {
                const isVideo =
                  item.mediaType === "video" || item.type?.startsWith("video");

                return (
                  <View key={`${item.uri}-${index}`} style={styles.mediaCard}>
                    {isVideo ? (
                      <View style={styles.videoBox}>
                        <Text style={styles.videoText}>VIDEO</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                    )}

                    <Pressable
                      onPress={() => removeMedia(index)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyMediaText}>
              No images or videos selected yet.
            </Text>
          )}
        </Section>

        <Section title="Property Type">
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyLabel}>Type of Real Estate : </Text>
            <Text style={styles.readOnlyValue}>{propertyType}</Text>
          </View>
        </Section>

       <Section title="Building Condition">
  <View style={styles.radioGroup}>
   <View style={styles.conditionRow}>
  <RadioRow
    label="Under Construction"
    selected={buildingCondition === "underConstruction"}
    onPress={() => setBuildingCondition("underConstruction")}
  />

  <RadioRow
    label="Used"
    selected={buildingCondition === "used"}
    onPress={() => setBuildingCondition("used")}
  />

  <RadioRow
    label="New"
    selected={buildingCondition === "new"}
    onPress={() => setBuildingCondition("new")}
  />
</View>

    
<View style={styles.otherRow}>
  <View style={{ width: 90 }}>
    <RadioRow
      label="Other"
      selected={buildingCondition === "other"}
      onPress={() => setBuildingCondition("other")}
    />
  </View>

  {buildingCondition === "other" && (
    <TextInput
      value={otherBuildingCondition}
      onChangeText={setOtherBuildingCondition}
      placeholder="Describe other condition"
      placeholderTextColor={MUTED}
      style={styles.otherInput}
    />
  )}
</View>
  </View>



 <View style={styles.completionRow}>
  <Text style={styles.completionLabel}>
    Building Completion %
  </Text>

  <TextInput
    value={buildingCompletion}
    onChangeText={setBuildingCompletion}
    placeholder="%"
    placeholderTextColor={MUTED}
    keyboardType="numeric"
    editable={buildingCondition === "underConstruction"}
    style={[
      styles.completionInputSmall,
      buildingCondition !== "underConstruction" &&
        styles.disabledInput,
    ]}
  />
</View>
</Section>

        <Section title="Surrounding Environment">
          <CheckboxGrid
            items={ENVIRONMENT_OPTIONS as any}
            checked={checked}
            toggle={toggle}
          />
        </Section>

        <Section title="Available Services">
         

          <CheckboxRow
            label="Sanitary Drainage / Sewage System"
            checked={checked.sanitaryDrainage}
            onPress={() => toggle("sanitaryDrainage")}
          />

          <CheckboxRow
            label="Telephone Line"
            checked={checked.telephoneLine}
            onPress={() => toggle("telephoneLine")}
          />
<View style={styles.electricityRow}>
  <View style={{ flex: 1 }}>
    <CheckboxRow
      label="Electricity"
      checked={checked.electricity}
      onPress={() => toggle("electricity")}
    />
  </View>

  {checked.electricity && (
    <TextInput
      value={electricityUnits}
      onChangeText={setElectricityUnits}
      placeholder="Units"
      placeholderTextColor={MUTED}
      keyboardType="numeric"
      style={styles.rowInput}
    />
  )}
</View>

          <View style={styles.electricityRow}>
  <View style={{ flex: 1 }}>
    <CheckboxRow
      label="Number of Water Meters"
      checked={checked.waterMeters}
      onPress={() => toggle("waterMeters")}
    />
  </View>

  {checked.waterMeters && (
    <TextInput
      value={waterMetersCount}
      onChangeText={setWaterMetersCount}
      placeholder="Count"
      placeholderTextColor={MUTED}
      keyboardType="numeric"
      style={styles.rowInput}
    />
  )}
</View>

          <View style={styles.electricityRow}>
  <View style={{ flex: 1 }}>
    <CheckboxRow
      label="Number of Electricity Meters"
      checked={checked.electricityMeters}
      onPress={() => toggle("electricityMeters")}
    />
  </View>

  {checked.electricityMeters && (
    <TextInput
      value={electricityMetersCount}
      onChangeText={setElectricityMetersCount}
      placeholder="Count"
      placeholderTextColor={MUTED}
      keyboardType="numeric"
      style={styles.rowInput}
    />
  )}
</View>
        </Section>

        <Pressable
          disabled={saving}
          onPress={handleSubmit}
          style={[styles.primaryBtn, saving && styles.disabledBtn]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Inspection</Text>
          )}
        </Pressable>
      </ScrollView>

      <AssetCameraModal
        visible={cameraOpen}
        mode={cameraMode}
        onClose={() => setCameraOpen(false)}
        onDone={handleCameraDone}
        onScanText={() => {}}
      />
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function CheckboxRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>

      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>

      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

function CheckboxGrid({
  items,
  checked,
  toggle,
}: {
  items: [string, string][];
  checked: CheckedState;
  toggle: (key: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => toggle(key)}
          style={[styles.gridItem, checked[key] && styles.gridItemActive]}
        >
          <View style={[styles.smallBox, checked[key] && styles.checkboxActive]}>
            {checked[key] && <Text style={styles.smallCheck}>✓</Text>}
          </View>

          <Text style={[styles.gridText, checked[key] && styles.gridTextActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    padding: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  backText: {
    fontSize: 26,
    color: ACC,
    marginTop: -3,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT,
  },
  subtitle: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  section: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 11,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 9,
  },
  label: {
    fontSize: 11.5,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FAFBFC",
    borderRadius: 11,
    paddingHorizontal: 11,
    fontSize: 12.5,
    color: TEXT,
    marginBottom: 7,
  },
  readOnlyBox: {
    flexDirection: "row",
    backgroundColor: "#FAFBFC",
    borderRadius: 12,
    padding: 5,
  },
  readOnlyLabel: {
    fontSize: 10.5,
    color: MUTED,
    fontWeight: "700",
    marginBottom: 3,
  },
  readOnlyValue: {
    fontSize: 10,
    color: TEXT,
    fontWeight: "500",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.3,
    borderColor: BORDER,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  checkboxActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },
  checkMark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  checkLabel: {
    flex: 1,
    fontSize: 12.5,
    color: TEXT,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  gridItem: {
    width: "48%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
    padding: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  gridItemActive: {
    backgroundColor: "#F5F7FA",
    borderColor: ACC,
  },
  smallBox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  smallCheck: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },

  radioGroup: {
  gap: 2,
},

radioRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 6,
  
},

conditionRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-around",
  marginBottom: 5,
},

otherRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 5,
},

otherInput: {
  flex: 1,
  height: 40,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: "#FAFBFC",
  borderRadius: 10,
  paddingHorizontal: 12,
  fontSize: 12.5,
  color: TEXT,
},

completionRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginTop: 4,
},

completionLabel: {
  fontSize: 12,
  fontWeight: "700",
  color: TEXT,
},

completionInputSmall: {
  width: 80,
  height: 40,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: "#FAFBFC",
  borderRadius: 10,
  paddingHorizontal: 12,
  fontSize: 12.5,
  color: TEXT,
},

radioOuter: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 2,
  borderColor: ACC,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
},

radioInner: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: ACC,
},

radioLabel: {
  fontSize: 13,
  color: TEXT,
  fontWeight: "600",
},

buildingCompletionContainer: {
  marginTop: 12,
},

completionInput: {
  height: 42,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: "#FAFBFC",
  borderRadius: 10,
  paddingHorizontal: 12,
  fontSize: 13,
  color: TEXT,
},

disabledInput: {
  opacity: 0.5,
  backgroundColor: "#F1F3F7",
},
  gridText: {
    flex: 1,
    fontSize: 11,
    color: TEXT,
    fontWeight: "600",
  },
  gridTextActive: {
    color: ACC,
    fontWeight: "800",
  },
  mediaActions: {
    flexDirection: "row",
    gap: 8,
  },
  mediaActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: ACC,
  },
  mediaActionText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
  },
  secondaryActionText: {
    color: ACC,
  },
  emptyMediaText: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 8,
    textAlign: "center",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 9,
  },
  mediaCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: SURFACE,
    position: "relative",
  },
  mediaImg: {
    width: "100%",
    height: "100%",
  },
  videoBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACC,
  },
  videoText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  removeBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#fff",
    fontSize: 15,
    marginTop: -2,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 13,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  buildingConditionRows: {
    gap: 4,
  },
  buildingConditionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  buildingConditionHalf: {
    flex: 1,
  },
buildingCompletionRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 6,
},

electricityRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
},
rowInput: {
  width: 90,
  height: 40,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: "#FAFBFC",
  borderRadius: 6,
  paddingHorizontal: 11,
  fontSize: 12.5,
  color: TEXT,
 
},
buildingCompletionInput: {
  width: 70,          // fixed width to keep it compact
  height: 40,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: "#FAFBFC",
  borderRadius: 6,
  paddingHorizontal: 11,
  fontSize: 12.5,
  color: TEXT,
  marginBottom: 7,
},
});
