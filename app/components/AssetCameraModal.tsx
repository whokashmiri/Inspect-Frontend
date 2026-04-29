// components/AssetCameraModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  PanResponder,
  ActivityIndicator,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  runOnJS,
} from "react-native-reanimated";
import { useCodeScanner } from "react-native-vision-camera";

// IMPORTANT:
// Point this import to the offline scan helper you already created earlier.
// It should accept a local image URI and return extracted text.
// Example signature:
//   processOfflineScanFromImage(imageUri: string): Promise<string>
import { processOfflineScanFromImage } from "./utils/offlineScanner";

const { width, height } = Dimensions.get("window");
const AnimatedCamera = Animated.createAnimatedComponent(Camera);

const SLIDER_WIDTH = width * 0.5;
const SLIDER_THUMB = 26;

type CameraMode = "photos" | "scan";

type Props = {
  visible: boolean;
  onClose: () => void;
  onDone: (images: any[]) => void;
  mode?: CameraMode;
  onScanText?: (text: string) => void;
};

export default function AssetCameraModal({
  visible,
  onClose,
  onDone,
  mode = "photos",
  onScanText,
}: Props) {
  const device = useCameraDevice("back");
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const { t } = useTranslation();

  const [hasLiveCodeResult, setHasLiveCodeResult] = useState(false);
const lastScannedValueRef = useRef<string | null>(null);
const lastScannedAtRef = useRef<number>(0);

  const camera = useRef<Camera>(null);

  const [photos, setPhotos] = useState<any[]>([]);
  const [zoomDisplay, setZoomDisplay] = useState(1);

  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanText, setScanText] = useState("");
  const [scanError, setScanError] = useState("");
  const [lastCapturedScanPath, setLastCapturedScanPath] = useState<string | null>(
    null
  );

  const zoom = useSharedValue(1);
  const zoomStart = useSharedValue(1);

  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1;
  const sliderMaxZoom = Math.min(maxZoom, 10);

  const zoomSteps = useMemo(() => {
    const steps = new Set<number>([minZoom]);

    const candidates = [1, 2, 3, 5, 10, 15, 20, 25, 30];
    for (const c of candidates) {
      if (c > minZoom && c < maxZoom) steps.add(c);
    }

    steps.add(maxZoom);

    let arr = Array.from(steps).sort((a, b) => a - b);

    if (arr.length > 5) {
      const first = arr[0];
      const last = arr[arr.length - 1];
      const middle = arr.slice(1, -1);

      arr = [
        first,
        middle[0],
        middle[Math.floor(middle.length / 2)],
        middle[middle.length - 1],
        last,
      ].filter((v, i, self) => self.indexOf(v) === i);
    }

    return arr;
  }, [minZoom, maxZoom]);

  const clampZoom = (value: number) => {
    "worklet";
    const min = device?.minZoom ?? 1;
    const max = device?.maxZoom ?? 1;
    return Math.max(min, Math.min(value, max));
  };

  const applyZoom = (value: number) => {
    const clamped = Math.max(minZoom, Math.min(value, maxZoom));
    zoom.value = clamped;
    zoomStart.value = clamped;
    setZoomDisplay(clamped);
  };

  const applySliderZoom = (value: number) => {
    const clamped = Math.max(minZoom, Math.min(value, sliderMaxZoom));
    zoom.value = clamped;
    zoomStart.value = clamped;
    setZoomDisplay(clamped);
  };

  const zoomToSliderX = (z: number) => {
    const safeMin = Math.max(minZoom, 1);
    const safeMax = Math.max(sliderMaxZoom, safeMin + 0.01);
    const clamped = Math.max(safeMin, Math.min(z, safeMax));

    const t =
      (Math.log(clamped) - Math.log(safeMin)) /
      (Math.log(safeMax) - Math.log(safeMin));

    return t * SLIDER_WIDTH;
  };

  const sliderXToZoom = (x: number) => {
    const safeMin = Math.max(minZoom, 1);
    const safeMax = Math.max(sliderMaxZoom, safeMin + 0.01);
    const t = Math.max(0, Math.min(x, SLIDER_WIDTH)) / SLIDER_WIDTH;

    return Math.exp(
      Math.log(safeMin) + t * (Math.log(safeMax) - Math.log(safeMin))
    );
  };

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        applySliderZoom(sliderXToZoom(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        applySliderZoom(sliderXToZoom(e.nativeEvent.locationX));
      },
    })
  ).current;

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      zoomStart.value = zoom.value;
    })
    .onUpdate((e) => {
      const next = clampZoom(zoomStart.value * e.scale);
      zoom.value = next;
      runOnJS(setZoomDisplay)(next);
    });

  const animatedProps = useAnimatedProps(() => ({ zoom: zoom.value }), [zoom]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!visible) {
      zoom.value = minZoom;
      zoomStart.value = minZoom;
      setZoomDisplay(minZoom);
      setPhotos([]);
      setScanText("");
      setScanError("");
      setLastCapturedScanPath(null);
      setIsProcessingScan(false);
      setHasLiveCodeResult(false);
      lastScannedValueRef.current = null;
      lastScannedAtRef.current = 0;
    }
  }, [visible, minZoom, zoom, zoomStart]);


  const codeScanner = useCodeScanner({
  codeTypes: [
    "qr",
    "ean-13",
    "ean-8",
    "code-128",
    "code-39",
    "upc-a",
    "upc-e",
    "pdf-417",
  ],
  onCodeScanned: (codes) => {
    if (mode !== "scan" || !visible || isProcessingScan) return;
    if (!codes?.length) return;

    const first = codes.find((c) => !!c.value);
    const value = first?.value?.trim();

    if (!value) return;

    const now = Date.now();
    const isDuplicate =
      lastScannedValueRef.current === value && now - lastScannedAtRef.current < 1500;

    if (isDuplicate) return;

    lastScannedValueRef.current = value;
    lastScannedAtRef.current = now;

    setScanError("");
   setScanText(t("camera.codeDetected", { value }));
    setHasLiveCodeResult(true);
  },
});

  const handleDismiss = () => {
    setPhotos([]);
    setScanText("");
    setScanError("");
    setLastCapturedScanPath(null);
    setIsProcessingScan(false);
    onClose();
  };


  const takePhoto = async () => {
  if (!camera.current || isProcessingScan) return;

  try {
    const photo = await camera.current.takePhoto({
      enableShutterSound: false,
    });

    if (mode === "photos") {
      setPhotos((prev) => [...prev, photo]);
      return;
    }

    const imageUri = `file://${photo.path}`;
    setLastCapturedScanPath(imageUri);
    setScanError("");
    setScanText("");
    setHasLiveCodeResult(false);
    setIsProcessingScan(true);

    try {
      const extracted = await processOfflineScanFromImage(imageUri, { mode: "auto" });
      const cleaned = extracted?.trim() ?? "";

      if (!cleaned) {
        setScanError(t("camera.noTextDetected"));
        return;
      }

      setScanText(cleaned);
    } catch (error) {
      console.log("Scan processing error:", error);
      setScanError(t("camera.extractFailed"));
    } finally {
      setIsProcessingScan(false);
    }
  } catch (error) {
    console.log("Take photo error:", error);
    if (mode === "scan") {
     setScanError(t("camera.captureFailed"));
    }
  }
};
  const handlePrimaryDone = () => {
    if (mode === "photos") {
      onDone(photos);
      setPhotos([]);
      onClose();
      return;
    }

    const cleaned = scanText.trim();
    if (!cleaned) return;

    onScanText?.(cleaned);
    setScanText("");
    setScanError("");
    setLastCapturedScanPath(null);
    onClose();
  };

  if (!device || !hasPermission) return null;

  const thumbX = zoomToSliderX(zoomDisplay);
  const activeStep =
    zoomSteps.find((s) => Math.abs(s - zoomDisplay) < 0.3) ?? null;

  const doneDisabled =
    mode === "photos" ? photos.length === 0 : !scanText.trim() || isProcessingScan;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        <GestureDetector gesture={pinchGesture}>
          <AnimatedCamera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={visible}
            photo
            animatedProps={animatedProps}
             codeScanner={mode === "scan" ? codeScanner : undefined}
          />
        </GestureDetector>

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={handleDismiss}>
            <Text style={styles.topBtnText}>{t("camera.close")}</Text>
          </TouchableOpacity>

          <View style={styles.topRightGroup}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
  {mode === "scan" ? t("camera.scanMode") : t("camera.photoMode")}
