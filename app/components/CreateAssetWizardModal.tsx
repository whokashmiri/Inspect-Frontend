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

type CameraMode = "photos" | "scan";


type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: AssetDraft) => Promise<void> | void;
  mode?: "create" | "edit";
  initialData?: Partial<AssetDraft>;
  disableAssetName?: boolean;
  firstInputRef?: RefObject<TextInput | null>;
};

const getInitialDraft = (
  initialData?: Partial<AssetDraft>
): AssetDraft => ({
  images: initialData?.images || [],
  name: initialData?.name || "",
  writtenDescription: initialData?.writtenDescription || "",
  voiceNotes: initialData?.voiceNotes?.slice(0, 1) || [],
  condition: initialData?.condition || "Good",
  assetType: initialData?.assetType || "Other",
  brand: initialData?.brand || "",
  model: initialData?.model || "",
  manufactureYear: initialData?.manufactureYear || "",
  kilometersDriven: initialData?.kilometersDriven || "",
  isPresent: initialData?.isPresent ?? true,
  isDone: initialData?.isDone ?? true,
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
  firstInputRef,

}: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.dir?.() === "rtl";

  const [step, setStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);
const [cameraMode, setCameraMode] = useState<CameraMode>("photos");
  const [notesModalVisible, setNotesModalVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);


  const [snackbar, setSnackbar] = useState<{
  message: string;
  type: "success" | "error" | "info";
} | null>(null);

const snackbarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
 const soundObjectRef = useRef<any>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

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

 const { width, height } = useWindowDimensions();


const isSmallScreen = width < 380 || height < 700;
const isTablet = width >= 768;

const modalWidth = Math.min(width * 0.95, isTablet ? 720 : 520);
const modalMaxHeight = height * 0.95;
const modalMinHeight = height * 0.88;



  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

 

  const [draft, setDraft] = useState<AssetDraft>(
    getInitialDraft(initialData)
  );

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
    setIsRecording(false);
    setCameraMode("photos");
    setSubmitting(false);
    didAutoOpenCameraRef.current = false;

    if (mode === "create" && initialData?.assetType && !didAutoOpenCameraRef.current) {
      didAutoOpenCameraRef.current = true;

      setTimeout(() => {
        setCameraMode("photos");
        setCameraOpen(true);
      }, 350);
    }
  } else {
    stopVoicePlayback();
  }
}, [visible, initialData, mode]);

 const previewSize = useMemo(() => {
  const columns = width < 360 ? 4 : width < 600 ? 5 : 6;
  const cardPadding = 32;
  const gaps = (columns - 1) * 6;
  const available = modalWidth - cardPadding - gaps;

  return Math.max(44, Math.min(62, Math.floor(available / columns)));
}, [width, modalWidth]);

const didAutoOpenCameraRef = useRef(false);
const [customTypeInput, setCustomTypeInput] = useState("");

const getQuantity = () => {
  const rawQuantity =
    (draft as any).quantity ??
    (draft as any).rawData?.quantity ??
    1;

  return String(rawQuantity);
};

const updateQuantity = (nextValue: number | string) => {
  const cleaned =
    typeof nextValue === "number"
      ? nextValue
      : Number(String(nextValue).replace(/[^0-9]/g, "") || 0);

  const quantity = Math.max(0, cleaned);

  setDraft((prev) => ({
    ...prev,
    rawData: {
      ...((prev as any).rawData || {}),
      quantity,
    },
  } as any));
};

const updateCustomAssetType = (value: string) => {
  setDraft((prev) => ({
    ...prev,
    rawData: {
      ...((prev as any).rawData || {}),
      customAssetType: value,
    },
  } as any));
};

const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);
const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);

const projectAssetTypes = [
  "Sofa",
  "Chair",
  "TV",
  "Table",
  "AC",
  "Bed",
];
const currentCategory =
  String(draft.assetType || "").toLowerCase() === "vehicle"
    ? "Vehicle"
    : "Other";

const isVehicle = currentCategory === "Vehicle";

const customAssetType = String(
  (draft as any).rawData?.customAssetType || currentCategory
).trim();

const displayCategory =
  customAssetType && customAssetType !== currentCategory
    ? `${currentCategory} • ${customAssetType}`
    : currentCategory;

