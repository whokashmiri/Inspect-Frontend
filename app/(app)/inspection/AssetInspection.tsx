import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Modal,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";



import { VideoView, useVideoPlayer } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import NetInfo from "@react-native-community/netinfo";
import { transactionApi } from "../../../api/api";
import {
  getOfflineTransactionById,
  saveOfflineTransaction,
  savePendingInspectionSync,
  saveLocalInspectionMedia,
  dedupeMedia,
} from "../../offline/transactionsOffline";
import AssetCameraModal from "../../components/AssetCameraModal";
import { useTranslation } from "react-i18next";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";

 function MediaVideoPlayer({ uri }: { uri: string }) {
   const player = useVideoPlayer(uri, (player) => {
     player.loop = false;
     player.play();
   });
 
   return (
     <VideoView
       player={player}
       style={styles.videoPlayer}
       nativeControls
     />
   );
 }


function optimiseCloudinaryUrl(uri: string | undefined | null): string {
  if (!uri) return "";
  if (uri.startsWith("file://") || uri.startsWith("data:")) return uri;
  if (!uri.includes("res.cloudinary.com")) return uri;
  if (uri.includes("/upload/w_") || uri.includes("/upload/q_")) return uri;
  return uri.replace("/upload/", "/upload/w_800,q_auto,f_auto/");
}

type CheckedState = Record<string, boolean>;
type CameraMode = "photos" | "scan";
type TabType = "details" | "media";

const ENVIRONMENT_OPTIONS = [
  ["mosque", "assetInspection.environment.mosque"],
  ["commercialMarket", "assetInspection.environment.commercialMarket"],
  ["park", "assetInspection.environment.park"],
  ["governmentFacility", "assetInspection.environment.governmentFacility"],
  ["highSpeedRoad", "assetInspection.environment.highSpeedRoad"],
  ["otherServices", "assetInspection.environment.otherServices"],
  ["educationalFacility", "assetInspection.environment.educationalFacility"],
  ["securityFacility", "assetInspection.environment.securityFacility"],
  ["medicalFacility", "assetInspection.environment.medicalFacility"],
] as const;

