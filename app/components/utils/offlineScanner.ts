// utils/offlineScanner.ts
import TextRecognition from "@react-native-ml-kit/text-recognition";
import BarcodeScanning from "@react-native-ml-kit/barcode-scanning";

export type OfflineScanMode =
  | "auto"
  | "generalText"
  | "numbersOnly"
  | "carPlate"
  | "receiptTotal"
  | "barcodeOnly";

export type OfflineScanResult = {
  mode: OfflineScanMode;
  text: string;
  rawText: string;
  numbers: string[];
  plates: string[];
  totals: string[];
  barcodes: string[];
};

type ProcessOptions = {
  mode?: OfflineScanMode;
  minOdometerDigits?: number;
  maxOdometerDigits?: number;
};

const DEFAULT_OPTIONS: Required<ProcessOptions> = {
  mode: "auto",
  minOdometerDigits: 4,
  maxOdometerDigits: 7,
};

export async function processOfflineScanFromImage(
  imageUri: string,
  options?: ProcessOptions
): Promise<string> {
  const result = await processOfflineScanDetailed(imageUri, options);
  return result.text;
}

export async function processOfflineScanDetailed(
  imageUri: string,
  options?: ProcessOptions
): Promise<OfflineScanResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!imageUri?.trim()) {
    throw new Error("Image URI is required for offline scanning.");
  }

  const [ocrResult, barcodeResult] = await Promise.allSettled([
    TextRecognition.recognize(imageUri),
    BarcodeScanning.scan(imageUri),
  ]);

  const rawText =
    ocrResult.status === "fulfilled"
      ? normalizeOcrText(ocrResult.value?.text || "")
      : "";

  const barcodes =
    barcodeResult.status === "fulfilled"
      ? dedupeStrings(
          (barcodeResult.value || [])
            .map((item: any) => String(item?.value || "").trim())
            .filter(Boolean)
        )
      : [];

  const numbers = rawText
    ? extractOdometerCandidates(
        rawText,
        config.minOdometerDigits,
        config.maxOdometerDigits
      )
    : [];

  const totals = rawText ? extractReceiptTotals(rawText) : [];
  const plates = rawText ? extractCarPlateCandidates(rawText) : [];

  const finalText = buildOutputText({
    mode: config.mode,
    rawText,
    numbers,
    totals,
    plates,
    barcodes,
  });

  return {
    mode: config.mode,
    text: finalText,
    rawText,
    numbers,
    plates,
    totals,
    barcodes,
  };
}

function buildOutputText(params: {
  mode: OfflineScanMode;
  rawText: string;
  numbers: string[];
  totals: string[];
  plates: string[];
  barcodes: string[];
}): string {
  const { mode, rawText, numbers, totals, plates, barcodes } = params;

  if (mode === "barcodeOnly") {
    return barcodes.join("\n").trim();
  }

  if (mode === "generalText") {
    return rawText;
  }

  if (mode === "numbersOnly") {
    return numbers.join("\n").trim();
  }

  if (mode === "carPlate") {
    return plates.join("\n").trim();
  }

  if (mode === "receiptTotal") {
    return totals.map((t) => `Total: ${t}`).join("\n").trim();
  }

  const parts: string[] = [];

  if (barcodes.length > 0) {
    parts.push(...barcodes.map((b) => `Code: ${b}`));
  }

  if (plates.length > 0) {
    parts.push(...plates.map((p) => `Plate: ${p}`));
  }

  if (numbers.length > 0) {
    parts.push(...numbers.map((n) => `Odometer: ${n}`));
  }

  if (totals.length > 0) {
    parts.push(...totals.map((t) => `Total: ${t}`));
  }

  if (parts.length > 0) {
    return dedupeStrings(parts).join("\n").trim();
  }

  return rawText;
}

export function normalizeOcrText(input: string): string {
  if (!input) return "";

  return input
    .replace(/[٠-٩]/g, (char) => String("٠١٢٣٤٥٦٧٨٩".indexOf(char)))
    .replace(/[۰-۹]/g, (char) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(char)))
    .replace(/[٫]/g, ".")
    .replace(/[،]/g, ",")
    .replace(/[‐-–—]/g, "-")
    .replace(/[|]/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractOdometerCandidates(
  rawText: string,
  minDigits = 4,
  maxDigits = 7
): string[] {
  const text = normalizeOcrText(rawText);

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const strongMatches = new Set<string>();
  const genericMatches = new Set<string>();

  const rangePattern = new RegExp(`\\b\\d{${minDigits},${maxDigits}}\\b`, "g");
  const strongHintPattern =
    /\b(odo|odometer|mileage|km|kms|kilometer|kilometers|kilometre|kilometres)\b/i;

  for (const line of lines) {
    const matches = line.match(rangePattern) || [];

    if (strongHintPattern.test(line)) {
      matches.forEach((m) => strongMatches.add(m));
    } else {
      matches.forEach((m) => genericMatches.add(m));
    }
  }

  return dedupeStrings([...strongMatches, ...genericMatches]);
}

export function extractReceiptTotals(rawText: string): string[] {
  const text = normalizeOcrText(rawText);

  const patterns = [
    /total\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
    /grand\s*total\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
    /amount\s*due\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
    /net\s*total\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
    /المجموع\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
    /الاجمالي\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
    /الإجمالي\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/gi,
  ];

  const totals = new Set<string>();

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) totals.add(match[1]);
    }
  }

  return [...totals];
}

export function extractCarPlateCandidates(rawText: string): string[] {
  const text = normalizeOcrText(rawText).toUpperCase();
  const candidates = new Set<string>();

  const patterns = [
    /\b[A-Z]{1,3}\s?\d{2,4}\b/g,
    /\b\d{2,4}\s?[A-Z]{1,3}\b/g,
    /\b[A-Z0-9]{5,8}\b/g,
    /\b[ء-ي]{1,4}\s?\d{1,4}\b/g,
    /\b\d{1,4}\s?[ء-ي]{1,4}\b/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      const cleaned = match.replace(/\s+/g, " ").trim();
      if (isLikelyPlate(cleaned)) candidates.add(cleaned);
    }
  }

  return [...candidates];
}

function isLikelyPlate(value: string): boolean {
  if (!value) return false;

  const compact = value.replace(/\s+/g, "");
  if (compact.length < 5 || compact.length > 8) return false;
  if (/^\d+$/.test(compact)) return false;

  const hasLetter = /[A-Zء-ي]/i.test(compact);
  const hasDigit = /\d/.test(compact);

  return hasLetter && hasDigit;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }

  return out;
}