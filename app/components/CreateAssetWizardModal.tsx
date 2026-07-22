// CreateAssetWizardModal.tsx
import React, {RefObject, useEffect, useMemo, useRef, useState } from "react";
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
  ActivityIndicator,
  StyleSheet
  
} from "react-native";


import { Audio } from "expo-av";
import {Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AssetCameraModal from "./AssetCameraModal";

import OtherAssetForm, {
  cleanOtherAssetDraft,
  getOtherSubAssetType,
} from "./forms/OtherAssetForm";
import VehicleAssetForm from "./forms/VehicleAssetForm";

import { AssetDraft, AssetMediaInput, AssetType } from "./utils/types";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

type CameraMode = "photos" | "scan";

type PhotoSlot = "plate" | "details" | "odometer" | "brand" | "other" | null;



const DEFAULT_CONDITIONS = [
  "New",
  "Excellent",
  "Good",
  "Very Good",
  "Acceptable",
  "Poor",
  "Scrape",
];


type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: AssetDraft) => Promise<void> | void;
  mode?: "create" | "edit";
  initialData?: Partial<AssetDraft>;
  disableAssetName?: boolean;
  firstInputRef?: RefObject<TextInput | null>;
  subAssetTypes?: string[];
  conditionOptions?: string[];
  autoOpenCamera?: boolean;

  onRenameSubAssetType?: (
    oldSubAssetType: string,
    newSubAssetType: string
  ) => Promise<void> | void;

  onSaveAndNext?: (draft: AssetDraft) => Promise<void> | void;
  onSaveAndCreate?: (draft: AssetDraft) => Promise<void> | void;
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


const createEmptyImages = () => ({
  plate: null,
  details: null,
  odometer: null,
  brand: null,
  other: [],
});

const normalizeInitialImages = (
  images: any,
  assetType?: string
): AssetDraft["images"] => {
  const empty = createEmptyImages();

  if (!images) return empty;

  // Current API format
  if (!Array.isArray(images) && typeof images === "object") {
    return {
      plate: images.plate || null,
      details: images.details || null,
      odometer: images.odometer || null,
      brand: images.brand || null,
      other: Array.isArray(images.other) ? images.other.filter(Boolean) : [],
    };
  }

  // Backward compatibility for old drafts that used a flat array.
  if (Array.isArray(images)) {
    const clean = images.filter(Boolean);
    const isVehicle = String(assetType || "").toLowerCase() === "vehicle";

    if (isVehicle) {
      return {
        ...empty,
        plate: clean[0] || null,
        details: clean[1] || null,
        odometer: clean[2] || null,
        other: clean.slice(3),
      };
    }

    return {
      ...empty,
      other: clean,
    };
  }

  return empty;
};

const getInitialDraft = (
  initialData?: Partial<AssetDraft>
): AssetDraft => {
  const rawData = cleanAssetRawData(
    ((initialData as any)?.rawData || {}) as Record<string, any>
  );

  const quantity = (initialData as any)?.quantity ?? 1;

  const subAssetType = String(
    (initialData as any)?.subAssetType || ""
  ).trim();

  return {
    images: normalizeInitialImages(initialData?.images, initialData?.assetType),
    name: initialData?.name || "",
    writtenDescription: "",
    voiceNotes: initialData?.voiceNotes?.slice(0, 1) || [],
    condition: initialData?.condition || "Good",
    assetType:
      String(initialData?.assetType || "other").toLowerCase() === "vehicle"
        ? "vehicle"
        : "other",

    brand: initialData?.brand || "",
    model: initialData?.model || "",
    manufactureYear: initialData?.manufactureYear || "",
    kilometersDriven: initialData?.kilometersDriven || "",

    isPresent: initialData?.isPresent ?? true,
    isDone: initialData?.isDone ?? true,

    notes: initialData?.notes || "",
    hasNotes: !!initialData?.notes?.trim(),

    quantity,
    subAssetType,

    rawData,
  } as any;
};;