</Text>
            </View>

            <View style={styles.zoomBadge}>
              <Text style={styles.zoomBadgeText}>{zoomDisplay.toFixed(1)}×</Text>
            </View>
          </View>
        </View>

        <View style={styles.zoomRow}>
          {zoomSteps.map((z) => (
            <TouchableOpacity
              key={z}
              style={[styles.zoomBtn, activeStep === z && styles.zoomBtnActive]}
              onPress={() => applyZoom(z)}
            >
              <Text
                style={[
                  styles.zoomText,
                  activeStep === z && styles.zoomTextActive,
                ]}
              >
                {z % 1 === 0 ? z : z.toFixed(1)}×
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sliderWrapper}>
          <Text style={styles.sliderLabel}>
            {minZoom % 1 === 0 ? minZoom : minZoom.toFixed(1)}×
          </Text>

          <View style={styles.sliderTrack} {...sliderPanResponder.panHandlers}>
            <View style={[styles.sliderFill, { width: thumbX }]} />
            <View
              style={[
                styles.sliderThumb,
                { left: thumbX - SLIDER_THUMB / 2 },
              ]}
            />
          </View>

          <Text style={styles.sliderLabel}>
            {sliderMaxZoom >= 10
              ? Math.round(sliderMaxZoom)
              : sliderMaxZoom.toFixed(1)}
            ×
          </Text>
        </View>

        {mode === "scan" && (
          <View style={styles.scanCard}>
            <Text style={styles.scanCardTitle}>
            {t("camera.extractedText")}
            </Text>

            {isProcessingScan ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color={ACC} />
                <Text style={styles.processingText}>
                {t("camera.processing")}
                </Text>
              </View>
            ) : scanText ? (
              <Text numberOfLines={5} style={styles.scanPreviewText}>
                {scanText}
              </Text>
            ) : scanError ? (
              <Text style={styles.scanErrorText}>
              {scanError || t("camera.scanError")}
              </Text>
            ) : (
              <Text style={styles.scanPlaceholderText}>
            {t("camera.scanPlaceholder")}
            </Text>
            )}

            {!!lastCapturedScanPath && !scanText && !isProcessingScan && (
              <Text style={styles.scanHintText}>
              {t("camera.captureAgain")}
              </Text>
            )}
          </View>
        )}

        <View style={[styles.bottomBar, { bottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.smallBtn} onPress={handleDismiss}>
            <Text style={styles.btnText}>{t("commonT.cancel")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.captureOuter,
              isProcessingScan && styles.captureOuterDisabled,
            ]}
            onPress={takePhoto}
            disabled={isProcessingScan}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, doneDisabled && styles.smallBtnDisabled]}
            onPress={handlePrimaryDone}
            disabled={doneDisabled}
          >
            <Text
            style={[styles.btnText, doneDisabled && styles.btnTextDisabled]}>
            {mode === "photos"
            ? t("camera.doneWithCount", { count: photos.length })
              : scanText
              ? t("camera.useResult")
              : t("camera.scan")}
              </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const BORDER = "rgba(255,255,255,0.18)";
