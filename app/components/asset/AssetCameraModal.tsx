import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";

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
  const { hasPermission, requestPermission } = useCameraPermission();

  const camera = useRef<Camera>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  const takePhoto = async () => {
    if (!camera.current) return;
    const photo = await camera.current.takePhoto();
    setPhotos((prev) => [...prev, photo]);
  };

  if (!device) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Camera Preview */}
          <View style={styles.cameraWrap}>
            <Camera
              ref={camera}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              photo
              zoom={zoom}
            />
          </View>

          {/* Zoom Controls */}
          <View style={styles.zoomRow}>
            {[1, 2, 3].map((z) => (
              <TouchableOpacity key={z} onPress={() => setZoom(z)}>
                <Text
                  style={[
                    styles.zoomText,
                    zoom === z && styles.zoomActive,
                  ]}
                >
                  {z}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottom}>
            <TouchableOpacity style={styles.smallBtn} onPress={onClose}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto} />

            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => {
                onDone(photos);
                setPhotos([]);
                onClose();
              }}
            >
              <Text style={styles.btnText}>Done ({photos.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const BORDER = "#222";
const SURFACE = "#111";
const ACC = "#00FFA3";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 14,
  },

  cameraWrap: {
    width: "100%",
    height: 350,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  zoomRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 12,
  },

  zoomText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },

  zoomActive: {
    color: ACC,
    fontSize: 16,
  },

  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },

  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  btnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: ACC,
    borderWidth: 4,
    borderColor: "#000",
  },
});