import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import AssetCameraModal from "./AssetCameraModal";
import { AssetDraft } from "./types";

export default function CreateAssetWizardModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: AssetDraft) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [draft, setDraft] = useState<AssetDraft>({
    images: [],
    serialNumber: "",
    name: "",
    writtenDescription: "",
    voiceNotes: [],
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Asset</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={{ color: "#fff" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step Indicator */}
            <Text style={styles.step}>Step {step} of 3</Text>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Text style={styles.label}>Upload Images</Text>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setCameraOpen(true)}
                >
                  <Text style={styles.primaryText}>Open Camera</Text>
                </TouchableOpacity>

                <Text style={styles.helper}>
                  {draft.images.length} images selected
                </Text>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Text style={styles.label}>Asset Details</Text>

                <TextInput
                  placeholder="Asset Name"
                  placeholderTextColor="#666"
                  value={draft.name}
                  onChangeText={(t) =>
                    setDraft({ ...draft, name: t })
                  }
                  style={styles.input}
                />

                <TextInput
                  placeholder="Serial Number"
                  placeholderTextColor="#666"
                  value={draft.serialNumber}
                  onChangeText={(t) =>
                    setDraft({ ...draft, serialNumber: t })
                  }
                  style={styles.input}
                />
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <Text style={styles.label}>Description</Text>

                <TextInput
                  placeholder="Write something..."
                  placeholderTextColor="#666"
                  value={draft.writtenDescription}
                  onChangeText={(t) =>
                    setDraft({
                      ...draft,
                      writtenDescription: t,
                    })
                  }
                  style={[styles.input, { height: 100 }]}
                  multiline
                />
              </>
            )}

            {/* Footer Buttons */}
            <View style={styles.footer}>
              {step > 1 && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={back}>
                  <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
              )}

              {step < 3 ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={next}>
                  <Text style={styles.primaryText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={async () => {
                    if (!draft.name || !draft.serialNumber) {
                      Alert.alert("Validation", "Fill required fields");
                      return;
                    }
                    await onSubmit(draft);
                    onClose();
                  }}
                >
                  <Text style={styles.primaryText}>Finish</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <AssetCameraModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDone={(photos) => {
          const mapped = photos.map((p: any, i: number) => ({
            uri: "file://" + p.path,
            name: `photo_${Date.now()}_${i}.jpg`,
            type: "image/jpeg",
          }));

          setDraft((prev) => ({
            ...prev,
            images: [...prev.images, ...mapped],
          }));
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
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
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

  step: {
    color: "#666",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 20,
  },

  label: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "600",
  },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    color: "#fff",
    marginBottom: 12,
  },

  primaryBtn: {
    // width: "100%",
    backgroundColor: ACC,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#000",
    // fontWeight: "800",
    fontSize: 15,
  },

  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  secondaryText: {
    color: "#888",
    fontWeight: "600",
  },

  helper: {
    color: "#777",
    marginTop: 10,
    fontSize: 12,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    alignItems: "center",
  },
});