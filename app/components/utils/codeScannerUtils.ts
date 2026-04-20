// codeScannerUtils.ts

export function normalizeCode(raw: string | null | undefined): string {
  return (raw || "").trim();
}

export function isUsableCode(raw: string | null | undefined): boolean {
  return normalizeCode(raw).length > 0;
}

export function createCodeDeduper(cooldownMs = 1800) {
  let lastValue = "";
  let lastAt = 0;

  return (value: string) => {
    const next = normalizeCode(value);
    const now = Date.now();

    if (!next) return false;

    if (next === lastValue && now - lastAt < cooldownMs) {
      return false;
    }

    lastValue = next;
    lastAt = now;
    return true;
  };
}