export default function CreateAssetWizardModal({
  visible,
  onClose,
  onSubmit,
  mode = "create",
  initialData,
  disableAssetName = false,
  firstInputRef,
  subAssetTypes = [],
  conditionOptions = [],
  autoOpenCamera = false,
  onRenameSubAssetType,
  onSaveAndNext,
  onSaveAndCreate,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.dir?.() === "rtl";

  const [step, setStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("photos");

  const [photoSlot, setPhotoSlot] =
    useState<PhotoSlot>(null);

  const [submitting, setSubmitting] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundObjectRef = useRef<any>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const didAutoOpenCameraRef = useRef(false);

  const { width, height } = useWindowDimensions();

  const isSmallScreen = width < 380 || height < 700;
  const isTablet = width >= 768;

  const modalWidth = Math.min(width * 0.97, isTablet ? 900 : 650);

const modalMaxHeight =
  detailsExpanded ? height * 0.92 : height * 0.82;

const modalMinHeight =
  detailsExpanded ? height * 0.90 : height * 0.55;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const [imageLoadingMap, setImageLoadingMap] = useState<
    Record<string, boolean>
  >({});

  const [draft, setDraft] = useState<AssetDraft>(getInitialDraft(initialData));

  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [addConditionMode, setAddConditionMode] = useState(false);
  const [newConditionText, setNewConditionText] = useState("");

  const showSnackbar = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    if (snackbarTimeout.current) {
      clearTimeout(snackbarTimeout.current);
    }

    setSnackbar({ message, type });
    snackbarTimeout.current = setTimeout(() => setSnackbar(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (snackbarTimeout.current) {
        clearTimeout(snackbarTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setDraft(getInitialDraft(initialData));
      setImageLoadingMap({});
      setIsRecording(false);
      setCameraMode("photos");
      setPhotoSlot(null);
      setSubmitting(false);
      setDetailsExpanded(false);
      didAutoOpenCameraRef.current = false;

      const initialAssetType = String(initialData?.assetType || "").toLowerCase();

      const shouldAutoOpenForCreate =
        mode === "create" && initialAssetType === "other";

      const shouldAutoOpenForEdit = mode === "edit" && autoOpenCamera;

      if (
        (shouldAutoOpenForCreate || shouldAutoOpenForEdit) &&
        !didAutoOpenCameraRef.current
      ) {
        didAutoOpenCameraRef.current = true;

        setTimeout(() => {
          setCameraMode("photos");
          setCameraOpen(true);
        }, 350);
      }
    } else {
      stopVoicePlayback();
    }
  }, [visible, initialData, mode, autoOpenCamera]);

  // const previewSize = useMemo(() => {
  //   const columns = width < 360 ? 4 : width < 600 ? 5 : 6;
  //   const cardPadding = 32;
  //   const gaps = (columns - 1) * 6;
  //   const available = modalWidth - cardPadding - gaps;

  //   return Math.max(44, Math.min(62, Math.floor(available / columns)));
  // }, [width, modalWidth]);

const previewSize = useMemo(() => {
  const columns = width < 600 ? 4 : 5;
  const cardPadding =  isSmallScreen ? 28 : 44;
  const gaps = (columns - 1) * 8;
  const available = modalWidth - cardPadding - gaps;

  return Math.max(
  110,
  Math.min(100, Math.floor(available / columns))
);
}, [isSmallScreen, modalWidth]);


  const otherPreviewSize = useMemo(() => {
  const columns = 4;
  const gridGap = 8;

  // modalCard horizontal padding:
  const modalHorizontalPadding = isSmallScreen ? 28 : 44;

  const availableWidth =
    modalWidth -
    modalHorizontalPadding -
    gridGap * (columns - 1);

  return Math.max(
    110,
    Math.min(100, Math.floor(availableWidth / columns))
  );
}, [modalWidth, isSmallScreen]);


  const projectConditions = useMemo(() => {
    const unique = new Map<string, string>();

    DEFAULT_CONDITIONS.forEach((item) => {
      const value = String(item || "").trim();
      if (value) unique.set(value.toLowerCase(), value);
    });

    conditionOptions.forEach((item) => {
      const value = String(item || "").trim();
      if (value) unique.set(value.toLowerCase(), value);
    });

    const current = String((draft as any).condition || "").trim();

    if (current) {
      unique.set(current.toLowerCase(), current);
    }

    return Array.from(unique.values()).sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );
  }, [conditionOptions, (draft as any).condition]);

  const currentCategory: AssetType =
    String(draft.assetType || "").toLowerCase() === "vehicle"
      ? "vehicle"
      : "other";

  const isVehicle = currentCategory === "vehicle";

  const isVehicleAsset =
    String((draft as any).assetType || "").toLowerCase() === "vehicle" ||
    String((draft as any).assetType || "") === "Vehicle";

  const subAssetType = getOtherSubAssetType(draft);

  const displayCategory =
    subAssetType && subAssetType !== currentCategory
      ? `${currentCategory} • ${subAssetType}`
      : currentCategory;

  const getShortVoiceName = () => {
    if (isRecording) return "Recording...";
    if (!draft.voiceNotes?.[0]) return "Add voice";
    return "Play your Voice note";
  };

  const setFieldPosition = (key: string) => (e: LayoutChangeEvent) => {
    fieldPositions.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToField = (key: string) => {
    const y = fieldPositions.current[key] ?? 0;

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 80),
        animated: true,
      });
    }, 80);

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 80),
        animated: true,
      });
    }, 320);
  };

  const openVehiclePhotoCamera = (slot: Exclude<PhotoSlot, "brand" | null>) => {
    setPhotoSlot(slot);
    setCameraMode("photos");
    setCameraOpen(true);
  };

  const openOtherPhotoCamera = (slot: "details" | "brand" | "other") => {
    setPhotoSlot(slot);
    setCameraMode("photos");
    setCameraOpen(true);
  };

  const openPhotoCamera = () => {
    setPhotoSlot("other");
    setCameraMode("photos");
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

    showSnackbar("Scanned text added", "success");
  };

  const getImageKey = (uri: string, index: number) => {
    return `${uri}-${index}`;
  };

  const setImageLoading = (key: string, loading: boolean) => {
    setImageLoadingMap((prev) => ({
      ...prev,
      [key]: loading,
    }));
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (!status.granted) {
        showSnackbar(t("asset.microphonePermissionMessage"), "error");
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch {
      showSnackbar(t("asset.couldNotStartRecording"), "error");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      setIsRecording(false);

      const uri = recorder.uri;

      if (uri) {
        await stopVoicePlayback();

        setDraft((prev) => ({
          ...prev,
          voiceNotes: [
            {
              uri,
              name: `voice_note_${Date.now()}.m4a`,
              type: "audio/m4a",
            },
          ],
        }));
      }
    } catch {
      showSnackbar(t("asset.couldNotStopRecording"), "error");
    }
  };

  const currentYear = new Date().getFullYear();

  const manufactureYears = Array.from(
    { length: currentYear - 1979 },
    (_, index) => String(currentYear - index)
  );

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
    } catch {
      showSnackbar(t("asset.couldNotPlayVoiceNote"), "error");
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
    setPhotoSlot(null);

    Keyboard.dismiss();
    onClose();
  };

  const buildCleanDraft = (): AssetDraft | null => {
    if (!draft.name?.trim()) {
      Alert.alert(t("common.validation"), t("asset.assetNameRequired"));
      return null;
    }

    const cleanedNotes = (draft.notes || "").trim();

    const isVehicleDraft =
      String((draft as any).assetType || "").toLowerCase() === "vehicle";

    if (!isVehicleDraft) {
      const otherDraft = cleanOtherAssetDraft(draft);

      if (!otherDraft) {
        showSnackbar("Asset type is required", "error");
        return null;
      }

      return {
        ...otherDraft,
        notes: cleanedNotes || undefined,
        hasNotes: cleanedNotes.length > 0,
      } as any;
    }

    return {
      ...draft,

      notes: cleanedNotes || undefined,
      hasNotes: cleanedNotes.length > 0,

      quantity: undefined,
      subAssetType: undefined,

      brand: draft.brand || undefined,
      model: draft.model || undefined,
      manufactureYear: draft.manufactureYear || undefined,
      kilometersDriven: draft.kilometersDriven || undefined,

      rawData: cleanAssetRawData((draft as any).rawData),
    } as any;
  };

  const saveDraftWithAction = async (
    action?: (draft: AssetDraft) => Promise<void> | void,
    closeAfterSave = true
  ) => {
    if (submitting) return;

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
                saveDraftWithAction(action, closeAfterSave);
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

    const cleanDraft = buildCleanDraft();

    if (!cleanDraft) return;

    setSubmitting(true);

    try {
      await (action ? action(cleanDraft) : onSubmit(cleanDraft));

      if (closeAfterSave) {
        await handleClose();
      } else {
        setSubmitting(false);
      }
    } catch (error: any) {
      setSubmitting(false);
      Alert.alert(
        t("common.error"),
        error?.message || t("asset.failedToSaveAsset")
      );
    }
  };

  const handleFinish = async () => {
    await saveDraftWithAction(onSubmit);
  };

  const handleFooterSave = async () => {
    if (mode === "edit") {
      await saveDraftWithAction(onSaveAndNext || onSubmit, false);
      return;
    }

    await saveDraftWithAction(onSaveAndCreate || onSubmit, false);
  };

  const saveNewCondition = () => {
    const value = newConditionText.trim();

    if (!value) {
      showSnackbar("Please enter condition", "error");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      condition: value,
    }));

    setNewConditionText("");
    setAddConditionMode(false);
    setConditionModalOpen(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
          }}
        >
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              style={styles.keyboardWrap}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
              enabled
            >
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.modalCard,
                    {
                      width: modalWidth,
                      maxHeight: modalMaxHeight,
                      minHeight: modalMinHeight,
                      //  height: detailsExpanded ? height * 0.92 : height * 0.78,
                      borderRadius: isSmallScreen ? 18 : 24,
                      padding: isSmallScreen ? 14 : 22,
                    },
                    !detailsExpanded && styles.modalCardCompact,
                  ]}
                >
                  <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>
                          {mode === "edit"
                            ? t("asset.editAsset")
                            : t("asset.createAsset")}
                        </Text>

                        <View style={styles.categoryBadge}>
                          <Text
                            style={styles.categoryBadgeText}
                            numberOfLines={1}
                          >
                            {displayCategory}
                          </Text>
                        </View>
                      </View>

   
                    </View>

                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.closeBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled
                  >
                    <>
                      <View style={styles.topQuickRow}>
                        <View
                          style={{ flex: 1 }}
                          onLayout={setFieldPosition("name")}
                        >
                          <Text style={styles.fieldLabel}>Asset name</Text>

                          <View style={styles.assetNameInputWrap}>
                            <TextInput
                              ref={firstInputRef}
                              placeholder={t("asset.assetName")}
                              placeholderTextColor="#767B91"
                              value={draft.name}
                              onChangeText={(text) => {
                                setDraft((prev) => ({
                                  ...prev,
                                  name: text,
                                }));
                              }}
                              editable
                              selectTextOnFocus
                              style={[
                                styles.input,
                                styles.compactInput,
                                styles.assetNameInputWithClear,
                                disableAssetName && styles.inputDisabled,
                              ]}
                              returnKeyType="done"
                              onFocus={() => scrollToField("name")}
                            />

                            {!!draft.name?.trim() && !disableAssetName && (
                              <TouchableOpacity
                                style={styles.assetNameClearBtn}
                                onPress={() => {
                                  setDraft((prev) => ({
                                    ...prev,
                                    name: "",
                                  }));

                                  setTimeout(() => {
                                    firstInputRef?.current?.focus?.();
                                  }, 50);
                                }}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={25}
                                  color={MUTED}
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>


                                         {!isVehicleAsset && (
                        <OtherAssetForm
  draft={draft}
  setDraft={setDraft}
  detailsExpanded={detailsExpanded}
  setDetailsExpanded={setDetailsExpanded}
  subAssetTypes={subAssetTypes}
  onRenameSubAssetType={onRenameSubAssetType}
  showSnackbar={showSnackbar}
  previewSize={otherPreviewSize}
  imageLoadingMap={imageLoadingMap}
  setImageLoading={setImageLoading}
  height={height}
  openOtherPhotoCamera={openOtherPhotoCamera}
/>
                      )}

                                            {isVehicle && (
                        <VehicleAssetForm
                          draft={draft}
                          setDraft={setDraft}
                          detailsExpanded={detailsExpanded}
                          previewSize={previewSize}
                          setDetailsExpanded={setDetailsExpanded}
                          
                          imageLoadingMap={imageLoadingMap}
                          setImageLoading={setImageLoading}
                          manufactureYears={manufactureYears}
                          height={height}
                          openVehiclePhotoCamera={openVehiclePhotoCamera}
                          t={t}
                        />
                      )}




                      {detailsExpanded && (
                        <>
                          <View style={styles.conditionBoxFull}>
                            <Text style={styles.fieldLabel}>
                              {t("asset.condition")}
                            </Text>

                            <TouchableOpacity
                              style={styles.conditionSelectInput}
                              onPress={() => {
                                setConditionModalOpen(true);
                                setAddConditionMode(false);
                                setNewConditionText("");
                                Keyboard.dismiss();
                              }}
                              activeOpacity={0.85}
                            >
                              <Text
                                style={[
                                  styles.conditionSelectText,
                                  !draft.condition &&
                                    styles.vehicleDropdownPlaceholder,
                                ]}
                                numberOfLines={1}
                              >
                                {draft.condition || "Choose condition"}
                              </Text>

                              <Ionicons
                                name="chevron-down"
                                size={16}
                                color={TEXT}
                              />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.notesInputWrap}>
                            <Text style={styles.fieldLabel}>Notes</Text>

                            <TextInput
                              placeholder="Type notes here..."
                              placeholderTextColor="#767B91"
                              value={draft.notes || ""}
                              onChangeText={(text) => {
                                const hasNotes = text.trim().length > 0;

                                setDraft((prev) => ({
                                  ...prev,
                                  notes: text,
                                  hasNotes,
                                }));
                              }}
                              style={styles.notesTextArea}
                              multiline
                              textAlignVertical="top"
                            />
                          </View>

                          <View style={styles.recordDoneRow}>
                            <View style={styles.voiceCompactRow}>
                              <TouchableOpacity
                                style={[
                                  styles.voiceIconBtn,
                                  isRecording && styles.voiceRecordingBtn,
                                ]}
                                onPress={
                                  isRecording ? stopRecording : startRecording
                                }
                                activeOpacity={0.85}
                              >
                                <Ionicons
                                  name={isRecording ? "stop" : "mic-outline"}
                                  size={18}
                                  color="#ffffff"
                                />
                              </TouchableOpacity>

                              {!!draft.voiceNotes?.[0] && !isRecording && (
                                <TouchableOpacity
                                  style={[
                                    styles.voiceSmallAction,
                                    styles.voicePlayAction,
                                  ]}
                                  onPress={() => {
                                    const note = draft.voiceNotes?.[0];
                                    const uri = note?.uri || note?.url || "";
                                    if (!uri) return;

                                    playVoiceNote(uri, 0);
                                  }}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons
                                    name={
                                      playingIndex === 0
                                        ? "pause-circle"
                                        : "play-circle"
                                    }
                                    size={18}
                                    color={ACC}
                                  />
                                </TouchableOpacity>
                              )}

                              <Text
                                style={styles.voiceCompactText}
                                numberOfLines={1}
                              >
                                {getShortVoiceName()}
                              </Text>

                              {!!draft.voiceNotes?.[0] && !isRecording && (
                                <TouchableOpacity
                                  style={styles.voiceSmallAction}
                                  onPress={() => removeVoiceNote(0)}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={18}
                                    color="#FF4444"
                                  />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {mode === "edit" && (
                            <View style={styles.statusInlineRow}>
                              <TouchableOpacity
                                style={styles.doneInlineBtn}
                                onPress={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    isDone: !prev.isDone,
                                  }))
                                }
                                activeOpacity={0.75}
                              >
                                <View
                                  style={[
                                    styles.smallCheckbox,
                                    draft.isDone &&
                                      styles.smallCheckboxChecked,
                                  ]}
                                >
                                  {draft.isDone && (
                                    <Text style={styles.smallCheckmark}>✓</Text>
                                  )}
                                </View>

                                <Text style={styles.statusInlineText}>
                                  {t("asset.markAsDone") || "Mark as done"}
                                </Text>
                              </TouchableOpacity>

                              <View style={styles.statusDivider} />

                              <View style={styles.presentInlineGroup}>
                                <Text style={styles.statusInlineText}>
                                  {t("asset.assetIsPresent") ||
                                    "Asset is present"}
                                </Text>

                                <TouchableOpacity
                                  style={styles.smallRadioOption}
                                  onPress={() =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      isPresent: true,
                                    }))
                                  }
                                  activeOpacity={0.75}
                                >
                                  <Ionicons
                                    name={
                                      draft.isPresent
                                        ? "radio-button-on"
                                        : "radio-button-off"
                                    }
                                    size={15}
                                    color={ACC}
                                  />
                                  <Text style={styles.smallRadioText}>
                                    {t("common.yes") || "Yes"}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.smallRadioOption}
                                  onPress={() =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      isPresent: false,
                                    }))
                                  }
                                  activeOpacity={0.75}
                                >
                                  <Ionicons
                                    name={
                                      !draft.isPresent
                                        ? "radio-button-on"
                                        : "radio-button-off"
                                    }
                                    size={15}
                                    color={ACC}
                                  />
                                  <Text style={styles.smallRadioText}>
                                    {t("common.no") || "No"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}


                        </>
                      )}
                    </>
                  </ScrollView>

                  <View style={styles.footer}>
                    {!isVehicle && (
                      <TouchableOpacity
                        style={[styles.footerIconBtn]}
                        onPress={openPhotoCamera}
                        activeOpacity={0.85}
                      >
                        <MaterialIcons
                          name="photo-camera"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.footerIconBtnText}>
                          {t("asset.openCamera")}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        styles.finishBtn,
                        submitting && { opacity: 0.6 },
                      ]}
                      onPress={handleFooterSave}
                      disabled={submitting}
                    >
                      <Text style={styles.primaryText}>
                        {submitting
                          ? t("asset.saving") || "Saving..."
                          : mode === "edit"
                          ? "Save & Next"
                          : "Save & New Asset"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        styles.finishBtn,
                        submitting && { opacity: 0.6 },
                      ]}
                      onPress={handleFinish}
                      disabled={submitting}
                    >
                      <Text style={styles.primaryText}>
                        {submitting
                          ? t("asset.saving") || "Saving..."
                          : mode === "edit"
                          ? t("asset.saveChanges")
                          : t("asset.finish")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={conditionModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setConditionModalOpen(false);
          setAddConditionMode(false);
          setNewConditionText("");
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setConditionModalOpen(false);
            setAddConditionMode(false);
            setNewConditionText("");
          }}
        >
          <View style={styles.vehicleSelectOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.conditionModalCard}>
                <View style={styles.vehicleSelectHeader}>
                  <Text style={styles.vehicleSelectTitle}>
                    Choose condition
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setConditionModalOpen(false);
                      setAddConditionMode(false);
                      setNewConditionText("");
                    }}
                    style={styles.vehicleSelectCloseBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={18} color="#2b2b2d" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.vehicleSelectScroll}
                  contentContainerStyle={styles.vehicleSelectScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {!addConditionMode ? (
                    <TouchableOpacity
                      style={styles.conditionAddRow}
                      onPress={() => {
                        setAddConditionMode(true);
                        setNewConditionText("");
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={ACC}
                      />
                      <Text style={styles.conditionAddRowText}>
                        Add a Condition
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.conditionInputRow}>
                      <TextInput
                        value={newConditionText}
                        onChangeText={setNewConditionText}
                        placeholder="e.g. Needs Repair"
                        placeholderTextColor="#767B91"
                        style={styles.conditionInput}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={saveNewCondition}
                      />

                      <TouchableOpacity
                        style={styles.conditionTickBtn}
                        onPress={saveNewCondition}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name="checkmark"
                          size={19}
                          color="#ffffff"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {projectConditions.map((condition) => {
                    const isSelected =
                      String(draft.condition || "").trim().toLowerCase() ===
                      condition.trim().toLowerCase();

                    return (
                      <TouchableOpacity
                        key={condition}
                        style={[
                          styles.conditionOptionRow,
                          isSelected && styles.conditionOptionRowSelected,
                        ]}
                        onPress={() => {
                          setDraft((prev) => ({
                            ...prev,
                            condition,
                          }));

                          setConditionModalOpen(false);
                          setAddConditionMode(false);
                          setNewConditionText("");
                        }}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.conditionOptionText,
                            isSelected && styles.conditionOptionTextSelected,
                          ]}
                        >
                          {condition}
                        </Text>

                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={ACC}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AssetCameraModal
        visible={cameraOpen}
        mode={cameraMode}
        onClose={() => setCameraOpen(false)}
        onDone={(media: any[]) => {
          if (cameraMode !== "photos") return;

          const mapped: AssetMediaInput[] = media.map(
            (item: any, index: number) => {
              const isVideo = item.mediaType === "video";

              return {
                uri: item.path?.startsWith("file://")
                  ? item.path
                  : `file://${item.path}`,
                name: isVideo
                  ? `video_${Date.now()}_${index}.mp4`
                  : `photo_${Date.now()}_${index}.jpg`,
                type: isVideo ? "video/mp4" : "image/jpeg",
                mediaType: isVideo ? "video" : "image",
              };
            }
          );

          if (!mapped.length) return;

          setDraft((prev): AssetDraft => {
            const slot = photoSlot || "other";

            if (slot === "other") {
              return {
                ...prev,
                images: {
                  ...prev.images,
                  other: [...(prev.images.other || []), ...mapped],
                },
              };
            }

            return {
              ...prev,
              images: {
                ...prev.images,
                [slot]: mapped[0],
              },
            };
          });

          setPhotoSlot(null);
        }}
        onScanText={(text: string) => {
          if (cameraMode !== "scan") return;

          appendScannedTextToDescription(text);
          setCameraOpen(false);
        }}
      />

      <Modal
        visible={!!snackbar}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSnackbar(null)}
      >
        <View style={styles.snackbarModalOverlay} pointerEvents="none">
          {snackbar && (
            <View
              style={[
                styles.snackbar,
                snackbar.type === "error"
                  ? styles.snackbarError
                  : snackbar.type === "success"
                  ? styles.snackbarSuccess
                  : styles.snackbarInfo,
              ]}
            >
              <Text style={styles.snackbarText}>{snackbar.message}</Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

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
    justifyContent: "center",
    alignItems: "center",
  },

  keyboardWrap: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

 modalCard: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 24,
  padding: 16,
  alignSelf: "center",
  flexShrink: 1,
  overflow: "visible",
},
  scrollView: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },

  assetNameInputWrap: {
    position: "relative",
    justifyContent: "center",
  },

  assetNameInputWithClear: {
    paddingRight: 30,
  },

  assetNameClearBtn: {
    position: "absolute",
    right: 5,
    top: 5,
    bottom: 10,
    width: 35,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleSelectOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  vehicleSelectHeader: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42,50,75,0.08)",
  },

  vehicleSelectTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },

  vehicleSelectCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  vehicleSelectScroll: {
    width: "100%",
  },

  vehicleSelectScrollContent: {
    paddingVertical: 4,
  },

  addDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(247,197,159,0.55)",
    borderWidth: 1,
    borderColor: SOFT,
  },

  addDetailsText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },

  conditionBoxFull: {
    marginBottom: 8,
  },

  modalCardCompact: {
    alignSelf: "center",
  },

  previewImageLoading: {
    opacity: 0.35,
  },

  snackbarModalOverlay: {
    flex: 1,
    alignItems: "center",
  },

  snackbar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 30,
    left: 16,
    right: 16,
    minHeight: 30,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 9999,
  },

  snackbarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  snackbarSuccess: {
    backgroundColor: ACC,
  },

  snackbarError: {
    backgroundColor: "#FF6B6B",
  },

  snackbarInfo: {
    backgroundColor: MUTED,
  },

 header: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 8,
  gap: 8,
},

  title: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "500",
  },

