import { Platform, StyleSheet } from "react-native";

export const ACC = "#2A324B";
export const SURFACE = "#E1E5EE";
export const BORDER = "#C7CCDB";
export const TEXT = "#2A324B";
export const MUTED = "#767B91";
export const SOFT = "#F7C59F";

export const formStyles = StyleSheet.create({
  otherAssetControls: {
    marginTop: 8,
    gap: 8,
  },

  assetTypeQuantityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  assetTypeFieldWrap: {
    width: 200,
    marginRight: 5,
  },

  quantityFieldWrap: {
    flex: 1,
  },

  fieldLabel: {
    color: MUTED,
    fontSize: 10,
    marginBottom: 2,
    fontWeight: "500",
  },

  assetTypeInputLikeWrap: {
    height: 40,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
  },

 

  assetTypeInputChoose: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  assetTypeInputText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  assetTypeInputDivider: {
    width: 1,
    height: 22,
    backgroundColor: BORDER,
  },

  assetTypeInputPlus: {
    width: 42,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  quantityControl: {
    height: 40,
    width: "100%",
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
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  quantityInput: {
    flex: 1,
    height: "100%",
    textAlign: "center",
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  assetTypeDropdownMenuFull: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 5,
    zIndex: 9999,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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

  addTypeDropdownOptionTextSelected: {
    color: ACC,
    fontWeight: "900",
  },

  addTypeDropdownOptionEditing: {
    backgroundColor: "rgba(247,197,159,0.35)",
  },

  assetTypeOptionMain: {
    flex: 1,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  assetTypeMiniAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42,50,75,0.06)",
  },

  assetTypeEditInput: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACC,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    overflow: "visible",
    zIndex: 10,
  },

  vehicleField: {
    width: "48%",
    position: "relative",
    zIndex: 1,
  },

  vehicleFieldDropdownTop: {
    zIndex: 30,
    elevation: 30,
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

  compactInput: {
    minHeight: 40,
    paddingVertical: 8,
    marginBottom: 8,
  },

  vehicleDropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },

  vehicleDropdownDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "rgba(156,163,175,0.35)",
  },

  vehicleDropdownText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
  },

  vehicleDropdownPlaceholder: {
    color: "#767B91",
    fontWeight: "500",
  },

  vehicleYearPickerWrap: {
    height: 40,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    justifyContent: "center",
  },

  vehicleYearPicker: {
    height: Platform.OS === "android" ? 55 : 40,
    color: TEXT,
    fontSize: 8,
    transform: Platform.OS === "android" ? [{ scale: 0.8 }] : undefined,
    marginLeft: Platform.OS === "android" ? -10 : 0,
    marginRight: Platform.OS === "android" ? -10 : 0,

    
  },

  vehicleYearPickerItem: {
    fontSize: 10,
    color: TEXT,
  },

  vehicleSelectOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  vehicleSelectCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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

  vehicleSelectOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  vehicleSelectOptionMain: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  vehicleSelectOptionText: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginRight: 10,
  },

  vehicleFavoriteBtn: {
    width: 48,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
});