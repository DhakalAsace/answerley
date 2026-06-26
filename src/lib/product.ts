export const product = {
  name: "Small Business Answering",
  setupName: "answering setup",
  statusDraft: "Draft - not live yet",
  statusTesting: "Testing - real callers will not hear this yet",
  promise:
    "We answer your business calls when you cannot, capture what matters, and send you the details before anything goes live.",
  shortPromise:
    "Answer missed, overflow, and after-hours calls only after you approve the setup.",
} as const;

export const focusedSetupSections = [
  {
    id: "businessProfile",
    title: "Business details",
    description: "Name, website, public contact details, address, timezone, and service area.",
  },
  {
    id: "offerings",
    title: "Services & answers",
    description: "Services callers can ask about, approved answers, and safe pricing wording.",
  },
  {
    id: "hoursAvailability",
    title: "Hours & after-hours",
    description: "Open hours, temporary updates, and what callers hear after hours.",
  },
  {
    id: "booking",
    title: "Appointment handling",
    description: "Capture requests, send a booking link, or use a connected calendar.",
  },
  {
    id: "scenarios",
    title: "Call handling",
    description: "When calls are answered, what gets collected, and what happens next.",
  },
  {
    id: "greetingVoice",
    title: "Greeting & voice",
    description: "Caller-facing greeting, tone, language, and recording disclosure wording.",
  },
  {
    id: "routing",
    title: "Owner alerts",
    description: "Owner, office, on-call, and backup contacts for messages and urgent calls.",
  },
  {
    id: "unknownHandling",
    title: "Safety & unknown questions",
    description: "Approved-answer-only behavior and what happens when the setup does not know.",
  },
  {
    id: "links",
    title: "Sources",
    description: "Website, owner edits, booking/contact links, and fields needing review.",
  },
] as const;