const getShortVoiceName = () => {
  if (isRecording) return "Recording...";
  if (!draft.voiceNotes?.[0]) return "Add voice";
  return "Voice note";
};

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
     showSnackbar(t("asset.assetNameRequired"), "error");
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

    showSnackbar("Scanned text added", "success");
  };

  const pickImagesFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showSnackbar(t("asset.photoPermissionMessage"), "error");

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
     showSnackbar(t("asset.unablePickImages"), "error");
    }
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
    } catch (error) {
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
  } catch (error) {
    showSnackbar(t("asset.couldNotStopRecording"), "error");
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
  if (submitting) return;

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

  setSubmitting(true);

  try {
    await onSubmit(draft);
    await handleClose();
  } catch (error: any) {
    setSubmitting(false);
    Alert.alert(
      t("common.error"),
      error?.message || t("asset.failedToSaveAsset")
    );
  }
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
               behavior={Platform.OS === "ios" ? "padding" : "position"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
              enabled={true}
            >
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.modalCard,
                        {
                        width: modalWidth,
                        maxHeight: modalMaxHeight,
                        minHeight: modalMinHeight,
                        borderRadius: isSmallScreen ? 18 : 24,
                        padding: isSmallScreen ? 12 : 16,
                  },

                  ]}
                >
                  <View style={styles.header}>
