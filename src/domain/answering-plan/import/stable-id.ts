const fallbackId = "item";

export function slugifyIdPart(value: string | null | undefined) {
  const slug = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  return slug || fallbackId;
}

export function stableId(prefix: string, value: string | null | undefined, fallbackIndex = 1) {
  const base = slugifyIdPart(value) || `${fallbackId}_${fallbackIndex}`;
  return `${prefix}_${base}`;
}

export function uniqueStableId(
  prefix: string,
  value: string | null | undefined,
  used: Set<string>,
  fallbackIndex = 1,
) {
  const first = stableId(prefix, value, fallbackIndex);
  if (!used.has(first)) {
    used.add(first);
    return first;
  }

  let suffix = 2;
  while (used.has(`${first}_${suffix}`)) suffix += 1;
  const next = `${first}_${suffix}`;
  used.add(next);
  return next;
}
