import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const { width, height } = Dimensions.get("window");
const AnimatedCamera = Animated.createAnimatedComponent(Camera);

const SLIDER_WIDTH = width * 0.5;
const SLIDER_THUMB = 26;

export default function AssetCameraModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (images: any[]) => void;
}) {
  const device = useCameraDevice("back");
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();

  const camera = useRef<Camera>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [zoomDisplay, setZoomDisplay] = useState(1);

  const zoom = useSharedValue(1);
  const zoomStart = useSharedValue(1);

  // ── Device zoom limits ──────────────────────────────────────────────────────
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1; // true device max, no artificial cap
  const sliderMaxZoom = Math.min(maxZoom, 10);

  // Build quick-access zoom buttons from device capabilities.
  // Always include minZoom and maxZoom, and sensible steps in between.
  const zoomSteps = useMemo(() => {
    const steps = new Set<number>([minZoom]);

    const candidates = [1, 2, 3, 5, 10, 15, 20, 25, 30];
    for (const c of candidates) {
      if (c > minZoom && c < maxZoom) steps.add(c);
    }
    steps.add(maxZoom);

    let arr = Array.from(steps).sort((a, b) => a - b);

    // Keep at most 5 buttons; pick evenly distributed ones if more
    if (arr.length > 5) {
      const first = arr[0];
      const last = arr[arr.length - 1];
      const middle = arr.slice(1, -1);
      const gap = Math.max(1, Math.floor((middle.length - 1) / 2));
      arr = [
        first,
        middle[0],
        middle[Math.floor(middle.length / 2)],
        middle[middle.length - 1],
        last,
      ];
    }

    return arr;
  }, [minZoom, maxZoom]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
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

  // ── Slider logic ─────────────────────────────────────────────────────────────
  // Use square-root scale so lower zoom values get more slider space
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

  // ── Pinch gesture ────────────────────────────────────────────────────────────
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

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!visible) {
      zoom.value = minZoom;
      zoomStart.value = minZoom;
      setZoomDisplay(minZoom);
    }
  }, [visible, minZoom]);

  // ── Photo ─────────────────────────────────────────────────────────────────────
  const takePhoto = async () => {
    if (!camera.current) return;
    try {
      const photo = await camera.current.takePhoto();
      setPhotos((prev) => [...prev, photo]);
    } catch (error) {
      console.log("Take photo error:", error);
    }
  };

  if (!device || !hasPermission) return null;

  const thumbX = zoomToSliderX(zoomDisplay);
  const activeStep = zoomSteps.find((s) => Math.abs(s - zoomDisplay) < 0.3) ?? null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <GestureDetector gesture={pinchGesture}>
          <AnimatedCamera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={visible}
            photo
            animatedProps={animatedProps}
          />
        </GestureDetector>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={onClose}>
            <Text style={styles.topBtnText}>Close</Text>
          </TouchableOpacity>

          {/* Live zoom readout */}
          <View style={styles.zoomBadge}>
            <Text style={styles.zoomBadgeText}>{zoomDisplay.toFixed(1)}×</Text>
          </View>
        </View>

        {/* Quick-step zoom buttons — built from device.maxZoom */}
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

        {/* Continuous zoom slider */}
        <View style={styles.sliderWrapper}>
          <Text style={styles.sliderLabel}>
            {minZoom % 1 === 0 ? minZoom : minZoom.toFixed(1)}×
          </Text>

          <View style={styles.sliderTrack} {...sliderPanResponder.panHandlers}>
            <View style={[styles.sliderFill, { width: thumbX }]} />
            <View style={[styles.sliderThumb, { left: thumbX - SLIDER_THUMB / 2 }]} />
          </View>

          <Text style={styles.sliderLabel}>
  {sliderMaxZoom >= 10 ? Math.round(sliderMaxZoom) : sliderMaxZoom.toFixed(1)}×
</Text>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomBar, { bottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => { setPhotos([]); onClose(); }}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureOuter} onPress={takePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => { onDone(photos); setPhotos([]); onClose(); }}
          >
            <Text style={styles.btnText}>Done ({photos.length})</Text>
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
    height: height * 0.82, // was full height
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

  topBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  topBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

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

  btnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

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

  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACC,
  },
});