<View style={{ flex: 1 }}>
  <View style={styles.titleRow}>
    <Text style={styles.title}>
      {mode === "edit" ? t("asset.editAsset") : t("asset.createAsset")}
    </Text>

    <View style={styles.categoryBadge}>
      <Text style={styles.categoryBadgeText} numberOfLines={1}>
        {displayCategory}
      </Text>
    </View>

 <View style={styles.assetTypeChooseWrap}>
  <View style={styles.assetTypeChooseControl}>
    <TouchableOpacity
      style={styles.assetTypeChooseBtn}
      onPress={() => {
        setAssetTypeDropdownOpen((prev) => !prev);
        setShowCustomTypeInput(false);
      }}
      activeOpacity={0.85}
    >
      <Text style={styles.assetTypeChooseText}>Choose</Text>

      <Ionicons
        name={assetTypeDropdownOpen ? "chevron-up" : "chevron-down"}
        size={13}
        color={TEXT}
      />
    </TouchableOpacity>

    <View style={styles.assetTypeChooseDivider} />

    <TouchableOpacity
      style={styles.assetTypePlusBtn}
      onPress={() => {
        setShowCustomTypeInput((prev) => !prev);
        setAssetTypeDropdownOpen(false);
      }}
      activeOpacity={0.85}
    >
      <Ionicons name="add" size={16} color={SURFACE} />
    </TouchableOpacity>
  </View>

  {assetTypeDropdownOpen && (
    <View style={styles.addTypeDropdownMenu}>
      {projectAssetTypes.map((type) => (
        <TouchableOpacity
          key={type}
          style={styles.addTypeDropdownOption}
          onPress={() => {
            setDraft((prev) => ({
              ...prev,
              assetType: "Other",
              rawData: {
                ...((prev as any).rawData || {}),
                customAssetType: type,
              },
            } as any));

            setAssetTypeDropdownOpen(false);
            setShowCustomTypeInput(false);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.addTypeDropdownOptionText}>{type}</Text>

          {customAssetType === type && (
            <Ionicons name="checkmark" size={16} color={ACC} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
  </View>

  {showCustomTypeInput && (
    <View style={styles.headerTypeInputRow}>
      <TextInput
        placeholder="Asset type e.g. Sofa, Chair, TV"
        placeholderTextColor="#767B91"
        value={
          customAssetType === "Vehicle" || customAssetType === "Other"
            ? ""
            : customAssetType
        }
        onChangeText={updateCustomAssetType}
        style={styles.headerTypeInput}
      />

      <TouchableOpacity
        style={styles.headerTypeSaveBtn}
        onPress={() => {
          const value = String(
            (draft as any).rawData?.customAssetType || ""
          ).trim();

          if (!value) {
            showSnackbar("Please enter asset type", "error");
            return;
          }

          setDraft((prev) => ({
            ...prev,
            assetType: "Other",
            rawData: {
              ...((prev as any).rawData || {}),
              customAssetType: value,
            },
          } as any));

          setShowCustomTypeInput(false);
          setAssetTypeDropdownOpen(false);
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.headerTypeSaveText}>Add</Text>
      </TouchableOpacity>
    </View>
  )}
</View>

                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.closeBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* <Text style={styles.step}>
                    {t("asset.stepOf", { step, total: totalSteps })}
                  </Text> */}
                  
                  <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    nestedScrollEnabled={true}
                  >
                  <>
  <View style={styles.topQuickRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>Asset name</Text>
      <TextInput
        ref={firstInputRef}
        placeholder={t("asset.assetName")}
        placeholderTextColor="#767B91"
        value={draft.name}
        onChangeText={(text) => {
          if (!disableAssetName) {
            setDraft((prev) => ({ ...prev, name: text }));
          }
        }}
        editable={!disableAssetName}
        selectTextOnFocus={!disableAssetName}
        style={[
          styles.input,
          styles.compactInput,
          disableAssetName && styles.inputDisabled,
        ]}
        returnKeyType="done"
      />
    </View>

    <View style={styles.quantityBox}>
      <Text style={styles.fieldLabel}>Quantity</Text>

      <View style={styles.quantityControl}>
        <TouchableOpacity
          style={styles.quantityIconBtn}
          onPress={() => updateQuantity(Number(getQuantity()) - 1)}
        >
          <Ionicons name="remove" size={18} color={TEXT} />
        </TouchableOpacity>

        <TextInput
          value={getQuantity()}
          onChangeText={updateQuantity}
          keyboardType="numeric"
          style={styles.quantityInput}
        />

        <TouchableOpacity
          style={styles.quantityIconBtn}
          onPress={() => updateQuantity(Number(getQuantity()) + 1)}
        >
          <Ionicons name="add" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
    </View>
  </View>

  

 

  {!!customTypeInput && (
    <View style={styles.customTypeRow}>
      <TextInput
        placeholder="Example: Sofa, Chair, TV"
        placeholderTextColor="#767B91"
        value={customAssetType === "Vehicle" || customAssetType === "Other" ? "" : customAssetType}
        onChangeText={updateCustomAssetType}
        style={[styles.input, styles.compactInput, { flex: 1 }]}
      />

      <TouchableOpacity
        style={styles.addTypeSaveBtn}
        onPress={() => {
          const value = String((draft as any).rawData?.customAssetType || "").trim();

          if (!value) {
            showSnackbar("Please enter asset type", "error");
            return;
          }

          setDraft((prev) => ({
            ...prev,
            assetType: "Other",
            rawData: {
              ...((prev as any).rawData || {}),
              customAssetType: value,
            },
          } as any));

          setCustomTypeInput("");
        }}
      >
        <Text style={styles.primaryText}>Add</Text>
      </TouchableOpacity>
    </View>
  )}

  <Text style={styles.fieldLabel}>{t("asset.condition")}</Text>
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
      <Picker.Item label={t("asset.conditionGood")} value="Good" />
      <Picker.Item label={t("asset.conditionNew")} value="New" />
      <Picker.Item label={t("asset.conditionUsed")} value="Used" />
      <Picker.Item label={t("asset.conditionDamaged")} value="Damaged" />
    </Picker>
  </View>

  {isVehicle && (
    <View style={styles.vehicleGrid}>
      <View style={styles.vehicleField}>
        <Text style={styles.fieldLabel}>{t("asset.brand")}</Text>
        <TextInput
          placeholder={t("asset.brand")}
          placeholderTextColor="#767B91"
          value={draft.brand}
          onChangeText={(text) =>
            setDraft((prev) => ({ ...prev, brand: text }))
          }
          style={[styles.input, styles.compactInput]}
        />
      </View>

      <View style={styles.vehicleField}>
        <Text style={styles.fieldLabel}>{t("asset.model")}</Text>
        <TextInput
          placeholder={t("asset.model")}
          placeholderTextColor="#767B91"
          value={draft.model}
          onChangeText={(text) =>
            setDraft((prev) => ({ ...prev, model: text }))
          }
          style={[styles.input, styles.compactInput]}
        />
      </View>

      <View style={styles.vehicleField}>
        <Text style={styles.fieldLabel}>{t("asset.manufactureYear")}</Text>
        <TextInput
          placeholder={t("asset.manufactureYear")}
          placeholderTextColor="#767B91"
          value={draft.manufactureYear}
          keyboardType="numeric"
          onChangeText={(text) =>
            setDraft((prev) => ({ ...prev, manufactureYear: text }))
          }
          style={[styles.input, styles.compactInput]}
        />
      </View>

      <View style={styles.vehicleField}>
        <Text style={styles.fieldLabel}>{t("asset.kilometersDriven")}</Text>
        <TextInput
          placeholder={t("asset.kilometersDriven")}
          placeholderTextColor="#767B91"
          value={draft.kilometersDriven}
          keyboardType="numeric"
          onChangeText={(text) =>
            setDraft((prev) => ({ ...prev, kilometersDriven: text }))
          }
          style={[styles.input, styles.compactInput]}
        />
      </View>
    </View>
  )}

  <TouchableOpacity
    style={styles.notesCheckRow}
    onPress={() => {
      if (draft.hasNotes) {
        setNotesModalVisible(true);
        return;
      }

      setDraft((prev) => ({ ...prev, hasNotes: true }));
      setNotesModalVisible(true);
    }}
    activeOpacity={0.8}
  >
    <Ionicons
      name={draft.hasNotes ? "checkbox" : "square-outline"}
      size={22}
      color="#2A324B"
    />

    <View style={styles.notesTextWrap}>
      <Text style={styles.notesCheckText}>Add Notes</Text>

      {!!draft.notes?.trim() && (
        <Text style={styles.notesPreview} numberOfLines={1}>
          {draft.notes.trim()}
        </Text>
      )}
    </View>
  </TouchableOpacity>

<View style={styles.recordDoneRow}>
  <View style={styles.voiceCompactRow}>
    <TouchableOpacity
      style={[
        styles.voiceIconBtn,
        isRecording && styles.voiceRecordingBtn,
      ]}
      onPress={isRecording ? stopRecording : startRecording}
      activeOpacity={0.85}
    >
      <Ionicons
        name={isRecording ? "stop" : "mic-outline"}
        size={19}
        color="#ffffff"
      />
    </TouchableOpacity>

    {!!draft.voiceNotes?.[0] && !isRecording && (
      <TouchableOpacity
        style={styles.voiceSmallAction}
        onPress={() => {
          const note = draft.voiceNotes?.[0];
          const uri = note?.uri || note?.url || "";
          if (!uri) return;

          playVoiceNote(uri, 0);
        }}
        activeOpacity={0.85}
      >
        <Ionicons
          name={playingIndex === 0 ? "pause-circle" : "play-circle"}
          size={24}
          color={ACC}
        />
      </TouchableOpacity>
    )}

    <Text style={styles.voiceCompactText} numberOfLines={1}>
      {getShortVoiceName()}
    </Text>

    {!!draft.voiceNotes?.[0] && !isRecording && (
      <TouchableOpacity
        style={styles.voiceSmallAction}
        onPress={() => removeVoiceNote(0)}
        activeOpacity={0.85}
      >
        <Ionicons name="trash-outline" size={21} color="#FF4444" />
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
          draft.isDone && styles.smallCheckboxChecked,
        ]}
      >
        {draft.isDone && <Text style={styles.smallCheckmark}>✓</Text>}
      </View>

      <Text style={styles.statusInlineText}>
        {t("asset.markAsDone") || "Mark as done"}
      </Text>
    </TouchableOpacity>

    <View style={styles.statusDivider} />

    <View style={styles.presentInlineGroup}>
      <Text style={styles.statusInlineText}>
        {t("asset.assetIsPresent") || "Asset is present"}
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
          name={draft.isPresent ? "radio-button-on" : "radio-button-off"}
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
          name={!draft.isPresent ? "radio-button-on" : "radio-button-off"}
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

  <Text style={styles.helper}>
    {t("asset.imagesSelected", { count: draft.images.length })}
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
                  </ScrollView>

<View style={styles.footer}>
  <TouchableOpacity
    style={[styles.footerIconBtn, styles.footerCameraBtn]}
    onPress={openPhotoCamera}
    activeOpacity={0.85}
  >
    <MaterialIcons name="photo-camera" size={18} color="#fff" />
    <Text style={styles.footerIconBtnText}>{t("asset.openCamera")}</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.footerIconBtn}
    onPress={pickImagesFromLibrary}
    activeOpacity={0.85}
  >
    <Ionicons name="image-outline" size={18} color={TEXT} />
    <Text style={styles.footerIconBtnTextDark}>
      {t("asset.uploadFromPhone")}
    </Text>
  </TouchableOpacity>

  {/* <TouchableOpacity
    style={styles.footerIconBtn}
    onPress={openScanCamera}
    activeOpacity={0.85}
  >
    <Ionicons name="scan-outline" size={18} color={TEXT} />
    <Text style={styles.footerIconBtnTextDark}>
      {t("asset.scanText") || "Scan"}
    </Text>
  </TouchableOpacity> */}

  <TouchableOpacity
    style={[styles.primaryBtn, styles.finishBtn, submitting && { opacity: 0.6 }]}
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

      <AssetCameraModal
  visible={cameraOpen}
  mode={cameraMode}
  onClose={() => setCameraOpen(false)}
  onDone={(media: any[]) => {
    if (cameraMode !== "photos") return;

    const mapped = media.map((item: any, index: number) => {
     const isVideo = item.mediaType === "video";

      return {
        uri: item.path?.startsWith("file://")
          ? item.path
          : `file://${item.path}`,
        name: isVideo
          ? `video_${Date.now()}_${index}.mp4`
        : `photo_${Date.now()}_${index}.jpg`,
      type: isVideo ? "video/mp4" : "image/jpeg",
      };
    });

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
  if (!draft.notes?.trim()) {
    setDraft((prev) => ({
      ...prev,
      hasNotes: false,
      notes: "",
    }));
  }

  setNotesModalVisible(false);
}}
      />


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
 const { t, i18n } = useTranslation();
const isRTL = i18n.language === "ar" || i18n.dir?.() === "rtl";

const { width, height } = useWindowDimensions();

const isSmallScreen = width < 380 || height < 700;
const isTablet = width >= 768;

const notesModalWidth = Math.min(width * 0.92, isTablet ? 480 : 420);
const notesModalMaxHeight = height * 0.78;


  useEffect(() => {
    setCurrentNotes(notes);
  }, [notes]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
  style={[
    styles.modalCardSmall,
    {
      width: notesModalWidth,
      maxHeight: notesModalMaxHeight,
      borderRadius: isSmallScreen ? 18 : 24,
      padding: isSmallScreen ? 12 : 16,
    },
  ]}
>
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
     justifyContent: "center",   // vertical center
  alignItems: "center",       // horizontal center
  },

  keyboardWrap: {
  
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 24,
  padding: 16,
  alignSelf: "center",
  flex: 0,          // ← ADD THIS so it doesn't expand unboundedly
  flexShrink: 1,    // ← ADD THIS so it can shrink when keyboard appears

  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: {
      elevation: 8,
    },
  }),
},

modalCardSmall: {
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 24,
  padding: 16,
  alignSelf: "center",

  ...Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    android: {
      elevation: 6,
    },
  }),
},

  scrollView: {
    flex: 1,
  },


  addTypeDropdownWrap: {
  position: "relative",
  zIndex: 999,
},

addTypeDropdownMenu: {
  position: "absolute",
  top: 30,
  right: 0,
  width: 175,
  maxHeight: 230,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  paddingVertical: 6,
  zIndex: 9999,
  elevation: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
},

addTypeDropdownTitle: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "800",
  paddingHorizontal: 10,
  paddingBottom: 6,
  borderBottomWidth: 1,
  borderBottomColor: BORDER,
  marginBottom: 4,
},

addTypeDropdownOption: {
  minHeight: 36,
  paddingHorizontal: 10,
  paddingVertical: 8,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
},

addTypeDropdownOptionText: {
  flex: 1,
  color: TEXT,
  fontSize: 12,
  fontWeight: "700",
},

assetTypeChooseWrap: {
  position: "relative",
  zIndex: 999,
},

assetTypeChooseControl: {
  height: 28,
  minWidth: 106,
  borderRadius: 999,
  backgroundColor: SOFT,
  borderWidth: 1,
  borderColor: BORDER,
  flexDirection: "row",
  alignItems: "center",
  overflow: "hidden",
},

assetTypeChooseBtn: {
  flex: 1,
  height: "100%",
  paddingLeft: 9,
  paddingRight: 5,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
},

assetTypeChooseText: {
  color: TEXT,
  fontSize: 10,
  fontWeight: "800",
},

assetTypeChooseDivider: {
  width: 1,
  height: 16,
  backgroundColor: BORDER,
},

assetTypePlusBtn: {
  width: 30,
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor:ACC
},





snackbar: {
  position: "absolute",
  top: Platform.OS === "ios" ? 60 : 5,
  left: 20,
  right: 20,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 14,
  zIndex: 9999,
  elevation: 20,
},

snackbarText: {
  color: "#ffffff",
  fontSize: 13,
  fontWeight: "600",
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


  radioRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 12,
},

radioOption: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: 1,
},

radioText: {
  color: TEXT,
  fontSize: 14,
  fontWeight: "600",
},

notesCheckRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
  marginBottom: 10,
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 12,
  paddingHorizontal: 10,
  paddingVertical: 9,
},

notesPreview: {
  color: MUTED,
  fontSize: 11,
  marginTop: 2,
},

notesRemoveBtn: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
},

