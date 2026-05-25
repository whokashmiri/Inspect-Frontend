

//api/api.ts

import * as SecureStore from "expo-secure-store";

// ─── Config ────────────────────────────────────────────────────────────────
// export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.167.71.231.64.nip.io/api/v1";


export const BASE_URL = process.env.EXPO_PUBLIC_API_URL 

const TOKEN_KEY = "auth.accessToken";
const REFRESH_KEY = "auth.refreshToken";

// ─── Token helpers ──────────────────────────────────────────────────────────
export const tokenStore = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),

  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefreshToken: (t: string) => SecureStore.setItemAsync(REFRESH_KEY, t),

  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";



export interface AssetMediaInput {
  uri?: string;
  url?: string;
  name?: string;
  type?: string;
  publicId?: string | null;
  duration?: number | null;
  existing?: boolean;
  mediaType?: "image" | "video";
  mimeType?: string | null;
  thumbnailUrl?: string | null;
}


interface JsonRequestOptions {
  method?: Method;
  body?: Record<string, unknown>;
  auth?: boolean;
}

interface FormRequestOptions {
  method?: Method;
  body?: FormData;
  auth?: boolean;
}


export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  { method = "GET", body, auth = true }: JsonRequestOptions = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await tokenStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 401 && auth && retry) {
    try {
      const refreshToken = await tokenStore.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const newTokens = await authApi.refreshToken(refreshToken);

      await tokenStore.setToken(newTokens.accessToken);
      await tokenStore.setRefreshToken(newTokens.refreshToken);

      return request<T>(path, { method, body, auth }, false);
    } catch {
      await tokenStore.clear();
      throw new ApiError(401, "Session expired. Please login again.");
    }
  }

  if (!res.ok) {
    const message = data?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export async function requestForm<T>(url: string, options: {
  method?: string;
  body: FormData;
}): Promise<T> {
  const token = await tokenStore.getToken();

  const response = await fetch(`${BASE_URL}${url}`, {
    method: options.method || "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : data?.message?.toString() ?? "Invalid request";
    throw new ApiError(response.status, message, data);
  }

  return data;
}


async function uploadFilesInBatches<T>(
  
  files: UploadFileInput[],
  uploadFn: (file: UploadFileInput) => Promise<T>,
  batchSize = 3
): Promise<T[]> {
  const results: T[] = [];
  

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const uploaded = await Promise.all(batch.map(uploadFn));
    results.push(...uploaded);
  }

  return results;
}

// ─── Auth endpoints ─────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt?: string;
}

export interface User {
  id: string;
  username: string;
  phone?: string | null;
  name?: string | null;
  companyName?: string;
  role?: "Manager" | "Inspector" | "Valuator" | "company_admin" | string;
  serviceCities?: string[];
  isProfileCompleted?: boolean;
  isPhoneVerified?: boolean;
  isBlocked?: boolean;
}

export interface RequestSignupOtpResponse {
  success: boolean;
  message: string;
  phone: string;
}

