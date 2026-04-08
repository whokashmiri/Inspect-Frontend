// api.ts

import * as SecureStore from "expo-secure-store";

// ─── Config ────────────────────────────────────────────────────────────────
export const BASE_URL = "http://192.168.0.198:3000/api/v1"; // 🔧 change this

const TOKEN_KEY = "auth_token";
const REFRESH_KEY = "refresh_token";

// ─── Token helpers ──────────────────────────────────────────────────────────
export const tokenStore = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefresh: (t: string) => SecureStore.setItemAsync(REFRESH_KEY, t),
  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

// ─── Core fetcher ───────────────────────────────────────────────────────────
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: Record<string, unknown>;
  auth?: boolean; // attach Bearer token?
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
  { method = "GET", body, auth = true }: RequestOptions = {},
  retry = true // 👈 important
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await tokenStore.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
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

  // 🔴 HANDLE TOKEN EXPIRY HERE
  if (res.status === 401 && auth && retry) {
    try {
      const refreshToken = await tokenStore.getRefresh();
      if (!refreshToken) throw new Error("No refresh token");

      const newTokens = await authApi.refreshToken(refreshToken);

      // save new tokens
      await tokenStore.setToken(newTokens.accessToken);
      await tokenStore.setRefresh(newTokens.refreshToken);

      // 🔁 retry original request ONCE
      return request<T>(path, { method, body, auth }, false);
    } catch (err) {
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

// ─── Auth endpoints ─────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  companyName: string;
  fullName: string; // ✅ add this
  role: "Manager" | "Inspector" | "Valuator"; // ✅ add this
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authApi = {
  signup: (payload: { 
    fullName: string;
    role: "Manager" | "Inspector" | "Valuator";
     email: string;
      password: string;
      companyName: string }) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload: { email: string; password: string }) =>
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

// ─── Convenience wrapper (auto-saves tokens) ────────────────────────────────
export async function loginAndSave(email: string, password: string) {
  const res = await authApi.login({ email, password });
  await tokenStore.setToken(res.tokens.accessToken);
  await tokenStore.setRefresh(res.tokens.refreshToken);
  return res;
}

export async function signupAndSave(
  fullName: string,
  role: "Manager" | "Inspector" | "Valuator",
  email: string,
  password: string,
  companyName: string,
) {
  const res = await authApi.signup({ fullName ,role , email, password, companyName });
  await tokenStore.setToken(res.tokens.accessToken);
  await tokenStore.setRefresh(res.tokens.refreshToken);
  return res;
}
