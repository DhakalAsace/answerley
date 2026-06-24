export interface ProvisionNumberInput {
  businessId: string;
  country: string;
  areaCode?: string;
  capabilities: Array<"voice" | "sms">;
}

export interface ProvisionedNumber {
  providerNumberId: string;
  e164: string;
  displayNumber: string;
}

export interface NumberProvider {
  readonly id: string;
  search(input: ProvisionNumberInput): Promise<ProvisionedNumber[]>;
  provision(input: ProvisionNumberInput & { providerNumberId: string }): Promise<ProvisionedNumber>;
  release(providerNumberId: string): Promise<void>;
  verifyForwarding(number: string, destinationNumber: string): Promise<{ active: boolean; detail?: string }>;
}
