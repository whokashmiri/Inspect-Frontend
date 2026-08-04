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
  Linking,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRouter } from "expo-router";
import { Ionicons, Entypo } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useTranslation } from "react-i18next";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Location from "expo-location";

import { useAuth } from "../../api/AuthContext";
import {
  projectApi,
  Project,
  ApiError,
  InspectorFile,
  ProjectLocation,
} from "../../api/api";
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
import AssetCameraModal from "../components/AssetCameraModal";

type FilterType = "new" | "recent" | "favorite" | "done";

const ACC = "#2A324B";
const SURFACE = "#E1E5EE";
const BORDER = "#C7CCDB";
const TEXT = "#2A324B";
const MUTED = "#767B91";
const SOFT = "#F7C59F";

function parseInspectionDate(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInspectionDatePayload(value: Date | null) {
  if (!value) return null;

  return new Date(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 12),
  ).toISOString();
}

function buildLocationLabel(address?: Location.LocationGeocodedAddress) {
  if (!address) return "";

  return [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
    address.country,
  ]
    .map((part) => String(part || "").trim())
    .filter((part, index, values) => part && values.indexOf(part) === index)
    .join(", ");
}

function upsertInspectorFile(
  files: InspectorFile[] | undefined,
  nextFile: InspectorFile,
) {
  return [...(files || []).filter((file) => file.id !== nextFile.id), nextFile];
}

function removeInspectorFile(
  files: InspectorFile[] | undefined,
  fileId: string,
) {
  return (files || []).filter((file) => file.id !== fileId);
}

function getProjectStatusLabel(project: Project, t: (key: string) => string) {
  const raw = (project.workflowStatus ?? "").toLowerCase();
  if (raw === "new") return t("projectScreen.status.new");
  if (raw === "done") return t("projectScreen.status.done");
  return project.workflowStatus || t("projectScreen.status.new");
}

function isVideoFile(file: InspectorFile) {
  return file.type === "video" || file.mimeType?.startsWith("video/");
}

function getVideoThumbnailUrl(file: InspectorFile) {
  if (file.thumbnailUrl) return file.thumbnailUrl;

  // Generate a thumbnail from a Cloudinary video if the backend
  // did not return thumbnailUrl.
  if (file.url?.includes("/video/upload/")) {
    return file.url.replace(
      "/video/upload/",
      "/video/upload/so_1,f_jpg,q_auto/",
    );
  }

  return null;
}

