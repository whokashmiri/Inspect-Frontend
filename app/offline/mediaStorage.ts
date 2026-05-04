import { Directory, File, Paths } from "expo-file-system";

const OFFLINE_MEDIA_DIR = new Directory(Paths.document, "offline-media");

function ensureOfflineMediaDir() {
  if (!OFFLINE_MEDIA_DIR.exists) {
    OFFLINE_MEDIA_DIR.create({
      intermediates: true,
      idempotent: true,
    });
  }
}

function getFileExtension(file: any) {
  const source = file?.name || file?.uri || "";
  const match = String(source).match(/\.[a-zA-Z0-9]+$/);
  return match?.[0] || "";
}

export async function persistOfflineFile(file: any) {
  if (!file?.uri) return file;

  if (file.uri.startsWith("http")) return file;

  if (file.uri.startsWith(OFFLINE_MEDIA_DIR.uri)) return file;

  ensureOfflineMediaDir();

  const ext = getFileExtension(file);
  const fileName = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}${ext}`;

  const sourceFile = new File(file.uri);
  const targetFile = new File(OFFLINE_MEDIA_DIR, fileName);

  if (!sourceFile.exists) {
    throw new Error("Offline media file does not exist");
  }

  sourceFile.copy(targetFile);

  return {
    ...file,
    uri: targetFile.uri,
    name: file.name || fileName,
  };
}

export async function persistOfflineMediaPayload(payload: any) {
  const images = await Promise.all(
    (payload.images || []).map((file: any) => persistOfflineFile(file))
  );

  const voiceNotes = await Promise.all(
    (payload.voiceNotes || []).map((file: any) => persistOfflineFile(file))
  );

  return {
    ...payload,
    images,
    voiceNotes,
  };
}

export async function deleteOfflineImageFiles(payload: any) {
  const images = payload.images || [];

  for (const image of images) {
    const uri = image?.uri;

    if (typeof uri === "string" && uri.startsWith(OFFLINE_MEDIA_DIR.uri)) {
      try {
        const file = new File(uri);

        if (file.exists) {
          file.delete();
        }
      } catch {
        console.warn(`Failed to delete offline image file: ${uri}`);
      }
    }
  }
}