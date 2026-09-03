import {
  clearAllOfflineData,
} from "./storage";

import {
  clearAssetTaxonomyOffline,
} from "./assetGalleryStorage";

import {
  clearAllRecentAssets,
} from "./assetRecentStorage";

import {
  clearAllOfflineMediaFiles,
} from "./mediaStorage";

import {
  clearOfflineAuthState,
} from "./authStorage";

import {
  clearAllScans,
} from "../components/utils/scannerDb";

import {
  clearAllOfflineTransactions,
  clearAllTransactionMedia,
} from "./transactionsOffline";

import {
  clearConnectivityStorage,
} from "../components/connectivity/ConnectivityContext";

export async function clearAllLocalUserData(): Promise<void> {
  const cleanups = [
    {
      name: "auth",
      run: () =>
        clearOfflineAuthState(),
    },
    {
      name: "projects",
      run: () =>
        clearAllOfflineData(),
    },
    {
      name: "asset-taxonomy",
      run: () =>
        clearAssetTaxonomyOffline(),
    },
    {
      name: "asset-recent",
      run: () =>
        clearAllRecentAssets(),
    },
    {
      name: "asset-media",
      run: () =>
        clearAllOfflineMediaFiles(),
    },
    {
      name: "transactions",
      run: () =>
        clearAllOfflineTransactions(),
    },
    {
      name: "transaction-media",
      run: () =>
        clearAllTransactionMedia(),
    },
    {
      name: "scanner",
      run: async () => {
        clearAllScans();
      },
    },
    {
      name: "connectivity",
      run: () =>
        clearConnectivityStorage(),
    },
  ];

  const results =
    await Promise.allSettled(
      cleanups.map(
        (cleanup) =>
          cleanup.run(),
      ),
    );

  results.forEach(
    (result, index) => {
      if (
        result.status ===
        "rejected"
      ) {
        console.warn(
          `[LogoutCleanup] ${cleanups[index].name} failed`,
          result.reason,
        );
      }
    },
  );

  console.log(
    "✅ All local user data cleared",
  );
}