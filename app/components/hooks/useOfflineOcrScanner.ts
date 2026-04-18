import { useState } from "react";
// Example package:
// import TextRecognition from "@jd/react-native-text-recognition";
import { buildResultsFromRawText, dedupeResults } from "../utils/scanParsers";
import { ExtractedScanResult, ScanToggles } from "../utils/scanTypes";

type Params = {
  toggles: ScanToggles;
};

// Replace this with your real OCR package call.
async function recognizeTextFromImage(uri: string): Promise<string> {
  // Example:
  // const blocks = await TextRecognition.recognize(uri);
  // return Array.isArray(blocks) ? blocks.join("\n") : "";

  return "";
}

export function useOfflineOcrScanner({ toggles }: Params) {
  const [isProcessing, setIsProcessing] = useState(false);

  async function processCapturedImage(imageUri: string): Promise<ExtractedScanResult[]> {
    setIsProcessing(true);

    try {
      const rawText = await recognizeTextFromImage(imageUri);
      if (!rawText?.trim()) {
        return [];
      }

      const allResults = buildResultsFromRawText(rawText, imageUri);

      const filtered = allResults.filter((item) => {
        if (item.type === "text") {
          return toggles.generalText;
        }
        if (item.type === "odometer") {
          return toggles.numbersOnly;
        }
        if (item.type === "plate") {
          return toggles.carPlate;
        }
        return false;
      });

      return dedupeResults(filtered);
    } finally {
      setIsProcessing(false);
    }
  }

  return {
    isProcessing,
    processCapturedImage,
  };
}