notesRemoveText: {
  color: "#ff6b6b",
  fontSize: 12,
  fontWeight: "700",
},

notesModalCard: {
  width: "88%",
  maxWidth: 360,
  alignSelf: "center",
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 18,
  padding: 14,
},

notesBox: {
  height: 120,
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  padding: 10,
  marginBottom: 8,
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
  fontSize: 10,
  fontWeight: "800",
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
  paddingVertical: 8,
  marginBottom: 8,
},

voiceIconBtn: {
  width: 34,
  height: 34,
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
  fontWeight: "700",
},

voiceSmallAction: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
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

quantityBox: {
  width: 125,
},

quantityControl: {
  height: 40,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  overflow: "hidden",
},

quantityIconBtn: {
  width: 36,
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
},

quantityInput: {
  flex: 1,
  height: "100%",
  textAlign: "center",
  color: TEXT,
  fontSize: 14,
  fontWeight: "700",
},

categoryHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 4,
  marginBottom: 6,
},

addTypeBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: SOFT,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
},

addTypeText: {
  color: TEXT,
  fontSize: 11,
  fontWeight: "700",
},

categoryChipRow: {
  flexDirection: "row",
  gap: 8,
  marginBottom: 10,
},

categoryChip: {
  flex: 1,
  minHeight: 42,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: SURFACE,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

categoryChipActive: {
  backgroundColor: ACC,
  borderColor: ACC,
},

categoryChipText: {
  color: TEXT,
  fontSize: 13,
  fontWeight: "800",
},

categoryChipTextActive: {
  color: "#ffffff",
},

customTypeRow: {
  flexDirection: "row",
  gap: 8,
  alignItems: "center",
  marginBottom: 8,
},

addTypeSaveBtn: {
  backgroundColor: ACC,
  minHeight: 40,
  paddingHorizontal: 14,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
},

vehicleGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 4,
},

