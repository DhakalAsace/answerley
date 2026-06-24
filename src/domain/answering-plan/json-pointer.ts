const decodeSegment = (segment: string) =>
  segment.replace(/~1/g, "/").replace(/~0/g, "~");

export function getByJsonPointer<T = unknown>(value: unknown, pointer: string): T | undefined {
  if (pointer === "" || pointer === "/") return value as T;
  const segments = pointer
    .replace(/^\//, "")
    .split("/")
    .map(decodeSegment);

  let cursor: unknown = value;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) return undefined;
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      cursor = cursor[index];
      continue;
    }
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor as T | undefined;
}

export function isMeaningfullyEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}
