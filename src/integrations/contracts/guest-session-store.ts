import type { AnsweringPlanEnvelope } from "@/domain/answering-plan/schema";

export interface GuestSessionState {
  id: string;
  plan: AnsweringPlanEnvelope | null;
  sourceDocuments: unknown[];
  testActivity: Record<string, unknown>;
  expiresAt: string;
}

export interface GuestSessionStore {
  create(submittedBusiness: string): Promise<{ session: GuestSessionState; claimToken: string }>;
  read(id: string, claimToken: string): Promise<GuestSessionState>;
  update(id: string, claimToken: string, state: Partial<GuestSessionState>): Promise<GuestSessionState>;
  claim(id: string, claimToken: string, authenticatedUserId: string): Promise<{ businessId: string; answeringPlanId: string }>;
}
