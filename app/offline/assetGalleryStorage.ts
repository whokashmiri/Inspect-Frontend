// offline/assetGalleryStorage.ts


import {
  AssetCategoryItem,
  AssetTypeItem,
  AssetNameItem,
} from "../../api/assetCategory.api";


// -----------------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------------

import {
  offlineDb as db,
  configureOfflineDb,
} from "./database";

import { runDbTask } from "./dbQueue";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type OfflineAssetTaxonomy = {
  categories: AssetCategoryItem[];
  types: AssetTypeItem[];
  names: AssetNameItem[];
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
  | Promise<void>
  | null = null;

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
      await configureOfflineDb();

      await runDbTask(async () => {
        if (initialized) {
          return;
        }

        try {
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
      });
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });

  return initializationPromise;
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

 await runDbTask(() =>
  db.runAsync(
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
  ),
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

    console.log(
  "[AssetGalleryOffline] reading taxonomy",
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

 await runDbTask(() =>
  db.runAsync(
    `
      DELETE FROM offline_asset_taxonomy
      WHERE id = ?;
    `,
    [TAXONOMY_CACHE_ID],
  ),
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



