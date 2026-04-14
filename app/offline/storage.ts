import * as SQLite from "expo-sqlite";
import { PendingItem } from "./types";
import { Platform } from "react-native";

const DB_NAME = Platform.select({
  ios: "offline-queue.db",
  default: "offline-queue.db",
})!;

const db = SQLite.openDatabaseSync(DB_NAME);

type PendingQueueRow = {
  id: string;
  type: PendingItem["type"];
  payload: string;
  projectId: string | null;
  localMediaUris: string | null;
  createdAt: number | string;
  status: PendingItem["status"];
  retryCount: number | string;
  lastAttempt: number | string | null;
};

let initialized = false;

export async function initStorage(): Promise<void> {
  if (initialized) return;

  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_queue (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        projectId TEXT,
        localMediaUris TEXT,
        createdAt INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retryCount INTEGER NOT NULL DEFAULT 0,
        lastAttempt INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_pending_queue_status ON pending_queue(status);
      CREATE INDEX IF NOT EXISTS idx_pending_queue_projectId ON pending_queue(projectId);
    `);

    initialized = true;
    console.log("✅ Offline storage initialized");
  } catch (error) {
    console.error("Storage init failed:", error);
    throw error;
  }
}

export async function savePending(
  item: Omit<PendingItem, "status" | "retryCount" | "lastAttempt">
): Promise<string> {
  const fullItem: PendingItem = {
    ...item,
    status: "pending",
    retryCount: 0,
    lastAttempt: null,
  };

  await db.runAsync(
    `INSERT OR REPLACE INTO pending_queue
     (id, type, payload, projectId, localMediaUris, createdAt, status, retryCount, lastAttempt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      fullItem.id,
      fullItem.type,
      JSON.stringify(fullItem.payload),
      fullItem.projectId ?? null,
      JSON.stringify(fullItem.localMediaUris ?? []),
      fullItem.createdAt,
      fullItem.status,
      fullItem.retryCount ?? 0,
      fullItem.lastAttempt ?? null,
    ]
  );

  return fullItem.id;
}

export async function getPending(
  status: PendingItem["status"] = "pending"
): Promise<PendingItem[]> {
  await initStorage();

  const rows = await db.getAllAsync<PendingQueueRow>(
    `SELECT * FROM pending_queue WHERE status = ? ORDER BY createdAt ASC;`,
    [status]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload),
    projectId: row.projectId ?? undefined,
    localMediaUris: row.localMediaUris ? JSON.parse(row.localMediaUris) : [],
    createdAt: Number(row.createdAt),
    status: row.status,
    retryCount: Number(row.retryCount ?? 0),
    lastAttempt:
      row.lastAttempt === null || row.lastAttempt === undefined
        ? null
        : Number(row.lastAttempt),
  }));
}

export async function updateStatus(
  id: string,
  status: PendingItem["status"],
  retryCount?: number,
  lastAttempt?: number
): Promise<void> {
  await initStorage();

  await db.runAsync(
    `UPDATE pending_queue
     SET status = ?,
         retryCount = COALESCE(?, retryCount),
         lastAttempt = ?
     WHERE id = ?;`,
    [status, retryCount ?? null, lastAttempt ?? null, id]
  );
}

export async function deletePending(id: string): Promise<void> {
  await initStorage();
  await db.runAsync(`DELETE FROM pending_queue WHERE id = ?;`, [id]);
}

export async function getPendingCount(): Promise<number> {
  try {
    await initStorage();

    const result = await db.getFirstAsync<{ count: number | string }>(
      `SELECT COUNT(*) as count FROM pending_queue WHERE status = 'pending';`
    );

    return Number(result?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function updatePayload(
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  await initStorage();

  await db.runAsync(
    `UPDATE pending_queue SET payload = ? WHERE id = ?;`,
    [JSON.stringify(payload), id]
  );
}