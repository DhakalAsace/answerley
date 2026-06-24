export interface AvailabilityQuery {
  businessId: string;
  integrationConnectionId: string;
  offeringId?: string | null;
  locationId?: string | null;
  startsAfter: string;
  endsBefore: string;
}

export interface BookingProvider {
  readonly id: string;
  listAvailability(query: AvailabilityQuery): Promise<Array<{ startsAt: string; endsAt: string; externalResourceId?: string }>>;
  createBooking(input: AvailabilityQuery & { startsAt: string; caller: Record<string, unknown>; idempotencyKey: string }): Promise<{ externalBookingId: string; status: "confirmed" | "pending" }>;
}