function VideoPreviewModal({
  videoUrl,
  title,
  onClose,
}: {
  videoUrl: string;
  title: string;
  onClose: () => void;
}) {
  const player = useVideoPlayer(videoUrl, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.play();
  });

  const handleClose = () => {
    player.pause();
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.videoPlayerOverlay}>
        <View style={styles.videoPlayerCard}>
          <View style={styles.videoPlayerHeader}>
            <Text style={styles.videoPlayerTitle} numberOfLines={1}>
              {title}
            </Text>

            <Pressable style={styles.videoPlayerClose} onPress={handleClose}>
              <Ionicons name="close" size={23} color="#ffffff" />
            </Pressable>
          </View>

          <VideoView
            style={styles.videoPlayer}
            player={player}
            nativeControls
            contentFit="contain"
          />
        </View>
      </View>
    </Modal>
  );
}
export default function ProjectScreen() {
  const { t } = useTranslation();

  const [loaded] = useFonts({
    ...fonts.poppins,
    ...fonts.inter,
  });

  const router = useRouter();
  const { user, isOnline } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<FilterType>("new");
  const [loading, setLoading] = useState(true);
  const [refreshingProjects, setRefreshingProjects] = useState(false);

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [selectedCompanyFilterId, setSelectedCompanyFilterId] = useState<
    string | null
  >(null);
  const [companyModalVisible, setCompanyModalVisible] = useState(false);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const [pendingProjects, setPendingProjects] = useState<PendingItem[]>([]);

  const [downloadedProjectIds, setDownloadedProjectIds] = useState<string[]>(
    [],
  );

  const [previewVideo, setPreviewVideo] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const [projectPendingMap, setProjectPendingMap] = useState<
    Record<string, number>
  >({});
  const [downloadingProjectId, setDownloadingProjectId] = useState<
    string | null
  >(null);
  // const [autoRefreshingIds, setAutoRefreshingIds] = useState<string[]>([]);

  const [removingProjectId, setRemovingProjectId] = useState<string | null>(
    null,
  );

  type ProjectInfoTab = "assets" | "locations";

  const [projectInfoModalVisible, setProjectInfoModalVisible] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<ProjectInfoTab | null>(
    null,
  );

  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>(
    [],
  );

  const [selectedLocation, setSelectedLocation] =
    useState<ProjectLocation | null>(null);

  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedProjectForFiles, setSelectedProjectForFiles] =
    useState<Project | null>(null);
  const [inspectorFiles, setInspectorFiles] = useState<InspectorFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const [inspectionLocationDraft, setInspectionLocationDraft] = useState("");
  const [inspectionMapUrlDraft, setInspectionMapUrlDraft] = useState("");
  const [inspectionDateDraft, setInspectionDateDraft] = useState<Date | null>(
    null,
  );
  const [inspectionDatePickerVisible, setInspectionDatePickerVisible] =
    useState(false);
  const [savingInspectionDetails, setSavingInspectionDetails] = useState(false);
  const [findingCurrentLocation, setFindingCurrentLocation] = useState(false);

  const [projectVideoCameraVisible, setProjectVideoCameraVisible] =
    useState(false);
  const [uploadingProjectVideoId, setUploadingProjectVideoId] = useState<
    string | null
  >(null);
  const uploadingProjectVideo = uploadingProjectVideoId !== null;

  const autoRefreshStartedRef = React.useRef(false);
  const autoRefreshRunningRef = React.useRef(false);
  const projectInfoRequestRef = React.useRef(0);

  const refreshPendingProjects = useCallback(async () => {
    const pending = await getPending("pending");
    setPendingProjects(pending.filter((item) => item.type === "createProject"));
  }, []);

  const refreshDownloadedProjects = useCallback(async () => {
    const downloaded = selectedCompanyFilterId
      ? await getDownloadedProjectsByCompany(selectedCompanyFilterId)
      : await getAllDownloadedProjects();

    const ids = downloaded.map((project) => project.id);
    setDownloadedProjectIds(ids);

    const counts = await Promise.all(
      ids.map(async (id) => {
        const count = await getPendingCountByProjectId(id);
        return [id, count] as const;
      }),
    );

    setProjectPendingMap(
      counts.reduce<Record<string, number>>((acc, [id, count]) => {
        acc[id] = count;
        return acc;
      }, {}),
    );
  }, [selectedCompanyFilterId]);

  useEffect(() => {
    fetchProjects(selectedCompanyFilterId);
  }, [isOnline, selectedCompanyFilterId]);

  useEffect(() => {
    const autoRefreshDownloadedProjects = async () => {
      if (autoRefreshStartedRef.current) return;
      if (autoRefreshRunningRef.current) return;
      if (!isOnline) return;
      if (loading) return;
      if (projects.length === 0) return;
      if (downloadedProjectIds.length === 0) return;

      autoRefreshStartedRef.current = true;
      autoRefreshRunningRef.current = true;

      try {
        for (const project of projects) {
          const isDownloaded = downloadedProjectIds.includes(project.id);
          if (!isDownloaded) continue;

          try {
            setDownloadingProjectId(project.id);

            await downloadProjectForOffline(project);
            await refreshDownloadedProjects();
          } catch (error) {
            console.warn("Auto refresh failed:", project.id, error);
          } finally {
            setDownloadingProjectId(null);
          }
        }
      } finally {
        autoRefreshRunningRef.current = false;
      }
    };

    autoRefreshDownloadedProjects();
  }, [
    isOnline,
    loading,
    projects,
    downloadedProjectIds,
    refreshDownloadedProjects,
  ]);

  useEffect(() => {
    autoRefreshStartedRef.current = false;
    autoRefreshRunningRef.current = false;
  }, [selectedCompanyFilterId]);

  useEffect(() => {
    refreshPendingProjects();
    refreshDownloadedProjects();

    const interval = setInterval(() => {
      refreshPendingProjects();
      refreshDownloadedProjects();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshPendingProjects, refreshDownloadedProjects]);

  async function handleRefreshProjects() {
    if (refreshingProjects) return;

    try {
      setRefreshingProjects(true);
      setGlobalError(null);

      if (isOnline) {
        const res = await projectApi.list(selectedCompanyFilterId || undefined);

        setProjects(Array.isArray(res.projects) ? res.projects : []);

        setCompanies(Array.isArray(res.companies) ? res.companies : []);
      } else {
        const offlineProjects = selectedCompanyFilterId
          ? await getDownloadedProjectsByCompany(selectedCompanyFilterId)
          : await getAllDownloadedProjects();

        setProjects(offlineProjects);
      }

      await Promise.all([
        refreshPendingProjects(),
        refreshDownloadedProjects(),
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t("projectScreen.errors.loadFailed");

      setGlobalError(message);
    } finally {
      setRefreshingProjects(false);
    }
  }

  async function fetchProjects(companyId?: string | null) {
    setLoading(true);
    setGlobalError(null);

    try {
      if (isOnline) {
        const res = await projectApi.list(companyId || undefined);

        setProjects(res.projects || []);
        setCompanies(res.companies || []);

        return;
      }

      const offlineProjects = companyId
        ? await getDownloadedProjectsByCompany(companyId)
        : await getAllDownloadedProjects();

      setProjects(offlineProjects);

      const offlineCompaniesMap = new Map<
        string,
        { id: string; name: string }
      >();

      offlineProjects.forEach((project) => {
        if (!project.companyId) return;

        offlineCompaniesMap.set(String(project.companyId), {
          id: String(project.companyId),
          name: project.company?.name || "Unknown Company",
        });
      });

      setCompanies(Array.from(offlineCompaniesMap.values()));
    } catch (err) {
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
          t("projectScreen.download.alreadyMessage"),
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
        }),
      );
    } catch (error: any) {
      Alert.alert(
        t("projectScreen.download.failTitle"),
        error?.message || t("projectScreen.download.failMessage"),
      );
    } finally {
      setDownloadingProjectId(null);
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
        name: payload.name ?? t("projectScreen.offline.projectName"),
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.createdAt).toISOString(),
        isFavorite: false,
        workflowStatus: "new",
        companyId: "offline-company",
        userId: user?.id ?? "offline-user",
        stats: {
          totalAssets: 0,
          doneAssets: 0,
          incompleteAssets: 0,
          assetsWithNotes: 0,
          presentAssets: 0,
          notPresentAssets: 0,
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

  const [projectVideoListVisible, setProjectVideoListVisible] = useState(false);

  const [selectedProjectVideoId, setSelectedProjectVideoId] = useState<
    string | null
  >(null);

  const selectedProjectForVideoList = useMemo(() => {
    if (!selectedProjectVideoId) return null;

    return (
      projects.find((project) => project.id === selectedProjectVideoId) ?? null
    );
  }, [projects, selectedProjectVideoId]);

  const projectVideosForModal = useMemo(() => {
    return (selectedProjectForVideoList?.inspectorFiles || []).filter(
      isVideoFile,
    );
  }, [selectedProjectForVideoList]);

  const isRecentProject = (project?: Project | null) => {
    if (!project?.createdAt || !project?.updatedAt) return false;

    return (
      new Date(project.updatedAt).getTime() >
      new Date(project.createdAt).getTime()
    );
  };

  const filteredProjects = useMemo(() => {
    const safeProjects = combinedProjects.filter(Boolean) as Project[];

    if (filter === "new") {
      return safeProjects.filter(
        (p) =>
          (p.workflowStatus ?? "new").toLowerCase() === "new" &&
          !p.isFavorite &&
          !isRecentProject(p),
      );
    }

    if (filter === "recent") {
      return safeProjects
        .filter(
          (p) =>
            isRecentProject(p) &&
            !p.isFavorite &&
            (p.workflowStatus ?? "new").toLowerCase() !== "done",
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }

    if (filter === "favorite") {
      return safeProjects.filter((p) => p.isFavorite === true);
    }

    if (filter === "done") {
      return safeProjects.filter(
        (p) => (p.workflowStatus ?? "").toLowerCase() === "done",
      );
    }

    return safeProjects;
  }, [combinedProjects, filter]);

  if (!loaded) return null;

  async function openProjectInfoModal(project: Project) {
    const requestId = ++projectInfoRequestRef.current;

    // Clear every value that belongs to the previously opened project before
    // showing the modal. In particular, keeping selectedLocation here caused
    // the inspector files from Project A to remain visible for Project B.
    setSelectedProjectForFiles(project);
    setSelectedLocation(null);
    setInspectorFiles([]);
    setProjectLocations([]);
    setActiveInfoTab("locations");
    setInspectionLocationDraft(project.inspectionLocation || "");
    setInspectionMapUrlDraft(project.inspectionMapUrl || "");
    setInspectionDateDraft(parseInspectionDate(project.inspectionDate));
    setInspectionDatePickerVisible(false);
    setLocationsLoading(true);
    setProjectInfoModalVisible(true);

    try {
      const result = await projectApi.listLocations(project.id);

      // Ignore an older response if the user has already opened another
      // project's menu.
      if (projectInfoRequestRef.current !== requestId) return;

      setProjectLocations(
        Array.isArray(result.locations) ? result.locations : [],
      );
    } catch (error: any) {
      if (projectInfoRequestRef.current !== requestId) return;
      Alert.alert("Error", error?.message || "Could not load locations");
    } finally {
      if (projectInfoRequestRef.current === requestId) {
        setLocationsLoading(false);
      }
    }
  }

  function closeProjectInfoModal() {
    // Invalidate an in-flight request so it cannot repopulate closed/stale UI.
    projectInfoRequestRef.current += 1;
    setProjectInfoModalVisible(false);
    setSelectedProjectForFiles(null);
    setSelectedLocation(null);
    setProjectLocations([]);
    setInspectorFiles([]);
    setLocationsLoading(false);
    setInspectionLocationDraft("");
    setInspectionMapUrlDraft("");
    setInspectionDateDraft(null);
    setInspectionDatePickerVisible(false);
    setProjectVideoCameraVisible(false);
    setPreviewVideo(null);
  }

  function getFileIcon(type: InspectorFile["type"]) {
    if (type === "pdf") return "document-text-outline";
    if (type === "excel") return "grid-outline";
    if (type === "word") return "document-outline";
    if (type === "image") return "image-outline";
    if (type === "video") return "videocam-outline";
    if (type === "audio") return "musical-notes-outline";
    return "attach-outline";
  }

  function formatFileSize(sizeBytes?: number) {
    if (!sizeBytes) return "";
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }
  async function viewInspectorFile(
    file: InspectorFile,
    projectId = selectedProjectForFiles?.id,
  ) {
    if (!projectId) return;

    try {
      setViewingFileId(file.id);

      if (isVideoFile(file)) {
        // Project videos are stored in Cloudinary, so their saved URL can be
        // played directly. This also avoids waiting for a download URL before
        // mounting the player on the first tap.
        let videoUrl = String(file.url || "").trim();

        if (!videoUrl) {
          const result = await projectApi.downloadInspectorFile(
            projectId,
            file.id,
          );
          videoUrl = String(result.url || "").trim();
        }

        if (!videoUrl) {
          throw new Error("Video URL is unavailable");
        }

        setPreviewVideo({
          url: videoUrl,
          name: file.name || "Inspection video",
        });

        return;
      }

      const result = await projectApi.downloadInspectorFile(projectId, file.id);
      await Linking.openURL(result.url);
    } catch (error: any) {
      Alert.alert("View failed", error?.message || "Could not open file.");
    } finally {
      setViewingFileId(null);
    }
  }

  async function downloadInspectorFile(file: InspectorFile) {
    try {
      if (!selectedProjectForFiles) return;
      setDownloadingFileId(file.id);

      const result = await projectApi.downloadInspectorFile(
        selectedProjectForFiles.id,
        file.id,
      );

      const safeFileName = file.name.replace(/[\/\\?%*:|"<>]/g, "-");
      const fileUri = FileSystem.documentDirectory + safeFileName;

      const downloaded = await FileSystem.downloadAsync(result.url, fileUri);

      // Save images and videos directly to the device gallery.
      if (
        file.type === "image" ||
        file.type === "video" ||
        file.mimeType?.startsWith("image/") ||
        file.mimeType?.startsWith("video/")
      ) {
        const permission = await MediaLibrary.requestPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission required",
            "Please allow media access to save this file.",
          );
          return;
        }

        await MediaLibrary.saveToLibraryAsync(downloaded.uri);

        Alert.alert("Saved", "Media saved to your gallery.");
        return;
      }

      // For PDF, Word, Excel, audio: open save/share sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: file.mimeType || undefined,
          dialogTitle: "Save file",
          UTI: file.mimeType || undefined,
        });
      } else {
        Alert.alert("Downloaded", "File saved to app storage.");
      }
    } catch (error: any) {
      Alert.alert(
        "Download failed",
        error?.message || "Error downloading file",
      );
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function toggleAssetsSection() {
    if (!selectedProjectForFiles) return;

    if (activeInfoTab === "assets") {
      setActiveInfoTab(null);
      return;
    }

    setActiveInfoTab("assets");

    try {
      setFilesLoading(true);
      const result = await projectApi.listInspectorFiles(
        selectedProjectForFiles.id,
      );
      setInspectorFiles(result.files || []);
    } catch (error: any) {
      Alert.alert(
        "Files error",
        error?.message || "Could not load inspector files",
      );
    } finally {
      setFilesLoading(false);
    }
  }

  async function useCurrentInspectionLocation() {
    if (findingCurrentLocation) return;

    try {
      setFindingCurrentLocation(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Location permission required",
          "Allow location access to use your current inspection location.",
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = Number(current.coords.latitude.toFixed(6));
      const longitude = Number(current.coords.longitude.toFixed(6));
      const coordinateLabel = `${latitude}, ${longitude}`;

      let addressLabel = "";

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        addressLabel = buildLocationLabel(addresses[0]);
      } catch (error) {
        console.warn("Reverse geocoding failed:", error);
      }

      setInspectionLocationDraft(addressLabel || coordinateLabel);
      setInspectionMapUrlDraft(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      );
    } catch (error: any) {
      Alert.alert(
        "Location unavailable",
        error?.message || "Could not get your current location.",
      );
    } finally {
      setFindingCurrentLocation(false);
    }
  }

  async function saveInspectionDetails() {
    const project = selectedProjectForFiles;

    if (!project || savingInspectionDetails) return;

    if (!isOnline) {
      Alert.alert(
        "Internet required",
        "Switch the app online before saving inspection details.",
      );
      return;
    }

    try {
      setSavingInspectionDetails(true);

      const result = await projectApi.updateInspectionDetails(project.id, {
        inspectionLocation: inspectionLocationDraft.trim(),
        inspectionMapUrl: inspectionMapUrlDraft.trim(),
        inspectionDate: toInspectionDatePayload(inspectionDateDraft),
      });

      setProjects((current) =>
        current.map((item) =>
          item.id === result.project.id ? result.project : item,
        ),
      );
      setSelectedProjectForFiles(result.project);
      setInspectionLocationDraft(result.project.inspectionLocation || "");
      setInspectionMapUrlDraft(result.project.inspectionMapUrl || "");
      setInspectionDateDraft(
        parseInspectionDate(result.project.inspectionDate),
      );

      Alert.alert("Saved", "Inspection details were updated successfully.");
    } catch (error: any) {
      Alert.alert(
        "Save failed",
        error?.message || "Could not update inspection details.",
      );
    } finally {
      setSavingInspectionDetails(false);
    }
  }

  async function handleProjectVideoDone(media: any[]) {
    const project = selectedProjectForFiles;
    const locationId = selectedLocation?.id;

    if (!project) {
      throw new Error("No project selected");
    }

    if (!isOnline) {
      Alert.alert(
        "Internet required",
        "Switch the app online before uploading a project video.",
      );
      throw new Error("Project video upload requires internet");
    }

    const capturedVideo = media.find(
      (item) =>
        item?.mediaType === "video" ||
        item?.mimeType?.startsWith?.("video/") ||
        item?.type?.startsWith?.("video/"),
    );

    if (!capturedVideo) {
      Alert.alert("Video required", "Please record or select a video.");
      throw new Error("No video selected");
    }

    const rawUri =
      capturedVideo.uri || capturedVideo.localUri || capturedVideo.path;

    if (!rawUri) {
      throw new Error("Video URI is unavailable");
    }

    const uri = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawUri)
      ? rawUri
      : `file://${rawUri}`;

    const uploadedAt = Date.now();
    const videoName =
      capturedVideo.name || `inspection-video-${uploadedAt}.mp4`;
    const videoMimeType =
      capturedVideo.mimeType || capturedVideo.type || "video/mp4";
    const temporaryVideoId = `uploading-video-${project.id}-${uploadedAt}`;

    const optimisticVideo: InspectorFile = {
      id: temporaryVideoId,
      name: videoName,
      type: "video",
      url: uri,
      uploadedBy: user?.id ?? "pending-upload",
      createdAt: new Date(uploadedAt).toISOString(),
      storage: "cloudinary",
      publicId: null,
      mimeType: videoMimeType,
      duration:
        typeof capturedVideo.duration === "number"
          ? capturedVideo.duration
          : null,
      thumbnailUrl:
        capturedVideo.thumbnailUrl || capturedVideo.thumbnailUri || null,
      locationIds: locationId ? [locationId] : [],
    };

    // Close the camera immediately and show the local video in the UI while
    // Cloudinary and the project API continue in the background.
    setProjectVideoCameraVisible(false);
    setUploadingProjectVideoId(temporaryVideoId);

    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? {
              ...item,
              inspectorFiles: upsertInspectorFile(
                item.inspectorFiles,
                optimisticVideo,
              ),
            }
          : item,
      ),
    );

    setSelectedProjectForFiles((current) =>
      current?.id === project.id
        ? {
            ...current,
            inspectorFiles: upsertInspectorFile(
              current.inspectorFiles,
              optimisticVideo,
            ),
          }
        : current,
    );

    setInspectorFiles((current) =>
      upsertInspectorFile(current, optimisticVideo),
    );

    if (locationId) {
      setSelectedLocation((current) =>
        current?.id === locationId
          ? {
              ...current,
              inspectorFiles: upsertInspectorFile(
                current.inspectorFiles,
                optimisticVideo,
              ),
            }
          : current,
      );

      setProjectLocations((current) =>
        current.map((location) =>
          location.id === locationId
            ? {
                ...location,
                inspectorFiles: upsertInspectorFile(
                  location.inspectorFiles,
                  optimisticVideo,
                ),
              }
            : location,
        ),
      );
    }

    // Do not await this task. Returning now lets AssetCameraModal finish its
    // Use Video action without waiting for the network upload.
    void (async () => {
      try {
        const result = await projectApi.addProjectVideo({
          projectId: project.id,
          video: {
            uri,
            name: videoName,
            type: videoMimeType,
          },
          locationIds: locationId ? [locationId] : [],
        });

        const savedProject: Project = {
          ...result.project,
          inspectorFiles: upsertInspectorFile(
            removeInspectorFile(
              result.project.inspectorFiles,
              temporaryVideoId,
            ),
            result.video,
          ),
        };

        setProjects((current) =>
          current.map((item) =>
            item.id === savedProject.id ? savedProject : item,
          ),
        );

        setSelectedProjectForFiles((current) =>
          current?.id === savedProject.id ? savedProject : current,
        );

        setInspectorFiles((current) =>
          upsertInspectorFile(
            removeInspectorFile(current, temporaryVideoId),
            result.video,
          ),
        );

        if (locationId) {
          setSelectedLocation((current) =>
            current?.id === locationId
              ? {
                  ...current,
                  inspectorFiles: upsertInspectorFile(
                    removeInspectorFile(
                      current.inspectorFiles,
                      temporaryVideoId,
                    ),
                    result.video,
                  ),
                }
              : current,
          );

          setProjectLocations((current) =>
            current.map((location) =>
              location.id === locationId
                ? {
                    ...location,
                    inspectorFiles: upsertInspectorFile(
                      removeInspectorFile(
                        location.inspectorFiles,
                        temporaryVideoId,
                      ),
                      result.video,
                    ),
                  }
                : location,
            ),
          );
        }
      } catch (error: any) {
        // Roll back only the optimistic item; preserve every real file.
        setProjects((current) =>
          current.map((item) =>
            item.id === project.id
              ? {
                  ...item,
                  inspectorFiles: removeInspectorFile(
                    item.inspectorFiles,
                    temporaryVideoId,
                  ),
                }
              : item,
          ),
        );

        setSelectedProjectForFiles((current) =>
          current?.id === project.id
            ? {
                ...current,
                inspectorFiles: removeInspectorFile(
                  current.inspectorFiles,
                  temporaryVideoId,
                ),
              }
            : current,
        );

        setInspectorFiles((current) =>
          removeInspectorFile(current, temporaryVideoId),
        );

        if (locationId) {
          setSelectedLocation((current) =>
            current?.id === locationId
              ? {
                  ...current,
                  inspectorFiles: removeInspectorFile(
                    current.inspectorFiles,
                    temporaryVideoId,
                  ),
                }
              : current,
          );

          setProjectLocations((current) =>
            current.map((location) =>
              location.id === locationId
                ? {
                    ...location,
                    inspectorFiles: removeInspectorFile(
                      location.inspectorFiles,
                      temporaryVideoId,
                    ),
                  }
                : location,
            ),
          );
        }

        Alert.alert(
          "Upload failed",
          error?.message || "Could not upload the inspection video.",
        );
      } finally {
        setUploadingProjectVideoId((current) =>
          current === temporaryVideoId ? null : current,
        );
      }
    })();
  }

  function openProjectVideosModal(project: Project) {
    setSelectedProjectVideoId(project.id);
    setProjectVideoListVisible(true);
  }

  function closeProjectVideosModal() {
    setProjectVideoListVisible(false);
    setSelectedProjectVideoId(null);
  }

  function addAnotherProjectVideo() {
    if (!selectedProjectForVideoList || uploadingProjectVideo) return;

    const project = selectedProjectForVideoList;

    setProjectVideoListVisible(false);
    openProjectVideoCamera(project);
  }

  function openProjectVideoCamera(project: Project) {
    if (uploadingProjectVideo) return;

    if (!isOnline) {
      Alert.alert(
        "Internet required",
        "Switch the app online before recording a project video.",
      );
      return;
    }

    // The project-card camera saves a project-level video. A video started
    // from inside a selected location remains linked to that location.
    setSelectedProjectForFiles(project);
    setSelectedLocation(null);
    setProjectVideoCameraVisible(true);
  }

  async function openPhone(phone: string) {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;

    await Linking.openURL(`tel:${cleanPhone}`);
  }

  async function openLocation(location: ProjectLocation) {
    const url =
      location.mapUrl ||
      (location.latitude && location.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
        : null);

    if (!url) {
      Alert.alert("Location unavailable", "No map URL or coordinates found.");
      return;
    }

    await Linking.openURL(url);
  }

  async function toggleProjectDone(project: Project) {
    if (!project?.id || project.id.startsWith("offline_")) return;

    const previousStatus = project.workflowStatus;
    const nextStatus =
      project.workflowStatus?.toLowerCase() === "done" ? "new" : "done";

    setProjects((prev) =>
      prev
        .filter(Boolean)
        .map((p) =>
          p.id === project.id ? { ...p, workflowStatus: nextStatus } : p,
        ),
    );

    try {
      const result = await projectApi.updateProjectWorkflow(project.id, {
        workflowStatus: nextStatus as "new" | "done",
      });

      setProjects((prev) =>
        prev
          .filter(Boolean)
          .map((p) => (p.id === project.id ? result.project : p))
          .filter(Boolean),
      );
    } catch (error: any) {
      setProjects((prev) =>
        prev
          .filter(Boolean)
          .map((p) =>
            p.id === project.id ? { ...p, workflowStatus: previousStatus } : p,
          ),
      );

      Alert.alert("Error", error?.message || "Could not update project status");
    }
  }

  async function toggleProjectFavorite(project: Project) {
    if (!project?.id || project.id.startsWith("offline_")) return;

    const previousFavorite = project.isFavorite;
    const nextFavorite = !project.isFavorite;

    setProjects((prev) =>
      prev
        .filter(Boolean)
        .map((p) =>
          p.id === project.id ? { ...p, isFavorite: nextFavorite } : p,
        ),
    );

    try {
      const result = await projectApi.updateProjectWorkflow(project.id, {
        isFavorite: nextFavorite,
      });

      setProjects((prev) =>
        prev
          .filter(Boolean)
          .map((p) => (p.id === project.id ? result.project : p))
          .filter(Boolean),
      );
    } catch (error: any) {
      setProjects((prev) =>
        prev
          .filter(Boolean)
          .map((p) =>
            p.id === project.id ? { ...p, isFavorite: previousFavorite } : p,
          ),
      );

      Alert.alert("Error", error?.message || "Could not update favorite");
    }
  }

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
            onPress={() => setCompanyModalVisible(true)}
            disabled={refreshingProjects}
          >
            <Text style={styles.switchBtnText} numberOfLines={1}>
              {selectedCompanyFilterId
                ? companies.find(
                    (company) => company.id === selectedCompanyFilterId,
                  )?.name || t("company.company")
                : t("company.allCompanies")}
            </Text>

            <Ionicons name="chevron-down" size={16} color="#ffffff" />
          </Pressable>

          <Pressable
            style={[
              styles.projectsRefreshBtn,
              refreshingProjects && styles.projectsRefreshBtnDisabled,
            ]}
            onPress={handleRefreshProjects}
            disabled={refreshingProjects}
          >
            {refreshingProjects ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="refresh" size={20} color="#ffffff" />
            )}

            <Text style={styles.projectsRefreshText}>
              {t("common.refresh")}
            </Text>
          </Pressable>
        </View>

        {/* ── Filter row ── */}
        <View style={styles.filterRow}>
          {(["new", "recent", "favorite", "done"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={styles.filterTab}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === item && styles.filterTabTextActive,
                ]}
              >
                {t(`filters.${item}`)}
              </Text>

              {filter === item && <View style={styles.filterActiveLine} />}
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
              const projectVideos = (project.inspectorFiles || []).filter(
                isVideoFile,
              );

              const projectVideo =
                projectVideos.length > 0
                  ? projectVideos[projectVideos.length - 1]
                  : null;

              const stats = project.stats ?? {
                totalAssets: 0,
                doneAssets: 0,
                incompleteAssets: 0,
                assetsWithNotes: 0,
                presentAssets: 0,
                notPresentAssets: 0,
              };

              return (
                <Pressable
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => openProject(project)}
                >
                  <View style={styles.projectCardTop}>
                    <Text style={styles.projectName}>{project.name}</Text>

                    <View style={styles.projectQuickActions}>
                      <Pressable
                        style={styles.quickActionBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleProjectFavorite(project);
                        }}
                        disabled={project.id.startsWith("offline_")}
                      >
                        <Ionicons
                          name={project.isFavorite ? "heart" : "heart-outline"}
                          size={18}
                          color={project.isFavorite ? "#E63946" : MUTED}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.quickActionBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleProjectDone(project);
                        }}
                        disabled={project.id.startsWith("offline_")}
                      >
                        <Ionicons
                          name={
                            project.workflowStatus?.toLowerCase() === "done"
                              ? "checkmark-circle"
                              : "checkmark-circle-outline"
                          }
                          size={19}
                          color={
                            project.workflowStatus?.toLowerCase() === "done"
                              ? "#2A9D8F"
                              : MUTED
                          }
                        />
                      </Pressable>

                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                          {getProjectStatusLabel(project, t)}
                        </Text>
                      </View>
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
                      <Text style={styles.statLabel}>
                        {t("projectScreen.stats.total")}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>
                        {stats.notPresentAssets}
                      </Text>
                      <Text style={styles.statLabel}>Not Present</Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{stats.doneAssets}</Text>
                      <Text style={styles.statLabel}>
                        {t("projectScreen.stats.done")}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>
                        {stats.incompleteAssets}
                      </Text>
                      <Text style={styles.statLabel}>
                        {t("projectScreen.stats.incomplete")}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>
                        {stats.assetsWithNotes}
                      </Text>
                      <Text style={styles.statLabel}>
                        {t("projectScreen.stats.notes")}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.statBox}
                      onPress={(e) => {
                        e.stopPropagation();
                        openProjectInfoModal(project);
                      }}
                    >
                      {/* <Ionicons name="dots-three-vertical" size={22} color={TEXT} /> */}
                      <Entypo
                        name="dots-three-vertical"
                        size={24}
                        color={TEXT}
                      />
                      {/* <Text style={styles.statLabel}>Files</Text> */}
                    </Pressable>
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
                        )}

                        {projectVideo ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View ${projectVideos.length} inspection videos`}
                            style={[
                              styles.iconBtn,
                              styles.projectVideoIconThumbnail,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              openProjectVideosModal(project);
                            }}
                          >
                            {getVideoThumbnailUrl(projectVideo) ? (
                              <Image
                                source={{
                                  uri: getVideoThumbnailUrl(projectVideo)!,
                                }}
                                style={styles.projectVideoIconImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.projectVideoIconFallback} />
                            )}

                            <View style={styles.projectVideoIconOverlay}>
                              <Ionicons
                                name="albums-outline"
                                size={18}
                                color="#ffffff"
                              />
                            </View>

                            <View style={styles.projectVideoCountBadge}>
                              <Text style={styles.projectVideoCountText}>
                                {projectVideos.length}
                              </Text>
                            </View>
                          </Pressable>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Record inspection video"
                            style={[
                              styles.iconBtn,
                              styles.videoIconBtn,
                              (!isOnline || uploadingProjectVideo) &&
                                styles.iconBtnDisabled,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              openProjectVideoCamera(project);
                            }}
                            disabled={!isOnline || uploadingProjectVideo}
                          >
                            {uploadingProjectVideo &&
                            selectedProjectForFiles?.id === project.id ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Ionicons
                                name="videocam-outline"
                                size={21}
                                color="#ffffff"
                              />
                            )}
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Modal
          visible={companyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCompanyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filesModalCard}>
              <View style={styles.filesModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {" "}
                    {t("company.filterByCompany")}
                  </Text>
                  <Text style={styles.filesModalSubtitle}>
                    {t("company.selectCompanyToShowProjects")}
                  </Text>
                </View>

                <Pressable
                  style={styles.filesCloseBtn}
                  onPress={() => setCompanyModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={TEXT} />
                </Pressable>
              </View>

              <Pressable
                style={styles.companyOption}
                onPress={() => {
                  setSelectedCompanyFilterId(null);
                  setCompanyModalVisible(false);
                }}
              >
                <Text style={styles.companyOptionText}>
                  {t("company.allCompanies")}
                </Text>
                {!selectedCompanyFilterId && (
                  <Ionicons name="checkmark-circle" size={20} color={ACC} />
                )}
              </Pressable>

              {companies.map((company) => (
                <Pressable
                  key={company.id}
                  style={styles.companyOption}
                  onPress={() => {
                    setSelectedCompanyFilterId(company.id);
                    setCompanyModalVisible(false);
                  }}
                >
                  <Text style={styles.companyOptionText}>
                    {company.name || "Unknown Company"}
                  </Text>

                  {selectedCompanyFilterId === company.id && (
                    <Ionicons name="checkmark-circle" size={20} color={ACC} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        <Modal
          visible={projectInfoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeProjectInfoModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.filesModalCard}>
              <View style={styles.filesModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {t("project.projectInfo")}
                  </Text>
                  <Text style={styles.filesModalSubtitle} numberOfLines={1}>
                    {selectedProjectForFiles?.name}
                  </Text>
                </View>

                <Pressable
                  style={styles.filesCloseBtn}
                  onPress={closeProjectInfoModal}
                >
                  <Ionicons name="close" size={20} color={TEXT} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                <View style={styles.inspectionDetailsCard}>
                  <View style={styles.inspectionHeaderRow}>
                    {inspectionMapUrlDraft.trim() ? (
                      <Pressable
                        style={styles.smallMapBtn}
                        onPress={() =>
                          Linking.openURL(inspectionMapUrlDraft.trim())
                        }
                      >
                        <Ionicons name="map-outline" size={10} color={ACC} />
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={styles.fieldLabel}>Inspection location</Text>
                  <TextInput
                    value={inspectionLocationDraft}
                    onChangeText={setInspectionLocationDraft}
                    placeholder="Enter inspection location"
                    placeholderTextColor={MUTED}
                    style={styles.inspectionInput}
                    multiline
                    textAlignVertical="top"
                  />

                  <Pressable
                    style={styles.currentLocationBtn}
                    onPress={useCurrentInspectionLocation}
                    disabled={findingCurrentLocation}
                  >
                    {findingCurrentLocation ? (
                      <ActivityIndicator size="small" color={ACC} />
                    ) : (
                      <Ionicons name="locate-outline" size={18} color={ACC} />
                    )}
                    <Text style={styles.currentLocationText}>
                      {findingCurrentLocation
                        ? "Getting current location..."
                        : "Use current location"}
                    </Text>
                  </Pressable>

                  <Text style={styles.fieldLabel}>Google Maps URL</Text>
                  <TextInput
                    value={inspectionMapUrlDraft}
                    onChangeText={setInspectionMapUrlDraft}
                    placeholder="Map URL (filled automatically from GPS)"
                    placeholderTextColor={MUTED}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={styles.inspectionInputSingle}
                  />

                  <Text style={styles.fieldLabel}>Inspection date</Text>
                  <View style={styles.inspectionDateRow}>
                    <Pressable
                      style={styles.inspectionDateBtn}
                      onPress={() => setInspectionDatePickerVisible(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color={ACC} />
                      <Text style={styles.inspectionDateText}>
                        {inspectionDateDraft
                          ? inspectionDateDraft.toLocaleDateString()
                          : "Select inspection date"}
                      </Text>
                    </Pressable>

                    {inspectionDateDraft ? (
                      <Pressable
                        style={styles.clearDateBtn}
                        onPress={() => setInspectionDateDraft(null)}
                      >
                        <Ionicons name="close" size={18} color={MUTED} />
                      </Pressable>
                    ) : null}
                  </View>

                  {inspectionDatePickerVisible ? (
                    <DateTimePicker
                      value={inspectionDateDraft || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(event, nextDate) => {
                        setInspectionDatePickerVisible(false);

                        if (event.type !== "dismissed" && nextDate) {
                          setInspectionDateDraft(nextDate);
                        }
                      }}
                    />
                  ) : null}

                  <Pressable
                    style={[
                      styles.saveInspectionBtn,
                      (!isOnline || savingInspectionDetails) &&
                        styles.actionBtnDisabled,
                    ]}
                    onPress={saveInspectionDetails}
                    disabled={savingInspectionDetails}
                  >
                    {savingInspectionDetails ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="save-outline" size={18} color="#ffffff" />
                    )}
                    <Text style={styles.saveInspectionText}>
                      {isOnline
                        ? "Save inspection details"
                        : "Switch online to save"}
                    </Text>
                  </Pressable>
                </View>

                {locationsLoading ? (
                  <ActivityIndicator color={ACC} style={{ marginTop: 24 }} />
                ) : projectLocations.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>
                      {t("location.noLocationsFound")}
                    </Text>
                  </View>
                ) : !selectedLocation ? (
                  projectLocations.map((location, index) => (
                    <Pressable
                      key={`${location.id || location.name || index}`}
                      style={styles.locationCard}
                      onPress={() => setSelectedLocation(location)}
                    >
                      <View style={styles.locationMainRow}>
                        <View style={styles.locationIconBox}>
                          <Ionicons
                            name="location-outline"
                            size={22}
                            color={ACC}
                          />
                        </View>

                        <View style={styles.infoTextWrap}>
                          <Text style={styles.fileName}>
                            {location.name ||
                              location.city ||
                              t("location.location")}
                          </Text>

                          <Text style={styles.fileMeta}>
                            {[location.region, location.city]
                              .filter(Boolean)
                              .join(" • ") || t("location.noAddress")}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={MUTED}
                        />
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View>
                    <Pressable
                      style={styles.locationBackBtn}
                      onPress={() => setSelectedLocation(null)}
                    >
                      <Ionicons name="chevron-back" size={18} color={ACC} />
                      <Text style={styles.locationBackText}>
                        {t("location.locations")}
                      </Text>
                    </Pressable>

                    <View style={styles.locationCard}>
                      <Pressable
                        style={styles.locationMainRow}
                        onPress={() => openLocation(selectedLocation)}
                      >
                        <View style={styles.locationIconBox}>
                          <Ionicons name="map-outline" size={22} color={ACC} />
                        </View>

                        <View style={styles.infoTextWrap}>
                          <Text style={styles.fileName}>
                            {selectedLocation.name ||
                              selectedLocation.city ||
                              "Location"}
                          </Text>

                          <Text style={styles.fileMeta}>
                            {[selectedLocation.region, selectedLocation.city]
                              .filter(Boolean)
                              .join(" • ") || "No address"}
                          </Text>

                          {(selectedLocation.latitude ||
                            selectedLocation.longitude) && (
                            <Text style={styles.locationCoords}>
                              {selectedLocation.latitude ?? "-"},{" "}
                              {selectedLocation.longitude ?? "-"}
                            </Text>
                          )}
                        </View>

                        <Ionicons name="open-outline" size={18} color={MUTED} />
                      </Pressable>

                      {selectedLocation.notes ? (
                        <Text style={styles.locationNotes}>
                          {selectedLocation.notes}
                        </Text>
                      ) : null}

                      <View style={styles.phoneRow}>
                        {selectedLocation.primaryPhone ? (
                          <Pressable
                            style={styles.phoneBtn}
                            onPress={() =>
                              openPhone(selectedLocation.primaryPhone!)
                            }
                          >
                            <Ionicons
                              name="call-outline"
                              size={16}
                              color={ACC}
                            />
                            <Text style={styles.phoneText}>
                              {selectedLocation.primaryPhone}
                            </Text>
                          </Pressable>
                        ) : null}

                        {selectedLocation.secondaryPhone ? (
                          <Pressable
                            style={styles.phoneBtn}
                            onPress={() =>
                              openPhone(selectedLocation.secondaryPhone!)
                            }
                          >
                            <Ionicons
                              name="call-outline"
                              size={16}
                              color={ACC}
                            />
                            <Text style={styles.phoneText}>
                              {selectedLocation.secondaryPhone}
                            </Text>
                          </Pressable>
                        ) : null}

                        {!selectedLocation.primaryPhone &&
                        !selectedLocation.secondaryPhone ? (
                          <Text style={styles.noPhoneText}>
                            {t("location.noPhoneNumbers")}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Pressable
                      style={[
                        styles.recordVideoBtn,
                        (!isOnline || uploadingProjectVideo) &&
                          styles.actionBtnDisabled,
                      ]}
                      onPress={() => setProjectVideoCameraVisible(true)}
                      disabled={!isOnline || uploadingProjectVideo}
                    >
                      {uploadingProjectVideo ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons
                          name="videocam-outline"
                          size={19}
                          color="#ffffff"
                        />
                      )}
                      <Text style={styles.recordVideoText}>
                        {isOnline
                          ? "Record inspection video"
                          : "Video upload requires internet"}
                      </Text>
                    </Pressable>

                    <Text style={styles.sectionTitle}>
                      {t("project.inspectorFiles")}
                    </Text>

                    {(selectedLocation.inspectorFiles || []).length === 0 ? (
                      <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>
                          {t("project.noFilesForLocation")}
                        </Text>
                      </View>
                    ) : (
                      (selectedLocation.inspectorFiles || []).map((file) => (
                        <View key={file.id} style={styles.fileRow}>
                          {isVideoFile(file) ? (
                            <Pressable
                              style={styles.fileVideoThumbnail}
                              onPress={() => viewInspectorFile(file)}
                              disabled={
                                viewingFileId === file.id ||
                                file.id === uploadingProjectVideoId
                              }
                            >
                              {getVideoThumbnailUrl(file) ? (
                                <Image
                                  source={{ uri: getVideoThumbnailUrl(file)! }}
                                  style={styles.fileVideoThumbnailImage}
                                />
                              ) : null}

                              <View style={styles.fileVideoThumbnailOverlay}>
                                {file.id === uploadingProjectVideoId ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#ffffff"
                                  />
                                ) : (
                                  <Ionicons
                                    name="play"
                                    size={19}
                                    color="#ffffff"
                                  />
                                )}
                              </View>
                            </Pressable>
                          ) : (
                            <View style={styles.fileIconBox}>
                              <Ionicons
                                name={getFileIcon(file.type) as any}
                                size={22}
                                color={ACC}
                              />
                            </View>
                          )}

                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName} numberOfLines={2}>
                              {file.name}
                            </Text>
                            <Text style={styles.fileMeta}>
                              {file.type.toUpperCase()}
                              {file.sizeBytes
                                ? ` • ${formatFileSize(file.sizeBytes)}`
                                : ""}
                            </Text>
                          </View>

                          <View style={styles.fileActions}>
                            <Pressable
                              style={[styles.fileActionBtn, styles.viewBtn]}
                              onPress={() => viewInspectorFile(file)}
                              disabled={
                                viewingFileId === file.id ||
                                downloadingFileId === file.id ||
                                file.id === uploadingProjectVideoId
                              }
                            >
                              {viewingFileId === file.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons
                                  name="eye-outline"
                                  size={18}
                                  color="#fff"
                                />
                              )}
                            </Pressable>

                            <Pressable
                              style={[styles.fileActionBtn, styles.downloadBtn]}
                              onPress={() => downloadInspectorFile(file)}
                              disabled={
                                viewingFileId === file.id ||
                                downloadingFileId === file.id ||
                                file.id === uploadingProjectVideoId
                              }
                            >
                              {downloadingFileId === file.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons
                                  name="download-outline"
                                  size={18}
                                  color="#fff"
                                />
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>

      <Modal
        visible={projectVideoListVisible}
        transparent
        animationType="fade"
        onRequestClose={closeProjectVideosModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.projectVideosModalCard}>
            <View style={styles.filesModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Inspection videos</Text>

                <Text style={styles.filesModalSubtitle} numberOfLines={1}>
                  {selectedProjectForVideoList?.name}
                </Text>
              </View>

              <Pressable
                style={styles.filesCloseBtn}
                onPress={closeProjectVideosModal}
              >
                <Ionicons name="close" size={20} color={TEXT} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.projectVideosScroll}
              showsVerticalScrollIndicator={false}
            >
              {projectVideosForModal.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    No inspection videos uploaded.
                  </Text>
                </View>
              ) : (
                projectVideosForModal.map((file, index) => {
                  const isUploading = file.id === uploadingProjectVideoId;
                  const thumbnailUrl = getVideoThumbnailUrl(file);

                  return (
                    <View key={file.id} style={styles.fileRow}>
                      <Pressable
                        style={styles.fileVideoThumbnail}
                        onPress={() => {
                          if (!isUploading && selectedProjectForVideoList) {
                            viewInspectorFile(
                              file,
                              selectedProjectForVideoList.id,
                            );
                          }
                        }}
                        disabled={isUploading || viewingFileId === file.id}
                      >
                        {thumbnailUrl ? (
                          <Image
                            source={{ uri: thumbnailUrl }}
                            style={styles.fileVideoThumbnailImage}
                            resizeMode="cover"
                          />
                        ) : null}

                        <View style={styles.fileVideoThumbnailOverlay}>
                          {isUploading || viewingFileId === file.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Ionicons name="play" size={19} color="#ffffff" />
                          )}
                        </View>
                      </Pressable>

                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={2}>
                          {file.name || `Inspection video ${index + 1}`}
                        </Text>

                        <Text style={styles.fileMeta}>
                          {isUploading
                            ? "Uploading..."
                            : file.createdAt
                              ? new Date(file.createdAt).toLocaleString()
                              : "Video"}
                        </Text>
                      </View>

                      <Pressable
                        style={[
                          styles.fileActionBtn,
                          styles.viewBtn,
                          (isUploading || viewingFileId === file.id) &&
                            styles.iconBtnDisabled,
                        ]}
                        onPress={() => {
                          if (selectedProjectForVideoList) {
                            viewInspectorFile(
                              file,
                              selectedProjectForVideoList.id,
                            );
                          }
                        }}
                        disabled={isUploading || viewingFileId === file.id}
                      >
                        {viewingFileId === file.id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Ionicons
                            name="eye-outline"
                            size={18}
                            color="#ffffff"
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              style={[
                styles.recordVideoBtn,
                (!isOnline || uploadingProjectVideo) &&
                  styles.actionBtnDisabled,
              ]}
              onPress={addAnotherProjectVideo}
              disabled={!isOnline || uploadingProjectVideo}
            >
              {uploadingProjectVideo ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="videocam-outline" size={19} color="#ffffff" />
              )}

              <Text style={styles.recordVideoText}>
                {!isOnline
                  ? "Video upload requires internet"
                  : uploadingProjectVideo
                    ? "Uploading video..."
                    : "Record"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {previewVideo ? (
        <VideoPreviewModal
          key={previewVideo.url}
          videoUrl={previewVideo.url}
          title={previewVideo.name}
          onClose={() => setPreviewVideo(null)}
        />
      ) : null}

      <AssetCameraModal
        visible={projectVideoCameraVisible}
        mode="video"
        onClose={() => setProjectVideoCameraVisible(false)}
        onDone={handleProjectVideoDone}
      />

      <Pressable
        onPress={() => router.push("/inspection/InspectionType")}
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={22} color={ACC} />
      </Pressable>
    </View>
  );
}

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

  companyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  companyOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT,
  },
  switchBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    backgroundColor: ACC,
    borderWidth: 1,
    borderColor: ACC,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  switchBtnText: {
    flexShrink: 1,
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.inter.medium as unknown as string,
  },

  projectsRefreshBtn: {
    minWidth: 105,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: ACC,
    borderWidth: 1,
    borderColor: ACC,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  projectsRefreshBtnDisabled: {
    opacity: 0.6,
  },

  projectsRefreshText: {
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

  locationBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },

  locationBackText: {
    color: ACC,
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  locationNotes: {
    color: TEXT,
    fontSize: 11,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 13,
    marginBottom: 10,
    marginTop: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  filterTabText: {
    fontSize: 15,
    color: "#6B7280",
    fontFamily: "Poppins_500Medium",
  },

  filterTabTextActive: {
    color: "#111827",
    fontFamily: "Poppins_700Bold",
  },

  filterActiveLine: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#2A324B",
  },

  infoButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  infoTabBtn: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  projectQuickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  quickActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  backBtn: {
    position: "absolute",

    left: 15,
    top: "60%",
    transform: [{ translateY: 200 }],

    width: 36,
    height: 36,
    borderRadius: 18,

    backgroundColor: "#f4f2f2",
    borderWidth: 1,
    borderColor: BORDER,

    alignItems: "center",
    justifyContent: "center",

    zIndex: 999,
    elevation: 999,
  },

  infoTabBtnActive: {
    backgroundColor: ACC,
    borderColor: ACC,
  },

  infoTabText: {
    color: TEXT,
    fontSize: 10,
    fontFamily: fonts.inter.medium as unknown as string,
  },

  infoTabTextActive: {
    color: "#ffffff",
  },

  locationCard: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  locationMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  locationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  locationCoords: {
    color: MUTED,
    fontSize: 9,
    marginTop: 3,
  },

  phoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  phoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  phoneText: {
    color: TEXT,
    fontSize: 11,
    fontFamily: fonts.inter.medium as unknown as string,
  },

  noPhoneText: {
    color: MUTED,
    fontSize: 11,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },

  infoTextWrap: {
    flex: 1,
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
    gap: 1,
    marginTop: 5,
  },

  statBox: {
    flex: 1,
    // backgroundColor: SURFACE,
    // borderWidth: 2,
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
    fontSize: 6,
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
  videoIconBtn: {
    backgroundColor: ACC,
    borderWidth: 1,
    borderColor: ACC,
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

  filesModalCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    maxHeight: "80%",
  },

  filesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  filesModalSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: -8,
  },

  filesCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },

  fileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  fileInfo: {
    flex: 1,
  },

  fileName: {
    color: TEXT,
    fontSize: 12,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },

  fileMeta: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  fileOpenBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACC,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  fileActions: {
    flexDirection: "row",
    gap: 8,
  },

  fileActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  viewBtn: {
    backgroundColor: "#767B91",
  },

  downloadBtn: {
    backgroundColor: "#2A324B",
  },

  inspectionDetailsCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: "#F8F9FC",
    padding: 13,
    marginBottom: 14,
  },
  inspectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 1,
  },
  smallMapBtn: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 6,
    color: TEXT,
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
  },

  inspectionInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    color: TEXT,
    fontSize: 13,
    fontFamily: "Inter-Regular",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currentLocationBtn: {
    minHeight: 42,
    marginTop: 8,
    borderWidth: 1,
    borderColor: ACC,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  currentLocationText: {
    color: ACC,
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
  },
  inspectionInputSingle: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    color: TEXT,
    fontSize: 12,
    fontFamily: "Inter-Regular",
    paddingHorizontal: 12,
  },
  inspectionDateBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  inspectionDateText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontFamily: "Inter-Regular",
  },
  inspectionDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearDateBtn: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveInspectionBtn: {
    minHeight: 46,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: ACC,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  saveInspectionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  recordVideoBtn: {
    minHeight: 46,
    marginTop: 5,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: ACC,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  recordVideoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter-SemiBold",
  },

  projectVideoIconThumbnail: {
    overflow: "hidden",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: ACC,
  },

  projectVideoIconImage: {
    width: "100%",
    height: "100%",
  },

  projectVideoIconFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827",
  },

  projectVideoIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  fileVideoThumbnail: {
    width: 54,
    height: 46,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#111827",
    marginRight: 10,
  },

  fileVideoThumbnailImage: {
    width: "100%",
    height: "100%",
  },

  fileVideoThumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  videoPlayerOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.92)",
  },

  videoPlayerCard: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#000000",
  },

  videoPlayerHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    backgroundColor: ACC,
  },

  videoPlayerTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },

  videoPlayerClose: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  videoPlayer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000000",
  },

  projectVideosModalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "65%",
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
  },

  projectVideosScroll: {
    maxHeight: 330,
  },

  projectVideoCountBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 15,
    height: 15,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  projectVideoCountText: {
    color: TEXT,
    fontSize: 7,
    fontFamily: fonts.inter.semiBold as unknown as string,
  },
});
