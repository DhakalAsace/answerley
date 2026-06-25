import { z } from "zod";

export interface GeminiSchemaCompatibilityOptions {
  maxBytes: number;
  maxDepth: number;
  maxUnionBranches: number;
  maxProperties: number;
  forbiddenKeywords: string[];
}

export const defaultGeminiSchemaCompatibilityOptions: GeminiSchemaCompatibilityOptions = {
  maxBytes: 20_000,
  maxDepth: 8,
  maxUnionBranches: 8,
  maxProperties: 80,
  forbiddenKeywords: [
    "$schema",
    "default",
    "const",
    "pattern",
    "propertyNames",
    "minLength",
    "maxLength",
  ],
};

export class GeminiSchemaCompatibilityError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Gemini schema compatibility failed: ${issues.join("; ")}`);
  }
}

export function toGeminiJsonSchema(schema: z.ZodType) {
  return sanitizeGeminiSchema(z.toJSONSchema(schema));
}

export function assertGeminiSchemaCompatible(
  schema: unknown,
  options: GeminiSchemaCompatibilityOptions = defaultGeminiSchemaCompatibilityOptions,
) {
  const issues: string[] = [];
  const serialized = JSON.stringify(schema);
  if (serialized.length > options.maxBytes) {
    issues.push(`schema is ${serialized.length} bytes, above ${options.maxBytes}`);
  }

  const stats = collectSchemaStats(schema, options);
  if (stats.maxDepth > options.maxDepth) {
    issues.push(`schema depth is ${stats.maxDepth}, above ${options.maxDepth}`);
  }
  if (stats.maxUnionBranches > options.maxUnionBranches) {
    issues.push(`largest union has ${stats.maxUnionBranches} branches, above ${options.maxUnionBranches}`);
  }
  if (stats.maxProperties > options.maxProperties) {
    issues.push(`largest object has ${stats.maxProperties} properties, above ${options.maxProperties}`);
  }
  for (const keyword of Object.keys(stats.forbiddenKeywordCounts)) {
    issues.push(`forbidden keyword "${keyword}" appears ${stats.forbiddenKeywordCounts[keyword]} time(s)`);
  }
  if (stats.emptySchemaCount > 0) {
    issues.push(`${stats.emptySchemaCount} empty schema object(s) found`);
  }

  if (issues.length) throw new GeminiSchemaCompatibilityError(issues);
  return schema;
}

function sanitizeGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeGeminiSchema);
  if (!value || typeof value !== "object") return value;

  const input = value as Record<string, unknown>;
  if (Array.isArray(input.anyOf)) {
    const nullableTypes = input.anyOf
      .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).type : null));
    if (
      nullableTypes.length === input.anyOf.length &&
      nullableTypes.every((type) => typeof type === "string")
    ) {
      const rest = { ...input };
      delete rest.anyOf;
      return sanitizeGeminiSchema({
        ...rest,
        type: Array.from(new Set(nullableTypes)),
      });
    }
  }

  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (
      key === "$schema" ||
      key === "default" ||
      key === "pattern" ||
      key === "propertyNames" ||
      key === "minLength" ||
      key === "maxLength"
    ) {
      continue;
    }
    if (key === "const") {
      output.enum = [raw];
      continue;
    }
    output[key] = sanitizeGeminiSchema(raw);
  }
  return output;
}

function collectSchemaStats(
  schema: unknown,
  options: GeminiSchemaCompatibilityOptions,
) {
  const stats = {
    maxDepth: 0,
    maxUnionBranches: 0,
    maxProperties: 0,
    emptySchemaCount: 0,
    forbiddenKeywordCounts: {} as Record<string, number>,
  };

  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object") return;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }

    const object = value as Record<string, unknown>;
    const keys = Object.keys(object);
    if (keys.length === 0) stats.emptySchemaCount += 1;
    for (const key of keys) {
      if (options.forbiddenKeywords.includes(key)) {
        stats.forbiddenKeywordCounts[key] = (stats.forbiddenKeywordCounts[key] ?? 0) + 1;
      }
    }

    if (object.properties && typeof object.properties === "object" && !Array.isArray(object.properties)) {
      stats.maxProperties = Math.max(stats.maxProperties, Object.keys(object.properties).length);
    }
    for (const unionKey of ["anyOf", "oneOf", "allOf"]) {
      if (Array.isArray(object[unionKey])) {
        stats.maxUnionBranches = Math.max(stats.maxUnionBranches, object[unionKey].length);
      }
    }

    for (const child of Object.values(object)) visit(child, depth + 1);
  };

  visit(schema, 0);
  return stats;
}
