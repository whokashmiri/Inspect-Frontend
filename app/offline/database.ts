// offline/database.ts

import * as SQLite from "expo-sqlite";

export const OFFLINE_DB_NAME =
  "offline-queue.db";

export const offlineDb =
  SQLite.openDatabaseSync(
    OFFLINE_DB_NAME,
  );

let configured = false;

let configurationPromise:
  | Promise<void>
  | null = null;

export async function configureOfflineDb() {
  if (configured) {
    return;
  }

  if (configurationPromise) {
    return configurationPromise;
  }

  configurationPromise =
    (async () => {
      await offlineDb.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        PRAGMA foreign_keys = ON;
      `);

      configured = true;
    })().finally(() => {
      configurationPromise = null;
    });

  return configurationPromise;
}