import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import home from "./home";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../api/AuthContext";
import { projectApi, Project, ApiError } from "../../api/api";
import { PendingItem } from "../offline/types";
import {
  safeApiCall,
  getPending,
  getDownloadedProjectsByCompany,
  getAllDownloadedProjects,
  isProjectDownloaded,
  clearOfflineProject,
  getPendingCountByProjectId,
} from "../offline";
import { downloadProjectForOffline } from "../offline/downloader";
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";

type FilterType = "recent" | "new";



function getProjectStatusLabel(project: Project, t: (key: string) => string) {
  const raw = (project.workflowStatus ?? "").toLowerCase();
  if (raw === "new") return t("projectScreen.status.new");
  if (raw === "done") return t("projectScreen.status.done");
  return project.workflowStatus || t("projectScreen.status.new");
}

export default function ProjectScreen() {
  const { t } = useTranslation();

  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();
  const { user, isOnline, selectedCompanyId } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<FilterType>("new");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [pendingProjects, setPendingProjects] = useState<PendingItem[]>([]);

  const [downloadedProjectIds, setDownloadedProjectIds] = useState<string[]>([]);
  const [projectPendingMap, setProjectPendingMap] = useState<Record<string, number>>({});
  const [downloadingProjectId, setDownloadingProjectId] = useState<string | null>(null);
  const [removingProjectId, setRemovingProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [isOnline, selectedCompanyId]);

  const refreshPendingProjects = useCallback(async () => {
    const pending = await getPending("pending");
    setPendingProjects(pending.filter((item) => item.type === "createProject"));
  }, []);

  const refreshDownloadedProjects = useCallback(async () => {
    const downloaded = selectedCompanyId
      ? await getDownloadedProjectsByCompany(selectedCompanyId)
      : await getAllDownloadedProjects();

    const ids = downloaded.map((project) => project.id);
    setDownloadedProjectIds(ids);

    const counts = await Promise.all(
      ids.map(async (id) => {
        const count = await getPendingCountByProjectId(id);
        return [id, count] as const;
      })
    );

    setProjectPendingMap(
      counts.reduce<Record<string, number>>((acc, [id, count]) => {
        acc[id] = count;
        return acc;
      }, {})
    );
  }, [selectedCompanyId]);

  useEffect(() => {
    refreshPendingProjects();
    refreshDownloadedProjects();

    const interval = setInterval(() => {
      refreshPendingProjects();
      refreshDownloadedProjects();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshPendingProjects, refreshDownloadedProjects]);

  async function fetchProjects() {
    setLoading(true);
    setGlobalError(null);

    try {
      if (isOnline) {
        const res = await projectApi.list();
        setProjects(res.projects);
        return;
      }

      const offlineProjects = selectedCompanyId
        ? await getDownloadedProjectsByCompany(selectedCompanyId)
        : await getAllDownloadedProjects();

      setProjects(offlineProjects);
    } catch (err) {
      if (!isOnline) {
        try {
          const offlineProjects = selectedCompanyId
            ? await getDownloadedProjectsByCompany(selectedCompanyId)
            : await getAllDownloadedProjects();

          setProjects(offlineProjects);
          setGlobalError(null);
          return;
        } catch {
          // fall through
        }
      }

      const msg =
        err instanceof ApiError
          ? err.message
          : t("projectScreen.errors.loadFailed");
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  }



  async function handleDownloadProject(project: Project, forceRefresh = false) {
    try {
      setDownloadingProjectId(project.id);

      const alreadyDownloaded = await isProjectDownloaded(project.id);

      if (alreadyDownloaded && !forceRefresh) {
        Alert.alert(
          t("projectScreen.download.alreadyTitle"),
          t("projectScreen.download.alreadyMessage")
        );
        return;
      }

      const result = await downloadProjectForOffline(project);
      await refreshDownloadedProjects();

      Alert.alert(
        forceRefresh
          ? t("projectScreen.download.refreshTitle")
          : t("projectScreen.download.successTitle"),
        t("projectScreen.download.successMessage", {
          name: project.name,
          folders: result.folderCount,
          assets: result.assetCount,
        })
      );
    } catch (error: any) {
      Alert.alert(
        t("projectScreen.download.failTitle"),
        error?.message || t("projectScreen.download.failMessage")
      );
    } finally {
      setDownloadingProjectId(null);
    }
  }

  async function handleRemoveOfflineProject(project: Project) {
    try {
      setRemovingProjectId(project.id);

      const pendingCount = await getPendingCountByProjectId(project.id);

      if (pendingCount > 0) {
        Alert.alert(
          t("projectScreen.remove.syncRequiredTitle"),
          t("projectScreen.remove.syncRequiredMessage")
        );
        return;
      }

      await clearOfflineProject(project.id);
      await refreshDownloadedProjects();

      Alert.alert(
        t("projectScreen.remove.successTitle"),
        t("projectScreen.remove.successMessage", { name: project.name })
      );
    } catch (error: any) {
      Alert.alert(
        t("projectScreen.remove.failTitle"),
        error?.message || t("projectScreen.remove.failMessage")
      );
    } finally {
      setRemovingProjectId(null);
    }
  }

  function openProject(project: Project) {
    router.push({
      pathname: "/(app)/FolderAndAssetScreen",
      params: {
        projectId: project.id,
        projectName: project.name,
      },
    });
  }

  const offlineProjectEntries = useMemo<Project[]>(() => {
    return pendingProjects.map((item) => {
      const payload = item.payload as { name?: string };
      console.log(payload);
      
      return {
        id: item.id,
        name: payload.name ?? t("projectScreen.offline.projectName"),
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.createdAt).toISOString(),
        workflowStatus: "new",
        companyId: "offline-company",
        userId: user?.id ?? "offline-user",
        stats: {
            totalAssets: 0,
            doneAssets: 0,
            incompleteAssets: 0,
        },
        company: {
          id: "offline-company",
          name: user?.companyName ?? t("projectScreen.offline.projectName"),
        },
        user: {
          id: user?.id ?? "offline-user",
          username: user?.username ?? "You",
          role: user?.role ?? null,
        },
      };
    });
  }, [pendingProjects, user, t]);

  const combinedProjects = useMemo(() => {
    return [...offlineProjectEntries, ...projects];
  }, [offlineProjectEntries, projects]);

  const filteredProjects = useMemo(() => {
    if (filter === "recent") {
      return [...combinedProjects].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (filter === "new") {
      return combinedProjects.filter(
        (p) => (p.workflowStatus ?? "").toLowerCase() === "new"
      );
    }
    return combinedProjects;
  }, [combinedProjects, filter]);

  if (!loaded) return null;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("projectPage.title")}:{" "}
            <Text style={styles.companyName}>
              {user?.companyName ?? "Company"}
            </Text>
          </Text>
          <Text style={styles.subtitle}>{t("projectPage.description")}</Text>
        </View>

        {/* ── Error banner ── */}
        {globalError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{globalError}</Text>
          </View>
        )}

        {/* ── Action row ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.switchBtn}
            onPress={() => router.replace("home")}
          >
            <Text style={styles.switchBtnText}>
              {t("projectPage.switchCompany")}
            </Text>
          </Pressable>
        </View>

        {/* ── Filter row ── */}
        <View style={styles.filterRow}>
          {(["recent", "new"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[
                styles.filterBtn,
                filter === item && styles.filterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filter === item && styles.filterBtnTextActive,
                ]}
              >
                {t(`filters.${item}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Content ── */}
        {loading ? (
          <ActivityIndicator color={ACC} style={{ marginTop: 30 }} />
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("projectScreen.empty")}</Text>
          </View>
        ) : (
          <View style={styles.projectList}>
            {filteredProjects.map((project) => {
              const isOfflineCreated = project.id.startsWith("offline_");
              const isDownloaded = downloadedProjectIds.includes(project.id);
              const isDownloading = downloadingProjectId === project.id;
              const isRemoving = removingProjectId === project.id;
              const pendingForProject = projectPendingMap[project.id] ?? 0;

               const stats = project.stats ?? {
                totalAssets: 0,
                doneAssets: 0,
                incompleteAssets: 0,
                };


              return (
                <Pressable
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => openProject(project)}
                >
                  <View style={styles.projectCardTop}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>
                        {getProjectStatusLabel(project, t)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.projectMeta}>
                    {t("projectScreen.createdBy", {
                      name: project.user?.username ?? "Unknown",
                    })}
                  </Text>
                  <Text style={styles.projectMeta}>
                    {t("projectScreen.company", {
                      name: project.company?.name ?? "Unknown",
                    })}
                  </Text>

                  <View style={styles.statsRow}>
  <View style={styles.statBox}>
    <Text style={styles.statNumber}>{stats.totalAssets}</Text>
    <Text style={styles.statLabel}>{t("projectScreen.stats.total")}</Text>
  </View>

  <View style={styles.statBox}>
    <Text style={styles.statNumber}>{stats.doneAssets}</Text>
    <Text style={styles.statLabel}>{t("projectScreen.stats.done")}</Text>
  </View>

  <View style={styles.statBox}>
    <Text style={styles.statNumber}>{stats.incompleteAssets}</Text>
    <Text style={styles.statLabel}>
      {t("projectScreen.stats.incomplete")}
    </Text>
  </View>


<View style={styles.statBox}>
    <Text style={styles.statNumber}>{stats.incompleteAssets}</Text>
    <Text style={styles.statLabel}>
      Notes
      {/* {t("projectScreen.stats.incomplete")} */}
    </Text>
  </View>

</View>

                  <View style={styles.projectFooterRow}>
                    <View style={styles.projectBadgeColumn}>
                      {isDownloaded && (
                        <View style={styles.offlineReadyBadge}>
                          <Text style={styles.offlineReadyText}>
                            {t("projectScreen.availableOffline")}
                          </Text>
                        </View>
                      )}
                      {pendingForProject > 0 && (
                        <View style={styles.pendingSyncBadge}>
                          <Text style={styles.pendingSyncText}>
                            {t("projectScreen.pendingSync", {
                              count: pendingForProject,
                            })}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isOfflineCreated && (
                      <View style={styles.projectActionsRow}>
                        {!isDownloaded ? (
                          <Pressable
                            style={[
                              styles.iconBtn,
                              styles.downloadIconBtn,
                              isDownloading && styles.iconBtnDisabled,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDownloadProject(project);
                            }}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <Ionicons
                                name="cloud-download-outline"
                                size={20}
                                color="#f3f3f4"
                              />
                            )}
                          </Pressable>
                        ) : (
                          <>
                            <Pressable
                              style={[
                                styles.iconBtn,
                                styles.refreshIconBtn,
                                isDownloading && styles.iconBtnDisabled,
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDownloadProject(project, true);
                              }}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <ActivityIndicator size="small" color={BORDER} />
                              ) : (
                                <Ionicons
                                  name="refresh-outline"
                                  size={20}
                                  color={SURFACE}
                                />
                              )}
                            </Pressable>

                            <Pressable
                              style={[
                                styles.iconBtn,
                                styles.removeIconBtn,
                                (isRemoving || pendingForProject > 0) &&
                                  styles.iconBtnDisabled,
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveOfflineProject(project);
                              }}
                              disabled={isRemoving || pendingForProject > 0}
                            >
                              {isRemoving ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#ff8b8b"
                                />
                              ) : (
                                <Ionicons
                                  name="trash-outline"
                                  size={20}
                                  color="#ff8b8b"
                                />
                              )}
                            </Pressable>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { padding: 8, paddingTop: 10, paddingBottom: 40 },
  header: { marginBottom: 10 },
  title: {
    color: TEXT,
    fontSize: 17,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  companyName: { color: TEXT, textTransform: "uppercase" },
  subtitle: { color: MUTED, marginTop: 6, fontSize: 10 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 5,
  },
  switchBtn: {
    flex: 1,
    backgroundColor: ACC,
    borderWidth: 1,
    borderColor: ACC,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  switchBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.inter.medium as unknown as string,
  },

  createBtn: {
    flex: 1,
    backgroundColor: ACC,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 5,
  },
  filterBtn: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterBtnActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },
  filterBtnText: {
    color: MUTED,
    fontSize: 12,
  },
  filterBtnTextActive: {
    color: "#ffffff",
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  errorBanner: {
    backgroundColor: "rgba(255, 69, 58, 0.12)",
    borderColor: "#FF453A",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#FF453A",
    fontSize: 13,
    textAlign: "center",
  },

  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
  },

  projectList: {
    gap: 12,
  },
  projectCard: {
    // backgroundColor: SURFACE,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
  },
  projectCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectName: {
    color: TEXT,
    fontSize: 13,
    fontFamily: fonts.inter.semiBold as unknown as string,
    flex: 1,
    marginRight: 10,
    textTransform: "uppercase",
  },
  statusPill: {
    backgroundColor: SOFT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: TEXT,
    fontSize: 9,
    fontFamily: fonts.inter.medium as unknown as string,
  },
  projectMeta: {
    color: MUTED,
    fontSize: 8,
    marginTop: 8,
    textTransform: "uppercase",
  },

  statsRow: {
  flexDirection: "row",
  gap: 8,
  marginTop: 5,
},

statBox: {
  flex: 1,
  // backgroundColor: SURFACE,
  borderWidth: 2,
  borderColor: BORDER,
  borderRadius: 5,
  paddingVertical: 1,
  alignItems: "center",
},

statNumber: {
  color: TEXT,
  fontSize: 15,
  fontFamily: fonts.inter.semiBold as unknown as string,
},

statLabel: {
  color: MUTED,
  fontSize: 8,
  marginTop: 3,
  textTransform: "uppercase",
  fontFamily: fonts.inter.medium as unknown as string,
},
  projectFooterRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  projectBadgeColumn: {
    flex: 1,
    gap: 8,
  },
  projectActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadIconBtn: {
    backgroundColor: ACC,
  },
  refreshIconBtn: {
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: SOFT,
  },
  removeIconBtn: {
    backgroundColor: "#2A324B",
    borderWidth: 1,
    borderColor: "#2A324B",
  },
  iconBtnDisabled: {
    opacity: 0.5,
  },

  offlineReadyBadge: {
    backgroundColor: "#C7CCDB",
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  offlineReadyText: {
    color: TEXT,
    fontSize: 10,
    fontFamily: fonts.inter.medium as unknown as string,
  },
  pendingSyncBadge: {
    backgroundColor: SOFT,
    borderColor: SOFT,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  pendingSyncText: {
    color: TEXT,
    fontSize: 10,
    fontFamily: fonts.inter.medium as unknown as string,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(42,50,75,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 18,
    marginBottom: 14,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  modalInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: {
    color: TEXT,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: ACC,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  btnDisabled: {
    opacity: 0.65,
  },
});