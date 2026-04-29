//OfflineScannerModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLiveBarcodeScanner } from "./hooks/useLiveBarcodeScanner";
import { useOfflineOcrScanner } from "./hooks/useOfflineOcrScanner";
import { insertManyScans } from "./utils/scannerDb";
import {
  ExtractedScanResult,
  ScanToggleKey,
  ScanToggles,
  ScannerModalResult,
} from "./utils/scanTypes";

type Props = {
  visible: boolean;
  onClose: () => void;
  onApplyToDescription: (payload: ScannerModalResult) => void;
};

const defaultToggles: ScanToggles = {
  barcode: true,
  generalText: false,
  numbersOnly: false,
  carPlate: false,
};

export default function OfflineScannerModal({
  visible,
  onClose,
  onApplyToDescription,
}: Props) {
  const insets = useSafeAreaInsets();
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  const { t } = useTranslation();

  const [flash, setFlash] = useState<"off" | "on">("off");
  const [toggles, setToggles] = useState<ScanToggles>(defaultToggles);
  const [results, setResults] = useState<ExtractedScanResult[]>([]);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [hasLiveLockedResult, setHasLiveLockedResult] = useState(false);

  const { isProcessing, processCapturedImage } = useOfflineOcrScanner({ toggles });

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!visible) {
      setResults([]);
      setCapturedImageUri(null);
      setHasLiveLockedResult(false);
      setToggles(defaultToggles);
    }
  }, [visible]);

  const codeScanner = useLiveBarcodeScanner({
    enabled: visible && toggles.barcode && !hasLiveLockedResult,
    onDetected: (liveResults) => {
      setResults(liveResults);
      setHasLiveLockedResult(true);
    },
  });

  const selectedModes = useMemo(
    () => Object.entries(toggles).filter(([, v]) => v).map(([k]) => k),
    [toggles]
  );

  const toggleMode = (key: ScanToggleKey) => {
    setResults([]);
    setCapturedImageUri(null);
    setHasLiveLockedResult(false);
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const captureAndProcess = async () => {
    if (!camera.current) return;
    if (!toggles.barcode && !toggles.generalText && !toggles.numbersOnly && !toggles.carPlate) {
     Alert.alert(
        t("scanner.alerts.selectModeTitle"),
        t("scanner.alerts.selectModeDesc")
      );
      return;
    }

    try {
      const photo = await camera.current.takePhoto({
        flash,
        enableShutterSound: false,
      });

      const uri = `file://${photo.path}`;
      setCapturedImageUri(uri);

      // If barcode mode is on and live already found a result, no need for OCR.
      if (hasLiveLockedResult && toggles.barcode) return;

      const ocrResults = await processCapturedImage(uri);

      if (!ocrResults.length) {
       Alert.alert(
      t("scanner.alerts.noTextTitle"),
      t("scanner.alerts.noTextDesc")
      );
        return;
      }

      setResults(ocrResults);
    } catch (error) {
      console.log("captureAndProcess error", error);
      Alert.alert(
        t("scanner.alerts.failedTitle"),
        t("scanner.alerts.failedDesc")
        );
    }
  };

  const handleSave = () => {
    if (!results.length) {
      Alert.alert(
        t("scanner.alerts.noResultsTitle"),
        t("scanner.alerts.noResultsDesc")
      );
      return;
    }

    const timestamp = new Date().toISOString();
    const normalizedResults = results.map((item) => ({
      ...item,
      imageUri: item.imageUri ?? capturedImageUri,
      createdAt: timestamp,
    }));

    insertManyScans(normalizedResults);

    const descriptionText = normalizedResults
      .map((item) => `[${item.type.toUpperCase()}] ${item.value}`)
      .join("\n");

    onApplyToDescription({
      descriptionText,
      results: normalizedResults,
      imageUri: capturedImageUri,
    });

    onClose();
  };

  if (!device || !hasPermission) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={visible}
          photo
          codeScanner={codeScanner}
          torch={flash === "on" ? "on" : "off"}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.topBtn} onPress={onClose}>
           <Text style={styles.topBtnText}>{t("scanner.close")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topBtn}
            onPress={() => setFlash((p) => (p === "off" ? "on" : "off"))}
          >
            <Text style={styles.topBtnText}>
            {t("scanner.flash")}: {t(`scanner.flash_${flash}`)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
         <Text style={styles.title}>{t("scanner.title")}</Text>

          <View style={styles.toggleWrap}>
            <ToggleChip
               label={t("scanner.modes.barcode")}
              active={toggles.barcode}
              onPress={() => toggleMode("barcode")}
            />
            <ToggleChip
              label={t("scanner.modes.generalText")}
              active={toggles.generalText}
              onPress={() => toggleMode("generalText")}
            />
            <ToggleChip
               label={t("scanner.modes.numbersOnly")}
              active={toggles.numbersOnly}
              onPress={() => toggleMode("numbersOnly")}
            />
            <ToggleChip
                label={t("scanner.modes.carPlate")}
              active={toggles.carPlate}
              onPress={() => toggleMode("carPlate")}
            />
          </View>

          <Text style={styles.subText}>
          {t("scanner.active")}:{" "}
          {selectedModes.length
            ? selectedModes.map((m) => t(`scanner.modes.${m}`)).join(", ")
        : t("scanner.none")}
        </Text>

          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{t("scanner.extractedResults")}</Text>

            {isProcessing ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}> {t("scanner.processing")}</Text>
              </View>
            ) : results.length ? (
              <ScrollView style={{ maxHeight: 160 }}>
                {results.map((item, index) => (
                  <View key={`${item.type}-${item.value}-${index}`} style={styles.resultItem}>
                    <Text style={styles.resultType}>{item.type}</Text>
                    <Text style={styles.resultValue}>{item.value}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>
                 {t("scanner.noResults")}
              </Text>
            )}
          </View>

          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.captureBtn} onPress={captureAndProcess}>
              <Text style={styles.captureBtnText}> {t("scanner.capture")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}> {t("scanner.save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topBtnText: { color: "#fff", fontWeight: "700" },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 12 },
  toggleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: "#D4FF00",
    borderColor: "#D4FF00",
  },
  chipText: { color: "#fff", fontWeight: "600" },
  chipTextActive: { color: "#000" },
  subText: { color: "#aaa", marginTop: 10, marginBottom: 12 },
  resultBox: {
    backgroundColor: "#181818",
    borderRadius: 16,
    padding: 12,
    minHeight: 120,
  },
  resultTitle: { color: "#fff", fontWeight: "700", marginBottom: 10 },
  emptyText: { color: "#888" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { color: "#ddd" },
  resultItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2A2A2A",
  },
  resultType: { color: "#D4FF00", fontWeight: "700", marginBottom: 2 },
  resultValue: { color: "#fff" },
  bottomActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  captureBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  captureBtnText: { color: "#000", fontWeight: "800" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#D4FF00",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#000", fontWeight: "800" },
});