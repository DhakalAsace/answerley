export interface CheckoutInput {
  organizationId: string;
  planKey: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  readonly id: string;
  createCheckout(input: CheckoutInput): Promise<{ checkoutUrl: string; sessionId: string }>;
  createPortal(organizationId: string, returnUrl: string): Promise<{ portalUrl: string }>;
  syncSubscription(providerSubscriptionId: string): Promise<void>;
}
