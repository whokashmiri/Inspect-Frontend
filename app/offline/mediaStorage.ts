import {
  Directory,
  File,
  Paths,
} from "expo-file-system";

const OFFLINE_MEDIA_DIR =
  new Directory(
    Paths.document,
    "offline-media",
  );


  export async function clearAllOfflineMediaFiles(): Promise<void> {
  try {
    if (OFFLINE_MEDIA_DIR.exists) {
      OFFLINE_MEDIA_DIR.delete();
    }

    console.log("✅ Offline asset media cleared");
  } catch (error) {
    console.warn(
      "[OfflineMedia] Failed to clear offline media directory",
      error,
    );
  }
}
type AssetMediaInput = {
  uri?: string;
  url?: string;
  name?: string;
  type?: string;
  mediaType?: string;
  publicId?: string | null;
  mimeType?: string | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  existing?: boolean;

  [key: string]: any;
};

type AssetImagesInput = {
  main?: AssetMediaInput | null;
  plate?: AssetMediaInput | null;
  details?: AssetMediaInput | null;
  odometer?: AssetMediaInput | null;
  brand?: AssetMediaInput | null;
  other?: AssetMediaInput[];
};


// -----------------------------------------------------------------------------
// Directory
// -----------------------------------------------------------------------------

function ensureOfflineMediaDir() {
  if (!OFFLINE_MEDIA_DIR.exists) {
    OFFLINE_MEDIA_DIR.create({
      intermediates: true,
      idempotent: true,
    });
  }
}


// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getFileExtension(
  file: any,
) {
  const source =
    file?.name ||
    file?.uri ||
    "";

  const match =
    String(source).match(
      /\.[a-zA-Z0-9]+$/,
    );

  return match?.[0] || "";
}


function normalizeVoiceNotes(
  value: unknown,
): AssetMediaInput[] {
  return Array.isArray(value)
    ? value.filter(Boolean)
    : [];
}


function normalizeOtherImages(
  value: unknown,
): AssetMediaInput[] {
  return Array.isArray(value)
    ? value.filter(Boolean)
    : [];
}


function flattenAssetImages(
  images?:
    | AssetImagesInput
    | AssetMediaInput[]
    | null,
): AssetMediaInput[] {
  if (!images) {
    return [];
  }

  /*
   * Backward compatibility with old
   * flat image arrays.
   */
  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  const result:
    AssetMediaInput[] = [];

  if (images.main) {
    result.push(images.main);
  }

  if (images.plate) {
    result.push(images.plate);
  }

  if (images.details) {
    result.push(images.details);
  }

  if (images.odometer) {
    result.push(images.odometer);
  }

  if (images.brand) {
    result.push(images.brand);
  }

  result.push(
    ...normalizeOtherImages(
      images.other,
    ),
  );

  return result;
}


// -----------------------------------------------------------------------------
// Persist single file
// -----------------------------------------------------------------------------

export async function persistOfflineFile(
  file: any,
) {
  if (!file) {
    return file;
  }

  /*
   * Existing server media may have URL only.
   * Nothing needs to be copied locally.
   */
  if (
    !file.uri &&
    file.url
  ) {
    return file;
  }

  if (!file.uri) {
    return file;
  }

  /*
   * Existing remote media should stay unchanged.
   */
  if (
    file.uri.startsWith("http://") ||
    file.uri.startsWith("https://")
  ) {
    return file;
  }

  /*
   * Already persisted.
   */
  if (
    file.uri.startsWith(
      OFFLINE_MEDIA_DIR.uri,
    )
  ) {
    return file;
  }

  ensureOfflineMediaDir();

  const ext =
    getFileExtension(file);

  const fileName =
    `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}${ext}`;

  const sourceFile =
    new File(file.uri);

  const targetFile =
    new File(
      OFFLINE_MEDIA_DIR,
      fileName,
    );

  if (!sourceFile.exists) {
    throw new Error(
      `Offline media file does not exist: ${file.uri}`,
    );
  }

  sourceFile.copy(
    targetFile,
  );

  return {
    ...file,

    uri:
      targetFile.uri,

    name:
      file.name ||
      fileName,
  };
}


// -----------------------------------------------------------------------------
// Persist optional structured image
// -----------------------------------------------------------------------------

async function persistOptionalImage(
  file?:
    | AssetMediaInput
    | null,
): Promise<
  AssetMediaInput | null
> {
  if (!file) {
    return null;
  }

  return persistOfflineFile(
    file,
  );
}


// -----------------------------------------------------------------------------
// Persist structured images
// -----------------------------------------------------------------------------

async function persistStructuredImages(
  images?:
    | AssetImagesInput
    | AssetMediaInput[]
    | null,
): Promise<AssetImagesInput> {
  if (!images) {
    return {
      main: null,
      plate: null,
      details: null,
      odometer: null,
      brand: null,
      other: [],
    };
  }

  /*
   * Backward compatibility for old
   * flat image arrays.
   */
  if (Array.isArray(images)) {
    const persisted =
      await Promise.all(
        images
          .filter(Boolean)
          .map((file) =>
            persistOfflineFile(
              file,
            ),
          ),
      );

    return {
      main: null,
      plate: null,
      details: null,
      odometer: null,
      brand: null,
      other: persisted,
    };
  }

  /*
   * IMPORTANT:
   *
   * Promise order MUST exactly match
   * destructuring order.
   */
  const [
    main,
    plate,
    details,
    odometer,
    brand,
    other,
  ] = await Promise.all([
    persistOptionalImage(
      images.main,
    ),

    persistOptionalImage(
      images.plate,
    ),

    persistOptionalImage(
      images.details,
    ),

    persistOptionalImage(
      images.odometer,
    ),

    persistOptionalImage(
      images.brand,
    ),

    Promise.all(
      normalizeOtherImages(
        images.other,
      ).map((file) =>
        persistOfflineFile(
          file,
        ),
      ),
    ),
  ]);

  return {
    main,
    plate,
    details,
    odometer,
    brand,
    other,
  };
}


// -----------------------------------------------------------------------------
// Persist complete queued payload
// -----------------------------------------------------------------------------

export async function persistOfflineMediaPayload(
  payload: any,
) {
  if (!payload) {
    return payload;
  }

  const images =
    await persistStructuredImages(
      payload.images,
    );

  const voiceNotes =
    await Promise.all(
      normalizeVoiceNotes(
        payload.voiceNotes,
      ).map((file) =>
        persistOfflineFile(
          file,
        ),
      ),
    );

  return {
    ...payload,

    images,

    voiceNotes,
  };
}



export async function deleteOfflineMediaFiles(
  payload: any,
) {
  if (!payload) {
    return;
  }

  const imageItems =
    flattenAssetImages(
      payload.images,
    );

  const voiceItems =
    normalizeVoiceNotes(
      payload.voiceNotes,
    );

  const mediaItems = [
    ...imageItems,
    ...voiceItems,
  ];

  for (const item of mediaItems) {
    const uri =
      item?.uri;

    if (
      typeof uri === "string" &&
      uri.startsWith(
        OFFLINE_MEDIA_DIR.uri,
      )
    ) {
      try {
        const file =
          new File(uri);

        if (file.exists) {
          file.delete();
        }
      } catch (error) {
        console.warn(
          `Failed to delete offline media file: ${uri}`,
          error,
        );
      }
    }
  }
}