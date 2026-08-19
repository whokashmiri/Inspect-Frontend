import * as ImageManipulator from "expo-image-manipulator";

type ImageSlot =
  | "main"
  | "plate"
  | "details"
  | "odometer"
  | "brand"
  | "other";

const IMAGE_CONFIG: Record<
  ImageSlot,
  {
    maxWidth: number;
    quality: number;
  }
> = {
    main: {
    maxWidth: 1800,
    quality: 0.85,
  },
  plate: {
    maxWidth: 1800,
    quality: 0.85,
  },
  odometer: {
    maxWidth: 1800,
    quality: 0.85,
  },
  details: {
    maxWidth: 1600,
    quality: 0.78,
  },
  brand: {
    maxWidth: 1600,
    quality: 0.8,
  },
  other: {
    maxWidth: 1400,
    quality: 0.75,
  },
};

export async function compressAssetImage(
  uri: string,
  slot: ImageSlot
): Promise<string> {
  const config = IMAGE_CONFIG[slot];

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: config.maxWidth,
        },
      },
    ],
    {
      compress: config.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return result.uri;
}