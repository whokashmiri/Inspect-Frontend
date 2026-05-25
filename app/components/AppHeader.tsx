import React, { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n/i18n";
import * as Updates from "expo-updates";
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference } from "../offline/authStorage";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

export type HeaderUser = {
  username?: string;
  name?: string | null;
  phone?: string | null;
  companyName?: string;
  serviceCities?: string[];
  isProfileCompleted?: boolean;
  role?: "Manager" | "Inspector" | "Valuator" | "company_admin" | string;
};

type AppHeaderProps = {
  isAuthenticated?: boolean;
  user?: HeaderUser | null;
  title?: string;
  onLogout?: () => void | Promise<void>;
  onCompleteProfile?: (payload: {
    name: string;
    serviceCities: string[];
  }) => Promise<void>;
};

const InfoRow = memo(function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoInlineRow}>
        <View style={styles.infoLeft}>
          <Ionicons name={icon} size={14} color="#767B91" />
          <Text style={styles.infoLabel}>{label}</Text>
        </View>

        <Text style={styles.infoValue} numberOfLines={2}>
          {value || "-"}
        </Text>
      </View>
    </View>
  );
});


  const SAUDI_CITIES = [
  "Riyadh",
  "Jeddah",
  "Makkah",
  "Madinah",
  "Dammam",
  "Khobar",
  "Dhahran",
  "Jubail",
  "Qatif",
  "Hofuf",
  "Taif",
  "Tabuk",
  "Abha",
  "Khamis Mushait",
  "Buraidah",
  "Hail",
  "Najran",
  "Jazan",
  "Yanbu",
  "Al Khafji",
];

