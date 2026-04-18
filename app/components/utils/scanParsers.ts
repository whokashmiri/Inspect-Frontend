import { ExtractedScanResult } from "./scanTypes";

export function normalizeText(input: string) {
  return input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function extract4To7DigitNumbers(rawText: string): string[] {
  const text = normalizeText(rawText);
  const matches = text.match(/\b\d{4,7}\b/g);
  return matches ? [...new Set(matches)] : [];
}

export function extractReceiptTotals(rawText: string): string[] {
  const text = normalizeText(rawText);
  const patterns = [
    /total\s*[:\-]?\s*(\d+(?:\.\d+)?)/gi,
    /amount\s*due\s*[:\-]?\s*(\d+(?:\.\d+)?)/gi,
    /grand\s*total\s*[:\-]?\s*(\d+(?:\.\d+)?)/gi,
    /المجموع\s*[:\-]?\s*(\d+(?:\.\d+)?)/gi,
    /الاجمالي\s*[:\-]?\s*(\d+(?:\.\d+)?)/gi,
  ];

  const values = new Set<string>();

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) values.add(match[1]);
    }
  }

  return [...values];
}

export function extractCarPlates(rawText: string): string[] {
  const text = normalizeText(rawText).toUpperCase();

  const patterns = [
    /\b[A-Z0-9]{5,8}\b/g,
    /\b\d{1,4}\s?[A-Z]{1,3}\s?\d{1,4}\b/g,
    /\b[A-Z]{2,3}\s?\d{3,4}\b/g,
    /\b\d{3,4}\s?[A-Z]{2,3}\b/g,
    // basic Arabic support
    /\b[ء-ي]{1,4}\s?\d{1,4}\b/g,
    /\b\d{1,4}\s?[ء-ي]{1,4}\b/g,
  ];

  const values = new Set<string>();

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    matches?.forEach((m) => values.add(m.trim()));
  }

  return [...values];
}

export function buildResultsFromRawText(
  rawText: string,
  imageUri?: string | null
): ExtractedScanResult[] {
  const text = normalizeText(rawText);
  const results: ExtractedScanResult[] = [];

  if (text) {
    results.push({
      type: "text",
      value: text,
      rawText: text,
      imageUri: imageUri ?? null,
    });
  }

  const odometerValues = extract4To7DigitNumbers(text);
  odometerValues.forEach((value) => {
    results.push({
      type: "odometer",
      value,
      rawText: text,
      imageUri: imageUri ?? null,
    });
  });

  const plateValues = extractCarPlates(text);
  plateValues.forEach((value) => {
    results.push({
      type: "plate",
      value,
      rawText: text,
      imageUri: imageUri ?? null,
    });
  });

  const totals = extractReceiptTotals(text);
  totals.forEach((value) => {
    results.push({
      type: "text",
      value: `Total: ${value}`,
      rawText: text,
      imageUri: imageUri ?? null,
    });
  });

  return dedupeResults(results);
}

export function dedupeResults(results: ExtractedScanResult[]) {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.type}::${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}