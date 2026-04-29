import React, { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n/i18n";
import * as Updates from "expo-updates";
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference } from "../offline/authStorage";

const ACC = "#C6FF00";
const SURFACE = "#111111";
const BORDER = "#232323";

export type HeaderUser = {
  username?: string;
  
  companyName?: string;
  role?: "Manager" | "Inspector" | "Valuator" | "company_admin" |string ;
};

type AppHeaderProps = {
  isAuthenticated?: boolean;
  user?: HeaderUser | null;
  title?: string;
  // role?: string;
  onLogout?: () => void | Promise<void>;
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
      <View style={styles.infoTopRow}>
        <Ionicons name={icon} size={14} color="#777" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
});



function AppHeaderComponent({
  isAuthenticated = false,
  user = null,
  title = "ValTech",
  onLogout,
}: AppHeaderProps) {
 const { t } = useTranslation();
 const [isRTL, setIsRTL] = useState(true);
const toggleLanguage = useCallback(async () => {
      const current = i18n.language;
      const next = current === "ar" ? "en" : "ar"; 
      
      // Save the language preference
      await saveLanguagePreference(next);
      
      // Change the language
      i18n.changeLanguage(next);
      setIsRTL(next === "ar");
    }, []);
 
  const [profileVisible, setProfileVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const openProfile = useCallback(() => {
    setProfileVisible(true);
  }, []);

  const closeProfile = useCallback(() => {
    if (loggingOut) return;
    setProfileVisible(false);
  }, [loggingOut]);

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
    const name = user?.username?.trim();
    if (!name) return "U";

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [user?.username]);

  return (
    <>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>

          <View>
            <Text style={styles.companyName}>{title}</Text>
            <Text style={styles.companySub}> {t('companyPage.header')}</Text>
          </View>

          
        </View>

        
                        <View style={[{ flexDirection: "row", alignItems: "center" }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                    {user?.username || "User"}
                  </Text>
                  <Text style={styles.profileRole}>{user?.role || "Member"}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={closeProfile}
                hitSlop={10}
                disabled={loggingOut}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoGrid}>
              <InfoRow label="Username" value={user?.username} icon="mail-outline" />
              <InfoRow
                label="Company"

                value={user?.companyName}
                icon="business-outline"
              />
              <InfoRow
                label="Role"
                value={user?.role}
                icon="shield-checkmark-outline"
              />
              {/* <InfoRow
                label="Status"
                value="Authenticated"
                icon="checkmark-circle-outline"
              /> */}
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
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={18} color="#000" />
                    <Text style={styles.logoutButtonText}>Logout</Text>
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
    backgroundColor: "#000",
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
    backgroundColor: "#000",
  },
  companyName: {
    fontSize: 22,
    fontWeight: "400",
    color: "#fff",
    letterSpacing: -0.5,
  },
  companySub: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  avatarButton: {
    marginLeft: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#000",
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
    color: "#000",
    fontSize: 20,
    fontWeight: "900",
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
    letterSpacing: -0.4,
  },
  profileRole: {
    fontSize: 8,
    color: "#777",
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
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 13,
    color: "#fff",
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
    color: "#000",
    letterSpacing: 0.2,
  },
  
   langToggle: {
  backgroundColor: SURFACE,
  borderWidth: 1,
  borderColor: BORDER,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 10,
  marginRight: 10,
},

langText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 1,
},

 
});