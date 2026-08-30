// offline/transactionsDatabase.ts

import * as SQLite from "expo-sqlite";

export const TRANSACTIONS_DB_NAME =
  "offline-transactions.db";

export const transactionsDb =
  SQLite.openDatabaseSync(
    TRANSACTIONS_DB_NAME,
  );

let configured = false;

let configurationPromise:
  | Promise<void>
  | null = null;

let queue: Promise<void> =
  Promise.resolve();

export function runTransactionsDbTask<T>(
  task: () => Promise<T>,
): Promise<T> {
  const next =
    queue.then(task, task);

  queue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}

export function configureTransactionsDb():
  Promise<void> {
  if (configured) {
    return Promise.resolve();
  }

  if (configurationPromise) {
    return configurationPromise;
  }

  configurationPromise =
    runTransactionsDbTask(
      async () => {
        if (configured) {
          return;
        }

        await transactionsDb.execAsync(`
          PRAGMA journal_mode = WAL;
          PRAGMA busy_timeout = 5000;
          PRAGMA foreign_keys = ON;
        `);

        configured = true;
      },
    ).catch((error) => {
      configurationPromise = null;
      throw error;
    });

  return configurationPromise;
}