export interface VerifySignupOtpResponse {
  success: boolean;
  message: string;
  setupToken: string;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken?: string | null;
  user: User;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authApi = {

   requestSignupOtp: (payload: { phone: string }) =>
    request<RequestSignupOtpResponse>("/auth/signup/request-otp", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  verifySignupOtp: (payload: { phone: string; otp: string }) =>
    request<VerifySignupOtpResponse>("/auth/signup/verify-otp", {
      method: "POST",
      body: payload,
      auth: false,
    }),

    requestResetPasswordOtp: (payload: { phone: string }) =>
  request<{ success: boolean; message: string; phone: string }>(
    "/auth/forgot-password/request-otp",
    {
      method: "POST",
      body: payload,
      auth: false,
    }
  ),

verifyResetPasswordOtp: (payload: { phone: string; otp: string }) =>
  request<{ success: boolean; message: string; resetToken: string }>(
    "/auth/forgot-password/verify-otp",
    {
      method: "POST",
      body: payload,
      auth: false,
    }
  ),

resetPassword: (payload: { resetToken: string; password: string }) =>
  request<{ success: boolean; message: string }>(
    "/auth/forgot-password/reset-password",
    {
      method: "POST",
      body: payload,
      auth: false,
    }
  ),

  completeProfile: (payload: {
  name: string;
  serviceCities: string[];
}) =>
  request<User>("/auth/me/profile", {
    method: "PUT",
    body: payload,
  }),

  setSignupPassword: (payload: {
    setupToken: string;
    password: string;
    role?: "Manager" | "Inspector" | "Valuator" | "company_admin";
  }) =>
    request<AuthResponse>("/auth/signup/set-password", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload: { username: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  refreshToken: (refreshToken: string) =>
    request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),

  me: () => request<User>("/auth/me"),

  getCompanies: () =>
    request<{ companies: { id: string; name: string | null }[] }>("/auth/companies", {
      method: "GET",
    }),

  logout: () =>
    request<void>("/auth/logout", { method: "POST" }).finally(() =>
      tokenStore.clear(),
    ),
};





export async function loginAndSave(username: string, password: string) {
  const res = await authApi.login({ username, password });

  await tokenStore.setToken(res.tokens.accessToken);

  if (res.tokens.refreshToken) {
    await tokenStore.setRefreshToken(res.tokens.refreshToken);
  }

  return res;
}



export async function setSignupPasswordAndSave(payload: {
  setupToken: string;
  password: string;
  role?: "Manager" | "Inspector" | "Valuator" | "company_admin";
}) {
  const res = await authApi.setSignupPassword(payload);

  await tokenStore.setToken(res.tokens.accessToken);

  if (res.tokens.refreshToken) {
    await tokenStore.setRefreshToken(res.tokens.refreshToken);
  }

  return res;
}
function getExistingUploadedMedia(files?: AssetMediaInput[]) {
  return (files || [])
    .filter((file) => {
      return typeof file.url === "string" && file.url.startsWith("http");
    })
    .map((file) => ({
      url: file.url!,
      publicId: file.publicId ?? null,
      mediaType:
        file.mediaType ??
        (file.type?.startsWith("video/") ? "video" : "image"),
      mimeType: file.mimeType ?? file.type ?? null,
      duration: file.duration ?? null,
      thumbnailUrl: file.thumbnailUrl ?? null,
    }));
}

// ─── Projects ───────────────────────────────────────────────────────────────

export interface ProjectCompany {
  id: string;
  name: string | null;
}

export interface ProjectUser {
  id: string;
  username: string | null;
  role: string | null;
}

export interface ProjectLocation {
  id?: string;
  name?: string;
  region?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  notes?: string;
  inspectorFiles?: InspectorFile[];
}


export interface ListProjectLocationsResponse {
  locations: ProjectLocation[];
}



export interface UploadedImageInput {
  url: string;
  publicId: string;
}

export interface UploadedVoiceNoteInput {
  url: string;
  publicId: string;
  duration?: number | null;
}

export interface CloudinarySignUploadResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: "image" | "video";
}


export interface ProjectStats {
  totalAssets: number;
  doneAssets: number;
  incompleteAssets: number;
  assetsWithNotes: number;
  presentAssets: number;
  notPresentAssets: number;
}

export type InspectorFileType =
  | "excel"
  | "pdf"
  | "word"
  | "image"
  | "audio"
  | "other";

export interface InspectorFile {
  id: string;
  name: string;
  type: InspectorFileType;
  url: string;
  uploadedBy: string;
  createdAt: string;
  storage?: string;
  spacesKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  locationIds?: string[];
}

export interface ListInspectorFilesResponse {
  files: InspectorFile[];
}

export interface GetInspectorFileResponse {
  file: InspectorFile;
}

export interface DownloadInspectorFileResponse {
  url: string;
  file: InspectorFile;
}
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  workflowStatus: string;
  companyId: string;
  userId: string;
  company: ProjectCompany | null;
  user: ProjectUser | null;
  stats?: ProjectStats;
  reportType?: string;
  reportData?: Record<string, any>;
  inspectorFiles?: InspectorFile[];

  locations?: ProjectLocation[];
 


  
}

export interface CreateProjectResponse {
  project: Project;
}

export interface ListProjectsResponse {
  projects: Project[];
}

export const mediaApi = {
  signUpload: (payload: {
    projectId: string;
    mediaType: "image" | "voice" | "video";
  }) =>
    request<CloudinarySignUploadResponse>("/media/sign-upload", {
      method: "POST",
      body: payload,
    }),


};


async function uploadSingleFileToCloudinary(params: {
  file: UploadFileInput;
  projectId: string;
  mediaType: "image" | "voice" | "video";
}) {
  const signData = await mediaApi.signUpload({
    projectId: params.projectId,
    mediaType: params.mediaType,
  });

  const form = new FormData();

  form.append("file", {
    uri: params.file.uri,
    name: params.file.name,
   type:
  params.file.type ||
  (params.mediaType === "voice"
    ? "audio/m4a"
    : params.mediaType === "video"
    ? "video/mp4"
    : "image/jpeg"),
  } as any);

  form.append("api_key", signData.apiKey);
  form.append("timestamp", String(signData.timestamp));
  form.append("signature", signData.signature);
  form.append("folder", signData.folder);
  form.append("public_id", signData.publicId);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/${signData.resourceType}/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: form,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.message || "Cloudinary upload failed",
      data
    );
  }

  if (params.mediaType === "voice") {
  return {
    url: data.secure_url,
    publicId: data.public_id,
    duration:
      typeof data.duration === "number" ? Math.round(data.duration) : null,
  };
}

