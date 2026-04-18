import * as SQLite from "expo-sqlite";
import { ExtractedScanResult } from "./scanTypes";

const db = SQLite.openDatabaseSync("offline_scanner.db");

export function initScannerDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      rawText TEXT,
      imageUri TEXT,
      createdAt TEXT NOT NULL
    );
  `);
}

function uuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function insertScan(scan: ExtractedScanResult) {
  const id = uuid();
  const createdAt = scan.createdAt ?? new Date().toISOString();

  db.runSync(
    `INSERT INTO scans (id, type, value, rawText, imageUri, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      scan.type,
      scan.value,
      scan.rawText ?? null,
      scan.imageUri ?? null,
      createdAt,
    ]
  );

  return { id, ...scan, createdAt };
}

export function insertManyScans(scans: ExtractedScanResult[]) {
  for (const scan of scans) {
    insertScan(scan);
  }
}

export function fetchScans() {
  return db.getAllSync(
    `SELECT id, type, value, rawText, imageUri, createdAt
     FROM scans
     ORDER BY datetime(createdAt) DESC`
  );
}