// CreateAssetWizardModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutChangeEvent,
  StyleSheet
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AssetCameraModal from "./AssetCameraModal";
import { AssetDraft } from "./utils/types";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

type AssetCondition = "" | "New" | "Used" | "Damaged" | "Good";
type AssetType = "Other" | "Vehicle";
type CameraMode = "photos" | "scan";

type ExtendedAssetDraft = AssetDraft & {
  condition?: AssetCondition;
  assetType?: AssetType;
  brand?: string;
  model?: string;
  manufactureYear?: string;
  kilometersDriven?: string;
  isPresent?: boolean;
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
  condition: initialData?.condition || "Good",
  assetType: initialData?.assetType || "Other",
  brand: initialData?.brand || "",
  model: initialData?.model || "",
  manufactureYear: initialData?.manufactureYear || "",
  kilometersDriven: initialData?.kilometersDriven || "",
  isPresent: initialData?.isPresent ?? true,
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
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("photos");

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const soundObjectRef = useRef<any>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const [draft, setDraft] = useState<ExtendedAssetDraft>(
    getInitialDraft(initialData)
  );

  useEffect(() => {
    if (visible) {
      setStep(1);
      setDraft(getInitialDraft(initialData));
      setIsRecording(false);
      setCameraMode("photos");
    } else {
      stopVoicePlayback();
    }
  }, [visible, initialData]);

  const previewSize = useMemo(() => {
    const horizontalPadding = 40;
    const gridGapTotal = 4 * 8;
    const available = width - horizontalPadding - gridGapTotal;
    return Math.max(48, Math.floor(available / 5));
  }, [width]);

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

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

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
        Alert.alert(
          t("asset.permissionRequired"),
          t("asset.photoPermissionMessage")
        );
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
      Alert.alert(t("common.error"), t("asset.unablePickImages"));
    }
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (!status.granted) {
        Alert.alert(
          t("asset.permissionRequired"),
          t("asset.microphonePermissionMessage")
        );
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (error) {
      console.error("Start recording failed:", error);
      Alert.alert(t("common.error"), t("asset.couldNotStartRecording"));
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
      Alert.alert(t("common.error"), t("asset.couldNotStopRecording"));
    }
  };

  const playVoiceNote = async (uri: string, index: number) => {
    try {
      const isRemote = uri.startsWith("http") || uri.startsWith("//");

      if (isRemote) {
        Alert.alert(
          t("asset.playbackNotAvailable"),
          t("asset.remoteVoicePlaybackMessage")
        );
        return;
      }

      if (playingIndex === index && soundObjectRef.current) {
        await soundObjectRef.current.pauseAsync();
        setPlayingIndex(null);
        return;
      }

      if (soundObjectRef.current) {
        await soundObjectRef.current.unloadAsync();
      }

      const formattedUri = uri.startsWith("file://") ? uri : `file://${uri}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: formattedUri },
        { shouldPlay: true }
      );

      soundObjectRef.current = sound;
      setPlayingIndex(index);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlayingIndex(null);
        }
      });
    } catch (error) {
      console.error("Error playing voice note:", error);
      Alert.alert(t("common.error"), t("asset.couldNotPlayVoiceNote"));
    }
  };

  const stopVoicePlayback = async () => {
    try {
      if (soundObjectRef.current) {
        await soundObjectRef.current.unloadAsync();
        soundObjectRef.current = null;
      }

      setPlayingIndex(null);
    } catch (error) {
      console.error("Error stopping playback:", error);
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

  const handleClose = async () => {
    if (isRecording) {
      try {
        await stopRecording();
      } catch (error) {
        console.error("Error stopping recording on close:", error);
      }
    }

    await stopVoicePlayback();

    setStep(1);
    setIsRecording(false);
    setCameraMode("photos");

    Keyboard.dismiss();
    onClose();
  };

  const handleFinish = async () => {
    if (!draft.name?.trim()) {
      Alert.alert(t("common.validation"), t("asset.assetNameRequired"));
      return;
    }

    if (isRecording) {
      Alert.alert(
        t("asset.recordingInProgress"),
        t("asset.stopRecordingBeforeSaving"),
        [
          {
            text: t("asset.stopRecordingAndSave"),
            onPress: async () => {
              try {
                await stopRecording();
                handleFinish();
              } catch {
                Alert.alert(t("common.error"), t("asset.couldNotStopRecording"));
              }
            },
          },
          {
            text: t("common.cancel"),
            style: "cancel",
          },
        ]
      );

      return;
    }

    let submitPromise: Promise<void>;

    try {
      submitPromise = Promise.resolve(onSubmit(draft));
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.message || t("asset.failedToSaveAsset")
      );
      return;
    }

    handleClose();

    submitPromise.catch((error) => {
      Alert.alert(
        t("common.error"),
        error?.message || t("asset.failedToSaveAsset")
      );
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
                      {mode === "edit"
                        ? t("asset.editAsset")
                        : t("asset.createAsset")}
                    </Text>

                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.closeBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.step}>
                    {t("asset.stepOf", { step, total: 3 })}
                  </Text>

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
                        <Text style={styles.label}>
                          {t("asset.uploadImages")}
                        </Text>

                        <View style={styles.imageActionRow}>
                          <TouchableOpacity
                            style={[styles.primaryBtn, styles.flexBtn]}
                            onPress={openPhotoCamera}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.primaryText}>
                              {t("asset.openCamera")}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.darkBtn, styles.flexBtn]}
                            onPress={pickImagesFromLibrary}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.darkBtnText}>
                              {t("asset.uploadFromPhone")}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.darkBtn, styles.flexBtn]}
                            onPress={openScanCamera}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.darkBtnText}>
                              {t("asset.scanText")}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.helper}>
                          {t("asset.imagesSelected", {
                            count: draft.images.length,
                          })}
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

                        <View style={styles.row}>
                          <TouchableOpacity
                            onPress={() =>
                              setDraft((prev) => ({
                                ...prev,
                                isPresent: !prev.isPresent,
                              }))
                            }
                            style={[
                              styles.checkboxIsPresent,
                              draft.isPresent && styles.checkboxActive,
                            ]}
                          >
                            {draft.isPresent && (
                              <Text style={styles.checkmarkIsPresent}>✓</Text>
                            )}
                          </TouchableOpacity>

                          <Text style={styles.checkboxLabelIsPresent}>
                            {t("asset.assetIsPresent")}
                          </Text>
                        </View>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <Text style={styles.label}>
                          {t("asset.assetDetails")}
                        </Text>

                        <View onLayout={setFieldPosition("name")}>
                          <Text style={styles.fieldLabel}>
                            {t("asset.assetName")}
                          </Text>

                          <TextInput
                            placeholder={t("asset.assetName")}
                            placeholderTextColor="#666"
                            value={draft.name}
                            onChangeText={(text) => {
                              if (!disableAssetName) {
                                setDraft((prev) => ({
                                  ...prev,
                                  name: text,
                                }));
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

                        <Text style={styles.fieldLabel}>
                          {t("asset.condition")}
                        </Text>

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
                            <Picker.Item
                              label={t("asset.conditionGood")}
                              value="Good"
                            />
                            <Picker.Item
                              label={t("asset.conditionNew")}
                              value="New"
                            />
                            <Picker.Item
                              label={t("asset.conditionUsed")}
                              value="Used"
                            />
                            <Picker.Item
                              label={t("asset.conditionDamaged")}
                              value="Damaged"
                            />
                          </Picker>
                        </View>

                        <Text style={styles.fieldLabel}>
                          {t("asset.assetType")}
                        </Text>

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
                            <Picker.Item
                              label={t("asset.typeOther")}
                              value="Other"
                            />
                            <Picker.Item
                              label={t("asset.typeVehicle")}
                              value="Vehicle"
                            />
                          </Picker>
                        </View>

                        {draft.assetType === "Vehicle" && (
                          <>
                            <View onLayout={setFieldPosition("brand")}>
                              <Text style={styles.fieldLabel}>
                                {t("asset.brand")}
                              </Text>

                              <TextInput
                                placeholder={t("asset.brand")}
                                placeholderTextColor="#666"
                                value={draft.brand}
                                onChangeText={(text) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    brand: text,
                                  }))
                                }
                                style={styles.input}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onFocus={() => scrollToField("brand")}
                              />
                            </View>

                            <View onLayout={setFieldPosition("model")}>
                              <Text style={styles.fieldLabel}>
                                {t("asset.model")}
                              </Text>

                              <TextInput
                                placeholder={t("asset.model")}
                                placeholderTextColor="#666"
                                value={draft.model}
                                onChangeText={(text) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    model: text,
                                  }))
                                }
                                style={[styles.input, styles.modelInput]}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onFocus={() => scrollToField("model")}
                              />
                            </View>

                            <View
                              onLayout={setFieldPosition("manufactureYear")}
                            >
                              <Text style={styles.fieldLabel}>
                                {t("asset.manufactureYear")}
                              </Text>

                              <TextInput
                                placeholder={t("asset.manufactureYear")}
                                placeholderTextColor="#666"
                                value={draft.manufactureYear}
                                onChangeText={(text) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    manufactureYear: text,
                                  }))
                                }
                                keyboardType="numeric"
                                style={styles.input}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onFocus={() =>
                                  scrollToField("manufactureYear")
                                }
                              />
                            </View>

                            <View
                              onLayout={setFieldPosition("kilometersDriven")}
                            >
                              <Text style={styles.fieldLabel}>
                                {t("asset.kilometersDriven")}
                              </Text>

                              <TextInput
                                placeholder={t("asset.kilometersDriven")}
                                placeholderTextColor="#666"
                                value={draft.kilometersDriven}
                                onChangeText={(text) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    kilometersDriven: text,
                                  }))
                                }
                                keyboardType="numeric"
                                style={styles.input}
                                returnKeyType="done"
                                onFocus={() =>
                                  scrollToField("kilometersDriven")
                                }
                              />
                            </View>
                          </>
                        )}
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <View style={styles.descriptionHeader}>
                          <Text style={styles.label}>
                            {t("asset.description")}
                          </Text>

                          <TouchableOpacity
                            style={styles.scanBtn}
                            onPress={openScanCamera}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.scanBtnText}>
                              {t("asset.scanText")}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View
                          onLayout={setFieldPosition("writtenDescription")}
                          style={styles.descriptionInputWrapper}
                        >
                          <TextInput
                            placeholder={t("asset.writeSomething")}
                            placeholderTextColor="#666"
                            value={draft.writtenDescription}
                            onChangeText={(text) =>
                              setDraft((prev) => ({
                                ...prev,
                                writtenDescription: text,
                              }))
                            }
                            style={[styles.input, styles.textArea]}
                            multiline
                            scrollEnabled
                            textAlignVertical="top"
                            onFocus={() =>
                              scrollToField("writtenDescription")
                            }
                          />
                        </View>

                        <Text style={styles.helper}>
                          {t("asset.scannedTextHelper")}
                        </Text>

                        <Text style={[styles.label, { marginTop: 8 }]}>
                          {t("asset.voiceNotes")}
                        </Text>

                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={isRecording ? stopRecording : startRecording}
                        >
                          <Text style={styles.primaryText}>
                            {isRecording
                              ? t("asset.stopRecording")
                              : t("asset.recordVoiceNote")}
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
                            {draft.isDone && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </View>

                          <Text style={styles.checkboxLabel}>
                            {t("asset.markAsDone")}
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.helper}>
                          {t("asset.voiceNotesAdded", {
                            count: draft.voiceNotes?.length || 0,
                          })}
                        </Text>

                        {(draft.voiceNotes || []).map((note, index) => {
                          const isRemote =
                            note.uri.startsWith("http") ||
                            note.uri.startsWith("//");
                          const canPlay = !isRemote;

                          return (
                            <View
                              key={`${note.uri}-${index}`}
                              style={styles.voiceItem}
                            >
                              <View style={styles.voiceActionsLeft}>
                                <TouchableOpacity
                                  onPress={() => removeVoiceNote(index)}
                                  activeOpacity={0.7}
                                >
                                  <MaterialIcons
                                    name="delete-outline"
                                    size={20}
                                    color="#ff6b6b"
                                  />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.voiceTextContainer}>
                                <Text
                                  style={styles.voiceText}
                                  numberOfLines={1}
                                >
                                  {note.name ||
                                    t("asset.voiceNoteNumber", {
                                      number: index + 1,
                                    })}
                                  {isRemote && (
                                    <Text style={styles.voiceRemoteText}>
                                      {" "}
                                      ({t("asset.saved")})
                                    </Text>
                                  )}
                                </Text>
                              </View>

                              <View style={styles.voiceActionsRight}>
                                {canPlay && (
                                  <TouchableOpacity
                                    onPress={() =>
                                      playVoiceNote(note.uri, index)
                                    }
                                    activeOpacity={0.7}
                                  >
                                    <MaterialIcons
                                      name={
                                        playingIndex === index
                                          ? "pause-circle-filled"
                                          : "play-circle-filled"
                                      }
                                      size={24}
                                      color={ACC}
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })}
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
                          <Text style={styles.secondaryText}>
                            {t("asset.back")}
                          </Text>
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
                          <Text style={styles.primaryText}>
                            {t("asset.next")}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.primaryBtn, styles.nextBtn]}
                          onPress={handleFinish}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.primaryText}>
                            {mode === "edit"
                              ? t("asset.saveChanges")
                              : t("asset.finish")}
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

          const mapped = photos.map((photo: any, index: number) => ({
            uri: photo.path?.startsWith("file://")
              ? photo.path
              : `file://${photo.path}`,
            name: `photo_${Date.now()}_${index}.jpg`,
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
    paddingHorizontal: 10,
    paddingVertical: 1,
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


  row: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 16,
},

checkboxIsPresent: {
  width: 22,
  height: 22,
  borderWidth: 2,
  borderColor: "#999",
  borderRadius: 4,
  marginRight: 10,
  alignItems: "center",
  justifyContent: "center",
},

checkboxActive: {
  backgroundColor: "#4CAF50",
  borderColor: "#4CAF50",
},

checkmarkIsPresent: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "bold",
},

checkboxLabelIsPresent: {
  fontSize: 16,
  color: "#fff", // match your theme
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
    borderColor: "#666",
    borderWidth: 1,
    borderRadius: 8,
  },

  secondaryText: {
    color: "#ded6d6",
    fontWeight: "600",
    fontSize: 14,
  },

  helper: {
    color: "#777",
    marginTop: 8,
    fontSize: 12,
  },

  fieldLabel: {
    color: "#ccc",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },

  modelInput: {
    minHeight: 54,
  },

  descriptionInputWrapper: {
    maxHeight: 150,
    marginBottom: 12,
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

  voiceActionsLeft: {
    alignItems: "center",
    justifyContent: "center",
  },

  voiceTextContainer: {
    flex: 1,
    marginHorizontal: 8,
  },

  voiceText: {
    color: "#fff",
    fontSize: 13,
  },

  voiceActionsRight: {
    alignItems: "center",
    justifyContent: "center",
  },

  voiceRemoteText: {
    color: "#666",
    fontSize: 12,
    fontStyle: "italic",
  },
});