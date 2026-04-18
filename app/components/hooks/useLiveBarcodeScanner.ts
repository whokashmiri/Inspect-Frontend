import { useMemo, useRef } from "react";
import { useCodeScanner, Code } from "react-native-vision-camera";
import { ExtractedScanResult } from "../utils/scanTypes";

type Params = {
  enabled: boolean;
  onDetected: (results: ExtractedScanResult[]) => void;
};

function mapCodeToType(code: Code): "qr" | "barcode" {
  return code.type === "qr" ? "qr" : "barcode";
}

export function useLiveBarcodeScanner({ enabled, onDetected }: Params) {
  const lastValueRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);

  const codeScanner = useCodeScanner({
    codeTypes: [
      "qr",
      "ean-13",
      "ean-8",
      "code-128",
      "code-39",
      "upc-a",
      "upc-e",
      "pdf-417",
    ],
    onCodeScanned: (codes) => {
      if (!enabled || !codes.length) return;

      const now = Date.now();
      const firstValid = codes.find((c) => !!c.value);
      if (!firstValid?.value) return;

      const sameAsPrevious = lastValueRef.current === firstValid.value;
      const tooSoon = now - lastTimeRef.current < 1500;

      if (sameAsPrevious && tooSoon) return;

      lastValueRef.current = firstValid.value;
      lastTimeRef.current = now;

      onDetected([
        {
          type: mapCodeToType(firstValid),
          value: firstValid.value,
          rawText: firstValid.value,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
  });

  return useMemo(() => (enabled ? codeScanner : undefined), [enabled, codeScanner]);
}