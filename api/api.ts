

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
  companyName: string;
  role: "Manager" | "Inspector" | "Valuator" | "company_admin" |string ;
  isBlocked?: boolean;
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

  logout: () =>
    request<void>("/auth/logout", { method: "POST" }).finally(() =>
      tokenStore.clear(),
    ),
};

// ─── Convenience wrapper ────────────────────────────────────────────────────
// 




export async function loginAndSave(username: string, password: string) {
  const res = await authApi.login({ username, password });

  await tokenStore.setToken(res.tokens.accessToken);

  if (res.tokens.refreshToken) {
    await tokenStore.setRefreshToken(res.tokens.refreshToken);
  }

  return res;
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
}
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workflowStatus: string;
  companyId: string;
  userId: string;
  company: ProjectCompany | null;
  user: ProjectUser | null;
  stats?: ProjectStats;


  
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
    mediaType: "image" | "voice";
  }) =>
    request<CloudinarySignUploadResponse>("/media/sign-upload", {
      method: "POST",
      body: payload,
    }),


};


async function uploadSingleFileToCloudinary(params: {
  file: UploadFileInput;
  projectId: string;
  mediaType: "image" | "voice";
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
      (params.mediaType === "voice" ? "audio/m4a" : "image/jpeg"),
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

  return {
    url: data.secure_url,
    publicId: data.public_id,
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

export interface AssetImageItem {
  id: string;
  url: string;
  publicId: string | null;
  createdAt: string;
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
  const localImages = getLocalUploadFiles(payload.images);
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
        images: uploadedImages,
        voiceNotes: uploadedVoiceNotes,
      },
    }
  );
},
  getAssetByCode: async (projectId: string, code: string) => {
    console.log("SCANNED RAW CODE:", JSON.stringify(code));
    console.log("PROJECT ID USED:", projectId);

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
  filter?: "all" | "done" | "incomplete",
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

  const localImages = getLocalUploadFiles(payload.images);
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
      images: uploadedImages,
      voiceNotes: uploadedVoiceNotes,
    },
  });
},


 advancedGetRawDataKeys: (projectId: string) => {
  return request<AdvancedRawDataKeysResponse>(
    `/projects/${projectId}/contents/advanced-keys`,
    { method: "GET" }
  );
},

advancedSearchContents: (
  projectId: string,
  key?: string | null,
  search?: string,
  filter?: "all" | "done" | "incomplete",
  page = 1,
  limit = 15
) => {
  const params = new URLSearchParams();

  if (key) {
    params.set("key", key);
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