const isVideo = params.mediaType === "video";

return {
  url: data.secure_url,
  publicId: data.public_id,
  mediaType: isVideo ? "video" : "image",
  mimeType: params.file.type,
  duration:
    isVideo && typeof data.duration === "number"
      ? Math.round(data.duration)
      : null,
  thumbnailUrl: isVideo
    ? data.secure_url.replace(
        "/video/upload/",
        "/video/upload/so_1,f_jpg/"
      )
    : null,
};

 
}



export const projectApi = {
  create: (payload: { name: string }) =>
    request<CreateProjectResponse>("/projects", {
      method: "POST",
      body: payload,
    }),

  list: () =>
    request<ListProjectsResponse>("/projects", {
      method: "GET",
    }),

 
updateProjectWorkflow: (
  projectId: string,
  payload: {
    workflowStatus?: "new" | "done";
    isFavorite?: boolean;
  }
) =>
  request<{ project: Project }>(`/projects/${projectId}/workflow`, {
    method: "PATCH",
    body: payload,
  }),

  listInspectorFiles: (projectId: string) =>
    request<ListInspectorFilesResponse>(
      `/projects/${projectId}/inspector-files`,
      {
        method: "GET",
      }
    ),

  getInspectorFile: (projectId: string, fileId: string) =>
    request<GetInspectorFileResponse>(
      `/projects/${projectId}/inspector-files/${fileId}`,
      {
        method: "GET",
      }
    ),

  downloadInspectorFile: (projectId: string, fileId: string) =>
    request<DownloadInspectorFileResponse>(
      `/projects/${projectId}/inspector-files/${fileId}/download`,
      {
        method: "GET",
      }
    ),
 listLocations: (projectId: string) =>
  request<ListProjectLocationsResponse>(
    `/projects/${projectId}/locations`,
    {
      method: "GET",
    }
  ),


};


export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface DeleteAssetResponse {
  success: boolean;
  message: string;
}

export interface AssetImageItem {
  id: string;
  url: string;
  uri?: string;
  publicId: string | null;
  createdAt: string;
  mediaType?: "image" | "video";
  mimeType?: string | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
}

export interface AssetVoiceNoteItem {
  id: string;
  url: string;
  publicId: string | null;
  duration: number | null;
  createdAt: string;
}

export interface AssetItem {
  id: string;
  name: string;
  writtenDescription: string | null;

  // old: folderId
  parent: string | null;

  projectId: string;
  createdAt: string;
  updatedAt: string;
  code: string | null;
  rawData: Record<string, any> | null;

  condition: "" | "New" | "Used" | "Damaged" | "Good" | null;
  assetType: "vehicle" | "other";

  brand: string | null;
  model: string | null;
  manufactureYear: string | null;
  kilometersDriven: string | null;

  hasNotes: boolean;
  notes: string | null;

  isDone: boolean;
  isPresent: boolean;

  createdBy: {
    id: string;
    fullName: string;
    email: string;
  };