function PreviewItem({ item }: { item: any }) {
  const { width, height } = Dimensions.get("window");

  const mediaWidth = width;
  const mediaHeight = height * 0.78;

  const isVideo =
    item.mediaType === "video" ||
    item.type?.startsWith?.("video") ||
    item.mimeType?.startsWith?.("video");

  const uri = item.localUri || item.uri || item.url;

  const player = useVideoPlayer(isVideo ? uri : null, (player) => {
    player.loop = false;
  });

  return (
    <View style={[styles.previewPage, { width, height }]}>
      <View style={styles.previewCenter}>
        {isVideo ? (
          <VideoView
            player={player}
            style={{ width: mediaWidth, height: mediaHeight }}
            nativeControls
            contentFit="contain"
          />
        ) : (
          <Image
            source={{ uri }}
            style={{ width: mediaWidth, height: mediaHeight }}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
  );
}

export default function AssetInspection() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabType>("details");

 const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
const [viewerMedia, setViewerMedia] = useState<any[]>([]);
const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [snackbar, setSnackbar] = useState("");
  // Notes modal state
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState("");
  // Temp notes while modal is open
  const [draftNotes, setDraftNotes] = useState("");

  const params = useLocalSearchParams<{
    transactionId?: string;
    projectId?: string;
    propertyType?: string;
  }>();

  const transactionId = params.transactionId || "";
  const projectId = params.projectId || "";

    const goBackToInspectionType = () => {
  router.push("/inspection/InspectionType");
};

  const propertyType =
    transactionDetails?.evalData?.propertyType ||
    params.propertyType ||
    "Not available";

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

  const flatListRef = useRef<FlatList>(null);

  const showSnackbar = (message: string) => {
    setSnackbar(message);
    setTimeout(() => setSnackbar(""), 2800);
  };

  const logMedia = (label: string, list: any[]) => {
    console.log(
      `[INSPECTION_MEDIA] ${label}`,
      list.map((m, i) => ({
        i,
        localId: m.localId,
        name: m.name,
        uri: m.uri,
        localUri: m.localUri,
        originalUri: m.originalUri,
        isLocalOnly: m.isLocalOnly,
        queuedForUpload: m.queuedForUpload,
        uploadedAt: m.uploadedAt,
        id: m.id,
        _id: m._id,
        serverId: m.serverId,
        url: m.url,
      }))
    );
  };

  useEffect(() => {
    if (!transactionId) return;

    const loadTransaction = async () => {
      try {
        setLoading(true);
        let transaction: any = null;

        const net = await NetInfo.fetch();
        const isOnline = !!net.isConnected && !!net.isInternetReachable;

        if (isOnline) {
          try {
            const transactionRes = await transactionApi.getById(transactionId);
            transaction = transactionRes.data;
            if (transaction) {
              await saveOfflineTransaction(transaction);
            }
          } catch (error) {
            console.log("Online transaction load failed, using offline:", error);
            transaction = await getOfflineTransactionById(transactionId);
          }
        } else {
          transaction = await getOfflineTransactionById(transactionId);
        }

        if (!transaction) {
          Alert.alert("Offline unavailable", "This transaction is not downloaded yet.");
          return;
        }

        const evalData = transaction?.evalData || {};

        setTransactionDetails(transaction);
        setInspectionNotes(evalData.inspectionNotes || "");

        const building = evalData.buildingCondition || {};
        const status = String(building.status || "").toLowerCase();

        if (status === "under construction" || status === "underconstruction") {
          setBuildingCondition("underConstruction");
        } else if (status === "used") {
          setBuildingCondition("used");
        } else if (status === "new") {
          setBuildingCondition("new");
        } else if (status === "other") {
          setBuildingCondition("other");
        } else {
          setBuildingCondition("");
        }

        setBuildingCompletion(
          building.completionPct !== null && building.completionPct !== undefined
            ? String(building.completionPct)
            : ""
        );

        setOtherBuildingCondition(building.otherText || "");
        setMedia(dedupeMedia(transaction?.media || []));

        const environment = evalData.surroundingEnvironment || [];
        const services = evalData.availableServices || {};

        setChecked((prev) => {
          const next = { ...prev };
          ENVIRONMENT_OPTIONS.forEach(([key]) => {
            next[key] =
              environment.includes(key) ||
              environment.includes(t(`assetInspection.environment.${key}`));
          });
          next.electricity = !!services.electricity;
          next.sanitaryDrainage = !!services.sanitaryDrainage;
          next.telephoneLine = !!services.telephoneLine;
          next.waterMeters =
            services.waterMetersCount !== null && services.waterMetersCount !== undefined;
          next.electricityMeters =
            services.electricityMetersCount !== null &&
            services.electricityMetersCount !== undefined;
          return next;
        });

        setElectricityUnits(
          services.electricityUnits !== null && services.electricityUnits !== undefined
            ? String(services.electricityUnits)
            : ""
        );
        setWaterMetersCount(
          services.waterMetersCount !== null && services.waterMetersCount !== undefined
            ? String(services.waterMetersCount)
            : ""
        );
        setElectricityMetersCount(
          services.electricityMetersCount !== null &&
            services.electricityMetersCount !== undefined
            ? String(services.electricityMetersCount)
            : ""
        );

        setMedia(dedupeMedia(Array.isArray(transaction?.media) ? transaction.media : []));
      } catch (error: any) {
        console.log("LOAD TRANSACTION ERROR:", error);
        Alert.alert("Error", error?.message || "Failed to load transaction.");
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [transactionId]);

 

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedEnvironment = useMemo(() => {
    return ENVIRONMENT_OPTIONS.filter(([key]) => checked[key]).map(([key]) => key);
  }, [checked]);

  const getBuildingStatus = () => {
    switch (buildingCondition) {
      case "underConstruction": return "Under Construction";
      case "used": return "Used";
      case "new": return "New";
      case "other": return "Other";
      default: return "";
    }
  };

  const openCamera = () => {
    setCameraMode("photos");
    setCameraOpen(true);
  };

const openPreview = (index: number) => {
  setViewerMedia(media);
  setActiveMediaIndex(index);
  setMediaViewerVisible(true);
};

const closeMediaViewer = () => {
  setMediaViewerVisible(false);
};
  const makeLocalMediaId = () =>
    `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const getStableMediaKey = (item: any, index?: number) =>
    String(
      item?.serverId ||
        item?.id ||
        item?._id ||
        item?.url ||
        item?.originalUri ||
        item?.localUri ||
        item?.uri ||
        item?.localId ||
        index ||
        ""
    );

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
        localId: makeLocalMediaId(),
        isLocalOnly: true,
        uri: asset.uri,
        name:
          asset.fileName ||
          `${isVideo ? "video" : "photo"}_${Date.now()}_${index}.${isVideo ? "mp4" : "jpg"}`,
        type: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        mimeType: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        mediaType: isVideo ? "video" : "image",
        size: asset.fileSize || 0,
        width: asset.width || null,
        height: asset.height || null,
        duration: asset.duration || null,
      };
    });

    setMedia((prev) => dedupeMedia([...prev, ...selected]));
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCameraDone = (capturedMedia: any) => {
    if (cameraMode !== "photos") return;

    const list = Array.isArray(capturedMedia)
      ? capturedMedia
      : capturedMedia
      ? [capturedMedia]
      : [];

    const validList = list.filter((item: any) => {
      const rawUri = item?.uri || item?.path || item?.localUri;
      if (!rawUri) return false;
      return true;
    });

    const mapped = validList.map((item: any, index: number) => {
      const isVideo =
        item.mediaType === "video" ||
        item.type?.startsWith?.("video") ||
        item.mimeType?.startsWith?.("video") ||
        item.uri?.endsWith?.(".mp4") ||
        item.path?.endsWith?.(".mp4");

      const rawUri = item.uri || item.path || item.localUri;
      const finalUri = rawUri?.startsWith?.("file://") ? rawUri : `file://${rawUri}`;

      return {
        localId: makeLocalMediaId(),
        isLocalOnly: true,
        uri: finalUri,
        localUri: finalUri,
        originalUri: finalUri,
        name: isVideo
          ? `video_${Date.now()}_${index}.mp4`
          : `photo_${Date.now()}_${index}.jpg`,
        type: isVideo ? "video/mp4" : "image/jpeg",
        mimeType: isVideo ? "video/mp4" : "image/jpeg",
        mediaType: isVideo ? "video" : "image",
        duration: item.duration || null,
        width: item.width || null,
        height: item.height || null,
        size: item.size || item.fileSize || 0,
      };
    });

    if (mapped.length === 0) {
      showSnackbar("No media captured. Please try again.");
      setCameraOpen(false);
      return;
    }

    setMedia((prev) =>
      dedupeMedia([...(Array.isArray(prev) ? prev : []), ...mapped])
    );
    setCameraOpen(false);
  };

  const isUploadableLocalMedia = (item: any) => {
    return (
      item.isLocalOnly === true &&
      item.queuedForUpload !== true &&
      !item.uploadedAt &&
      !item.serverId &&
      !item.id &&
      !item._id &&
      !item.url &&
      Boolean(item.uri || item.localUri)
    );
  };

  // Open notes modal — seed draft with current notes
  const openNotesModal = () => {
    setDraftNotes(inspectionNotes);
    setNotesModalVisible(true);
  };

  const saveNotes = () => {
    setInspectionNotes(draftNotes);
    setNotesModalVisible(false);
  };

  const cancelNotes = () => {
    setNotesModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!transactionId) {
      showSnackbar("Missing transaction id.");
      return;
    }
    if (saving) return;

    try {
      setSaving(true);

      const inspectionPayload = {
        inspectionNotes,
        buildingCondition: {
          status: getBuildingStatus(),
          completionPct: buildingCompletion ? Number(buildingCompletion) : null,
          otherText: buildingCondition === "other" ? otherBuildingCondition : "",
        },
        surroundingEnvironment: selectedEnvironment,
        availableServices: {
          electricity: checked.electricity,
          electricityUnits: electricityUnits ? Number(electricityUnits) : null,
          sanitaryDrainage: checked.sanitaryDrainage,
          telephoneLine: checked.telephoneLine,
          waterMetersCount:
            checked.waterMeters && waterMetersCount ? Number(waterMetersCount) : null,
          electricityMetersCount:
            checked.electricityMeters && electricityMetersCount
              ? Number(electricityMetersCount)
              : null,
        },
      };

      const localOnlyMedia = dedupeMedia(media).filter(isUploadableLocalMedia);
      const savedLocalMedia = dedupeMedia(
        await saveLocalInspectionMedia(transactionId, localOnlyMedia)
      ).filter(isUploadableLocalMedia);

      const queuedSavedLocalMedia = savedLocalMedia.map((item: any) => ({
        ...item,
        isLocalOnly: true,
        queuedForUpload: true,
        uploadedAt: null,
      }));

      const mergedMedia = dedupeMedia(
        media.map((item: any) => {
          if (!isUploadableLocalMedia(item)) return item;
          const match = queuedSavedLocalMedia.find((m: any) => {
            return (
              m.localId === item.localId ||
              m.originalUri === item.uri ||
              m.originalUri === item.localUri ||
              m.uri === item.uri ||
              m.localUri === item.localUri
            );
          });
          return {
            ...(match || item),
            localId: match?.localId || item.localId,
            isLocalOnly: true,
            queuedForUpload: true,
            uploadedAt: null,
          };
        })
      );

      const net = await NetInfo.fetch();
      const online = !!net.isConnected && net.isInternetReachable !== false;

      const updatedTransaction = {
        ...(transactionDetails || {}),
        id: transactionId,
        _id: transactionId,
        imagesCount: mergedMedia.length,
        media: mergedMedia,
        evalData: {
          ...(transactionDetails?.evalData || {}),
          ...inspectionPayload,
        },
        isCompleted: true,
        hasPendingInspectionSync: !online,
        lastLocalUpdateAt: new Date().toISOString(),
      };

      await saveOfflineTransaction(updatedTransaction);

      if (online) {
        showSnackbar("Inspection saved. Syncing in background...");
        router.back();
        setTimeout(() => {
          syncInspectionInBackground({
            transactionId,
            inspectionPayload,
            savedLocalMedia: queuedSavedLocalMedia,
            updatedTransaction,
          });
        }, 0);
      } else {
        await savePendingInspectionSync({
          transactionId,
          data: inspectionPayload,
          media: queuedSavedLocalMedia,
        });
        showSnackbar("Inspection saved offline. It will sync when online.");
        router.back();
      }
    } catch (error: any) {
      console.log("SAVE INSPECTION ERROR:", error);
      showSnackbar(error?.message || "Failed to save inspection.");
    } finally {
      setSaving(false);
    }
  };

  const syncInspectionInBackground = async ({
    transactionId,
    inspectionPayload,
    savedLocalMedia = [],
    updatedTransaction,
  }: any) => {
    try {
      const safeMedia = Array.isArray(savedLocalMedia) ? savedLocalMedia : [];
      await transactionApi.updateInspectionData(transactionId, inspectionPayload);

      const uploadMedia = dedupeMedia(safeMedia).filter((m: any) => {
        return (
          m.isLocalOnly === true &&
          !m.uploadedAt &&
          !m.serverId &&
          !m.id &&
          !m._id &&
          !m.url
        );
      });

      if (uploadMedia.length > 0) {
        await transactionApi.addMedia({
          transactionId: String(transactionId),
          media: uploadMedia,
        });
      }

      const fresh = await transactionApi.getById(String(transactionId));
      const serverTx = fresh.data;

      await saveOfflineTransaction({
        ...serverTx,
        media: dedupeMedia(serverTx.media || []),
        imagesCount: dedupeMedia(serverTx.media || []).length,
        hasPendingInspectionSync: false,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log("Background inspection sync failed:", error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={ACC} />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{t("assetInspection.title")}</Text>
              <Text style={styles.subtitle}>{t("assetInspection.subtitle")}</Text>
            </View>
          </View>

          {/* ── Tab Bar ── */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tab, activeTab === "details" && styles.tabActive]}
              onPress={() => setActiveTab("details")}
            >
              <Text style={[styles.tabText, activeTab === "details" && styles.tabTextActive]}>
                Details
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === "media" && styles.tabActive]}
              onPress={() => setActiveTab("media")}
            >
              <Text style={[styles.tabText, activeTab === "media" && styles.tabTextActive]}>
                Images & Videos
              </Text>
              {media.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{media.length}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            {/* ══ DETAILS TAB ══ */}
            {activeTab === "details" && (
              <>
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
                        label={t("assetInspection.underConstruction")}
                        selected={buildingCondition === "underConstruction"}
                        onPress={() => setBuildingCondition("underConstruction")}
                      />
                      <RadioRow
                        label={t("assetInspection.used")}
                        selected={buildingCondition === "used"}
                        onPress={() => setBuildingCondition("used")}
                      />
                      <RadioRow
                        label={t("assetInspection.new")}
                        selected={buildingCondition === "new"}
                        onPress={() => setBuildingCondition("new")}
                      />
                    </View>
                    <View style={styles.otherRow}>
                      <View style={{ width: 90 }}>
                        <RadioRow
                          label={t("assetInspection.other")}
                          selected={buildingCondition === "other"}
                          onPress={() => setBuildingCondition("other")}
                        />
                      </View>
                      {buildingCondition === "other" && (
                        <TextInput
                          value={otherBuildingCondition}
                          onChangeText={setOtherBuildingCondition}
                          placeholder={t("assetInspection.describeOtherCondition")}
                          placeholderTextColor={MUTED}
                          style={styles.otherInput}
                        />
                      )}
                    </View>
                  </View>

                  <View style={styles.completionRow}>
                    <Text style={styles.completionLabel}>
                      {t("assetInspection.buildingCompletion")}
                    </Text>
                    <TextInput
                      value={buildingCompletion}
                      onChangeText={setBuildingCompletion}
                      placeholder={t("assetInspection.percent")}
                      placeholderTextColor={MUTED}
                      keyboardType="numeric"
                      editable={buildingCondition === "underConstruction"}
                      style={[
                        styles.completionInputSmall,
                        buildingCondition !== "underConstruction" && styles.disabledInput,
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
                    label={t("assetInspection.sanitaryDrainage")}
                    checked={checked.sanitaryDrainage}
                    onPress={() => toggle("sanitaryDrainage")}
                  />
                  <CheckboxRow
                    label={t("assetInspection.telephoneLine")}
                    checked={checked.telephoneLine}
                    onPress={() => toggle("telephoneLine")}
                  />
                  <View style={styles.electricityRow}>
                    <View style={{ flex: 1 }}>
                      <CheckboxRow
                        label={t("assetInspection.electricity")}
                        checked={checked.electricity}
                        onPress={() => toggle("electricity")}
                      />
                    </View>
                    {checked.electricity && (
                      <TextInput
                        value={electricityUnits}
                        onChangeText={setElectricityUnits}
                        placeholder={t("assetInspection.units")}
                        placeholderTextColor={MUTED}
                        keyboardType="numeric"
                        style={styles.rowInput}
                      />
                    )}
                  </View>
                  <View style={styles.electricityRow}>
                    <View style={{ flex: 1 }}>
                      <CheckboxRow
                        label={t("assetInspection.waterMeters")}
                        checked={checked.waterMeters}
                        onPress={() => toggle("waterMeters")}
                      />
                    </View>
                    {checked.waterMeters && (
                      <TextInput
                        value={waterMetersCount}
                        onChangeText={setWaterMetersCount}
                        placeholder={t("assetInspection.count")}
                        placeholderTextColor={MUTED}
                        keyboardType="numeric"
                        style={styles.rowInput}
                      />
                    )}
                  </View>
                  <View style={styles.electricityRow}>
                    <View style={{ flex: 1 }}>
                      <CheckboxRow
                        label={t("assetInspection.electricityMeters")}
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

                {/* ── Inspection Notes — button only, opens modal ── */}
                <Section title="Inspection Notes">
                  <Pressable onPress={openNotesModal} style={styles.notesToggle}>
                    <Text style={styles.notesToggleText}>
                      {inspectionNotes ? "Edit Notes" : "Add Notes"}
                    </Text>
                  </Pressable>
                  {inspectionNotes ? (
                    <Text style={styles.notesPreview} numberOfLines={2}>
                      {inspectionNotes}
                    </Text>
                  ) : null}
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
              </>
            )}

            {/* ══ MEDIA TAB ══ */}
            {activeTab === "media" && (
              <>
                <Section title="Images & Videos">
                  <View style={styles.mediaActions}>
                    <Pressable onPress={openCamera} style={styles.mediaActionBtn}>
                      <Text style={styles.mediaActionText}>
                        {t("assetInspection.camera")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={pickMedia}
                      style={[styles.mediaActionBtn, styles.secondaryActionBtn]}
                    >
                      <Text
                        style={[styles.mediaActionText, styles.secondaryActionText]}
                      >
                        {t("assetInspection.gallery")}
                      </Text>
                    </Pressable>
                  </View>

                  {media.length > 0 ? (
                    <View style={styles.mediaGrid}>
                      {media.map((item, index) => {
                        const isVideo =
                          item.mediaType === "video" ||
                          item.type?.startsWith("video");
                        return (
                          <Pressable
                            key={getStableMediaKey(item, index)}
                            style={styles.mediaCard}
                            onPress={() => openPreview(index)}
                          >
                            {isVideo ? (
                              <View style={styles.videoBox}>
                                {item.thumbnailUrl ? (
                                  <Image
                                    source={{ uri: item.thumbnailUrl }}
                                    style={styles.mediaImg}
                                  />
                                ) : (
                                  <Text style={styles.videoText}>VIDEO</Text>
                                )}
                                <View style={styles.playBadge}>
                                  <Text style={styles.playText}>▶</Text>
                                </View>
                              </View>
                            ) : (
                              <Image
                                source={{ uri: optimiseCloudinaryUrl(item.localUri || item.uri || item.url) }}
                                style={styles.mediaImg}
                              />
                            )}
                            <Pressable
                              onPress={() => removeMedia(index)}
                              style={styles.removeBtn}
                            >
                              <Text style={styles.removeText}>×</Text>
                            </Pressable>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.emptyMediaText}>
                      {t("assetInspection.noMedia")}
                    </Text>
                  )}
                </Section>

                {/* Save button also available on media tab */}
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
              </>
            )}
          </ScrollView>

          {/* ══ NOTES MODAL ══ */}
          <Modal
            visible={notesModalVisible}
            transparent
            animationType="slide"
            onRequestClose={cancelNotes}
          >
            <KeyboardAvoidingView
              style={styles.notesModalOverlay}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <Pressable style={styles.notesModalBackdrop} onPress={cancelNotes} />
              <View style={styles.notesModalSheet}>
                {/* Handle bar */}
                <View style={styles.notesModalHandle} />

                <View style={styles.notesModalHeader}>
                  <Text style={styles.notesModalTitle}>Inspection Notes</Text>
                  <Pressable onPress={cancelNotes} style={styles.notesModalCloseBtn}>
                    <Text style={styles.notesModalCloseText}>×</Text>
                  </Pressable>
                </View>

                <TextInput
                  value={draftNotes}
                  onChangeText={setDraftNotes}
                  placeholder="Write inspection notes here..."
                  placeholderTextColor={MUTED}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                  style={styles.notesModalInput}
                />

                <View style={styles.notesModalActions}>
                  <Pressable onPress={cancelNotes} style={styles.notesCancelBtn}>
                    <Text style={styles.notesCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={saveNotes} style={styles.notesSaveBtn}>
                    <Text style={styles.notesSaveText}>Save Notes</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

    

         {/* ══ MEDIA VIEWER MODAL ══ */}
<Modal
  visible={mediaViewerVisible}
  transparent={false}
  animationType="fade"
  onRequestClose={closeMediaViewer}
>
  <View style={styles.viewerWrap}>
    <FlatList
      ref={flatListRef}
      data={viewerMedia}
      keyExtractor={(_, index) => `media-${index}`}
      showsVerticalScrollIndicator={false}
      pagingEnabled
      snapToAlignment="start"
      decelerationRate="fast"
      getItemLayout={(_data, index) => ({
        length: Dimensions.get("window").height,
        offset: Dimensions.get("window").height * index,
        index,
      })}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: Math.min(info.index, viewerMedia.length - 1),
            animated: false,
          });
        }, 100);
      }}
      onLayout={() => {
        if (activeMediaIndex > 0 && viewerMedia.length > activeMediaIndex) {
          flatListRef.current?.scrollToIndex({
            index: activeMediaIndex,
            animated: false,
          });
        }
      }}
      onViewableItemsChanged={({ viewableItems }) => {
        if (viewableItems.length > 0) {
          setActiveMediaIndex(viewableItems[0].index ?? 0);
        }
      }}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      renderItem={({ item }) => (
        <View style={{
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}>
          {item.mediaType === "video" ? (
            <MediaVideoPlayer key={item.uri} uri={item.uri} />
          ) : (
            <Image
              source={{ uri: item.localUri || item.uri || item.url }}
              style={{
                width: Dimensions.get("window").width,
                height: Dimensions.get("window").height,
              }}
              resizeMode="contain"
            />
          )}
        </View>
      )}
    />

    {/* Counter indicator */}
    <View style={styles.viewerIndicator}>
      <Text style={styles.viewerIndicatorText}>
        {activeMediaIndex + 1} / {viewerMedia.length}
      </Text>
    </View>

    {/* Close button */}
    <Pressable style={styles.viewerClose} onPress={closeMediaViewer}>
      <Text style={styles.viewerCloseText}>×</Text>
    </Pressable>
  </View>
</Modal>

          <AssetCameraModal
            visible={cameraOpen}
            mode={cameraMode}
            onClose={() => setCameraOpen(false)}
            onDone={handleCameraDone}
            onScanText={() => {}}
          />

          {snackbar ? (
            <View style={styles.snackbar}>
              <Text style={styles.snackbarText}>{snackbar}</Text>
            </View>
          ) : null}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
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
  items: readonly (readonly [string, string])[];
  checked: CheckedState;
  toggle: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.grid}>
      {items.map(([key, labelKey]) => (
        <Pressable
          key={key}
          onPress={() => toggle(key)}
          style={[styles.gridItem, checked[key] && styles.gridItemActive]}
        >
          <View style={[styles.smallBox, checked[key] && styles.checkboxActive]}>
            {checked[key] && <Text style={styles.smallCheck}>✓</Text>}
          </View>
          <Text style={[styles.gridText, checked[key] && styles.gridTextActive]}>
            {t(labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: MUTED, fontSize: 14 },

  container: { padding: 18, paddingBottom: 80, flexGrow: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  headerTextWrap: { flex: 1 },
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
  backText: { fontSize: 26, color: ACC, marginTop: -3 },
  title: { fontSize: 19, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 11, color: MUTED, marginTop: 2 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginHorizontal: 0,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    gap: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: ACC },
  tabText: { fontSize: 13, fontWeight: "700", color: MUTED },
  tabTextActive: { color: ACC },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  // Section
  section: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 11,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13.5, fontWeight: "800", color: TEXT, marginBottom: 9 },

  // Read-only
  readOnlyBox: { flexDirection: "row", backgroundColor: "#FAFBFC", borderRadius: 12, padding: 5 },
  readOnlyLabel: { fontSize: 10.5, color: MUTED, fontWeight: "700", marginBottom: 3 },
  readOnlyValue: { fontSize: 10, color: TEXT, fontWeight: "500" },

  // Checkbox
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
  checkboxActive: { backgroundColor: ACC, borderColor: ACC },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "900" },
  checkLabel: { flex: 1, fontSize: 12.5, color: TEXT, fontWeight: "600" },

  viewerIndicator: {
  position: "absolute",
  bottom: 32,
  alignSelf: "center",
  backgroundColor: "rgba(0,0,0,0.5)",
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 20,
},
viewerIndicatorText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "700",
},

videoPlayer: {
  width: "100%",
  height: "100%",
  backgroundColor: "#000",
},
  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
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
  gridItemActive: { backgroundColor: "#F5F7FA", borderColor: ACC },
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
  smallCheck: { color: "#fff", fontSize: 10, fontWeight: "900" },
  gridText: { flex: 1, fontSize: 11, color: TEXT, fontWeight: "600" },
  gridTextActive: { color: ACC, fontWeight: "800" },

  // Radio
  radioGroup: { gap: 2 },
  radioRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
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
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACC },
  radioLabel: { fontSize: 13, color: TEXT, fontWeight: "600" },

  // Building condition
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 5,
  },
  otherRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
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
  completionRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  completionLabel: { fontSize: 12, fontWeight: "700", color: TEXT },
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
  disabledInput: { opacity: 0.5, backgroundColor: "#F1F3F7" },

  // Services
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

  // Notes trigger (inline)
  notesToggle: {
    alignSelf: "flex-start",
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
  },
  notesToggleText: { color: ACC, fontSize: 13, fontWeight: "900" },
  notesPreview: {
    marginTop: 8,
    fontSize: 12,
    color: MUTED,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Notes modal
  notesModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  notesModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  notesModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    marginHorizontal: 10,
  },
  notesModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 16,
    
  },
  notesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  notesModalTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  notesModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  notesModalCloseText: { fontSize: 22, color: TEXT, lineHeight: 24 },
  notesModalInput: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    color: TEXT,
    fontSize: 14,
    backgroundColor: "#FAFBFC",
    marginBottom: 16,
  },
  notesModalActions: { flexDirection: "row", gap: 10 },
  notesCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  notesCancelText: { color: MUTED, fontSize: 13, fontWeight: "700" },
  notesSaveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },
  notesSaveText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  // Media
  mediaActions: { flexDirection: "row", gap: 8 },
  mediaActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: ACC },
  mediaActionText: { color: "#fff", fontSize: 12.5, fontWeight: "800" },
  secondaryActionText: { color: ACC },
  emptyMediaText: { fontSize: 11.5, color: MUTED, marginTop: 8, textAlign: "center" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  mediaCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: SURFACE,
    position: "relative",
  },
  mediaImg: { width: "100%", height: "100%" },
  videoBox: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: ACC },
  videoText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  playBadge: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  playText: { color: "#fff", fontSize: 15, fontWeight: "900" },
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
  removeText: { color: "#fff", fontSize: 15, marginTop: -2 },

  // Viewer
  viewerWrap: { flex: 1, backgroundColor: "#000" },
  viewerHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  viewerClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCloseText: { color: "#fff", fontSize: 30, lineHeight: 32, fontWeight: "500" },
  viewerCount: { color: "#fff", fontSize: 14, fontWeight: "900" },

  // Preview
  previewPage: { backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  previewCenter: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },

  // Primary button
  primaryBtn: {
    height: 46,
    borderRadius: 13,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  disabledBtn: { opacity: 0.65 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Snackbar
  snackbar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 24,
    backgroundColor: ACC,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  snackbarText: { color: "#fff", fontSize: 13, fontWeight: "700", textAlign: "center" },
});