const SURFACE = "rgba(0,0,0,0.45)";
const ACC = "#D4FF00";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  camera: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height: height * 0.82,
  },

  topBar: {
    position: "absolute",
    top: Platform.OS === "android" ? 48 : 58,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },

  topRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  topBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  topBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(212,255,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(212,255,0,0.25)",
  },

  modeBadgeText: {
    color: ACC,
    fontSize: 12,
    fontWeight: "700",
  },

  zoomBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  zoomBadgeText: { color: ACC, fontSize: 14, fontWeight: "700" },

  zoomRow: {
    position: "absolute",
    bottom: 190,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  zoomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  zoomBtnActive: { backgroundColor: "rgba(0,255,163,0.14)" },
  zoomText: { color: "#bbb", fontSize: 10, fontWeight: "500" },
  zoomTextActive: { color: ACC },

  sliderWrapper: {
    position: "absolute",
    bottom: 145,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sliderLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "center",
  },

  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
  },

  sliderFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACC,
  },

  sliderThumb: {
    position: "absolute",
    width: SLIDER_THUMB,
    height: SLIDER_THUMB,
    borderRadius: SLIDER_THUMB / 2,
    backgroundColor: "#fff",
    top: -(SLIDER_THUMB / 2 - 2),
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  scanCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 260,
    minHeight: 86,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: BORDER,
  },

  scanCardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  scanPreviewText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 20,
  },

  scanPlaceholderText: {
    color: "#999",
    fontSize: 13,
    lineHeight: 20,
  },

  scanErrorText: {
    color: "#ff8a8a",
    fontSize: 13,
    lineHeight: 20,
  },

  scanHintText: {
    color: "#bcbcbc",
    fontSize: 12,
    marginTop: 8,
  },

  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  processingText: {
    color: "#ddd",
    fontSize: 13,
  },

  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  smallBtn: {
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },

  smallBtnDisabled: {
    opacity: 0.45,
  },

  btnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  btnTextDisabled: { color: "#999" },

  captureOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  captureOuterDisabled: {
    opacity: 0.6,
  },

  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACC,
  },
});