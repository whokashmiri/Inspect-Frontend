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

type FilterType = "Recent" | "New";

const ACC = "#C6FF00";

function getProjectStatusLabel(project: Project) {
  const raw = (project.workflowStatus ?? "").toLowerCase();

  if (raw === "new") return "New";
  if (raw === "done") return "Done";
  return project.workflowStatus || "New";
}

export default function ProjectScreen() {



  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();
 const { user, isOnline, selectedCompanyId } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<FilterType>("New");
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
      err instanceof ApiError ? err.message : "Failed to load projects.";
    setGlobalError(msg);
  } finally {
    setLoading(false);
  }
}

  async function handleCreateProject() {
    if (!projectName.trim()) {
      setGlobalError("Project name is required.");
      return;
    }

    setCreating(true);
    setGlobalError(null);

    try {
      const payload = { name: projectName.trim() };
      const result = await safeApiCall(
        () => projectApi.create(payload),
        payload,
        { type: "createProject" }
      );

      if ("offline" in result) {
        Alert.alert("Offline", result.message);
      } else {
        setProjects((prev) => [result.project, ...prev]);
      }

      setProjectName("");
      setShowCreateModal(false);
      setFilter("New");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to create project.";
      setGlobalError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleDownloadProject(project: Project, forceRefresh = false) {
    try {
      setDownloadingProjectId(project.id);

      const alreadyDownloaded = await isProjectDownloaded(project.id);

      if (alreadyDownloaded && !forceRefresh) {
        Alert.alert(
          "Already downloaded",
          "This project is already available offline."
        );
        return;
      }

      const result = await downloadProjectForOffline(project);
      await refreshDownloadedProjects();

      Alert.alert(
        forceRefresh ? "Offline copy refreshed" : "Download complete",
        `${project.name} is now available offline.\n\nFolders: ${result.folderCount}\nAssets: ${result.assetCount}`
      );
    } catch (error: any) {
      Alert.alert(
        "Download failed",
        error?.message || "Could not download this project for offline use."
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
          "Sync required",
          "This project has unsynced offline changes. Sync before removing offline data."
        );
        return;
      }

      await clearOfflineProject(project.id);
      await refreshDownloadedProjects();

      Alert.alert(
        "Offline copy removed",
        `${project.name} was removed from offline storage.`
      );
    } catch (error: any) {
      Alert.alert(
        "Remove failed",
        error?.message || "Could not remove offline project data."
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

      return {
        id: item.id,
        name: payload.name ?? "Offline project",
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.createdAt).toISOString(),
        workflowStatus: "new",
        companyId: "offline-company",
        userId: user?.id ?? "offline-user",
        company: {
          id: "offline-company",
          name: user?.companyName ?? "Offline project",
        },
        user: {
          id: user?.id ?? "offline-user",
          username: user?.username ?? "You",
          role: user?.role ?? null,
        },
      };
    });
  }, [pendingProjects, user]);

  const combinedProjects = useMemo(() => {
    return [...offlineProjectEntries, ...projects];
  }, [offlineProjectEntries, projects]);

  const filteredProjects = useMemo(() => {
    if (filter === "Recent") {
      return [...combinedProjects].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (filter === "New") {
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
        <View style={styles.header}>
          <Text style={styles.title}>
            Your Company:{" "}
            <Text style={styles.companyName}>{user?.companyName ?? "Company"}</Text>
          </Text>
          <Text style={styles.subtitle}>Manage your company projects</Text>
        </View>

        {globalError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{globalError}</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable style={styles.switchBtn} onPress={() => router.back()}>
            <Text style={styles.switchBtnText}>Switch Company</Text>
          </Pressable>

          {/* <Pressable
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createBtnText}>Create New Project</Text>
          </Pressable> */}
        </View>

        <View style={styles.filterRow}>
          {(["Recent", "New"] as FilterType[]).map((item) => (
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
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={ACC} style={{ marginTop: 30 }} />
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No projects found.</Text>
          </View>
        ) : (
          <View style={styles.projectList}>
            {filteredProjects.map((project) => {
              const isOfflineCreated = project.id.startsWith("offline_");
              const isDownloaded = downloadedProjectIds.includes(project.id);
              const isDownloading = downloadingProjectId === project.id;
              const isRemoving = removingProjectId === project.id;
              const pendingForProject = projectPendingMap[project.id] ?? 0;

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
                        {getProjectStatusLabel(project)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.projectMeta}>
                    Created by: {project.user?.username ?? "Unknown"}
                  </Text>
                  <Text style={styles.projectMeta}>
                    Company: {project.company?.name ?? "Unknown"}
                  </Text>

                  <View style={styles.projectFooterRow}>
                    <View style={styles.projectBadgeColumn}>
                      {isDownloaded && (
                        <View style={styles.offlineReadyBadge}>
                          <Text style={styles.offlineReadyText}>Available Offline</Text>
                        </View>
                      )}

                      {pendingForProject > 0 && (
                        <View style={styles.pendingSyncBadge}>
                          <Text style={styles.pendingSyncText}>
                            Pending Sync: {pendingForProject}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isOfflineCreated && (
                      <View style={styles.projectActionsColumn}>
                        {!isDownloaded ? (
                          <Pressable
                            style={[
                              styles.downloadBtn,
                              isDownloading && styles.downloadBtnDisabled,
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
                              <Text style={styles.downloadBtnText}>Download</Text>
                            )}
                          </Pressable>
                        ) : (
                          <>
                            <Pressable
                              style={[
                                styles.refreshBtn,
                                isDownloading && styles.downloadBtnDisabled,
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDownloadProject(project, true);
                              }}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <ActivityIndicator size="small" color={ACC} />
                              ) : (
                                <Text style={styles.refreshBtnText}>Refresh</Text>
                              )}
                            </Pressable>

                            <Pressable
                              style={[
                                styles.removeOfflineBtn,
                                (isRemoving || pendingForProject > 0) &&
                                  styles.downloadBtnDisabled,
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveOfflineProject(project);
                              }}
                              disabled={isRemoving || pendingForProject > 0}
                            >
                              {isRemoving ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.removeOfflineBtnText}>
                                  Remove Offline
                                </Text>
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

// const ACC = "#C8F135";
const SURFACE = "#111";
const BORDER = "#f8f1f1";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { padding: 8, paddingTop: 10, paddingBottom: 40 },
  header: { marginBottom: 10  },
  title: {
    color: SURFACE,
    fontSize: 17,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  companyName: { color: SURFACE , textTransform: "uppercase" },
  subtitle: { color: "#666", marginTop: 6, fontSize: 10 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 5,
  },
  switchBtn: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  switchBtnText: {
    color: "#fff",
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
    color: "#000",
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
    color: "#aaa",
    fontSize: 12,
  },
  filterBtnTextActive: {
    color: "#000",
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
    color: "#FF7B72",
    fontSize: 13,
    textAlign: "center",
  },

  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
  },

  projectList: {
    gap: 12,
  },
  projectCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
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
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.inter.semiBold as unknown as string,
    flex: 1,
    marginRight: 10,
  },
  statusPill: {
    backgroundColor: "rgba(200, 241, 53, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: ACC,
    fontSize: 9,
    fontFamily: fonts.inter.medium as unknown as string,
  },
  projectMeta: {
    color: "#777",
    fontSize: 8,
    marginTop: 8,
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
  projectActionsColumn: {
    minWidth: 120,
    gap: 8,
  },
  offlineReadyBadge: {
    backgroundColor: "rgba(200, 241, 53, 0.12)",
    borderColor: "rgba(200, 241, 53, 0.4)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  offlineReadyText: {
    color: ACC,
    fontSize: 10,
    fontFamily: fonts.inter.medium as unknown as string,
  },
  pendingSyncBadge: {
    backgroundColor: "rgba(255, 193, 7, 0.12)",
    borderColor: "rgba(255, 193, 7, 0.35)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  pendingSyncText: {
    color: "#FFC107",
    fontSize: 10,
    fontFamily: fonts.inter.medium as unknown as string,
  },
  downloadBtn: {
    backgroundColor: ACC,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  refreshBtn: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: ACC,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  refreshBtnText: {
    color: ACC,
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  removeOfflineBtn: {
    backgroundColor: "#2a1111",
    borderWidth: 1,
    borderColor: "#ff6b6b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  removeOfflineBtnText: {
    color: "#ff8b8b",
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    color: "#000",
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    color: "#fff",
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
    color: "#fff",
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
    color: "#fff",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: ACC,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#000",
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  btnDisabled: {
    opacity: 0.65,
  },
});