import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

type CheckedState = Record<string, boolean>;

export default function AssetInspection() {
  const router = useRouter();

  const [realEstateType, setRealEstateType] = useState("Residential");
  const [buildingCompletion, setBuildingCompletion] = useState("");
  const [otherBuildingCondition, setOtherBuildingCondition] = useState("");

  const [checked, setChecked] = useState<CheckedState>({
    other: false,
    underConstruction: false,
    used: false,
    new: false,

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

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const realEstateTypes = [
    "Residential",
    "Commercial",
    "Industrial",
    "Agricultural",
    "Mixed Use",
    "Land",
  ];

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>Asset Inspection</Text>
            <Text style={styles.subtitle}>
              Type of real estate and property condition details
            </Text>
          </View>
        </View>

        <Section title="Type of Real Estate">
          <View style={styles.chipWrap}>
            {realEstateTypes.map((type) => {
              const active = realEstateType === type;

              return (
                <Pressable
                  key={type}
                  onPress={() => setRealEstateType(type)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Building Condition">
          <Label text="Building Completion Percentage" />
          <TextInput
            value={buildingCompletion}
            onChangeText={setBuildingCompletion}
            placeholder="Enter percentage"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            style={styles.input}
          />

          <CheckboxRow
            label="Other"
            checked={checked.other}
            onPress={() => toggle("other")}
          />

          {checked.other && (
            <TextInput
              value={otherBuildingCondition}
              onChangeText={setOtherBuildingCondition}
              placeholder="Describe other condition"
              placeholderTextColor={MUTED}
              style={styles.input}
            />
          )}

          <CheckboxRow
            label="Under Construction"
            checked={checked.underConstruction}
            onPress={() => toggle("underConstruction")}
          />

          <CheckboxRow
            label="Used"
            checked={checked.used}
            onPress={() => toggle("used")}
          />

          <CheckboxRow
            label="New"
            checked={checked.new}
            onPress={() => toggle("new")}
          />
        </Section>

        <Section title="Surrounding Environment Influencing the Property">
          <CheckboxGrid
            items={[
              ["mosque", "Mosque"],
              ["commercialMarket", "Commercial Market"],
              ["park", "Park"],
              ["governmentFacility", "Government Facility"],
              ["highSpeedRoad", "High-Speed Road"],
              ["otherServices", "Other Services"],
              ["educationalFacility", "Educational Facility"],
              ["securityFacility", "Security Facility"],
              ["medicalFacility", "Medical Facility"],
            ]}
            checked={checked}
            toggle={toggle}
          />
        </Section>

        <Section title="Available Services and Facilities in the Property">
          <CheckboxRow
            label="Electricity"
            checked={checked.electricity}
            onPress={() => toggle("electricity")}
          />

          {checked.electricity && (
            <TextInput
              value={electricityUnits}
              onChangeText={setElectricityUnits}
              placeholder="Enter units"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              style={styles.input}
            />
          )}

          <CheckboxRow
            label="Sanitary Drainage / Sewage System"
            checked={checked.sanitaryDrainage}
            onPress={() => toggle("sanitaryDrainage")}
          />

          <CheckboxRow
            label="Telephone Line"
            checked={checked.telephoneLine}
            onPress={() => toggle("telephoneLine")}
          />

          <CheckboxRow
            label="Number of Water Meters"
            checked={checked.waterMeters}
            onPress={() => toggle("waterMeters")}
          />

          {checked.waterMeters && (
            <TextInput
              value={waterMetersCount}
              onChangeText={setWaterMetersCount}
              placeholder="Enter number of water meters"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              style={styles.input}
            />
          )}

          <CheckboxRow
            label="Number of Electricity Meters"
            checked={checked.electricityMeters}
            onPress={() => toggle("electricityMeters")}
          />

          {checked.electricityMeters && (
            <TextInput
              value={electricityMetersCount}
              onChangeText={setElectricityMetersCount}
              placeholder="Enter number of electricity meters"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              style={styles.input}
            />
          )}
        </Section>

        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
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

function CheckboxGrid({
  items,
  checked,
  toggle,
}: {
  items: [string, string][];
  checked: CheckedState;
  toggle: (key: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => toggle(key)}
          style={[styles.gridItem, checked[key] && styles.gridItemActive]}
        >
          <View style={[styles.smallBox, checked[key] && styles.checkboxActive]}>
            {checked[key] && <Text style={styles.smallCheck}>✓</Text>}
          </View>

          <Text style={[styles.gridText, checked[key] && styles.gridTextActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 22,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  backText: {
    fontSize: 30,
    color: ACC,
    marginTop: -3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 3,
    maxWidth: 280,
  },
  section: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FAFBFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
  },
  chipTextActive: {
    color: "#ffffff",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },
  checkMark: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    fontWeight: "500",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "48%",
    minHeight: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: "#FAFBFC",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  gridItemActive: {
    backgroundColor: "#F5F7FA",
    borderColor: ACC,
  },
  smallBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.3,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  smallCheck: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  gridText: {
    flex: 1,
    fontSize: 12.5,
    color: TEXT,
    fontWeight: "500",
  },
  gridTextActive: {
    color: ACC,
    fontWeight: "700",
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});