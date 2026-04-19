// CreateAssetWizardModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutChangeEvent,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import AssetCameraModal from "./AssetCameraModal";
import { AssetDraft } from "./utils/types";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

type AssetCondition = "" | "New" | "Used" | "Damaged";
type AssetType = "Other" | "Vehicle";
type CameraMode = "photos" | "scan";

type ExtendedAssetDraft = AssetDraft & {
  condition?: AssetCondition;
  assetType?: AssetType;
  brand?: string;
  model?: string;
  manufactureYear?: string;
  kilometersDriven?: string;
  isDone?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: ExtendedAssetDraft) => Promise<void> | void;
  mode?: "create" | "edit";
  initialData?: Partial<ExtendedAssetDraft>;
  disableAssetName?: boolean;
};

const getInitialDraft = (
  initialData?: Partial<ExtendedAssetDraft>
): ExtendedAssetDraft => ({
  images: initialData?.images || [],
  name: initialData?.name || "",
  writtenDescription: initialData?.writtenDescription || "",
  voiceNotes: initialData?.voiceNotes || [],
  condition: initialData?.condition || "",
  assetType: initialData?.assetType || "Other",
  brand: initialData?.brand || "",
  model: initialData?.model || "",
  manufactureYear: initialData?.manufactureYear || "",
  kilometersDriven: initialData?.kilometersDriven || "",
  isDone: initialData?.isDone || false,
});

