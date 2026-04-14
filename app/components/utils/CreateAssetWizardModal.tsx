import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import AssetCameraModal from "./AssetCameraModal";
import { AssetDraft } from "./types";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

type AssetCondition = "" | "New" | "Used" | "Damaged";
type AssetType = "Other" | "Vehicle";

type ExtendedAssetDraft = AssetDraft & {
  condition?: AssetCondition;
  assetType?: AssetType;
  brand?: string;
  manufactureYear?: string;
  kilometersDriven?: string;
};

export default function CreateAssetWizardModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: ExtendedAssetDraft) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [draft, setDraft] = useState<ExtendedAssetDraft>({
    images: [],
    name: "",
    writtenDescription: "",
    voiceNotes: [],
    condition: "",
    assetType: "Other",
    brand: "",
    manufactureYear: "",
    kilometersDriven: "",
  });

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const previewSize = useMemo(() => {
    const horizontalPadding = 40;
    const gridGapTotal = 4 * 8;
    const available = width - horizontalPadding - gridGapTotal;
    return Math.max(48, Math.floor(available / 5));
  }, [width]);

  const pickImagesFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (result.canceled) return;

      const mapped = result.assets.map((asset, i) => ({
        uri: asset.uri,
        name: asset.fileName || `gallery_${Date.now()}_${i}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));

      setDraft((prev) => ({
        ...prev,
        images: [...prev.images, ...mapped],
      }));
    } catch (error) {
      Alert.alert("Error", "Unable to pick images from phone.");
    }
  };



const startRecording = async () => {
  try {
    const status = await AudioModule.requestRecordingPermissionsAsync();

    if (!status.granted) {
      Alert.alert("Permission required", "Microphone permission is required.");
      return;
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  } catch (error) {
    console.error("Start recording failed:", error);
    Alert.alert("Error", "Could not start recording.");
  }
};

const stopRecording = async () => {
  try {
    await recorder.stop();
    setIsRecording(false);

    const uri = recorder.uri;

    if (uri) {
      setDraft((prev) => ({
        ...prev,
        voiceNotes: [
          ...(prev.voiceNotes || []),
          {
            uri,
            name: `voice_note_${Date.now()}.m4a`,
            type: "audio/m4a",
          },
        ],
      }));
    }
  } catch (error) {
    console.error("Stop recording failed:", error);
    Alert.alert("Error", "Could not stop recording.");
  }
};

  const removeImage = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeVoiceNote = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      voiceNotes: (prev.voiceNotes || []).filter((_, i) => i !== index),
    }));
  };

  const handleFinish = async () => {
    if (!draft.name?.trim()) {
      Alert.alert("Validation", "Asset Name is required");
      return;
    }

    await onSubmit(draft);
    onClose();
    setStep(1);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalCard,
              isSmallScreen && styles.modalCardSmall,
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Create Asset</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.step}>Step {step} of 3</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {step === 1 && (
                <>
                  <Text style={styles.label}>Upload Images</Text>

                  <View style={styles.imageActionRow}>
                    <TouchableOpacity
                      style={[styles.primaryBtn, styles.flexBtn]}
                      onPress={() => setCameraOpen(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryText}>Open Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.darkBtn, styles.flexBtn]}
                      onPress={pickImagesFromLibrary}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.darkBtnText}>Upload from Phone</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.helper}>
                    {draft.images.length} image
                    {draft.images.length === 1 ? "" : "s"} selected
                  </Text>

                  {draft.images.length > 0 && (
                    <View style={styles.previewGrid}>
                      {draft.images.map((img, index) => (
                        <View
                          key={`${img.uri}-${index}`}
                          style={[
                            styles.previewItem,
                            {
                              width: previewSize,
                              height: previewSize,
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: img.uri }}
                            style={styles.previewImage}
                          />
                          <TouchableOpacity
                            style={styles.removeBadge}
                            onPress={() => removeImage(index)}
                          >
                            <Text style={styles.removeBadgeText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.label}>Asset Details</Text>

                  <TextInput
                    placeholder="Asset Name"
                    placeholderTextColor="#666"
                    value={draft.name}
                    onChangeText={(t) => setDraft({ ...draft, name: t })}
                    style={styles.input}
                  />

                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={draft.condition}
                      onValueChange={(value) =>
                        setDraft({
                          ...draft,
                          condition: value,
                        })
                      }
                      dropdownIconColor="#fff"
                      style={styles.picker}
                    >
                      <Picker.Item label="Condition (Optional)" value="" />
                      <Picker.Item label="New" value="New" />
                      <Picker.Item label="Used" value="Used" />
                      <Picker.Item label="Damaged" value="Damaged" />
                    </Picker>
                  </View>

                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={draft.assetType}
                      onValueChange={(value) =>
                        setDraft({
                          ...draft,
                          assetType: value,
                        })
                      }
                      dropdownIconColor="#fff"
                      style={styles.picker}
                    >
                      <Picker.Item label="Other" value="Other" />
                      <Picker.Item label="Vehicle" value="Vehicle" />
                    </Picker>
                  </View>

                  {draft.assetType === "Vehicle" && (
                    <>
                      <TextInput
                        placeholder="Brand"
                        placeholderTextColor="#666"
                        value={draft.brand}
                        onChangeText={(t) =>
                          setDraft({ ...draft, brand: t })
                        }
                        style={styles.input}
                      />

                      <TextInput
                        placeholder="Manufacture Year"
                        placeholderTextColor="#666"
                        value={draft.manufactureYear}
                        onChangeText={(t) =>
                          setDraft({ ...draft, manufactureYear: t })
                        }
                        keyboardType="numeric"
                        style={styles.input}
                      />

                      <TextInput
                        placeholder="Kilometers Driven"
                        placeholderTextColor="#666"
                        value={draft.kilometersDriven}
                        onChangeText={(t) =>
                          setDraft({ ...draft, kilometersDriven: t })
                        }
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.label}>Description</Text>

                  <TextInput
                    placeholder="Write something..."
                    placeholderTextColor="#666"
                    value={draft.writtenDescription}
                    onChangeText={(t) =>
                      setDraft({
                        ...draft,
                        writtenDescription: t,
                      })
                    }
                    style={[styles.input, styles.textArea]}
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={[styles.label, { marginTop: 8 }]}>
                    Voice Notes
                  </Text>

              <TouchableOpacity
              style={styles.primaryBtn}
              onPress={isRecording ? stopRecording : startRecording}
              >
              <Text style={styles.primaryText}>
                {isRecording ? "Stop Recording" : "Record Voice Note"}
              </Text>
              </TouchableOpacity>

                  <Text style={styles.helper}>
                    {(draft.voiceNotes || []).length} voice note
                    {(draft.voiceNotes || []).length === 1 ? "" : "s"} added
                  </Text>

                  {(draft.voiceNotes || []).map((note, index) => (
                    <View key={`${note.uri}-${index}`} style={styles.voiceItem}>
                      <Text style={styles.voiceText} numberOfLines={1}>
                        {note.name || `Voice Note ${index + 1}`}
                      </Text>

                      <TouchableOpacity onPress={() => removeVoiceNote(index)}>
                        <Text style={styles.voiceRemove}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.footerSide}>
                {step > 1 ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={back}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
              </View>

              <View style={styles.footerSideRight}>
                {step < 3 ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.nextBtn]}
                    onPress={next}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.nextBtn]}
                    onPress={handleFinish}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryText}>Finish</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <AssetCameraModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDone={(photos) => {
          const mapped = photos.map((p: any, i: number) => ({
            uri: "file://" + p.path,
            name: `photo_${Date.now()}_${i}.jpg`,
            type: "image/jpeg",
          }));

          setDraft((prev) => ({
            ...prev,
            images: [...prev.images, ...mapped],
          }));
        }}
      />
    </>
  );
}

const BORDER = "#222";
const SURFACE = "#111";
const ACC = "#D4FF00";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "92%",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 16,
  },

  modalCardSmall: {
    borderRadius: 18,
    padding: 14,
  },

  scrollContent: {
    paddingBottom: 8,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  step: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },

  label: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "600",
  },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    marginBottom: 12,
    fontSize: 14,
  },

  textArea: {
    minHeight: 110,
  },

  pickerWrap: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
  },

  picker: {
    color: "#fff",
  },

  imageActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },

  flexBtn: {
    flex: 1,
  },

  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  previewItem: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: SURFACE,
    position: "relative",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  removeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  primaryBtn: {
    backgroundColor: ACC,
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  nextBtn: {
    minWidth: 110,
  },

  primaryText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },

  darkBtn: {
    backgroundColor: SURFACE,
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  darkBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  secondaryBtn: {
    minHeight: 46,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  secondaryText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 14,
  },

  helper: {
    color: "#777",
    marginTop: 8,
    fontSize: 12,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 6,
  },

  footerSide: {
    flex: 1,
    alignItems: "flex-start",
  },

  footerSideRight: {
    flex: 1,
    alignItems: "flex-end",
  },

  voiceItem: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  voiceText: {
    color: "#fff",
    flex: 1,
    fontSize: 13,
  },

  voiceRemove: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "600",
  },
});