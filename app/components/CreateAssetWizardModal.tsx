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
import {Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AssetCameraModal from "./AssetCameraModal";
import { AssetDraft, AssetMediaInput } from "./utils/types";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

type AssetCondition = "" | "New" | "Used" | "Damaged" | "Good";
type AssetType = "Other" | "Vehicle";
type CameraMode = "photos" | "scan";

// type MediaInput = {
//   uri?: string;
//   url?: string;
//   name?: string;
//   type?: string;
//   publicId?: string | null;
//   duration?: number | null;
//   existing?: boolean;
// };

// type ExtendedAssetDraft = Omit<AssetDraft, "images" | "voiceNotes"> & {
//   images: MediaInput[];
//   voiceNotes: MediaInput[];
//   condition?: AssetCondition;
//   assetType?: AssetType;
//   brand?: string;
//   model?: string;
//   manufactureYear?: string;
//   kilometersDriven?: string;
//   isPresent?: boolean;
//   isDone?: boolean;
//   hasNotes?: boolean;
//   notes?: string;
// };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: AssetDraft) => Promise<void> | void;
  mode?: "create" | "edit";
  initialData?: Partial<AssetDraft>;
  disableAssetName?: boolean;
};

const getInitialDraft = (
  initialData?: Partial<AssetDraft>
): AssetDraft => ({
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
  hasNotes: initialData?.hasNotes ?? false,
  notes: initialData?.notes || "",
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
  const [notesModalVisible, setNotesModalVisible] = useState(false);

  const { width } = useWindowDimensions();

  const isSmallScreen = width < 380;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const soundObjectRef = useRef<any>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const [draft, setDraft] = useState<AssetDraft>(
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

  const totalSteps = 3;

  const next = () => {
    if (step === 1 && !draft.name?.trim()) {
      Alert.alert(t("common.validation"), t("asset.assetNameRequired"));
      scrollToField("name");
      return;
    }

    setStep((s) => Math.min(s + 1, totalSteps));
  };

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
                    {t("asset.stepOf", { step, total: totalSteps })}
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
                          {t("asset.assetDetails")}
                        </Text>

                        <View onLayout={setFieldPosition("name")}> 
                          <Text style={styles.fieldLabel}>
                            {t("asset.assetName")}
                          </Text>

                          <TextInput
                            placeholder={t("asset.assetName")}
                            placeholderTextColor="#767B91"
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

<TouchableOpacity
  style={styles.notesCheckRow}
  onPress={() => {
    const newHasNotes = !draft.hasNotes;
    setDraft((prev) => ({
      ...prev,
      hasNotes: newHasNotes,
    }));
    if (newHasNotes) {
      setNotesModalVisible(true);
    } else {
      setDraft((prev) => ({
        ...prev,
        notes: "",
      }));
    }
  }}
  activeOpacity={0.8}
>

  <Ionicons
    name={draft.hasNotes ? "checkbox" : "square-outline"}
    size={22}
    color="#2A324B"
  />
  <Text style={styles.notesCheckText}>Add Notes</Text>
</TouchableOpacity>



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
                            dropdownIconColor="#2A324B"
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
                          {t("asset.uploadImages")}
                        </Text>

                        <View style={styles.imageActionRow}>
                          <TouchableOpacity
                            style={[
                              styles.primaryBtn,
                              styles.flexBtn,
                              {
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                              },
                            ]}
                            onPress={openPhotoCamera}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons
                              name="photo-camera"
                              size={18}
                              color="#fff"
                              style={{ marginRight: 8 }}
                            />
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

                            {draft.images.map((img, index) => {
  const imageUri = img.uri || img.url;
  if (!imageUri) return null;

  return (
    <View
      key={`${imageUri}-${index}`}
      style={[
        styles.previewItem,
        {
          width: previewSize,
          height: previewSize,
        },
      ]}
    >
      <Image source={{ uri: imageUri }} style={styles.previewImage} />

      <TouchableOpacity
        style={styles.removeBadge}
        onPress={() => removeImage(index)}
      >
        <Text style={styles.removeBadgeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
})}
                           
                          </View>
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
                          const noteUri = note.uri || note.url || "";

                          const isRemote = noteUri.startsWith("http") || noteUri.startsWith("//");
                          const canPlay = !!noteUri && !isRemote;

                          return (
                            <View
                              key={`${noteUri}-${index}`}
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
                                      playVoiceNote(noteUri, index)
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
                      {step < totalSteps ? (
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

      <NotesModal
        visible={notesModalVisible}
        notes={draft.notes || ""}
        onSave={(notes) => {
          setDraft((prev) => ({ ...prev, notes }));
          setNotesModalVisible(false);
        }}
        onCancel={() => {
          if (!draft.hasNotes) {
            setDraft((prev) => ({ ...prev, notes: "" }));
          }
          setNotesModalVisible(false);
        }}
      />
    </>
  );
}

const NotesModal: React.FC<{
  visible: boolean;
  notes: string;
  onSave: (notes: string) => void;
  onCancel: () => void;
}> = ({ visible, notes, onSave, onCancel }) => {
  const [currentNotes, setCurrentNotes] = useState(notes);
  const { t } = useTranslation();

  useEffect(() => {
    setCurrentNotes(notes);
  }, [notes]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, styles.modalCardSmall]}>
              <View style={styles.header}>
                <Text style={styles.title}>Notes</Text>
                <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.notesBox}>
                <TextInput
                  value={currentNotes}
                  onChangeText={setCurrentNotes}
                  placeholder="Write notes..."
                  placeholderTextColor="#767B91"
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  style={styles.notesInput}
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onCancel}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => onSave(currentNotes)}
                >
                  <Text style={styles.primaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(42,50,75,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 1,
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
    minHeight: "70%",
    backgroundColor: "#ffffff",
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
    color: TEXT,
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

  notesCheckRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
  marginBottom: 10,
},

notesCheckText: {
  color: "#2A324B",
  fontSize: 14,
  fontWeight: "600",
},

notesBox: {
  height: 140,
  backgroundColor: "#E1E5EE",
  borderWidth: 1,
  borderColor: "#C7CCDB",
  borderRadius: 14,
  padding: 10,
  marginBottom: 12,
},

notesInput: {
  flex: 1,
  color: "#2A324B",
  fontSize: 14,
  minHeight: 120,
},

  closeText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  step: {
    color: MUTED,
    fontSize: 10,
    marginTop: 2,
    marginBottom: 10,
  },

  label: {
    color: TEXT,
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
    borderColor: MUTED,
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },

  checkmarkIsPresent: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },

  checkboxLabelIsPresent: {
    fontSize: 16,
    color: TEXT,
  },

  checkboxWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: MUTED,
    backgroundColor: "#ffffff",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    borderColor: ACC,
    backgroundColor: ACC,
  },

  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

  checkboxLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "500",
  },

  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  scanBtn: {
    backgroundColor: SOFT,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  scanBtnText: {
    color: TEXT,
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
    color: TEXT,
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
    color: TEXT,
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
    backgroundColor: "rgba(42,50,75,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  removeBadgeText: {
    color: "#ffffff",
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
    color: "#ffffff",
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
    color: TEXT,
    fontSize: 13,
    fontWeight: "500",
  },

  secondaryBtn: {
    minHeight: 46,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },

  secondaryText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 14,
  },

  helper: {
    color: MUTED,
    marginTop: 8,
    fontSize: 12,
  },

  fieldLabel: {
    color: MUTED,
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
    color: TEXT,
    fontSize: 13,
  },

  voiceActionsRight: {
    alignItems: "center",
    justifyContent: "center",
  },

  voiceRemoteText: {
    color: MUTED,
    fontSize: 12,
    fontStyle: "italic",
  },

  modalActions:{
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
     marginTop: 12,
    
  }
});