
//(app)/project.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
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
import { useFonts } from "expo-font";
import fonts from "../fonts/fonts";

type FilterType = "Recent" | "New" | "Favorite" | "Done";

export default function ProjectScreen() {
  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<FilterType>("New");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    setGlobalError(null);

    try {
      const res = await projectApi.list();
      setProjects(res.projects);
    } catch (err) {
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
      const res = await projectApi.create({
        name: projectName.trim(),
      });

      setProjects((prev) => [res.project, ...prev]);
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

  const filteredProjects = useMemo(() => {
    if (filter === "Recent") {
      return [...projects].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (filter === "New") {
      return projects.filter((p) => p.status === "New");
    }

    if (filter === "Favorite") {
      return projects.filter((p) => p.isFavorite);
    }

    if (filter === "Done") {
      return projects.filter((p) => p.status === "Done");
    }

    return projects;
  }, [projects, filter]);

  function openProject(project: Project) {
    router.push({
      pathname: "/(app)/FolderAndAssetScreen",
      params: {
        projectId: project.id,
        projectName: project.name,
      },
    });
  }

  if (!loaded) return null;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Project for:{" "}
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

          <Pressable
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createBtnText}>Create New Project</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {(["Recent", "New", "Favorite", "Done"] as FilterType[]).map((item) => (
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
            {filteredProjects.map((project) => (
              <Pressable
                key={project.id}
                style={styles.projectCard}
                onPress={() => openProject(project)}
              >
                <View style={styles.projectCardTop}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{project.status}</Text>
                  </View>
                </View>

                <Text style={styles.projectMeta}>
                  Created by: {project.createdBy.fullName}
                </Text>
                <Text style={styles.projectMeta}>
                  Company: {project.company.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Project</Text>

            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Enter project name"
              placeholderTextColor="#666"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreateModal(false);
                  setProjectName("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.saveBtn, creating && styles.btnDisabled]}
                onPress={handleCreateProject}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ACC = "#C8F135";
const SURFACE = "#111";
const BORDER = "#222";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#000" },
  scroll: { padding: 24, paddingTop: 20, paddingBottom: 40 },
  header: { marginBottom: 18 },
  title: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
  companyName: { color: ACC },
  subtitle: { color: "#666", marginTop: 6, fontSize: 10 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
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
    marginBottom: 18,
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
