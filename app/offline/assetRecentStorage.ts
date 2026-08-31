import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  AssetImageItem,
} from "../../api/api";

export type RecentAssetImages = {
  main?: AssetImageItem | null;
  plate?: AssetImageItem | null;
  details?: AssetImageItem | null;
  odometer?: AssetImageItem | null;
  brand?: AssetImageItem | null;
  other?: AssetImageItem[];
};

export type RecentAssetEntry = {
  /*
   * We intentionally use recentKey as id too.
   *
   * Recent represents the taxonomy selection,
   * not a specific DB asset.
   */
  id: string;
  recentKey: string;

  projectId: string;

  categoryId: string;
  category: string;

  typeId: string;
  type: string;

  nameId: string;
  name: string;

  assetType: "other";

  images: RecentAssetImages | null;

  usedAt: number;

  status: "pending" | "saved";
};

const RECENT_LIMIT = 50;

/*
 * Pending entries are intentionally memory-only.
 *
 * If the user kills/restarts the app without
 * saving the asset, these disappear automatically.
 */
const pendingRecentByProject =
  new Map<string, RecentAssetEntry[]>();

function storageKey(
  projectId: string,
) {
  return `asset-gallery-recent:${projectId}`;
}

export function createRecentKey({
  projectId,
  categoryId,
  typeId,
  nameId,
}: {
  projectId: string;
  categoryId: string;
  typeId: string;
  nameId: string;
}) {
  return [
    projectId,
    categoryId,
    typeId,
    nameId,
  ].join(":");
}

function getMediaUri(
  item?: AssetImageItem | null,
) {
  return String(
    item?.url ||
      item?.uri ||
      "",
  ).trim();
}

function hasMainImage(
  images?: RecentAssetImages | null,
) {
  return !!getMediaUri(
    images?.main,
  );
}

async function readSavedRecent(
  projectId: string,
): Promise<RecentAssetEntry[]> {
  try {
    const raw =
      await AsyncStorage.getItem(
        storageKey(projectId),
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    /*
     * Important:
     * persisted Recent MUST have a main image.
     */
    return parsed
      .filter(
        (item): item is RecentAssetEntry =>
          !!item &&
          item.projectId === projectId &&
          item.status === "saved" &&
          hasMainImage(item.images),
      )
      .sort(
        (a, b) =>
          Number(b.usedAt || 0) -
          Number(a.usedAt || 0),
      );
  } catch (error) {
    console.warn(
      "[RecentAssets] Could not read recent assets",
      error,
    );

    return [];
  }
}

async function writeSavedRecent(
  projectId: string,
  entries: RecentAssetEntry[],
) {
  const cleaned =
    entries
      .filter(
        (item) =>
          item.status === "saved" &&
          hasMainImage(item.images),
      )
      .sort(
        (a, b) =>
          Number(b.usedAt || 0) -
          Number(a.usedAt || 0),
      )
      .slice(
        0,
        RECENT_LIMIT,
      );

  await AsyncStorage.setItem(
    storageKey(projectId),
    JSON.stringify(cleaned),
  );
}

export async function getRecentAssets(
  projectId: string,
): Promise<RecentAssetEntry[]> {
  const saved =
    await readSavedRecent(
      projectId,
    );

  const pending =
    pendingRecentByProject.get(
      projectId,
    ) ?? [];

  /*
   * Pending takes precedence over the same key,
   * although normally the same taxonomy item
   * should not be pending if already saved.
   */
  const map =
    new Map<
      string,
      RecentAssetEntry
    >();

  for (const item of saved) {
    map.set(
      item.recentKey,
      item,
    );
  }

  for (const item of pending) {
    map.set(
      item.recentKey,
      item,
    );
  }

  return Array.from(
    map.values(),
  ).sort(
    (a, b) =>
      Number(b.usedAt || 0) -
      Number(a.usedAt || 0),
  );
}

/*
 * Called when the user presses Use on
 * a Suggested taxonomy item.
 *
 * This does NOT write AsyncStorage yet.
 */
export function createPendingRecentAsset({
  projectId,
  categoryId,
  category,
  typeId,
  type,
  nameId,
  name,
}: {
  projectId: string;

  categoryId: string;
  category: string;

  typeId: string;
  type: string;

  nameId: string;
  name: string;
}): RecentAssetEntry {
  const recentKey =
    createRecentKey({
      projectId,
      categoryId,
      typeId,
      nameId,
    });

  const entry: RecentAssetEntry = {
    id: recentKey,
    recentKey,

    projectId,

    categoryId,
    category,

    typeId,
    type,

    nameId,
    name,

    assetType: "other",

    images: null,

    usedAt: Date.now(),

    status: "pending",
  };

  const existing =
    pendingRecentByProject.get(
      projectId,
    ) ?? [];

  pendingRecentByProject.set(
    projectId,
    [
      entry,
      ...existing.filter(
        (item) =>
          item.recentKey !==
          recentKey,
      ),
    ],
  );

  return entry;
}

/*
 * Called after CreateAssetWizardModal successfully
 * saves an asset.
 *
 * The taxonomy name/category/type come from the
 * original Recent snapshot.
 *
 * Only images are added from the saved asset.
 */
export async function completePendingRecentAsset({
  projectId,
  recentKey,
  images,
}: {
  projectId: string;
  recentKey: string;
  images?: RecentAssetImages | null;
}) {
  const pending =
    pendingRecentByProject.get(
      projectId,
    ) ?? [];

  const entry =
    pending.find(
      (item) =>
        item.recentKey ===
        recentKey,
    );

  /*
   * Nothing to complete.
   */
  if (!entry) {
    return null;
  }

  /*
   * Your rule:
   *
   * no MAIN image = do not persist Recent.
   */
  if (!hasMainImage(images)) {
    discardPendingRecentAsset(
      projectId,
      recentKey,
    );

    return null;
  }

  const completed: RecentAssetEntry = {
    ...entry,

    /*
     * Important:
     * keep the original taxonomy snapshot/name.
     *
     * Do NOT take the potentially edited DB
     * asset name from the wizard.
     */
    images: images ?? null,

    usedAt: Date.now(),

    status: "saved",
  };

  const saved =
    await readSavedRecent(
      projectId,
    );

  const next = [
    completed,

    ...saved.filter(
      (item) =>
        item.recentKey !==
        recentKey,
    ),
  ];

  await writeSavedRecent(
    projectId,
    next,
  );

  discardPendingRecentAsset(
    projectId,
    recentKey,
  );

  return completed;
}

export function discardPendingRecentAsset(
  projectId: string,
  recentKey: string,
) {
  const current =
    pendingRecentByProject.get(
      projectId,
    ) ?? [];

  pendingRecentByProject.set(
    projectId,
    current.filter(
      (item) =>
        item.recentKey !==
        recentKey,
    ),
  );
}

export async function touchSavedRecentAsset(
  projectId: string,
  recentKey: string,
) {
  const saved =
    await readSavedRecent(
      projectId,
    );

  const existing =
    saved.find(
      (item) =>
        item.recentKey ===
        recentKey,
    );

  if (!existing) {
    return;
  }

  const updated = {
    ...existing,
    usedAt: Date.now(),
  };

  await writeSavedRecent(
    projectId,
    [
      updated,

      ...saved.filter(
        (item) =>
          item.recentKey !==
          recentKey,
      ),
    ],
  );
}