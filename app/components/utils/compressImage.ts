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
    maxDimension: number;
    quality: number;
  }
> = {
  main: {
    maxDimension: 1800,
    quality: 0.85,
  },
  plate: {
    maxDimension: 1800,
    quality: 0.85,
  },
  odometer: {
    maxDimension: 1800,
    quality: 0.85,
  },
  details: {
    maxDimension: 1600,
    quality: 0.78,
  },
  brand: {
    maxDimension: 1600,
    quality: 0.8,
  },
  other: {
    maxDimension: 1000,
    quality: 0.70,
  },
};

export async function compressAssetImage(
  uri: string,
  slot: ImageSlot,
  width?: number,
  height?: number,
): Promise<string> {
  const config = IMAGE_CONFIG[slot];

  const hasDimensions =
    typeof width === "number" &&
    width > 0 &&
    typeof height === "number" &&
    height > 0;

  if (hasDimensions) {
    const largestSide = Math.max(width, height);

    // Already small enough: do nothing.
    if (largestSide <= config.maxDimension) {
      return uri;
    }
  }

  let resize:
    | { width: number }
    | { height: number };

  if (hasDimensions && height > width) {
    resize = {
      height: config.maxDimension,
    };
  } else {
    resize = {
      width: config.maxDimension,
    };
  }

  const result =
    await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize,
        },
      ],
      {
        compress: config.quality,
        format:
          ImageManipulator.SaveFormat.JPEG,
      },
    );

  return result.uri;
}