// codeScannerModal.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { createCodeDeduper, normalizeCode } from "../components/utils/codeScannerUtils";

type Props = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onDetected: (code: string) => void | Promise<void>;
};

const ACC = "#D4FF00";

export default function CodeScannerModal({
  visible,
  loading = false,
  onClose,
  onDetected,
}: Props) {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const lockedRef = useRef(false);
  const allowScanRef = useRef(createCodeDeduper(2000));

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission();
    }
  }, [visible, hasPermission, requestPermission]);

  useEffect(() => {
    if (!visible) {
      lockedRef.current = false;
    }
  }, [visible]);

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13", "ean-8", "code-128", "code-39", "upc-a", "upc-e"],
    onCodeScanned: (codes) => {
      if (!visible || loading || lockedRef.current || !codes?.length) return;

      const raw =
        codes[0]?.value ||
        codes.find((item) => !!item?.value)?.value ||
        "";

      const clean = normalizeCode(raw);
      if (!clean) return;
      if (!allowScanRef.current(clean)) return;

      lockedRef.current = true;
      Promise.resolve(onDetected(clean)).finally(() => {
        setTimeout(() => {
          lockedRef.current = false;
        }, 1200);
      });
    },
  });

  const cameraReady = useMemo(
    () => visible && !!device && hasPermission,
    [visible, device, hasPermission]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Scan Asset Code</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Center the barcode or QR inside the frame.
              </Text>

              <View style={styles.cameraShell}>
                {cameraReady ? (
                  <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={visible}
                    codeScanner={codeScanner}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>
                      {!hasPermission
                        ? "Camera permission required"
                        : "Loading camera..."}
                    </Text>
                  </View>
                )}

                <View pointerEvents="none" style={styles.scanFrame} />
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={ACC} />
                    <Text style={styles.loadingText}>Looking up asset...</Text>
                  </View>
                )}
              </View>

              <Text style={styles.helper}>
                Detection is automatic. No shutter button needed.
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0f0f0f",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#1b1b1b",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  cameraShell: {
    height: 260,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    borderWidth: 1,
    borderColor: "#222",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  placeholderText: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
  },
  scanFrame: {
    position: "absolute",
    top: "22%",
    left: "12%",
    right: "12%",
    bottom: "22%",
    borderWidth: 2,
    borderColor: ACC,
    borderRadius: 18,
  },
  helper: {
    color: "#777",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    gap: 6,
  },
  loadingText: {
    color: ACC,
    fontSize: 12,
    fontWeight: "600",
  },
});