export interface MessageSendInput {
  businessId: string;
  messageId: string;
  channel: "sms" | "email";
  recipient: string;
  body: string;
  idempotencyKey: string;
}

export interface MessageSendResult {
  providerMessageId: string;
  status: "queued" | "sent" | "delivered" | "failed";
  errorMessage?: string;
}

export interface MessagingProvider {
  readonly id: string;
  send(input: MessageSendInput): Promise<MessageSendResult>;
  getStatus(providerMessageId: string): Promise<MessageSendResult>;
}