export default function CreateAssetWizardModal({
  visible,
  onClose,
  onSubmit,
  mode = "create",
  initialData,
  disableAssetName = false,
}: Props) {
  const [step, setStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("photos");

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState<ExtendedAssetDraft>(
    getInitialDraft(initialData)
  );

  useEffect(() => {
    if (visible) {
      setStep(1);
      setDraft(getInitialDraft(initialData));
      setIsRecording(false);
      setCameraMode("photos");
    }
  }, [visible, initialData]);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const previewSize = useMemo(() => {
    const horizontalPadding = 40;
    const gridGapTotal = 4 * 8;
    const available = width - horizontalPadding - gridGapTotal;
    return Math.max(48, Math.floor(available / 5));
  }, [width]);

  const fieldPositions = useRef<Record<string, number>>({});

  const setFieldPosition = (key: string) => (e: LayoutChangeEvent) => {
    fieldPositions.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToField = (key: string) => {
    const y = fieldPositions.current[key] ?? 0;

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 24),
        animated: true,
      });
    }, 120);
  };

  const openPhotoCamera = () => {
    setCameraMode("photos");
    setCameraOpen(true);
  };

  const openScanCamera = () => {
    setCameraMode("scan");
    setCameraOpen(true);
  };

  const appendScannedTextToDescription = (scannedText: string) => {
    const cleanText = scannedText?.trim();
    if (!cleanText) return;

    setDraft((prev) => {
      const current = (prev.writtenDescription || "").trim();

      return {
        ...prev,
        writtenDescription: current ? `${current}\n${cleanText}` : cleanText,
      };
    });

    setTimeout(() => {
      scrollToField("writtenDescription");
    }, 150);
  };

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
    } catch {
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

  const handleClose = () => {
    setStep(1);
    setIsRecording(false);
    setCameraMode("photos");
    Keyboard.dismiss();
    onClose();
  };

  const handleFinish = () => {
    if (!draft.name?.trim()) {
      Alert.alert("Validation", "Asset Name is required");
      return;
    }

    let submitPromise: Promise<void>;

    try {
      submitPromise = Promise.resolve(onSubmit(draft));
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save asset");
      return;
    }

    handleClose();

    submitPromise.catch((error) => {
      Alert.alert("Error", error?.message || "Failed to save asset");
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              style={styles.keyboardWrap}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 20}
            >
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.modalCard,
                    isSmallScreen && styles.modalCardSmall,
                  ]}
                >
                  <View style={styles.header}>
                    <Text style={styles.title}>
                      {mode === "edit" ? "Edit Asset" : "Create Asset"}
                    </Text>
                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.closeBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.step}>Step {step} of 3</Text>

                  <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={
                      Platform.OS === "ios" ? "interactive" : "on-drag"
                    }
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                  >
                    {step === 1 && (
                      <>
                        <Text style={styles.label}>Upload Images</Text>

                        <View style={styles.imageActionRow}>
                          <TouchableOpacity
                            style={[styles.primaryBtn, styles.flexBtn]}
                            onPress={openPhotoCamera}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.primaryText}>Open Camera</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.darkBtn, styles.flexBtn]}
                            onPress={pickImagesFromLibrary}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.darkBtnText}>
                              Upload from Phone
                            </Text>
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

                        <View onLayout={setFieldPosition("name")}>
                          <TextInput
                            placeholder="Asset Name"
                            placeholderTextColor="#666"
                            value={draft.name}
                            onChangeText={(t) => {
                              if (!disableAssetName) {
                                setDraft((prev) => ({ ...prev, name: t }));
                              }
                            }}
                            editable={!disableAssetName}
                            selectTextOnFocus={!disableAssetName}
                            style={[
                              styles.input,
                              disableAssetName && styles.inputDisabled,
                            ]}
                            returnKeyType="next"
                            blurOnSubmit={false}
                            onFocus={() => scrollToField("name")}
                          />
                        </View>

                        <View style={styles.pickerWrap}>
                          <Picker
                            selectedValue={draft.condition}
                            onValueChange={(value) =>
                              setDraft((prev) => ({
                                ...prev,
                                condition: value,
                              }))
                            }
                            dropdownIconColor="#fff"
                            style={styles.picker}
                          >
                            <Picker.Item label="Condition" value="" />
                            <Picker.Item label="New" value="New" />
                            <Picker.Item label="Used" value="Used" />
                            <Picker.Item label="Damaged" value="Damaged" />
                          </Picker>
                        </View>

                        <View style={styles.pickerWrap}>
                          <Picker
                            selectedValue={draft.assetType}
                            onValueChange={(value) =>
                              setDraft((prev) => ({
                                ...prev,
                                assetType: value,
                              }))
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
                            <View onLayout={setFieldPosition("brand")}>
                              <TextInput
                                placeholder="Brand"
                                placeholderTextColor="#666"
                                value={draft.brand}
                                onChangeText={(t) =>
                                  setDraft((prev) => ({ ...prev, brand: t }))
                                }
                                style={styles.input}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onFocus={() => scrollToField("brand")}
                              />
                            </View>

                            <View onLayout={setFieldPosition("model")}>
                              <TextInput
                                placeholder="Model"
                                placeholderTextColor="#666"
                                value={draft.model}
                                onChangeText={(t) =>
                                  setDraft((prev) => ({ ...prev, model: t }))
                                }
                                style={styles.input}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onFocus={() => scrollToField("model")}
                              />
                            </View>

                            <View onLayout={setFieldPosition("manufactureYear")}>
                              <TextInput
                                placeholder="Manufacture Year"
                                placeholderTextColor="#666"
                                value={draft.manufactureYear}
                                onChangeText={(t) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    manufactureYear: t,
                                  }))
                                }
                                keyboardType="numeric"
                                style={styles.input}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onFocus={() => scrollToField("manufactureYear")}
                              />
                            </View>

                            <View onLayout={setFieldPosition("kilometersDriven")}>
                              <TextInput
                                placeholder="Kilometers Driven"
                                placeholderTextColor="#666"
                                value={draft.kilometersDriven}
                                onChangeText={(t) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    kilometersDriven: t,
                                  }))
                                }
                                keyboardType="numeric"
                                style={styles.input}
                                returnKeyType="done"
                                onFocus={() => scrollToField("kilometersDriven")}
                              />
                            </View>
                          </>
                        )}
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <View style={styles.descriptionHeader}>
                          <Text style={styles.label}>Description</Text>

                          <TouchableOpacity
                            style={styles.scanBtn}
                            onPress={openScanCamera}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.scanBtnText}>Scan Text</Text>
                          </TouchableOpacity>
                        </View>

                        <View onLayout={setFieldPosition("writtenDescription")}>
                          <TextInput
                            placeholder="Write something..."
                            placeholderTextColor="#666"
                            value={draft.writtenDescription}
                            onChangeText={(t) =>
                              setDraft((prev) => ({
                                ...prev,
                                writtenDescription: t,
                              }))
                            }
                            style={[styles.input, styles.textArea]}
                            multiline
                            textAlignVertical="top"
                            onFocus={() => scrollToField("writtenDescription")}
                          />
                        </View>

                        <Text style={styles.helper}>
                          Scanned text will be appended here automatically.
                        </Text>

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

                        <TouchableOpacity
                          style={styles.checkboxWrap}
                          onPress={() =>
                            setDraft((prev) => ({
                              ...prev,
                              isDone: !prev.isDone,
                            }))
                          }
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              draft.isDone && styles.checkboxChecked,
                            ]}
                          >
                            {draft.isDone && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <Text style={styles.checkboxLabel}>Mark as Done</Text>
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
                          <Text style={styles.primaryText}>
                            {mode === "edit" ? "Save Changes" : "Finish"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AssetCameraModal
        visible={cameraOpen}
        mode={cameraMode}
        onClose={() => setCameraOpen(false)}
        onDone={(photos: any[]) => {
          if (cameraMode !== "photos") return;

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
        onScanText={(text: string) => {
          if (cameraMode !== "scan") return;
          appendScannedTextToDescription(text);
          setCameraOpen(false);
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
    paddingHorizontal: 14,
    paddingVertical: 20,
  },

  checkboxWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#666",
    backgroundColor: "#222",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    borderColor: ACC,
    backgroundColor: ACC,
  },

  checkmark: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },

  checkboxLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  keyboardWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "94%",
    minHeight: "60%",
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },

  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
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
    fontSize: 12,
    fontWeight: "700",
  },

  step: {
    color: "#777",
    fontSize: 10,
    marginTop: 2,
    marginBottom: 10,
  },

  label: {
    color: "#fff",
    fontSize: 12,
    marginBottom: 10,
    fontWeight: "500",
  },

  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  scanBtn: {
    backgroundColor: SURFACE,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  scanBtnText: {
    color: "#fff",
    fontSize: 12,
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

  inputDisabled: {
    opacity: 0.55,
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
    height: 48,
  },

  picker: {
    color: "#fff",
    height: 58,
    width: "100%",
    overflow: "hidden",
    marginLeft: 0,
    marginTop: Platform.OS === "android" ? -4 : 0,
  },

  imageActionRow: {
    flexDirection: "row",
    gap: 8,
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
    fontSize: 13,
    fontWeight: "500",
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
    fontSize: 13,
    fontWeight: "500",
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