closeBtn: {
  width: 32,
  height: 32,
  borderRadius: 12,
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
},

  vehicleDropdownPlaceholder: {
    color: "#767B91",
    fontWeight: "500",
  },

  notesInputWrap: {
    marginBottom: 8,
  },

  notesTextArea: {
    minHeight: 54,
    maxHeight: 80,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  categoryBadge: {
    backgroundColor: SOFT,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },

  categoryBadgeText: {
    color: TEXT,
    fontSize: 8,
    fontWeight: "300",
  },

  voiceCompactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 5,
  },

  imageLoaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42,50,75,0.35)",
    zIndex: 5,
  },

  voiceIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 17,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },

  voiceRecordingBtn: {
    backgroundColor: "#FF4444",
  },

  voiceCompactText: {
    flex: 1,
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

  voiceSmallAction: {
    width: 30,
    height: 30,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },

  voicePlayAction: {
    marginLeft: 40,
  },

  compactInput: {
    minHeight: 40,
    paddingVertical: 8,
    marginBottom: 8,
  },

  topQuickRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },

  recordDoneRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  footerIconBtn: {
    flex: 0.9,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  finishBtn: {
    flex: 1.3,
    minHeight: 44,
    paddingHorizontal: 8,
  },

  footerIconBtnText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },

  statusInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 8,
  },

  doneInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },

  presentInlineGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },

  statusInlineText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  smallCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  smallCheckboxChecked: {
    backgroundColor: ACC,
  },

  smallCheckmark: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },

  smallRadioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  smallRadioText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },

  statusDivider: {
    width: 1,
    height: 18,
    backgroundColor: BORDER,
  },

  closeText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: TEXT,
    marginBottom: 8,
    fontSize: 11,
  },

  inputDisabled: {
    opacity: 0.55,
  },

  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
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
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "500",
  },

  helper: {
    color: MUTED,
    marginTop: 8,
    fontSize: 12,
  },

  fieldLabel: {
    color: MUTED,
    fontSize: 10,
    marginBottom: 2,
    fontWeight: "500",
  },

  conditionSelectInput: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  conditionSelectText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
  },

  conditionModalCard: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "68%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  conditionAddRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    backgroundColor: "rgba(247,197,159,0.25)",
  },

  conditionAddRowText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },

  conditionInputRow: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    backgroundColor: "rgba(247,197,159,0.25)",
  },

  conditionInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  conditionTickBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },

  conditionOptionRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  conditionOptionRowSelected: {
    backgroundColor: "rgba(42,50,75,0.06)",
  },

  conditionOptionText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  conditionOptionTextSelected: {
    fontWeight: "900",
  },
});