  images: AssetImageItem[];
  voiceNotes: AssetVoiceNoteItem[];
}

export interface ProjectContentsResponse {
  parentId: string | null;
  folders: FolderItem[];
  assets: AssetItem[];
}

export interface CreateFolderResponse {
  folder: FolderItem;
}

export interface CreateAssetResponse {
  asset: AssetItem;
}

export interface GetAssetByCodeResponse {
  asset: AssetItem;
}

export interface UpdateAssetResponse {
  asset: AssetItem;
}

export interface UploadFileInput {
  uri: string;
  name: string;
  type: string;
}

function getLocalUploadFiles(files?: AssetMediaInput[]): UploadFileInput[] {
  return (files || [])
    .filter((file) => {
      const uri = file.uri;
      return typeof uri === "string" && !uri.startsWith("http");
    })
    .map((file) => ({
      uri: file.uri!,
      name: file.name || `file_${Date.now()}`,
      type: file.type || "application/octet-stream",
    }));
}

function isVideoFile(file: UploadFileInput) {
  return (
    file.type?.startsWith("video/") ||
    file.name?.toLowerCase().endsWith(".mp4") ||
    file.name?.toLowerCase().endsWith(".mov")
  );
}


export interface AdvancedRawDataKeysResponse {
  keys: string[];
}

const normalizeAssetType = (
  assetType?: "vehicle" | "other" | "Vehicle" | "Other"
): "vehicle" | "other" | undefined => {
  if (!assetType) return undefined;
  return String(assetType).toLowerCase() === "vehicle" ? "vehicle" : "other";
};

