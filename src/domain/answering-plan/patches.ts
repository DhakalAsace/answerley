import { applyPatch, validate, type Operation } from "fast-json-patch";
import { z } from "zod";
import {
  AnsweringPlanDocumentSchema,
  type AnsweringPlanEnvelope,
  type FieldMetadataMap,
} from "./schema";
import { assertPlanIntegrity } from "./integrity";

export const PlanPatchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), path: z.string().startsWith("/"), value: z.unknown() }),
  z.object({ op: z.literal("replace"), path: z.string().startsWith("/"), value: z.unknown() }),
  z.object({ op: z.literal("remove"), path: z.string().startsWith("/") }),
  z.object({ op: z.literal("copy"), from: z.string().startsWith("/"), path: z.string().startsWith("/") }),
  z.object({ op: z.literal("move"), from: z.string().startsWith("/"), path: z.string().startsWith("/") }),
  z.object({ op: z.literal("test"), path: z.string().startsWith("/"), value: z.unknown() }),
]);

export const PlanChangeProposalSchema = z.object({
  id: z.string().min(1),
  baseRevision: z.number().int().positive(),
  source: z.enum(["manual_ui", "plan_assistant", "website_builder", "system", "integration"]),
  summary: z.string().min(1),
  userInstruction: z.string().nullable().default(null),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresConfirmation: z.boolean(),
  operations: z.array(PlanPatchOperationSchema).min(1),
  affectedPaths: z.array(z.string()).default([]),
  conflicts: z.array(
    z.object({
      path: z.string(),
      currentValue: z.unknown(),
      proposedValue: z.unknown(),
      explanation: z.string(),
    }),
  ).default([]),
  clarification: z
    .object({
      question: z.string(),
      choices: z.array(z.string()).default([]),
    })
    .nullable()
    .default(null),
});

export type PlanPatchOperation = z.infer<typeof PlanPatchOperationSchema>;
export type PlanChangeProposal = z.infer<typeof PlanChangeProposalSchema>;

export interface AppliedPlanChange {
  plan: AnsweringPlanEnvelope;
  proposal: PlanChangeProposal;
  previousRevision: number;
  nextRevision: number;
  changedPaths: string[];
}

export class PlanRevisionConflictError extends Error {
  constructor(public readonly expected: number, public readonly actual: number) {
    super(`Plan revision conflict: expected ${expected}, received ${actual}.`);
  }
}

export class InvalidPlanPatchError extends Error {}

export function applyPlanChange(
  plan: AnsweringPlanEnvelope,
  proposalInput: PlanChangeProposal,
  now = new Date(),
): AppliedPlanChange {
  const proposal = PlanChangeProposalSchema.parse(proposalInput);
  if (proposal.baseRevision !== plan.revision) {
    throw new PlanRevisionConflictError(proposal.baseRevision, plan.revision);
  }
  if (proposal.clarification) {
    throw new InvalidPlanPatchError("A proposal that still requires clarification cannot be applied.");
  }
  if (proposal.conflicts.length > 0 && proposal.riskLevel === "high") {
    throw new InvalidPlanPatchError("High-risk conflicts must be resolved before applying the proposal.");
  }

  assertPatchGuardrails(proposal);
  const operations = proposal.operations as Operation[];
  const patchError = validate(operations, plan.document);
  if (patchError) {
    throw new InvalidPlanPatchError(patchError.message);
  }

  const nextDocument = structuredClone(plan.document);
  const result = applyPatch(nextDocument, operations, true, false);
  const validatedDocument = AnsweringPlanDocumentSchema.parse(result.newDocument);
  assertPlanIntegrity(validatedDocument);
  const changedPaths = Array.from(
    new Set(
      proposal.operations.flatMap((operation) =>
        "from" in operation ? [operation.path, operation.from] : [operation.path],
      ),
    ),
  );

  const nextMetadata = updateFieldMetadata(
    structuredClone(plan.fieldMetadata),
    changedPaths,
    proposal.source,
    now,
  );

  const nextRevision = plan.revision + 1;
  return {
    plan: {
      ...plan,
      revision: nextRevision,
      document: validatedDocument,
      fieldMetadata: nextMetadata,
      updatedAt: now.toISOString(),
    },
    proposal,
    previousRevision: plan.revision,
    nextRevision,
    changedPaths,
  };
}

function updateFieldMetadata(
  metadata: FieldMetadataMap,
  paths: string[],
  source: PlanChangeProposal["source"],
  now: Date,
): FieldMetadataMap {
  const sourceType =
    source === "website_builder"
      ? "website"
      : source === "plan_assistant"
        ? "assistant"
        : source === "manual_ui"
          ? "user"
          : source === "integration"
            ? "integration"
            : "system";

  for (const path of paths) {
    metadata[path] = {
      sourceType,
      sources: metadata[path]?.sources ?? [],
      confidence: source === "manual_ui" ? 1 : metadata[path]?.confidence ?? null,
      confirmedByUser: source === "manual_ui" || source === "plan_assistant",
      confirmedAt:
        source === "manual_ui" || source === "plan_assistant"
          ? now.toISOString()
          : metadata[path]?.confirmedAt ?? null,
      lastChangedBy: source,
      lastChangedAt: now.toISOString(),
      conflicts: [],
      note: metadata[path]?.note ?? null,
    };
  }
  return metadata;
}


const protectedTopLevelPaths = new Set([
  "/schemaVersion",
  "/businessProfile",
  "/temporaryUpdates",
  "/offerings",
  "/hoursAvailability",
  "/locationsCoverage",
  "/knowledgeItems",
  "/requestTypes",
  "/intakeFields",
  "/booking",
  "/scenarios",
  "/routing",
  "/followUps",
  "/unknownHandling",
  "/spamScreening",
  "/greetingVoice",
  "/links",
  "/globalRules",
]);

function topLevelPath(path: string) {
  const segment = path.split("/").filter(Boolean)[0];
  return segment ? `/${segment}` : "/";
}

function assertPatchGuardrails(proposal: PlanChangeProposal) {
  if (proposal.operations.length > 40) {
    throw new InvalidPlanPatchError("A single plan change may not contain more than 40 operations.");
  }
  for (const operation of proposal.operations) {
    if (operation.path === "/" || operation.path === "") {
      throw new InvalidPlanPatchError("Replacing or removing the entire Answering Plan is not allowed.");
    }
    if (operation.op === "remove" && protectedTopLevelPaths.has(operation.path)) {
      throw new InvalidPlanPatchError(`Required top-level section ${operation.path} cannot be removed.`);
    }
    if ("from" in operation && topLevelPath(operation.from) !== topLevelPath(operation.path)) {
      throw new InvalidPlanPatchError("Move/copy operations cannot cross Answering Plan sections.");
    }
  }
}

export function createManualChange(params: {
  plan: AnsweringPlanEnvelope;
  summary: string;
  operations: PlanPatchOperation[];
  riskLevel?: "low" | "medium" | "high";
}): PlanChangeProposal {
  return {
    id: `manual_${Date.now()}`,
    baseRevision: params.plan.revision,
    source: "manual_ui",
    summary: params.summary,
    userInstruction: null,
    riskLevel: params.riskLevel ?? "low",
    requiresConfirmation: (params.riskLevel ?? "low") !== "low",
    operations: params.operations,
    affectedPaths: params.operations.map((operation) => operation.path),
    conflicts: [],
    clarification: null,
  };
}
