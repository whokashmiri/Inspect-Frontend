

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

    // new field
    parent?: string | null;

    // temporary compatibility if some screens still use old field
    folderId?: string | null;

    images?: UploadFileInput[];
    voiceNotes?: UploadFileInput[];
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
    const form = new FormData();

    form.append("name", payload.name);

    if (payload.writtenDescription?.trim()) {
      form.append("writtenDescription", payload.writtenDescription.trim());
    }

    const resolvedParentSubProjectId =
      payload.parent ?? payload.folderId ?? null;

    if (resolvedParentSubProjectId) {
      form.append("parent", resolvedParentSubProjectId);
    }

    if (payload.condition) {
      form.append("condition", payload.condition);
    }

    const normalizedAssetType = normalizeAssetType(payload.assetType);
    if (normalizedAssetType) {
      form.append("assetType", normalizedAssetType);
    }

    if (payload.brand?.trim()) {
      form.append("brand", payload.brand.trim());
    }

    if (payload.model?.trim()) {
      form.append("model", payload.model.trim());
    }

    if (payload.code?.trim()) {
      form.append("code", payload.code.trim());
    }

    if (payload.manufactureYear?.trim()) {
      form.append("manufactureYear", payload.manufactureYear.trim());
    }

    if (payload.kilometersDriven?.trim()) {
      form.append("kilometersDriven", payload.kilometersDriven.trim());
    }
    form.append("hasNotes", payload.hasNotes ? "true" : "false");
    form.append("notes", payload.notes ?? "");

    form.append("isDone", payload.isDone ? "true" : "false");
    form.append("isPresent", payload.isPresent === false ? "false" : "true");

    for (const image of payload.images ?? []) {
      form.append("images", {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as any);
    }

    for (const voice of payload.voiceNotes ?? []) {
      form.append("voiceNotes", {
        uri: voice.uri,
        name: voice.name,
        type: voice.type,
      } as any);
    }

    return requestForm<CreateAssetResponse>(
      `/projects/${payload.projectId}/assets`,
      {
        method: "POST",
        body: form,
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
    name?: string | null;
    writtenDescription?: string | null;
    images?: UploadFileInput[];
    voiceNotes?: UploadFileInput[];
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
    const form = new FormData();

    if (payload.name !== undefined) {
      form.append("name", payload.name ?? "");
    }

    if (payload.writtenDescription !== undefined) {
      form.append("writtenDescription", payload.writtenDescription ?? "");
    }

    if (
      payload.condition === "New" ||
      payload.condition === "Used" ||
      payload.condition === "Damaged" ||
      payload.condition === "Good"
    ) {
      form.append("condition", payload.condition);
    }

    const normalizedAssetType = normalizeAssetType(payload.assetType);
    if (normalizedAssetType !== undefined) {
      form.append("assetType", normalizedAssetType);
    }

    
    if (payload.brand !== undefined) {
      form.append("brand", payload.brand ?? "");
    }

    if (payload.model !== undefined) {
      form.append("model", payload.model ?? "");
    }

    if (payload.code !== undefined) {
      form.append("code", payload.code ?? "");
    }

    if (payload.hasNotes !== undefined) {
      form.append("hasNotes", payload.hasNotes ? "true" : "false");

    }

    if (payload.notes !== undefined) {
      form.append("notes", payload.notes ?? "");
    }

    if (payload.manufactureYear !== undefined) {
      form.append("manufactureYear", payload.manufactureYear ?? "");
    }

    if (payload.kilometersDriven !== undefined) {
      form.append("kilometersDriven", payload.kilometersDriven ?? "");
    }

    if (payload.isDone !== undefined) {
      form.append("isDone", payload.isDone ? "true" : "false");
    }

    if (payload.isPresent !== undefined) {
      form.append("isPresent", payload.isPresent ? "true" : "false");
    }

    for (const image of payload.images ?? []) {
      form.append("images", {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as any);
    }

    for (const voice of payload.voiceNotes ?? []) {
      form.append("voiceNotes", {
        uri: voice.uri,
        name: voice.name,
        type: voice.type,
      } as any);
    }

    console.log("UPDATE FORM isDone:", payload.isDone);
    console.log("UPDATE FORM parts:", (form as any)._parts);

    return requestForm<UpdateAssetResponse>(
      `/projects/assets/${payload.assetId}`,
      {
        method: "PATCH",
        body: form,
      }
    );
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