// offline/assetGalleryStorage.ts

import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import {
  AssetCategoryItem,
  AssetTypeItem,
  AssetNameItem,
} from "../../api/assetCategory.api";

import { AssetItem } from "../../api/api";

// -----------------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------------

const DB_NAME = Platform.select({
  ios: "offline-queue.db",
  default: "offline-queue.db",
})!;

const db =
  SQLite.openDatabaseSync(DB_NAME);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type OfflineAssetTaxonomy = {
  categories: AssetCategoryItem[];
  types: AssetTypeItem[];
  names: AssetNameItem[];
};

type OfflineAssetRow = {
  id: string;
  projectId: string;
  folderId: string | null;
  data: string;
};

type AssetTaxonomyRow = {
  id: string;
  data: string;
  updatedAt: number | string;
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TAXONOMY_CACHE_ID =
  "asset_taxonomy";

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

let initialized = false;

let initializationPromise:
  Promise<void> | null = null;

export function initAssetGalleryStorage():
  Promise<void> {
  if (initialized) {
    return Promise.resolve();
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise =
    (async () => {
      try {
        /*
         * We only create the table owned by
         * AssetGalleryScreen here.
         *
         * offline_assets is created by storage.ts.
         */
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS offline_asset_taxonomy (
            id TEXT PRIMARY KEY NOT NULL,
            data TEXT NOT NULL,
            updatedAt INTEGER NOT NULL
          );
        `);

        initialized = true;

        console.log(
          "✅ Asset gallery offline storage initialized",
        );
      } catch (error) {
        initialized = false;

        console.error(
          "Asset gallery storage initialization failed:",
          error,
        );

        throw error;
      }
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });

  return initializationPromise;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function normalizeText(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function normalizeKey(
  value: unknown,
): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidTaxonomyValue(
  value: unknown,
): boolean {
  const normalized =
    normalizeKey(value);

  return (
    normalized.length > 0 &&
    normalized !== "unknown"
  );
}

function safeTimestamp(
  value: unknown,
): number {
  if (!value) {
    return 0;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const timestamp =
    new Date(
      String(value),
    ).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function normalizeAsset(
  value: any,
): AssetItem | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const id =
    String(
      value.id ||
        value._id ||
        "",
    ).trim();

  if (!id) {
    return null;
  }

  return {
    ...value,

    id,

    name:
      normalizeText(value.name) || "",

    assetType:
      String(
        value.assetType || "other",
      )
        .trim()
        .toLowerCase() ===
      "vehicle"
        ? "vehicle"
        : "other",

    categoryId:
      normalizeText(
        value.categoryId,
      ),

    category:
      normalizeText(
        value.category,
      ),

    typeId:
      normalizeText(
        value.typeId,
      ),

    type:
      normalizeText(
        value.type,
      ),

    nameId:
      normalizeText(
        value.nameId,
      ),

    code:
      normalizeText(
        value.code,
      ),

    client_code:
      normalizeText(
        value.client_code,
      ),

    employer:
      normalizeText(
        value.employer,
      ),

    asset_source:
      normalizeText(
        value.asset_source,
      ),

    val_tech_id:
      typeof value.val_tech_id ===
        "number"
        ? value.val_tech_id
        : null,

    projectId:
      String(
        value.projectId || "",
      ),

    parent:
      value.parent ??
      value.folderId ??
      null,

    updatedAt:
      value.updatedAt ?? null,

    createdAt:
      value.createdAt ?? null,

    createdBy:
      value.createdBy ?? null,

    updatedBy:
      value.updatedBy ?? null,
  } as AssetItem;
}

// -----------------------------------------------------------------------------
// Taxonomy
// -----------------------------------------------------------------------------

export async function saveAssetTaxonomyOffline(
  data: {
    categories?: AssetCategoryItem[];
    types?: AssetTypeItem[];
    names?: AssetNameItem[];
  },
): Promise<void> {
  await initAssetGalleryStorage();

  const normalized:
    OfflineAssetTaxonomy = {
    categories:
      Array.isArray(data?.categories)
        ? data.categories
        : [],

    types:
      Array.isArray(data?.types)
        ? data.types
        : [],

    names:
      Array.isArray(data?.names)
        ? data.names
        : [],
  };

  await db.runAsync(
    `
      INSERT OR REPLACE
      INTO offline_asset_taxonomy (
        id,
        data,
        updatedAt
      )
      VALUES (?, ?, ?);
    `,
    [
      TAXONOMY_CACHE_ID,
      JSON.stringify(normalized),
      Date.now(),
    ],
  );
}

export async function getAssetTaxonomyOffline():
  Promise<OfflineAssetTaxonomy | null> {
  await initAssetGalleryStorage();

  const row =
    await db.getFirstAsync<
      AssetTaxonomyRow
    >(
      `
        SELECT
          id,
          data,
          updatedAt
        FROM offline_asset_taxonomy
        WHERE id = ?
        LIMIT 1;
      `,
      [
        TAXONOMY_CACHE_ID,
      ],
    );

  if (!row) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(row.data);

    return {
      categories:
        Array.isArray(
          parsed?.categories,
        )
          ? parsed.categories
          : [],

      types:
        Array.isArray(
          parsed?.types,
        )
          ? parsed.types
          : [],

      names:
        Array.isArray(
          parsed?.names,
        )
          ? parsed.names
          : [],
    };
  } catch (error) {
    console.warn(
      "[AssetGalleryOffline] Invalid taxonomy cache",
      error,
    );

    return null;
  }
}

export async function clearAssetTaxonomyOffline():
  Promise<void> {
  await initAssetGalleryStorage();

  await db.runAsync(
    `
      DELETE FROM offline_asset_taxonomy
      WHERE id = ?;
    `,
    [
      TAXONOMY_CACHE_ID,
    ],
  );
}

export async function hasAssetTaxonomyOffline():
  Promise<boolean> {
  await initAssetGalleryStorage();

  const row =
    await db.getFirstAsync<{
      count: number | string;
    }>(
      `
        SELECT COUNT(*) AS count
        FROM offline_asset_taxonomy
        WHERE id = ?;
      `,
      [
        TAXONOMY_CACHE_ID,
      ],
    );

  return (
    Number(
      row?.count ?? 0,
    ) > 0
  );
}

// -----------------------------------------------------------------------------
// Recent assets
// -----------------------------------------------------------------------------

/*
 * Recent assets are NOT stored in a separate table.
 *
 * They are derived from offline_assets:
 *
 * 1. same project
 * 2. assetType = other
 * 3. valid category/type/name
 * 4. newest updatedAt first
 * 5. unique by normalized name
 * 6. newest duplicate wins
 */
export async function getOfflineRecentAssets(
  projectId: string,
  limit = 8,
): Promise<AssetItem[]> {
  await initAssetGalleryStorage();

  const normalizedProjectId =
    String(projectId || "").trim();

  if (!normalizedProjectId) {
    return [];
  }

  const safeLimit =
    Math.min(
      Math.max(
        Number(limit) || 8,
        1,
      ),
      30,
    );

  /*
   * Fetch all project assets.
   *
   * We cannot LIMIT before de-duplicating because:
   *
   * Chair
   * Chair
   * Chair
   * Table
   *
   * could otherwise produce fewer than requested
   * unique Recent assets.
   */
  let rows:
    OfflineAssetRow[] = [];

  try {
    rows =
      await db.getAllAsync<
        OfflineAssetRow
      >(
        `
          SELECT
            id,
            projectId,
            folderId,
            data
          FROM offline_assets
          WHERE projectId = ?;
        `,
        [
          normalizedProjectId,
        ],
      );
  } catch (error) {
    /*
     * This can happen if gallery storage initializes
     * before the main storage.ts has created
     * offline_assets.
     */
    console.warn(
      "[AssetGalleryOffline] Could not read offline_assets",
      error,
    );

    return [];
  }

  const assets: AssetItem[] =
    [];

  for (const row of rows) {
    try {
      const parsed =
        JSON.parse(row.data);

      const asset =
        normalizeAsset({
          ...parsed,

          id:
            parsed?.id ||
            row.id,

          projectId:
            parsed?.projectId ||
            row.projectId,

          folderId:
            parsed?.folderId ??
            row.folderId ??
            null,
        });

      if (!asset) {
        continue;
      }

      if (
        asset.assetType !==
        "other"
      ) {
        continue;
      }

      if (
        !isValidTaxonomyValue(
          asset.category,
        )
      ) {
        continue;
      }

      if (
        !isValidTaxonomyValue(
          asset.type,
        )
      ) {
        continue;
      }

      if (
        !isValidTaxonomyValue(
          asset.name,
        )
      ) {
        continue;
      }

      /*
       * Recent only makes sense when
       * the asset has been created/used/updated.
       */
      if (
        !asset.updatedAt
      ) {
        continue;
      }

      assets.push(asset);
    } catch (error) {
      console.warn(
        "[AssetGalleryOffline] Skipping invalid asset row",
        row.id,
        error,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Newest first
  // ---------------------------------------------------------------------------

  assets.sort(
    (a, b) => {
      const aTime =
        safeTimestamp(
          a.updatedAt,
        );

      const bTime =
        safeTimestamp(
          b.updatedAt,
        );

      if (
        aTime !== bTime
      ) {
        return (
          bTime - aTime
        );
      }

      /*
       * Stable tie breaker.
       */
      return String(
        b.id || "",
      ).localeCompare(
        String(
          a.id || "",
        ),
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Unique by name
  // ---------------------------------------------------------------------------

  const seenNames =
    new Set<string>();

  const uniqueAssets:
    AssetItem[] = [];

  for (
    const asset of assets
  ) {
    const nameKey =
      normalizeKey(
        asset.name,
      );

    if (!nameKey) {
      continue;
    }

    if (
      seenNames.has(
        nameKey,
      )
    ) {
      continue;
    }

    seenNames.add(
      nameKey,
    );

    uniqueAssets.push(
      asset,
    );

    if (
      uniqueAssets.length >=
      safeLimit
    ) {
      break;
    }
  }

  return uniqueAssets;
}

// -----------------------------------------------------------------------------
// Mark recent asset used locally
// -----------------------------------------------------------------------------

/*
 * Online:
 * backend markAssetUsed() updates updatedAt.
 *
 * Offline:
 * we need equivalent local behavior so Recent ordering
 * changes immediately.
 *
 * This does NOT set updatedBy because selecting a recent
 * item is not necessarily editing the real asset.
 */
export async function markOfflineAssetUsed(
  assetId: string,
): Promise<void> {
  await initAssetGalleryStorage();

  const normalizedId =
    String(assetId || "").trim();

  if (!normalizedId) {
    return;
  }

  let row:
    OfflineAssetRow | null =
    null;

  try {
    row =
      await db.getFirstAsync<
        OfflineAssetRow
      >(
        `
          SELECT
            id,
            projectId,
            folderId,
            data
          FROM offline_assets
          WHERE id = ?
          LIMIT 1;
        `,
        [
          normalizedId,
        ],
      );
  } catch (error) {
    console.warn(
      "[AssetGalleryOffline] Could not find asset to mark used",
      error,
    );

    return;
  }

  if (!row) {
    return;
  }

  try {
    const parsed =
      JSON.parse(row.data);

    const updatedAsset = {
      ...parsed,

      id:
        parsed?.id ||
        row.id,

      projectId:
        parsed?.projectId ||
        row.projectId,

      folderId:
        parsed?.folderId ??
        row.folderId ??
        null,

      updatedAt:
        new Date().toISOString(),
    };

    await db.runAsync(
      `
        UPDATE offline_assets
        SET data = ?
        WHERE id = ?;
      `,
      [
        JSON.stringify(
          updatedAsset,
        ),
        normalizedId,
      ],
    );
  } catch (error) {
    console.warn(
      "[AssetGalleryOffline] Could not mark asset used",
      error,
    );
  }
}

// -----------------------------------------------------------------------------
// Combined loader
// -----------------------------------------------------------------------------

/*
 * Convenience function for AssetGalleryScreen.
 *
 * This lets the screen load everything it needs with one call
 * when running offline.
 */
export async function getOfflineAssetGalleryData(
  projectId?: string,
  recentLimit = 8,
): Promise<{
  taxonomy:
    OfflineAssetTaxonomy | null;

  recentAssets:
    AssetItem[];
}> {
  const [
    taxonomy,
    recentAssets,
  ] = await Promise.all([
    getAssetTaxonomyOffline(),

    projectId
      ? getOfflineRecentAssets(
          projectId,
          recentLimit,
        )
      : Promise.resolve(
          [] as AssetItem[],
        ),
  ]);

  return {
    taxonomy,
    recentAssets,
  };
}