vehicleField: {
  width: "48%",
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
  flex: 1,
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: SURFACE,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 6,
},

footerCameraBtn: {
  backgroundColor: ACC,
  borderColor: ACC,
},

footerIconBtnText: {
  color: "#ffffff",
  fontSize: 9,
  fontWeight: "700",
  marginTop: 2,
  textAlign: "center",
},

footerIconBtnTextDark: {
  color: TEXT,
  fontSize: 9,
  fontWeight: "700",
  marginTop: 2,
  textAlign: "center",
},

finishBtn: {
  flex: 1,
  minHeight: 44,
  paddingHorizontal: 8,
},




addTypeHeaderBtn: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
},

headerTypeInputRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
  marginTop: 2,
  marginBottom: 3,
},

headerTypeInput: {
  flex: 1,
  height: 36,
  borderRadius: 12,
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  paddingHorizontal: 10,
  color: TEXT,
  fontSize: 12,
},

headerTypeSaveBtn: {
  height: 36,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: ACC,
  alignItems: "center",
  justifyContent: "center",
},

headerTypeSaveText: {
  color: "#ffffff",
  fontSize: 12,
  fontWeight: "800",
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



notesInput: {
  flex: 1,
  color: TEXT,
  fontSize: 14,
  minHeight: 100,
  textAlignVertical: "top",
},

modalActions: {
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 8,
},


notesCheckText: {
  color: TEXT,
  fontSize: 14,
  fontWeight: "600",
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

  notesTextWrap: {
  flex: 1,
},



  roww: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: TEXT,
    marginBottom: 8,
    fontSize: 11,
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

  footerRTL: {
  flexDirection: "row-reverse",
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
    fontSize: 10,
    marginBottom: 2,
    fontWeight: "500",
  },

  modelInput: {
    minHeight: 54,
  },

  descriptionInputWrapper: {
    maxHeight: 150,
    marginBottom: 12,
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

  isPresentRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 12,
  marginBottom: 4,
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 12,
  paddingHorizontal: 10,
  paddingVertical: 10,
},

isPresentText: {
  color: TEXT,
  fontSize: 14,
  fontWeight: "600",
},


});