export const projectContentApi = {
  createFolder: (payload: {
    projectId: string;
    name: string;
    parentId?: string | null;
  }) =>
    request<CreateFolderResponse>(`/projects/${payload.projectId}/folders`, {
      method: "POST",
      body: {
        name: payload.name,
        parentId: payload.parentId ?? null,
      },
    }),

 createAsset: async (payload: {
  projectId: string;
  name: string;
  writtenDescription?: string | null;
  parent?: string | null;
  folderId?: string | null;
  images?: AssetMediaInput[];
  voiceNotes?: AssetMediaInput[];
  condition?: "" | "New" | "Used" | "Damaged" | "Good" | null;
  assetType?: "vehicle" | "other" | "Vehicle" | "Other";
  brand?: string | null;
  model?: string | null;
  code?: string | null;
  manufactureYear?: string | null;
  kilometersDriven?: string | null;
  isDone?: boolean;
  isPresent?: boolean;
  hasNotes?: boolean;
  notes?: string | null;
}) => {
  const localMedia = getLocalUploadFiles(payload.images);
const localImages = localMedia.filter((file) => !isVideoFile(file));
const localVideos = localMedia.filter(isVideoFile);

const existingMedia = getExistingUploadedMedia(payload.images);

const localVoiceNotes = getLocalUploadFiles(payload.voiceNotes);
  const uploadedImages = await uploadFilesInBatches(
    localImages,
    (image) =>
      uploadSingleFileToCloudinary({
        file: image,
        projectId: payload.projectId,
        mediaType: "image",
      }),
    3
  );

  const uploadedVideos = await uploadFilesInBatches(
  localVideos,
  (video) =>
    uploadSingleFileToCloudinary({
      file: video,
      projectId: payload.projectId,
      mediaType: "video",
    }),
  1
);

  const uploadedVoiceNotes = await uploadFilesInBatches(
    localVoiceNotes,
    (voice) =>
      uploadSingleFileToCloudinary({
        file: voice,
        projectId: payload.projectId,
        mediaType: "voice",
      }),
    2
  );

  const resolvedParentSubProjectId =
    payload.parent ?? payload.folderId ?? null;

  return request<CreateAssetResponse>(
    `/projects/${payload.projectId}/assets`,
    {
      method: "POST",
      body: {
        name: payload.name,
        writtenDescription: payload.writtenDescription?.trim() || null,
        parent: resolvedParentSubProjectId,
        condition: payload.condition || undefined,
        assetType: normalizeAssetType(payload.assetType) ?? "other",
        brand: payload.brand?.trim() || null,
        model: payload.model?.trim() || null,
        code: payload.code?.trim() || null,
        manufactureYear: payload.manufactureYear?.trim() || null,
        kilometersDriven: payload.kilometersDriven?.trim() || null,
        isDone: payload.isDone ?? false,
        isPresent: payload.isPresent ?? true,
        hasNotes: payload.hasNotes ?? false,
        notes: payload.notes ?? null,
        images: [...existingMedia, ...uploadedImages, ...uploadedVideos],
        voiceNotes: uploadedVoiceNotes,
      },
    }
  );
},
  getAssetByCode: async (projectId: string, code: string) => {
    

    return request<GetAssetByCodeResponse>(
      `/projects/${projectId}/assets/by-code?code=${encodeURIComponent(code)}`,
      {
        method: "GET",
      }
    );
  },

  listContents: (
  projectId: string,
  parentId?: string | null,
  filter?: "all" | "done" | "incomplete" | "not_present",
  search?: string
) => {
  const params = new URLSearchParams();

  const cleanSearch = search?.trim();

  // Search whole project, not current folder
  if (!cleanSearch && parentId) {
    params.set("parentId", parentId);
  }

  if (filter && filter !== "all") {
    params.set("filter", filter);
  }

  if (cleanSearch) {
    params.set("search", cleanSearch);
  }

  const qs = params.toString();

  return request<ProjectContentsResponse>(
    `/projects/${projectId}/contents${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
    }
  );
},
  toggleAssetDone: (projectId: string, assetId: string, isDone: boolean) =>
    request(`/projects/${projectId}/assets/${assetId}/toggle-done`, {
      method: "PATCH",
      body: { isDone },
    }),

updateAsset: async (payload: {
  assetId: string;
  projectId: string;
  name?: string | null;
  writtenDescription?: string | null;
  images?: AssetMediaInput[];
  voiceNotes?: AssetMediaInput[];
  condition?: "" | "New" | "Used" | "Damaged" | "Good" | null;
  assetType?: "vehicle" | "other" | "Vehicle" | "Other";
  brand?: string | null;
  model?: string | null;
  code?: string | null;
  manufactureYear?: string | null;
  kilometersDriven?: string | null;
  hasNotes?: boolean;
  notes?: string | null;
  isDone?: boolean;
  isPresent?: boolean;
}) => {

  const localMedia = getLocalUploadFiles(payload.images);
const localImages = localMedia.filter((file) => !isVideoFile(file));
const localVideos = localMedia.filter(isVideoFile);

const existingMedia = getExistingUploadedMedia(payload.images);

const localVoiceNotes = getLocalUploadFiles(payload.voiceNotes);
  const uploadedImages = await uploadFilesInBatches(
   localImages,
    (image) =>
      uploadSingleFileToCloudinary({
        file: image,
        projectId: payload.projectId,
        mediaType: "image",
      }),
    3
  );

  const uploadedVideos = await uploadFilesInBatches(
  localVideos,
  (video) =>
    uploadSingleFileToCloudinary({
      file: video,
      projectId: payload.projectId,
      mediaType: "video",
    }),
  1
);

  const uploadedVoiceNotes = await uploadFilesInBatches(
    localVoiceNotes,
    (voice) =>
      uploadSingleFileToCloudinary({
        file: voice,
        projectId: payload.projectId,
        mediaType: "voice",
      }),
    2
  );

  return request<UpdateAssetResponse>(`/projects/assets/${payload.assetId}`, {
    method: "PATCH",
    body: {
      name: payload.name,
      writtenDescription: payload.writtenDescription,
      condition: payload.condition || undefined,
      assetType: normalizeAssetType(payload.assetType),
      brand: payload.brand,
      model: payload.model,
      code: payload.code,
      manufactureYear: payload.manufactureYear,
      kilometersDriven: payload.kilometersDriven,
      hasNotes: payload.hasNotes,
      notes: payload.notes,
      isDone: payload.isDone,
      isPresent: payload.isPresent,
      images: [...existingMedia, ...uploadedImages, ...uploadedVideos],
      voiceNotes: uploadedVoiceNotes,
    },
  });
},

deleteAsset: (assetId: string) =>
  request<DeleteAssetResponse>(`/projects/assets/${assetId}`, {
    method: "DELETE",
  }),


 advancedGetRawDataKeys: (projectId: string) => {
  return request<AdvancedRawDataKeysResponse>(
    `/projects/${projectId}/contents/advanced-keys`,
    { method: "GET" }
  );
},

advancedGetRawDataKeyValues: (projectId: string, key: string) => {
  const params = new URLSearchParams();
  params.set("key", key);

  return request<{ values: string[] }>(
    `/projects/${projectId}/contents/advanced-key-values?${params.toString()}`,
    {
      method: "GET",
    }
  );
},

advancedSearchContents: (
  projectId: string,
  filters?: { key: string; value: string }[] | null,
  search?: string,
  filter?: "all" | "done" | "incomplete" | "not_present",
  page = 1,
  limit = 15
) => {
  const params = new URLSearchParams();

  if (filters?.length) {
    params.set("filters", JSON.stringify(filters));
  }

  const cleanSearch = search?.trim();

  if (cleanSearch) {
    params.set("search", cleanSearch);
  }

  if (filter && filter !== "all") {
    params.set("filter", filter);
  }

  params.set("page", String(page));
  params.set("limit", String(limit));

  return request<ProjectContentsResponse>(
    `/projects/${projectId}/contents/advanced-search?${params.toString()}`,
    {
      method: "GET",
    }
  );
},

};


// ─── Transactions ───────────────────────────────────────────────────────────

export type TransactionMediaType = "image" | "video";

export interface TransactionBuildingCondition {
  status?: "Completion %" | "Other" | "Under Construction" | "Used" | "New" | string;
  completionPct?: number | null;
  otherText?: string | null;
}

export interface SearchCompanyTransactionsResponse
  extends PaginatedCompanyTransactionsResponse {}

export interface TransactionAvailableServices {
  electricity?: boolean;
  electricityUnits?:number | null;
  sanitaryDrainage?: boolean;
  telephoneLine?: boolean;
  waterMetersCount?: number | null;
  electricityMetersCount?: number | null;
}

export interface UpdateTransactionInspectionPayload {
  buildingCondition?: TransactionBuildingCondition;
  surroundingEnvironment?: string[];
  availableServices?: TransactionAvailableServices;
  propertyType?: string;
}

export interface TransactionMediaItem {
  id: string;
  transactionId: string;
  mediaType: TransactionMediaType;
  name?: string;
  originalName?: string;
  url: string;
  publicId: string;
  mimeType?: string | null;
  size?: number | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  sortIndex?: number;
  uploadedAt?: string;
  updatedAt?: string;
}

export interface TransactionItem {
  id: string;
  _id?: string;

  assignmentNumber?: string;
  authorizationNumber?: string;
  assignmentDate?: string;

  valuationPurpose?: string;
  intendedUse?: string;
  valuationBasis?: string;
  ownershipType?: string;
  valuationHypothesis?: string;

  clientId?: string;
  branch?: string;
  templateId?: string;

  companyId?: string;
  createdByUserId?: string;

  isCompleted?: boolean;
  isOpened?: boolean;
  lastSyncedAt?: string | null;

  templateFieldValues?: Record<string, any>;
  evalData?: Record<string, any>;

  priority?: string;
  attachmentsCount?: number;
  imagesCount?: number;

  media?: TransactionMediaItem[];

  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedCompanyTransactionsResponse {
  success: boolean;
  companyId: string;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  transactions: TransactionItem[];
}

export interface OfflineTransactionDownloadResponse {
  success: boolean;
  companyId: string;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  transactions: TransactionItem[];
}

export interface OfflineMediaResponse {
  success: boolean;
  total: number;
  data: TransactionMediaItem[];
}

export interface MarkTransactionOpenedResponse {
  success: boolean;
  message: string;
  data: TransactionItem;
}

export interface AddTransactionMediaResponse {
  success: boolean;
  message: string;
  data: TransactionMediaItem[];
}

export interface ListTransactionMediaResponse {
  success: boolean;
  data: TransactionMediaItem[];
}

export interface DeleteTransactionMediaResponse {
  success: boolean;
  message: string;
  data: TransactionMediaItem;
}

export interface UpdateTransactionInspectionResponse {
  success: boolean;
  message: string;
  data: any;
}

function getTransactionLocalMedia(files?: AssetMediaInput[]): UploadFileInput[] {
  return getLocalUploadFiles(files);
}

export const transactionApi = {


 listCompany: (params?: { page?: number; limit?: number }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;

    return request<PaginatedCompanyTransactionsResponse>(
      `/transactions/company?page=${page}&limit=${limit}`,
      {
        method: "GET",
      }
    );
  },


    downloadCompany: (params?: { page?: number; limit?: number }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;

    return request<OfflineTransactionDownloadResponse>(
      `/transactions/company/download?page=${page}&limit=${limit}`,
      {
        method: "GET",
      }
    );
  },

   getOfflineMedia: (transactionIds: string[]) =>
    request<OfflineMediaResponse>("/transactions/media/offline", {
      method: "POST",
      body: { transactionIds },
    }),

  markOpened: (transactionId: string) =>
    request<MarkTransactionOpenedResponse>(
      `/transactions/${transactionId}/open`,
      {
        method: "PATCH",
      }
    ),

    searchCompany: (params: {
  assignmentNumber: string;
  page?: number;
  limit?: number;
}) => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const assignmentNumber = encodeURIComponent(
    params.assignmentNumber.trim()
  );

  return request<SearchCompanyTransactionsResponse>(
    `/transactions/company/search?assignmentNumber=${assignmentNumber}&page=${page}&limit=${limit}`,
    {
      method: "GET",
    }
  );
},

  updateInspectionData: (
    transactionId: string,
    payload: UpdateTransactionInspectionPayload
  ) =>
    request<UpdateTransactionInspectionResponse>(
      `/transactions/${transactionId}/inspection-data`,
      {
        method: "PATCH",
        body: payload as Record<string, unknown>,
      }
    ),

 addMedia: async (payload: {
  transactionId: string;
  media: AssetMediaInput[];
}) => {
  const localMedia = getTransactionLocalMedia(payload.media);

  if (localMedia.length === 0) {
    return {
      success: true,
      message: "No new media to upload",
      data: [],
    } satisfies AddTransactionMediaResponse;
  }

  const localImages = localMedia.filter((file) => !isVideoFile(file));
  const localVideos = localMedia.filter(isVideoFile);


  const uploadedImages = await uploadFilesInBatches(
    localImages,
    async (image) => {
      const uploaded = await uploadSingleFileToCloudinary({
        file: image,
        projectId: payload.transactionId,
        mediaType: "image",
      });

      return {
        ...uploaded,
        mediaType: "image" as const,
        name: image.name,
        originalName: image.name,
        localId: (image as any).localId,
      };
    },
    3
  );

  const uploadedVideos = await uploadFilesInBatches(
    localVideos,
    async (video) => {
      const uploaded = await uploadSingleFileToCloudinary({
        file: video,
        projectId: payload.transactionId,
        mediaType: "video",
      });

      return {
        ...uploaded,
        mediaType: "video" as const,
        name: video.name,
        originalName: video.name,
        localId: (video as any).localId,
      };
    },
    1
  );

  const media = [...uploadedImages, ...uploadedVideos].map((item, index) => ({
    ...item,
    sortIndex: index,
  }));

  return request<AddTransactionMediaResponse>(
    `/transactions/${payload.transactionId}/media`,
    {
      method: "POST",
      body: { media },
    }
  );
},

  listMedia: (transactionId: string) =>
    request<ListTransactionMediaResponse>(
      `/transactions/${transactionId}/media`,
      {
        method: "GET",
      }
    ),

  getById: (transactionId: string) =>
    request<{
      success: boolean;
      data: TransactionItem & {
        media?: TransactionMediaItem[];
      };
    }>(`/transactions/${transactionId}`, {
      method: "GET",
    }),

  deleteMedia: (mediaId: string) =>
    request<DeleteTransactionMediaResponse>(`/transactions/media/${mediaId}`, {
      method: "DELETE",
    }),

  // old global list, keep only for admin/debug
  list: () =>
    request<{
      success: boolean;
      data: TransactionItem[];
    }>("/transactions", {
      method: "GET",
    }),
};