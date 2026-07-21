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

  
  helper: {
    color: MUTED,
    marginTop: 8,
    fontSize: 12,
  },

  vehiclePreviewGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 6,
  marginBottom: 8,
},




vehiclePreviewItem: {
  alignItems: "center",
  justifyContent: "flex-start",
},


vehiclePreviewBox: {
  width: "100%",
  aspectRatio: 1,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: BORDER,
  backgroundColor: SURFACE,
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
},

 previewImage: {
    width: "100%",
    height: "100%",
  },


  previewImageLoading: {
  opacity: 0.35,
},

imageLoaderOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(42,50,75,0.35)",
  zIndex: 5,
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

  vehiclePlaceholderContent: {
  flex: 1,
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
},
vehiclePreviewLabel: {
  marginTop: 3,
  color: TEXT,
  fontSize: 8,
  fontWeight: "800",
  textAlign: "center",
},


addDetailsBtn: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: 7,
  marginTop: 4,
  marginBottom: 10,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: "rgba(247,197,159,0.55)",
  borderWidth: 1,
  borderColor: SOFT,
},

  secondaryText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: ACC,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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

  addTypeModalCard: {
  width: "100%",
  maxWidth: 360,
  backgroundColor: "#ffffff",
  borderRadius: 18,
  overflow: "hidden",
  elevation: 20,
  shadowColor: "#000",
  shadowOpacity: 0.16,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  marginBottom:60,
},


 primaryText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "500",
  },

addDetailsText: {
  color: TEXT,
  fontSize: 12,
  fontWeight: "800",
},


 previewItem: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: SURFACE,
    position: "relative",
  },

  
  removeBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  }
,


// =========================================


countBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  otherAddBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },
  otherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    // paddingVertical: 8,
    padding:5
  },
  addOtherTile: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addOtherTileText: {
    fontSize: 11,
    color: ACC,
    fontWeight: "500",
  },
//====================================================



  vehicleSearchWrap: {
  flexDirection: "row",
  alignItems: "center",
  marginHorizontal: 14,
  marginBottom: 10,
  paddingHorizontal: 12,
  minHeight: 42,
  borderWidth: 1,
  borderColor: "#C7CCDB",
  borderRadius: 10,
  backgroundColor: "#F8F9FC",
},

vehicleSearchInput: {
  flex: 1,
  minHeight: 40,
  marginLeft: 8,
  paddingVertical: 8,
  color: "#2A324B",
  fontSize: 14,
  textAlign: "left",
},

vehicleSearchClearBtn: {
  padding: 4,
  marginLeft: 4,
},

vehicleSearchEmpty: {
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
  paddingVertical: 36,
},

vehicleSearchEmptyTitle: {
  marginTop: 10,
  color: "#2A324B",
  fontSize: 15,
  fontWeight: "600",
},

vehicleSearchEmptyText: {
  marginTop: 4,
  color: "#767B91",
  fontSize: 12,
  textAlign: "center",
},

});