function AppHeaderComponent({
  isAuthenticated = false,
  user = null,
  title = "ValueTech",
  onLogout,
  onCompleteProfile,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const [isRTL, setIsRTL] = useState(i18n.language === "ar");

  const [profileVisible, setProfileVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);

  const [profileName, setProfileName] = useState(user?.name || "");
  const [citySearch, setCitySearch] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>(
    Array.isArray(user?.serviceCities) ? user.serviceCities : []
  );
  const [savingProfile, setSavingProfile] = useState(false);

  const toggleLanguage = useCallback(async () => {
    const current = i18n.language;
    const next = current === "ar" ? "en" : "ar";

    await saveLanguagePreference(next);
    await i18n.changeLanguage(next);

    setIsRTL(next === "ar");
  }, []);

const openProfile = useCallback(() => {
  setProfileName(user?.name || "");
  setSelectedCities(Array.isArray(user?.serviceCities) ? user.serviceCities : []);
  setCitySearch("");
  setEditingProfile(!user?.isProfileCompleted);
  setProfileVisible(true);
}, [user?.name, user?.serviceCities, user?.isProfileCompleted]);

  const closeProfile = useCallback(() => {
    if (loggingOut || savingProfile) return;
    setProfileVisible(false);
  }, [loggingOut, savingProfile]);

  const handleLogout = useCallback(async () => {
    if (!onLogout || loggingOut) return;

    try {
      setLoggingOut(true);
      await onLogout();
      setProfileVisible(false);
    } finally {
      setLoggingOut(false);
    }
  }, [onLogout, loggingOut]);

  const initials = useMemo(() => {
    const name = user?.name?.trim() || user?.username?.trim();
    if (!name) return "U";

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [user?.name, user?.username]);

  const citySuggestions = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return [];

    return SAUDI_CITIES.filter((city) => {
      return (
        city.toLowerCase().includes(q) &&
        !selectedCities.includes(city)
      );
    }).slice(0, 6);
  }, [citySearch, selectedCities]);

  const addCity = useCallback((city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev : [...prev, city]
    );
    setCitySearch("");
  }, []);

  const removeCity = useCallback((city: string) => {
    setSelectedCities((prev) => prev.filter((c) => c !== city));
  }, []);

  const handleCompleteProfile = useCallback(async () => {
    if (!onCompleteProfile || savingProfile) return;
    if (!profileName.trim()) return;
    if (selectedCities.length === 0) return;

    try {
      setSavingProfile(true);

      await onCompleteProfile({
        name: profileName.trim(),
        serviceCities: selectedCities,
      });

      setEditingProfile(false);
setProfileVisible(false);
    } finally {
      setSavingProfile(false);
    }
  }, [onCompleteProfile, savingProfile, profileName, selectedCities]);

  const showProfileForm = !user?.isProfileCompleted || editingProfile;

  return (
    <>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.brandRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>

          <View>
            <Text style={styles.companyName}>{title}</Text>
            <Text style={styles.companySub}>{t("companyPage.header")}</Text>
          </View>
        </View>

        <View
          style={[
            { flexDirection: "row", marginLeft: 10, alignItems: "center" },
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langToggle}
            activeOpacity={0.8}
          >
            <Text style={styles.langText}>
              {i18n.language === "en" ? "AR" : "EN"}
            </Text>
          </TouchableOpacity>
        </View>

        {isAuthenticated && user ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openProfile}
            style={styles.avatarButton}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={profileVisible}
        animationType="fade"
        transparent
        onRequestClose={closeProfile}
      >
        <Pressable style={styles.overlay} onPress={closeProfile}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.profileHero}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>{initials}</Text>
                </View>

                <View style={styles.profileTextWrap}>
                  <Text style={styles.profileName}>
                    {user?.name || user?.username || t("header.userFallback")}
                  </Text>

                  <Text style={styles.profileRole}>
                    {user?.role ? t(`${user.role}`) : t("header.member")}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={closeProfile}
                hitSlop={10}
                disabled={loggingOut || savingProfile}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#2A324B" />
              </TouchableOpacity>
            </View>

            {showProfileForm ? (
              <View style={styles.completeProfileBox}>
                <Text style={styles.completeTitle}>
                  Complete your profile to work
                </Text>

                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={MUTED}
                  value={profileName}
                  onChangeText={setProfileName}
                />

                <Text style={styles.label}>Area of Service</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search city, e.g. Dammam"
                  placeholderTextColor={MUTED}
                  value={citySearch}
                  onChangeText={setCitySearch}
                />

                {citySuggestions.length > 0 ? (
                  <View style={styles.suggestionBox}>
                    {citySuggestions.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.suggestionItem}
                        onPress={() => addCity(city)}
                      >
                        <Ionicons name="location-outline" size={15} color={ACC} />
                        <Text style={styles.suggestionText}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <View style={styles.cityChips}>
                  {selectedCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.cityChip}
                      onPress={() => removeCity(city)}
                    >
                      <Text style={styles.cityChipText}>{city}</Text>
                      <Ionicons name="close" size={13} color="#ffffff" />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveProfileButton,
                    savingProfile ? styles.logoutButtonDisabled : null,
                  ]}
                  disabled={savingProfile}
                  onPress={handleCompleteProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveProfileText}>Save Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}


            {user?.isProfileCompleted && !editingProfile ? (
  <TouchableOpacity
    style={styles.editProfileButton}
    onPress={() => {
      setProfileName(user?.name || "");
      setSelectedCities(Array.isArray(user?.serviceCities) ? user.serviceCities : []);
      setCitySearch("");
      setEditingProfile(true);
    }}
  >
    <Ionicons name="create-outline" size={15} color="#ffffff" />
    <Text style={styles.editProfileText}>Edit Profile / Add Cities</Text>
  </TouchableOpacity>
) : null}

            <View style={styles.infoGrid}>
             <InfoRow
  label="Phone"
  value={user?.phone || user?.username}
  icon="call-outline"
/>

              <InfoRow
                label="Name"
                value={user?.name || undefined}
                icon="person-outline"
              />

              <InfoRow
                label={t("header.company")}
                value={user?.companyName}
                icon="business-outline"
              />

         

              <InfoRow
                label="Service Cities"
                value={user?.serviceCities?.join(", ")}
                icon="location-outline"
              />
            </View>

            {onLogout ? (
              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  loggingOut ? styles.logoutButtonDisabled : null,
                ]}
                activeOpacity={0.85}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                    <Text style={styles.logoutButtonText}>
                      {t("header.logout")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
export const AppHeader = memo(AppHeaderComponent);



const styles = StyleSheet.create({
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  logoInner: {
    width: 15,
    height: 15,
    borderRadius: 5,
    backgroundColor: SOFT,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "400",
    color: TEXT,
    letterSpacing: -0.5,
  },
  companySub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  avatarButton: {
    marginLeft: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: ACC,
    borderWidth: 1,
    borderColor: ACC,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(42,50,75,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  modalAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  modalAvatarText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "500",
    color: TEXT,
    letterSpacing: -0.4,
  },
  profileRole: {
    fontSize: 8,
    color: MUTED,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  infoGrid: {
    gap: 10,
  },
infoCard: {
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
},

infoInlineRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},

infoLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
},



editProfileButton: {
  backgroundColor: ACC,
  borderRadius: 12,
  paddingVertical: 11,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: 7,
  marginBottom: 12,
},

editProfileText: {
  color: "#ffffff",
  fontSize: 13,
  fontWeight: "700",
},

  infoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
infoLabel: {
  fontSize: 8,
  fontWeight: "700",
  color: MUTED,
  letterSpacing: 0.7,
  textTransform: "uppercase",
},

 infoValue: {
  flex: 1,
  textAlign: "right",
  fontSize: 13,
  color: TEXT,
  fontWeight: "600",
},

  logoutButton: {
    backgroundColor: ACC,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  langToggle: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  langText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },


completeProfileBox: {
  backgroundColor: "#F8F9FC",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  padding: 12,
  marginBottom: 12,
  gap: 8,
},

completeTitle: {
  fontSize: 13,
  fontWeight: "700",
  color: TEXT,
  marginBottom: 2,
},

input: {
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 9,
  color: TEXT,
  fontSize: 13,
},

suggestionBox: {
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 12,
  overflow: "hidden",
},

suggestionItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: BORDER,
},

suggestionText: {
  color: TEXT,
  fontSize: 13,
  fontWeight: "600",
},

cityChips: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
},

cityChip: {
  backgroundColor: ACC,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 7,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

cityChipText: {
  color: "#ffffff",
  fontSize: 12,
  fontWeight: "700",
},

saveProfileButton: {
  backgroundColor: ACC,
  borderRadius: 12,
  paddingVertical: 11,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 2,
},

saveProfileText: {
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "700",
},

 label: {
    fontSize: 8,
    fontWeight: "600",
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
});