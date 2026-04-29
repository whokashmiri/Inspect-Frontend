import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import {
  CachedCompany,
  CachedUser,
  OfflineSessionMeta,
} from "./types";

const db = SQLite.openDatabaseSync("offline-queue.db");

const KEYS = {
  accessToken: "auth.accessToken",
  refreshToken: "auth.refreshToken",
  sessionMeta: "auth.sessionMeta",
  preferredLanguage: "app.preferredLanguage",
};

const OFFLINE_AUTH_DAYS = 14;

export async function initAuthStorage() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_user (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_companies (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      data TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_selected_company (
      userId TEXT PRIMARY KEY NOT NULL,
      companyId TEXT NOT NULL,
      selectedAt INTEGER NOT NULL
    );
  `);
}

export async function saveTokens(accessToken: string, refreshToken?: string | null) {
  await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken);
  }
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(KEYS.accessToken);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(KEYS.refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(KEYS.accessToken);
  await SecureStore.deleteItemAsync(KEYS.refreshToken);
}

export async function saveCachedUser(user: CachedUser) {
  await db.runAsync(
    `
      INSERT OR REPLACE INTO offline_user (id, data, updatedAt)
      VALUES (?, ?, ?)
    `,
    [user.id, JSON.stringify(user), Date.now()]
  );
}

export async function getCachedUser(): Promise<CachedUser | null> {
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM offline_user LIMIT 1`
  );
  if (!row?.data) return null;
  return JSON.parse(row.data);
}

export async function clearCachedUser() {
  await db.runAsync(`DELETE FROM offline_user`);
}

export async function saveCachedCompanies(
  userId: string,
  companies: CachedCompany[]
) {
  await db.runAsync(`DELETE FROM offline_companies WHERE userId = ?`, [userId]);

  for (const company of companies) {
    await db.runAsync(
      `
        INSERT OR REPLACE INTO offline_companies (id, userId, data, updatedAt)
        VALUES (?, ?, ?, ?)
      `,
      [company.id, userId, JSON.stringify(company), Date.now()]
    );
  }
}

export async function getCachedCompanies(
  userId: string
): Promise<CachedCompany[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM offline_companies WHERE userId = ? ORDER BY updatedAt DESC`,
    [userId]
  );

  return rows.map((r) => JSON.parse(r.data));
}

export async function clearCachedCompanies(userId?: string) {
  if (userId) {
    await db.runAsync(`DELETE FROM offline_companies WHERE userId = ?`, [userId]);
    return;
  }
  await db.runAsync(`DELETE FROM offline_companies`);
}

export async function saveSelectedCompany(userId: string, companyId: string) {
  await db.runAsync(
    `
      INSERT OR REPLACE INTO offline_selected_company (userId, companyId, selectedAt)
      VALUES (?, ?, ?)
    `,
    [userId, companyId, Date.now()]
  );

  const meta = await getSessionMeta();
  if (meta?.userId === userId) {
    await saveSessionMeta({
      ...meta,
      selectedCompanyId: companyId,
    });
  }
}

export async function getSelectedCompanyId(userId: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ companyId: string }>(
    `SELECT companyId FROM offline_selected_company WHERE userId = ? LIMIT 1`,
    [userId]
  );
  return row?.companyId ?? null;
}

export async function clearSelectedCompany(userId?: string) {
  if (userId) {
    await db.runAsync(`DELETE FROM offline_selected_company WHERE userId = ?`, [userId]);
    return;
  }
  await db.runAsync(`DELETE FROM offline_selected_company`);
}

export async function saveSessionMeta(
  partial: Omit<OfflineSessionMeta, "offlineAllowedUntil"> & {
    offlineAllowedUntil?: number;
  }
) {
  const payload: OfflineSessionMeta = {
    ...partial,
    offlineAllowedUntil:
      partial.offlineAllowedUntil ??
      Date.now() + OFFLINE_AUTH_DAYS * 24 * 60 * 60 * 1000,
  };

  await SecureStore.setItemAsync(KEYS.sessionMeta, JSON.stringify(payload));
}

export async function getSessionMeta(): Promise<OfflineSessionMeta | null> {
  const raw = await SecureStore.getItemAsync(KEYS.sessionMeta);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSessionMeta() {
  await SecureStore.deleteItemAsync(KEYS.sessionMeta);
}

export async function isOfflineSessionValid(): Promise<boolean> {
  const meta = await getSessionMeta();
  if (!meta) return false;
  return Date.now() <= meta.offlineAllowedUntil;
}

export async function cacheAuthenticatedSession(params: {
  user: CachedUser;
  accessToken: string;
  refreshToken?: string | null;
  companies?: CachedCompany[];
  selectedCompanyId?: string | null;
}) {
  const {
    user,
    accessToken,
    refreshToken,
    companies = [],
    selectedCompanyId,
  } = params;

  await initAuthStorage();
  await saveTokens(accessToken, refreshToken);
  await saveCachedUser(user);

  if (companies.length) {
    await saveCachedCompanies(user.id, companies);
  }

  if (selectedCompanyId) {
    await saveSelectedCompany(user.id, selectedCompanyId);
  }

  await saveSessionMeta({
    userId: user.id,
    username: user.username,
    lastOnlineAuthAt: Date.now(),
    selectedCompanyId: selectedCompanyId ?? null,
  });
}

export async function clearOfflineAuthState() {
  const cachedUser = await getCachedUser();

  await clearTokens();
  await clearSessionMeta();
  await clearCachedUser();
  await clearSelectedCompany(cachedUser?.id);
  await clearCachedCompanies(cachedUser?.id);
}

/* ✅ LANGUAGE PREFERENCE STORAGE */
export async function saveLanguagePreference(language: "ar" | "en") {
  await SecureStore.setItemAsync(KEYS.preferredLanguage, language);
}

export async function getLanguagePreference(): Promise<"ar" | "en"> {
  const language = await SecureStore.getItemAsync(KEYS.preferredLanguage);
  return (language as "ar" | "en") || "ar"; // Default to Arabic
}

export async function clearLanguagePreference() {
  await SecureStore.deleteItemAsync(KEYS.preferredLanguage);
}