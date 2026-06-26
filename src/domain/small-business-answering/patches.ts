import { applyPatch, validate, type Operation } from "fast-json-patch";
import { z } from "zod";
import { AnsweringSetupSchema, type AnsweringSetup } from "./schema";

export const SetupPatchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), path: z.string().startsWith("/"), value: z.unknown() }),
  z.object({ op: z.literal("replace"), path: z.string().startsWith("/"), value: z.unknown() }),
  z.object({ op: z.literal("remove"), path: z.string().startsWith("/") }),
  z.object({ op: z.literal("copy"), from: z.string().startsWith("/"), path: z.string().startsWith("/") }),
  z.object({ op: z.literal("move"), from: z.string().startsWith("/"), path: z.string().startsWith("/") }),
  z.object({ op: z.literal("test"), path: z.string().startsWith("/"), value: z.unknown() }),
]);

export const SetupChangeProposalSchema = z.object({
  id: z.string().min(1),
  baseRevision: z.number().int().positive(),
  source: z.enum(["manual_ui", "setup_assistant", "website_builder", "system", "integration"]),
  summary: z.string().min(1),
  userInstruction: z.string().nullable().default(null),
  riskLevel: z.enum(["low", "medium", "high"]),
  requiresConfirmation: z.boolean(),
  operations: z.array(SetupPatchOperationSchema).min(1),
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

export type SetupPatchOperation = z.infer<typeof SetupPatchOperationSchema>;
export type SetupChangeProposal = z.infer<typeof SetupChangeProposalSchema>;

export interface AppliedSetupChange {
  setup: AnsweringSetup;
  proposal: SetupChangeProposal;
  previousRevision: number;
  nextRevision: number;
  changedPaths: string[];
}

export class SetupRevisionConflictError extends Error {
  constructor(public readonly expected: number, public readonly actual: number) {
    super(`Setup revision conflict: expected ${expected}, received ${actual}.`);
  }
}

export class InvalidSetupPatchError extends Error {}

const protectedTopLevelPaths = new Set([
  "/schemaVersion",
  "/setupId",
  "/businessId",
  "/brand",
  "/status",
  "/business",
  "/services",
  "/approvedAnswers",
  "/hours",
  "/callHandling",
  "/requestCapture",
  "/appointmentHandling",
  "/urgentRouting",
  "/ownerAlerts",
  "/callerConfirmations",
  "/spamScreening",
  "/privacy",
  "/sources",
  "/activationGates",
]);

function topLevelPath(path: string) {
  const segment = path.split("/").filter(Boolean)[0];
  return segment ? `/${segment}` : "/";
}

function assertPatchGuardrails(proposal: SetupChangeProposal) {
  if (proposal.operations.length > 40) {
    throw new InvalidSetupPatchError("A single setup change may not contain more than 40 operations.");
  }
  for (const operation of proposal.operations) {
    if (operation.path === "/" || operation.path === "") {
      throw new InvalidSetupPatchError("Replacing or removing the entire Answering Setup is not allowed.");
    }
    if (operation.op === "remove" && protectedTopLevelPaths.has(operation.path)) {
      throw new InvalidSetupPatchError(`Required top-level setup section ${operation.path} cannot be removed.`);
    }
    if ("from" in operation && topLevelPath(operation.from) !== topLevelPath(operation.path)) {
      throw new InvalidSetupPatchError("Move/copy operations cannot cross Answering Setup sections.");
    }
  }
}

export function applySetupChange(
  setup: AnsweringSetup,
  proposalInput: SetupChangeProposal,
): AppliedSetupChange {
  const proposal = SetupChangeProposalSchema.parse(proposalInput);
  if (proposal.baseRevision !== setup.status.draftRevision) {
    throw new SetupRevisionConflictError(proposal.baseRevision, setup.status.draftRevision);
  }
  if (proposal.clarification) {
    throw new InvalidSetupPatchError("A proposal that still requires clarification cannot be applied.");
  }
  if (proposal.conflicts.length > 0 && proposal.riskLevel === "high") {
    throw new InvalidSetupPatchError("High-risk conflicts must be resolved before applying the proposal.");
  }
  assertPatchGuardrails(proposal);
  const operations = proposal.operations as Operation[];
  const patchError = validate(operations, setup);
  if (patchError) throw new InvalidSetupPatchError(patchError.message);
  const nextSetup = structuredClone(setup);
  const result = applyPatch(nextSetup, operations, true, false);
  const validatedSetup = AnsweringSetupSchema.parse(result.newDocument);
  validatedSetup.status.draftRevision = setup.status.draftRevision + 1;
  validatedSetup.status.needsReview = true;
  const changedPaths = Array.from(new Set(proposal.operations.flatMap((operation) => "from" in operation ? [operation.path, operation.from] : [operation.path])));
  return {
    setup: validatedSetup,
    proposal,
    previousRevision: setup.status.draftRevision,
    nextRevision: validatedSetup.status.draftRevision,
    changedPaths,
  };
}
