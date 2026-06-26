# Small Business Answering — Focused Product Spec

**Purpose:** define the full product for a niche **small business answering service** and remove everything that is enterprise noise, AI-platform noise, CRM-suite noise, or generic automation noise.

**Brand:** Small Business Answering  
**Product category:** answering service for small businesses  
**Primary product object:** Answering Setup  
**Core promise:** enter a website or business name, build an answering setup, preview/test it, and only go live after approval.

---

## 1. Executive decision

Small Business Answering should not become a general AI receptionist platform, a CRM, a workflow builder, a call center suite, or an enterprise communications product.

The focused product should be:

> **A small business answering service that answers missed, overflow, and after-hours calls; captures caller details; handles appointment requests safely; routes urgent calls; filters spam; sends owner alerts; and lets the owner review/test everything before going live.**

That is the product small business owners will understand and pay for.

The strongest product sentence is:

> **We answer your business calls when you cannot, capture the reason for the call, and send you the details — without changing anything until you approve.**

Do not lead with:

- AI agent
- autonomous receptionist
- workflow automation
- voice AI platform
- call intelligence suite
- revenue operating system
- omnichannel customer engagement

Those words attract builders, competitors, and AI-curious users. The paying buyer wants calls answered correctly.

---

## 2. Research summary: what real small-business users keep saying

This section uses non-promotional customer/operator conversations, mainly Reddit discussions where business owners, operators, tradespeople, and buyers describe the problem in their own words. These are not perfect market data, but they are useful because the language is raw and practical.

### 2.1 Missed calls are the core pain

A solo consulting business owner describes missed calls as one of the biggest pain points because calls arrive during meetings or focus time, and missed follow-up means lost leads. [Source 1]

**Product implication:** the product must start with missed-call and overflow answering, not calendar setup, CRM integration, or AI customization.

### 2.2 Business owners want professional handling, not a gadget

A local business owner looking for a real person to answer the phone says the customer base is older or blue collar and not tech-savvy. [Source 2]

**Product implication:** the caller experience must be plain, warm, and direct. No robotic self-introduction. No “AI agent” language in the greeting. No complex phone tree by default.

### 2.3 Overflow and after-hours rules matter more than full replacement

One small-business operator describes a system where office staff answer during the day, then calls transfer to an answering service after about 30 seconds; after-hours calls route based on routine service versus emergency/on-call needs. [Source 3]

**Product implication:** the product needs answer timing, overflow, after-hours, urgent-routing, and owner-first modes. It should not assume the AI answers every call immediately.

### 2.4 Cost predictability and spam filtering are valuable

A discussion about answering service pricing mentions base monthly fees with included minutes, overage rates, message delivery by text/email/app, the ability to answer all calls/after-hours/overflow calls, and spam screening that may not count toward usage. [Source 4]

**Product implication:** the product should show usage clearly, separate spam from billable calls where possible, and avoid surprise per-minute complexity in the UI.

### 2.5 Existing answering services often fail because they know too little

A business owner using an answering service reports high monthly costs, setup friction, misinformation from agents who do not know the business, no schedule setup, and the owner still needing to text/call leads later. [Source 5]

**Product implication:** the product must be built around approved business knowledge, source review, accurate intake, and follow-up. “Someone answered” is not enough.

### 2.6 Trades businesses need after-hours dispatch and escalation, but cost is sensitive

A plumbing shop operator needs after-hours answering, 24/7 dispatch, overflow during business hours, and ideally dispatch software familiarity, while also worrying the family business may not pay for an expensive service. [Source 6]

**Product implication:** after-hours and overflow must be first-class. Dispatch-style urgent routing matters. But the setup cannot feel like expensive enterprise implementation.

### 2.7 Human-quality concerns are real

A landscaping business owner asks specifically for a human and American answering the phone. A former answering-service worker warns that generic answering-service staff may not know the industry, may not care, and may have long queues. [Source 7]

**Product implication:** Small Business Answering must compete on **business-specific accuracy and low-friction ownership**, not on pretending to be human. The UI must show exactly what the system will say and what it will collect.

### 2.8 Emergency filtering is a paid feature, not a side feature

Plumbing operators describe after-hours calls as emergency-only, with higher rates, checklists, on-call discretion, and the ability to talk customers down to waiting when something is not truly urgent. [Source 8]

**Product implication:** the system needs urgency rules, emergency wording, escalation contacts, and “routine vs urgent” handling. This is not optional for home services.

### 2.9 Text-back helps, but after-hours needs actual answering

A plumber says auto text-back within about 30 seconds can recover many missed calls because people text even when they will not leave voicemail, but after-hours needs something that actually answers. [Source 9]

**Product implication:** caller SMS follow-up is useful, but it should support the answering service. It should not become a general SMS marketing product.

### 2.10 Customers appreciate clear availability

Home-improvement customers say they appreciate when contractors are upfront that they are fully booked or only taking referrals, instead of leaving people waiting. [Source 10]

**Product implication:** availability messages, temporary updates, and “not taking new work right now” are valuable, simple, and small-business-specific.

### 2.11 Privacy and call recording should be handled plainly

The Office of the Privacy Commissioner of Canada says recorded customer calls involve personal information and must be handled appropriately through collection, use, disclosure, retention, and disposal. [Source 11]

**Product implication:** the dashboard needs plain controls for call recording, retention, caller disclosure, and access. Do not hide this under “advanced compliance.”

---

## 3. What to remove from the previous canonical JSON

The old JSON is powerful, but it is too much like a generic configurable agent platform. For a small-business answering service, much of it should be hidden, simplified, or removed.

### 3.1 Remove or hide these as product surface area

| Existing concept | Decision | Why |
|---|---|---|
| `legalName` in answering setup | Remove from core setup; keep in billing only if needed | Callers usually need the business name, not legal entity data. |
| `businessType.description` and `businessType.aliases` | Remove | Useful for internal classification, not owner-facing setup. |
| `offerings.title` separate from `name` | Remove | Duplicate. Small business owners need one service name. |
| `offering.locationIds` and deep location mapping | Simplify | Most small businesses need “where we serve,” not per-location service matrices. |
| `requestTypes.statuses` as configurable | Hide/fix | Requested, contacted, booked, completed is enough. |
| Generic `actions` arrays inside scenarios | Simplify | Owners should see outcomes, not workflow primitives. |
| `scenarios.priority` | Hide | Important internally, confusing in UI. |
| `appliesWhen.customCondition` | Hide/remove | Too enterprise/workflow-builder-like. |
| `routing.teams` | Simplify to contacts | Small businesses usually need owner, office, on-call, backup. |
| Complex `routing.rules` engine | Replace with answer timing + urgent routing | Owners think in “when should you answer?” and “who gets urgent calls?” |
| Generic `followUps` engine | Replace with owner alerts + caller confirmations | Avoid becoming a marketing automation platform. |
| `booking.offeringOverrides` | Remove | Too much configuration. Use one appointment mode, optional per-service eligibility. |
| `greetingVoice.assistantName` as open branding | Hide/lock | Caller should hear the business, not a named bot. |
| Broad `globalRules.customInstructions` | Hide as internal support-only field | Prevent prompt-box product design. |
| Multi-team notification preferences | Simplify | Owner, office, on-call, backup. That is enough. |
| General links manager as a major nav item | Fold into setup | Keep booking/contact links, not a separate CMS. |
| Full enterprise data source management | Simplify to website + manual edits + optional uploaded info | Small businesses need trust, not data governance. |

### 3.2 Features to explicitly not build for this niche

These are distractions, even if technically impressive.

| Do not build | Why it is noise |
|---|---|
| Full CRM pipeline | The product is answering calls, not replacing HubSpot/Jobber/Housecall Pro. |
| Outbound sales campaigns | Risky compliance area and not the core buyer pain. |
| Review generation campaigns | Useful later maybe, but not answering-service core. |
| Social DMs / omnichannel inbox | Dilutes phone-answering positioning. |
| Enterprise call-center analytics | Small owners need “what happened?” not workforce dashboards. |
| Deep role-based permissions | Owner/admin/member is enough. |
| AI prompt playground | Owners do not want prompt engineering. |
| Arbitrary workflow builder | Becomes Zapier-for-calls; too abstract. |
| Inventory/order management | Not core answering service. |
| Medical/legal compliance vertical claims | Only if compliance is fully built and reviewed. |
| Human receptionist marketplace | Different business model. |
| Full phone system replacement | Support forwarding/routing; do not become RingCentral. |
| Native payments from callers | Not required for call answering; adds trust/compliance complexity. |
| Knowledge-base/document portal | Use website + approved answers + manual edits. |
| Complex multi-location enterprise setup | Small multi-location can be supported simply; enterprise matrices should be avoided. |

---

## 4. Focused product scope

### 4.1 The product to build

Build a complete, polished, focused product with these pillars:

1. **Website-built answering setup**  
   Pull business name, contact details, services, hours, service area, links, and FAQs from the website.

2. **Approved answer layer**  
   The system can answer only from approved or reviewed business information. Unknown answers become messages or improvement suggestions.

3. **Call handling modes**  
   Owner-first, overflow, after-hours, immediate answering, urgent-only, paused.

4. **Lead/message/request capture**  
   Collect caller name, phone, reason, service needed, address/location when relevant, urgency, preferred time, and email when useful.

5. **Appointment request handling**  
   Support three modes: capture request, send booking link, or calendar booking. Do not call something “booked” unless calendar/write confirmation exists.

6. **Urgent call routing**  
   Detect emergency language, collect the right details, notify owner/on-call, and optionally attempt transfer.

7. **Owner alerts and caller confirmations**  
   Send concise summaries by SMS/email. Send booking links or confirmation messages to callers when configured.

8. **Spam screening**  
   Screen likely robocalls/telemarketing and keep spam from polluting the call log and billing perception.

9. **Test before live**  
   Browser phone simulator, demo number, and optional sample call to owner.

10. **Activation gates**  
   Nothing live until business details, services, hours, greeting, owner alerts, phone routing, payment, and final test are complete.

### 4.2 The product should feel like this

- calm
- professional
- owner-controlled
- practical
- non-technical
- built for busy people
- transparent about what it knows
- safe when it does not know

### 4.3 The product should not feel like this

- AI lab
- enterprise admin console
- workflow automation builder
- CRM suite
- call center platform
- chatbot builder
- “replace your employees” pitch

---

## 5. Focused canonical JSON

This is the proposed full canonical object for the focused small-business product. It keeps the useful pieces and removes the generic platform noise.

```json
{
  "schemaVersion": "2.0.0-small-business-answering",
  "setupId": "setup_{{id}}",
  "businessId": "business_{{id}}",
  "brand": "Small Business Answering",
  "status": {
    "mode": "draft",
    "draftRevision": 1,
    "liveRevision": 0,
    "isLive": false,
    "isPaused": false,
    "lastPublishedAt": null,
    "lastTestedAt": null,
    "needsReview": true
  },
  "business": {
    "name": "{{business_name}}",
    "websiteUrl": "{{website_url}}",
    "publicPhone": "{{business_phone}}",
    "publicEmail": "{{business_email}}",
    "timezone": "{{timezone}}",
    "primaryLanguage": "en",
    "additionalLanguages": [],
    "pronunciation": "{{business_name_pronunciation}}",
    "address": {
      "line1": "{{address_line_1}}",
      "line2": null,
      "city": "{{city}}",
      "region": "{{region}}",
      "postalCode": "{{postal_code}}",
      "country": "{{country}}"
    },
    "serviceArea": {
      "summary": "{{caller_facing_service_area}}",
      "areas": [
        "{{area_1}}"
      ],
      "excludedAreas": []
    }
  },
  "sources": [
    {
      "id": "source_website_home",
      "type": "website",
      "label": "Website",
      "url": "{{website_url}}",
      "processedAt": "{{iso_datetime}}",
      "status": "processed"
    },
    {
      "id": "source_owner_edits",
      "type": "owner_edits",
      "label": "Owner-approved edits",
      "url": null,
      "processedAt": null,
      "status": "active"
    }
  ],
  "fieldSources": {
    "/business/name": {
      "sourceId": "source_website_home",
      "confidence": 0.99,
      "confirmedByOwner": false,
      "excerpt": "{{source_excerpt}}"
    },
    "/business/timezone": {
      "sourceId": "source_website_home",
      "confidence": 0.75,
      "confirmedByOwner": false,
      "excerpt": "Inferred from business location."
    }
  },
  "services": [
    {
      "id": "service_{{id}}",
      "enabled": true,
      "name": "{{service_name}}",
      "description": "{{service_description}}",
      "aliases": [
        "{{caller_phrase}}"
      ],
      "callerCanAskAbout": true,
      "callerCanRequest": true,
      "appointmentEligible": true,
      "requiredIntakeFieldIds": [
        "field_name",
        "field_phone",
        "field_reason",
        "field_preferred_time"
      ],
      "priceHandling": {
        "mode": "do_not_quote",
        "currency": "CAD",
        "amount": null,
        "minAmount": null,
        "maxAmount": null,
        "callerWording": "Pricing is confirmed by the team after they review the request."
      },
      "urgentKeywords": [],
      "ownerNotes": null
    }
  ],
  "hours": {
    "enabled": true,
    "timezone": "{{timezone}}",
    "weekly": [
      {
        "day": "monday",
        "open": true,
        "periods": [
          {
            "opensAt": "09:00",
            "closesAt": "17:00"
          }
        ]
      },
      {
        "day": "tuesday",
        "open": true,
        "periods": [
          {
            "opensAt": "09:00",
            "closesAt": "17:00"
          }
        ]
      },
      {
        "day": "wednesday",
        "open": true,
        "periods": [
          {
            "opensAt": "09:00",
            "closesAt": "17:00"
          }
        ]
      },
      {
        "day": "thursday",
        "open": true,
        "periods": [
          {
            "opensAt": "09:00",
            "closesAt": "17:00"
          }
        ]
      },
      {
        "day": "friday",
        "open": true,
        "periods": [
          {
            "opensAt": "09:00",
            "closesAt": "17:00"
          }
        ]
      },
      {
        "day": "saturday",
        "open": false,
        "periods": []
      },
      {
        "day": "sunday",
        "open": false,
        "periods": []
      }
    ],
    "specialDates": [],
    "temporaryUpdates": [
      {
        "id": "temp_update_{{id}}",
        "enabled": false,
        "title": "{{temporary_update_title}}",
        "message": "{{temporary_update_message}}",
        "mentionWhen": "when_relevant",
        "startsAt": null,
        "expiresAt": null,
        "removeAutomatically": true
      }
    ],
    "afterHours": {
      "enabled": true,
      "routineBehavior": "answer_and_take_message",
      "urgentBehavior": "answer_collect_and_escalate",
      "callerWording": "The team is unavailable right now, but I can take a message and send it to them. If this is urgent, please tell me what happened."
    }
  },
  "intakeFields": [
    {
      "id": "field_name",
      "enabled": true,
      "label": "Name",
      "key": "name",
      "type": "text",
      "required": true,
      "spokenPrompt": "May I have your name?",
      "confirmBack": false,
      "usedFor": [
        "message",
        "appointment_request",
        "urgent_request"
      ],
      "order": 1
    },
    {
      "id": "field_phone",
      "enabled": true,
      "label": "Phone number",
      "key": "phone",
      "type": "phone",
      "required": true,
      "spokenPrompt": "What is the best phone number to reach you?",
      "confirmBack": true,
      "usedFor": [
        "message",
        "appointment_request",
        "urgent_request"
      ],
      "order": 2
    },
    {
      "id": "field_email",
      "enabled": true,
      "label": "Email",
      "key": "email",
      "type": "email",
      "required": false,
      "spokenPrompt": "What email address should the team use?",
      "confirmBack": false,
      "usedFor": [
        "appointment_request"
      ],
      "order": 3
    },
    {
      "id": "field_service_needed",
      "enabled": true,
      "label": "Service needed",
      "key": "service_needed",
      "type": "text",
      "required": false,
      "spokenPrompt": "What service do you need help with?",
      "confirmBack": false,
      "usedFor": [
        "appointment_request",
        "urgent_request"
      ],
      "order": 4
    },
    {
      "id": "field_address_or_location",
      "enabled": true,
      "label": "Address or location",
      "key": "address_or_location",
      "type": "text",
      "required": false,
      "spokenPrompt": "What address or location is this for?",
      "confirmBack": true,
      "usedFor": [
        "appointment_request",
        "urgent_request"
      ],
      "order": 5
    },
    {
      "id": "field_preferred_time",
      "enabled": true,
      "label": "Preferred date or time",
      "key": "preferred_time",
      "type": "text",
      "required": false,
      "spokenPrompt": "What day or time works best for you?",
      "confirmBack": false,
      "usedFor": [
        "appointment_request"
      ],
      "order": 6
    },
    {
      "id": "field_reason",
      "enabled": true,
      "label": "Reason for calling",
      "key": "reason",
      "type": "multiline_text",
      "required": true,
      "spokenPrompt": "What would you like the team to know?",
      "confirmBack": false,
      "usedFor": [
        "message",
        "appointment_request",
        "urgent_request",
        "unknown_question"
      ],
      "order": 7
    },
    {
      "id": "field_urgency",
      "enabled": true,
      "label": "Urgency",
      "key": "urgency",
      "type": "single_select",
      "required": false,
      "spokenPrompt": "Is this urgent, or can the team follow up during business hours?",
      "confirmBack": false,
      "usedFor": [
        "urgent_request",
        "after_hours"
      ],
      "order": 8,
      "options": [
        "urgent",
        "routine",
        "not_sure"
      ]
    }
  ],
  "approvedAnswers": [
    {
      "id": "answer_{{id}}",
      "enabled": true,
      "type": "faq",
      "title": "{{answer_title}}",
      "callerQuestions": [
        "{{question_1}}"
      ],
      "answer": "{{approved_answer}}",
      "behavior": "answer_directly",
      "relatedServiceIds": [],
      "relatedLinkId": null,
      "sourceId": "source_website_home",
      "confirmedByOwner": false
    }
  ],
  "appointmentHandling": {
    "enabled": true,
    "mode": "capture_request",
    "bookingLink": {
      "enabled": false,
      "url": null,
      "sendBySms": true,
      "sendByEmail": false
    },
    "calendar": {
      "enabled": false,
      "provider": null,
      "connectionId": null,
      "calendarId": null,
      "canCreateEvents": false,
      "requiresOwnerConfirmation": true
    },
    "wording": {
      "requestOnly": "I can take your preferred time and send the request to the team.",
      "bookingLink": "I can send you the booking link and capture your preferred time for the team.",
      "calendarBooking": "I can check the calendar and help create an appointment request."
    },
    "unavailableBehavior": "collect_preferred_time",
    "defaultDurationMinutes": 60,
    "defaultFieldIds": [
      "field_name",
      "field_phone",
      "field_email",
      "field_service_needed",
      "field_preferred_time",
      "field_reason"
    ]
  },
  "callHandling": {
    "answeringMode": "overflow_and_after_hours",
    "businessHours": {
      "mode": "owner_first",
      "ownerRingSeconds": 20,
      "ifUnanswered": "answer_take_message_and_notify"
    },
    "afterHours": {
      "mode": "answer_immediately",
      "ifRoutine": "take_message_and_notify",
      "ifUrgent": "collect_and_escalate"
    },
    "callTypes": [
      {
        "id": "call_type_information",
        "enabled": true,
        "name": "Business information question",
        "whenCaller": "Caller asks about services, hours, location, service area, pricing policy, or an approved FAQ.",
        "exampleCallerPhrases": [
          "What are your hours?",
          "Do you serve my area?"
        ],
        "outcome": "answer_approved_information",
        "collectFieldIds": [],
        "notifyOwner": false,
        "fallback": "unknown_question"
      },
      {
        "id": "call_type_appointment_request",
        "enabled": true,
        "name": "Appointment or estimate request",
        "whenCaller": "Caller wants to book, schedule, get an estimate, request a consultation, or choose a preferred time.",
        "exampleCallerPhrases": [
          "Can I book an appointment?",
          "Can someone come tomorrow?"
        ],
        "outcome": "create_request",
        "requestType": "appointment_request",
        "collectFieldIds": [
          "field_name",
          "field_phone",
          "field_service_needed",
          "field_address_or_location",
          "field_preferred_time",
          "field_reason"
        ],
        "notifyOwner": true,
        "fallback": "take_message"
      },
      {
        "id": "call_type_message",
        "enabled": true,
        "name": "Message or callback request",
        "whenCaller": "Caller wants to leave a message or have someone call them back.",
        "exampleCallerPhrases": [
          "Can someone call me back?",
          "I need to leave a message."
        ],
        "outcome": "take_message",
        "requestType": "callback_request",
        "collectFieldIds": [
          "field_name",
          "field_phone",
          "field_reason"
        ],
        "notifyOwner": true,
        "fallback": "unknown_question"
      },
      {
        "id": "call_type_urgent",
        "enabled": true,
        "name": "Urgent call",
        "whenCaller": "Caller describes an emergency, urgent issue, active leak, no heat, lockout, safety concern, or another owner-defined urgent condition.",
        "exampleCallerPhrases": [
          "This is urgent.",
          "Water is leaking right now."
        ],
        "outcome": "collect_and_escalate",
        "requestType": "urgent_request",
        "collectFieldIds": [
          "field_name",
          "field_phone",
          "field_service_needed",
          "field_address_or_location",
          "field_reason",
          "field_urgency"
        ],
        "notifyOwner": true,
        "fallback": "take_message_and_notify"
      }
    ],
    "unknownQuestions": {
      "enabled": true,
      "askOneClarifyingQuestion": true,
      "maximumAttempts": 1,
      "behavior": "take_message_and_notify",
      "callerWording": "I do not have that information confirmed, but I can take your details and have the team follow up.",
      "createImprovementSuggestion": true,
      "collectFieldIds": [
        "field_name",
        "field_phone",
        "field_reason"
      ]
    },
    "spamScreening": {
      "enabled": true,
      "screenLikelySpam": true,
      "hideLikelySpamFromDefaultView": true,
      "countBlockedSpamTowardUsage": false,
      "allowUnknownLocalNumbers": true,
      "suspectedSpamBehavior": "screen"
    }
  },
  "routing": {
    "ownerContacts": [
      {
        "id": "contact_owner",
        "enabled": true,
        "name": "{{owner_or_office_contact_name}}",
        "role": "owner_or_office",
        "phone": "{{owner_alert_phone}}",
        "email": "{{owner_alert_email}}",
        "notifyBySms": true,
        "notifyByEmail": true,
        "allowCallTransfer": false
      }
    ],
    "urgentEscalation": {
      "enabled": true,
      "tryCallTransferFirst": false,
      "notifyImmediately": true,
      "escalationOrder": [
        "contact_owner"
      ],
      "waitSecondsPerContact": 20,
      "ifNoAnswer": "send_sms_and_email_summary"
    },
    "ownerAlerts": {
      "newMessage": {
        "enabled": true,
        "channels": [
          "sms",
          "email"
        ],
        "template": "New caller message: {{caller_name}} — {{reason}}"
      },
      "newAppointmentRequest": {
        "enabled": true,
        "channels": [
          "sms",
          "email"
        ],
        "template": "New appointment request: {{caller_name}} — {{preferred_time}} — {{reason}}"
      },
      "urgentRequest": {
        "enabled": true,
        "channels": [
          "sms",
          "email",
          "call"
        ],
        "template": "Urgent call: {{caller_name}} — {{reason}}"
      }
    },
    "callerConfirmations": {
      "messageCaptured": {
        "enabled": true,
        "channel": "sms",
        "template": "Thanks for calling {{business_name}}. Your message was sent to the team."
      },
      "appointmentRequestCaptured": {
        "enabled": true,
        "channel": "sms",
        "template": "Thanks for calling {{business_name}}. Your appointment request was sent to the team."
      },
      "bookingLink": {
        "enabled": false,
        "channel": "sms",
        "template": "Here is the booking link for {{business_name}}: {{booking_link}}"
      }
    }
  },
  "greeting": {
    "enabled": true,
    "opening": "Thanks for calling {{business_name}}. How can I help today?",
    "afterHoursOpening": "Thanks for calling {{business_name}}. The team is unavailable right now, but I can take a message and send it to them.",
    "voiceId": "voice_configurable",
    "tone": "warm_professional",
    "primaryLanguage": "en",
    "additionalLanguages": [],
    "businessNamePronunciation": "{{business_name_pronunciation}}",
    "closing": "Thanks for calling. The team will follow up if needed.",
    "disclosure": {
      "callRecordingEnabled": false,
      "callerWording": "This call may be recorded so the business can review the details."
    }
  },
  "links": [
    {
      "id": "link_contact",
      "enabled": true,
      "label": "Contact page",
      "type": "contact",
      "url": "{{contact_url}}"
    },
    {
      "id": "link_booking",
      "enabled": false,
      "label": "Booking page",
      "type": "booking",
      "url": "{{booking_url}}"
    }
  ],
  "safety": {
    "approvedKnowledgeOnly": true,
    "doNotInventBusinessFacts": true,
    "askOneQuestionAtATime": true,
    "avoidRepeatingCollectedInformation": true,
    "confirmBeforeCreatingRequest": true,
    "doNotGiveMedicalLegalOrFinancialAdvice": true,
    "pricingDefault": "use_service_price_handling",
    "conversationStyle": "natural_brief_professional"
  },
  "testing": {
    "browserDemoCompleted": false,
    "liveDemoCallCompleted": false,
    "ownerSampleCallCompleted": false,
    "finalTestApproved": false,
    "sampleScenarios": [
      "call_type_information",
      "call_type_appointment_request",
      "call_type_message",
      "call_type_urgent",
      "unknown_question"
    ]
  },
  "activation": {
    "paymentStatus": "not_started",
    "phoneRoutingStatus": "not_connected",
    "ownerAlertStatus": "missing_or_unverified",
    "calendarStatus": "not_required",
    "goLiveChecklist": [
      {
        "id": "review_business",
        "label": "Review business details",
        "complete": false
      },
      {
        "id": "review_services",
        "label": "Review services and approved answers",
        "complete": false
      },
      {
        "id": "review_hours",
        "label": "Review hours and after-hours behavior",
        "complete": false
      },
      {
        "id": "owner_alerts",
        "label": "Add owner alerts",
        "complete": false
      },
      {
        "id": "test_call",
        "label": "Complete final test",
        "complete": false
      },
      {
        "id": "payment",
        "label": "Choose plan and pay",
        "complete": false
      },
      {
        "id": "phone_routing",
        "label": "Connect phone routing",
        "complete": false
      },
      {
        "id": "approve_go_live",
        "label": "Approve go-live",
        "complete": false
      }
    ]
  },
  "privacy": {
    "callRecordingEnabled": false,
    "recordingRetentionDays": 30,
    "transcriptRetentionDays": 365,
    "showRecordingDisclosure": true,
    "allowOwnerDataExport": true,
    "allowOwnerDeleteCallRecords": true
  },
  "metadata": {
    "createdAt": "{{iso_datetime}}",
    "updatedAt": "{{iso_datetime}}",
    "createdBy": "website_builder",
    "lastChangedBy": "owner_or_system"
  }
}
```

---

## 6. Why this JSON is better for the niche

### 6.1 It uses owner language

Old language:

- scenarios
- request types
- actions
- routing rules
- follow-ups
- global rules

Focused language:

- services
- hours
- approved answers
- appointment handling
- call handling
- owner alerts
- greeting
- safety

### 6.2 It keeps control without turning into a workflow builder

The owner can still control:

- when calls are answered
- what callers hear
- what services can be requested
- what questions are asked
- who gets alerts
- what happens after hours
- what counts as urgent
- whether booking link/calendar is used
- what happens when the system does not know

But the owner is not asked to configure:

- priorities
- custom conditions
- action graphs
- object schemas
- scenario engines
- teams and nested permissions

### 6.3 It supports the things small businesses pay for

This canonical JSON directly supports:

- missed-call recovery
- after-hours answering
- overflow answering
- message taking
- appointment requests
- booking links
- urgent escalation
- owner alerts
- spam screening
- approved answers
- final-test-before-live
- pause/resume answering

---

## 7. Product navigation

Use a focused sidebar. Do not expose every JSON object as a navigation item.

```text
Overview
Calls
Requests
Appointments
Test Center
Answering Setup
Phone Setup
Billing
Settings
```

Inside **Answering Setup**, use sections:

```text
Business details
Services & answers
Hours & after-hours
Appointment handling
Call handling
Greeting & voice
Owner alerts
Safety & unknown questions
Sources
```

This keeps the dashboard from feeling like an enterprise admin system.

---

## 8. Status model

Every screen should clearly show whether the service is live.

| Status | Meaning | UI copy |
|---|---|---|
| Draft | Setup generated but not reviewed | “Draft — not live yet” |
| Testing | User is trying calls | “Testing — real callers will not hear this yet” |
| Ready to activate | Setup reviewed but not connected/paid | “Ready to activate” |
| Live | Calls can be answered | “Live — answering calls based on your approved setup” |
| Paused | Service temporarily stopped | “Paused — calls are not being answered by Small Business Answering” |
| Needs attention | Payment/phone/integration issue | “Needs attention — finish setup to keep answering active” |

---

# 9. Onboarding screens

The onboarding should prove value quickly, then ask for the minimum needed to save and activate. It should not force every dashboard setting before the user sees the product work.

---

## O-01 — Build your answering setup

### Purpose

Start from the user’s website or business name.

### Layout

```text
Small Business Answering

Small business answering service, built from your website

[ Website or business name                         ]

[ Build my answering setup ]

No credit card. No phone changes. Nothing goes live until you approve.

Right side:
After-hours call answered
Caller details captured
Owner alerted
Appointment request created
```

### Main components

- Website/business input
- Optional location field only if needed
- Primary CTA: **Build my answering setup**
- Secondary link: **See pricing**
- Trust line: no card, no phone changes, approval first

### JSON mapping

- `business.websiteUrl`
- `business.name`
- `sources`
- `fieldSources`

### Do not show

- login form
- phone verification
- calendar connection
- payment
- AI model selection

---

## O-02 — Confirm business

### Purpose

Make sure the system found the correct business.

### Layout

```text
We found this business

Business name
Website
Phone
Address
Service category

[ Use this business ]
[ This is not my business ]
```

### Main components

- Business card
- Source/confidence chip
- “Search again” option
- “Continue manually” fallback

### JSON mapping

- `business.name`
- `business.publicPhone`
- `business.publicEmail`
- `business.address`
- `business.timezone`
- `fieldSources`

### Edge states

- Multiple business matches
- No website found
- Website blocked
- Low-confidence business name

---

## O-03 — Building setup

### Purpose

Show that the system is creating something useful, not just loading.

### Layout

```text
Building your answering setup

✓ Reading your website
✓ Finding services
✓ Finding hours
✓ Finding service area
✓ Preparing approved answers
✓ Creating call handling
✓ Preparing test calls

You will review everything before callers hear it.
```

### Main components

- Progress checklist
- Small live preview card
- “This usually takes a moment” microcopy

### JSON mapping

- `business`
- `services`
- `hours`
- `approvedAnswers`
- `appointmentHandling`
- `callHandling`
- `greeting`
- `sources`

---

## O-04 — Setup ready

### Purpose

Give the user the first “aha” moment.

### Layout

```text
Your answering setup is ready

Status: Draft — not live yet

Sample call:
Caller: “Can someone come tomorrow?”
Small Business Answering: “I can take your preferred time and send the request to the team.”

Detected: Appointment or estimate request
Action: Collect details → create request → notify owner

[ See it in action ]
[ Review setup ]
[ Save setup ]
```

### Main components

- Draft status badge
- Sample call transcript
- Detected call type
- Fields collected
- Owner alert preview
- CTA to test

### JSON mapping

- `callHandling.callTypes`
- `intakeFields`
- `appointmentHandling`
- `routing.ownerAlerts`
- `testing.sampleScenarios`

---

## O-05 — See it in action

### Purpose

Let the user test without using a real phone.

### Layout

```text
See how your calls would be answered

Left: phone-style conversation
Right: what the system detected

Caller question buttons:
[ Ask about hours ]
[ Request appointment ]
[ Leave message ]
[ Ask urgent question ]
[ Ask unknown question ]

[ Type your own caller question ]
```

### Main components

- Browser phone simulator
- Scenario chips
- Transcript bubbles
- Detected intent panel
- Collected fields panel
- Next action panel
- Source/approved answer panel

### JSON mapping

- `callHandling.callTypes`
- `approvedAnswers`
- `intakeFields`
- `appointmentHandling`
- `unknownQuestions`
- `routing.ownerAlerts`

### Do not require

- login
- payment
- calendar
- real call

---

## O-06 — Optional live demo number

### Purpose

Give high-intent users a real call test without blocking the flow.

### Layout

```text
Want to hear it live?

Call this demo number:
+1 XXX XXX XXXX

This uses your draft setup. It will not answer real customer calls.

[ Copy number ]
[ Continue setup ]
```

### Main components

- Demo number
- Copy button
- “Not live” reassurance
- Continue CTA

### JSON mapping

- `testing.liveDemoCallCompleted`

---

## O-07 — Optional “call me with a sample”

### Purpose

Let the system place a one-time sample call to the owner.

### Layout

```text
Get a sample call

Enter your number and we’ll call once with a test call.

[ Phone number ]

[ Call me with a sample ]

We will not use this number for owner alerts unless you choose that later.
```

### Main components

- Phone input
- Consent checkbox if needed
- Call-once explanation
- Cancel/continue

### JSON mapping

- `testing.ownerSampleCallCompleted`

### Important rule

Do not automatically save this phone number as `routing.ownerContacts[0].phone` unless the user explicitly chooses to use it for alerts.

---

## O-08 — Save setup / login

### Purpose

Save after value is shown.

### Layout

```text
Save your answering setup

Enter your email so you can come back and finish later.

[ Email address ]

[ Continue with email ]
[ Continue with Google ]
[ Continue with Microsoft ]

No phone changes. Nothing goes live until approval.
```

### Main components

- Email magic link
- Google/Microsoft sign-in
- Terms/privacy links
- No password by default

### JSON mapping

- app account record
- setup ownership

### Do not use as primary login

- phone number
- passcode-first identity

Phone is for alerts and routing, not first identity.

---

## O-09 — Review essentials hub

### Purpose

Turn a long setup into a small set of approve/edit cards.

### Layout

```text
Review your answering setup

Status: Draft — not live yet

Cards:
Business details        Needs review
Services & answers      Needs review
Hours & after-hours     Needs review
Appointment handling    Choose mode
Owner alerts            Missing phone
Call handling           Ready
Greeting                Ready
Safety                  Ready

[ Review next ]
[ Go to dashboard ]
```

### Main components

- Progress checklist
- Section cards
- Status chips: Found, Needs review, Missing, Approved
- Right-side sample call preview

### JSON mapping

- all setup sections
- `activation.goLiveChecklist`
- `status.needsReview`

---

## O-10 — Services & approved answers review

### Purpose

Confirm what callers can ask about and request.

### Layout

```text
Services callers can ask about

Service card:
Service name
Description
Can answer questions: On
Can create request: On
Appointment eligible: On
Pricing: Do not quote

Approved answer card:
Question
Answer
Source

[ Add service ]
[ Add approved answer ]
[ Approve services & answers ]
```

### Main components

- Service cards
- Approved answer cards
- Source/confidence chips
- Edit drawer
- Approve section CTA

### JSON mapping

- `services`
- `approvedAnswers`
- `fieldSources`
- `safety.approvedKnowledgeOnly`

---

## O-11 — Hours & after-hours review

### Purpose

Confirm open hours and closed-hours behavior.

### Layout

```text
Hours & after-hours

Regular hours:
Mon 9:00 AM – 5:00 PM
...

After-hours:
Routine calls: take message and notify
Urgent calls: collect details and escalate

Caller wording:
“The team is unavailable right now, but I can take a message...”

[ Approve hours ]
```

### Main components

- Weekly hours editor
- Closed/open toggles
- Special dates
- Temporary update option
- After-hours behavior selector
- Caller wording preview

### JSON mapping

- `hours.weekly`
- `hours.afterHours`
- `hours.specialDates`
- `hours.temporaryUpdates`

---

## O-12 — Appointment handling

### Purpose

Choose how appointment calls are handled.

### Layout

```text
How should appointment calls be handled?

○ Capture appointment requests
  Collect preferred time and send it to the team.

○ Send my booking link
  Text callers your booking page.

○ Book directly on my calendar
  Connect Google Calendar or Outlook.

[ Continue ]
```

### Main components

- Three cards: capture request, send booking link, calendar booking
- Booking link input if selected
- Calendar connect if selected
- Explanation of request vs booked

### JSON mapping

- `appointmentHandling.enabled`
- `appointmentHandling.mode`
- `appointmentHandling.bookingLink`
- `appointmentHandling.calendar`
- `links`

### Language rule

If calendar booking is not connected, UI and call summaries must say:

> Appointment request captured

Not:

> Appointment booked

---

## O-13 — Owner alerts

### Purpose

Collect where call summaries and urgent alerts go.

### Layout

```text
Where should caller requests go?

Primary contact
Name
Phone for text alerts
Email for summaries

Notify by:
[x] SMS
[x] Email
[ ] Phone call for urgent calls

[ Send test alert ]
[ Continue ]
```

### Main components

- Owner/office contact form
- SMS/email/call toggles
- Test alert button
- Urgent escalation option

### JSON mapping

- `routing.ownerContacts`
- `routing.ownerAlerts`
- `routing.urgentEscalation`

---

## O-14 — Call handling / answer timing

### Purpose

Choose when Small Business Answering answers.

### Layout

```text
When should Small Business Answering answer calls?

○ Let my team answer first
○ Answer every call immediately
○ Answer only after-hours
○ Answer only when unanswered or busy

During business hours:
Let my team ring first for [20 seconds]

After-hours:
Answer immediately and take message

[ Save call handling ]
```

### Main components

- Answering mode cards
- Owner ring seconds
- Business-hours behavior
- After-hours behavior
- If-unanswered fallback

### JSON mapping

- `callHandling.answeringMode`
- `callHandling.businessHours`
- `callHandling.afterHours`
- `routing.urgentEscalation`

---

## O-15 — Greeting & safety

### Purpose

Confirm caller-facing voice and guardrails.

### Layout

```text
Greeting & safety

Opening greeting:
“Thanks for calling {{business_name}}. How can I help today?”

When we do not know:
“I do not have that information confirmed, but I can take your details...”

Safety:
✓ Use approved information only
✓ Do not invent business facts
✓ Ask one question at a time
✓ Confirm before creating request

[ Play preview ]
[ Approve greeting & safety ]
```

### Main components

- Greeting editor
- Voice preview
- Unknown-answer wording
- Safety checklist
- Call recording disclosure toggle if applicable

### JSON mapping

- `greeting`
- `callHandling.unknownQuestions`
- `safety`
- `privacy`

---

## O-16 — Pricing

### Purpose

Move to purchase after the user understands the value.

### Layout

```text
Choose your answering plan

Starter
For owner-operated businesses
Includes X calls/minutes

Growth
For busier small teams
Includes X calls/minutes

You are not live yet. After payment, finish phone setup and approve the final test.

[ Choose plan ]
```

### Main components

- Plan cards
- Usage explanation
- Spam/billable explanation
- “Not live yet” trust banner

### JSON mapping

Billing object outside canonical setup; activation references:

- `activation.paymentStatus`

---

## O-17 — Checkout

### Purpose

Collect payment only. No extra setup here.

### Layout

```text
Secure checkout

Plan summary
Billing email
Payment method

[ Start plan ]

Your answering setup will not go live until you finish phone setup and final approval.
```

### Main components

- Plan summary
- Payment fields
- Tax/fees if relevant
- Terms
- Submit

### JSON mapping

- `activation.paymentStatus`

---

## O-18 — Phone setup

### Purpose

Connect the business phone or forwarding path.

### Layout

```text
Connect your business phone

How do you want calls answered?

○ Use a Small Business Answering number
○ Forward missed calls from my current number
○ Forward after-hours calls
○ I need help choosing

[ Continue ]
```

### Main components

- Phone setup method cards
- Explanation of each option
- No-change reassurance
- Test phone routing CTA

### JSON mapping

Phone routing config may live outside the canonical setup, but it updates:

- `activation.phoneRoutingStatus`
- `callHandling.answeringMode`
- `callHandling.businessHours`
- `callHandling.afterHours`

---

## O-19 — Final test

### Purpose

Make the owner approve the real behavior before going live.

### Layout

```text
Final test

Test how real callers will be answered.

[ Start browser test ]
[ Call demo number ]
[ Call me with test ]

Checklist:
✓ Greeting sounds correct
✓ Services are correct
✓ Unknown answers are safe
✓ Requests go to the right contact
✓ After-hours behavior works

[ Approve final test ]
```

### Main components

- Test options
- Checklist
- Sample owner alert preview
- Transcript preview
- Approval checkbox

### JSON mapping

- `testing.finalTestApproved`
- `activation.goLiveChecklist`

---

## O-20 — Go-live approval

### Purpose

Final gate before real calls are answered.

### Layout

```text
Ready to go live

Small Business Answering will start answering calls using your approved setup.

✓ Setup reviewed
✓ Payment complete
✓ Phone routing connected
✓ Owner alerts confirmed
✓ Final test approved

[ Go live ]
[ Keep testing ]
```

### Main components

- Final checklist
- Live confirmation
- “Keep testing” secondary action

### JSON mapping

- `status.mode`
- `status.isLive`
- `status.liveRevision`
- `status.lastPublishedAt`
- `activation.goLiveChecklist`

---

## O-21 — Go-live success

### Purpose

Orient user to dashboard.

### Layout

```text
You’re live

Small Business Answering is now ready to answer calls.

What happens next:
✓ Calls appear in your dashboard
✓ New requests are sent to your team
✓ You can pause answering anytime
✓ You can edit and publish changes anytime

[ View dashboard ]
[ Test another call ]
```

### JSON mapping

- `status.isLive`
- operational dashboard state

---

## O-22 — Recovery: website setup failed

### Purpose

Avoid losing users if scraping fails.

### Layout

```text
We could not find enough information from your website

You can still build your answering setup.

[ Enter details manually ]
[ Try another website ]
[ Upload information ]
```

### Ask only

- business name
- services
- hours
- service area
- owner alert contact
- appointment/message behavior

---

## O-23 — Recovery: payment failed

### Purpose

Keep setup safe and reduce panic.

### Layout

```text
Payment did not go through

Your setup is saved, but calls will not go live.

[ Try again ]
[ Use another payment method ]
[ Return to dashboard ]
```

---

## O-24 — Recovery: phone verification failed

### Purpose

Let user continue testing even if phone setup fails.

### Layout

```text
We could not verify that code

[ Resend code ]
[ Call me with a code ]
[ Change phone number ]
[ Continue in testing ]
```

---

# 10. Dashboard screens

The dashboard should be a working call-control center, not a technical admin panel.

---

## D-01 — Overview

### Purpose

Show status, next step, recent activity, and key outcomes.

### Layout

```text
Overview

Status: Testing — not live yet

Next step:
Connect your business phone so calls can be answered.

[ Connect phone ] [ Test a call ]

Cards:
Calls answered
Requests captured
Appointment requests
Urgent calls
Spam screened

Setup health:
✓ Business details
✓ Services & answers
○ Owner alerts missing
○ Phone routing incomplete
```

### Main components

- Status banner
- Next-best-action card
- Metrics cards
- Setup checklist
- Recent activity list
- Pause/resume control if live

### JSON mapping

- `status`
- `activation`
- `testing`
- operational call/request metrics

---

## D-02 — Calls

### Purpose

Show every answered, missed/handled, test, urgent, and spam call.

### Layout

```text
Calls

Filters:
All | Real calls | Test calls | Requests | Urgent | Spam | Unknown questions

Table:
Caller
Call type
Outcome
Time
Duration
Status
```

### Main components

- Search
- Filter tabs
- Call table
- Outcome chips
- Spam hidden toggle
- Empty state

### JSON mapping

Operational call records reference:

- `callHandling.callTypes`
- `approvedAnswers`
- `intakeFields`
- `routing.ownerAlerts`

---

## D-03 — Call detail

### Purpose

Show exactly what happened on one call.

### Layout

```text
Call detail

Caller
Phone
Time
Duration

Summary
Outcome
Collected details
Transcript
Owner alert sent
Source used

[ Mark good ]
[ Needs improvement ]
[ Add approved answer ]
[ Call back ]
```

### Main components

- Summary card
- Transcript
- Audio player if recording enabled
- Collected intake fields
- Request created
- Notifications sent
- Improvement actions

### JSON mapping

- `callHandling.callTypes`
- `intakeFields`
- `approvedAnswers`
- `callHandling.unknownQuestions`
- `privacy`

---

## D-04 — Requests

### Purpose

Manage captured caller requests.

### Layout

```text
Requests

Tabs:
All | Appointment requests | Callbacks | Urgent | Completed

Table:
Request
Caller
Phone
Preferred time
Status
Created
```

### Main components

- Request table
- Status filters
- Assignee/contact
- Export option
- Empty state

### Request statuses

Use fixed statuses:

- new
- contacted
- booked
- completed
- archived

Do not make statuses configurable in the small-business UI.

### JSON mapping

- `callHandling.callTypes`
- `appointmentHandling`
- `intakeFields`
- `routing.ownerContacts`

---

## D-05 — Request detail

### Purpose

Let the owner act on a captured request.

### Layout

```text
Appointment request

Status: New

Caller details
Service needed
Address/location
Preferred time
Reason for calling
Related call transcript

Actions:
[ Mark contacted ]
[ Mark booked ]
[ Send booking link ]
[ Call customer ]
[ Add note ]
```

### Main components

- Request summary
- Caller details
- Collected fields
- Related call
- Owner notes
- Follow-up actions

### JSON mapping

- `intakeFields`
- `appointmentHandling`
- `routing.callerConfirmations`

---

## D-06 — Appointments

### Purpose

Show appointment requests and current booking mode.

### Layout

```text
Appointments

Current mode:
Capture appointment requests

Calendar:
Not connected

Booking link:
Not enabled

Appointment requests:
Caller | Preferred time | Service | Status

[ Edit appointment handling ]
[ Connect calendar ]
[ Add booking link ]
```

### Main components

- Mode card
- Calendar status
- Booking link status
- Appointment request list
- Edit CTA

### JSON mapping

- `appointmentHandling`
- `links`
- `intakeFields`

---

## D-07 — Test Center

### Purpose

Let user test anytime before or after going live.

### Layout

```text
Test Center

Try your answering setup before real callers hear it.

[ Browser simulator ]
[ Call demo number ]
[ Call me with sample ]

Scenarios:
Business question
Appointment request
Message
Urgent call
Unknown question
After-hours call
```

### Main components

- Phone simulator
- Scenario buttons
- Demo number card
- Sample call card
- Test history
- Mark good/bad
- “Edit linked setup” shortcut

### JSON mapping

- `testing`
- `callHandling.callTypes`
- `approvedAnswers`
- `unknownQuestions`
- `greeting`

---

## D-08 — Answering Setup overview

### Purpose

Central place to review and edit the setup.

### Layout

```text
Answering Setup

Draft revision: 2
Live revision: 1

Sections:
Business details          Approved
Services & answers        Approved
Hours & after-hours       Needs review
Appointment handling      Ready
Call handling             Ready
Greeting & voice          Approved
Owner alerts              Missing phone
Safety                    Approved
Sources                   Website processed

[ Publish changes ]
```

### Main components

- Section cards
- Draft/live revision banner
- Publish changes button
- “Not live yet” or “Unpublished changes” banner

### JSON mapping

- entire canonical setup
- `status.draftRevision`
- `status.liveRevision`

---

## D-09 — Business details

### Purpose

Edit basic business identity.

### Layout

```text
Business details

Business name
Website
Public phone
Public email
Address
Timezone
Primary language
Business name pronunciation
Service area summary

[ Save draft ]
```

### Main components

- Editable fields
- Source chips
- Confirmed toggle
- Service area editor

### JSON mapping

- `business`
- `fieldSources`
- `sources`

---

## D-10 — Services & answers

### Purpose

Manage what callers can ask about and request.

### Layout

```text
Services & answers

Services:
[ Add service ]

Approved answers:
[ Add answer ]

Right side:
Caller preview
Source panel
```

### Main components

- Service list
- Service detail drawer
- Approved answer list
- Answer detail drawer
- Source/confidence panel
- Caller preview

### JSON mapping

- `services`
- `approvedAnswers`
- `fieldSources`
- `safety.approvedKnowledgeOnly`

---

## D-11 — Service detail

### Purpose

Edit one service.

### Layout

```text
Service

Name
Description
Caller phrases
Can answer questions
Can create request
Appointment eligible
Questions to ask
Pricing behavior
Urgent keywords
Owner notes

[ Save ]
```

### JSON mapping

- one object in `services[]`
- `intakeFields`
- `appointmentHandling`

---

## D-12 — Approved answer detail

### Purpose

Edit one approved FAQ/policy.

### Layout

```text
Approved answer

Title
Caller questions
Answer callers may hear
Behavior
Related service
Related link
Source
Confirmed by owner

[ Save ]
```

### JSON mapping

- one object in `approvedAnswers[]`
- `links`
- `sources`

---

## D-13 — Hours & after-hours

### Purpose

Edit open hours, temporary updates, and after-hours behavior.

### Layout

```text
Hours & after-hours

Weekly hours editor
Special dates
Temporary updates
After-hours routine behavior
After-hours urgent behavior
Caller wording

[ Save draft ]
```

### JSON mapping

- `hours`
- `callHandling.afterHours`

---

## D-14 — Appointment handling

### Purpose

Configure appointment request behavior.

### Layout

```text
Appointment handling

Enabled: On

Mode:
○ Capture request
○ Send booking link
○ Calendar booking

Booking link
Calendar connection
Questions to ask
Unavailable behavior
Confirmation wording

[ Save draft ]
```

### JSON mapping

- `appointmentHandling`
- `links`
- `intakeFields`
- `routing.callerConfirmations`

---

## D-15 — Call handling

### Purpose

Edit when calls are answered and how call types behave.

### Layout

```text
Call handling

Answering mode
Business hours behavior
After-hours behavior
Owner ring seconds
Urgent call handling
Unknown question handling
Spam screening

[ Save draft ]
```

### Main components

- Answering mode cards
- Business-hours section
- After-hours section
- Call type list
- Urgent escalation summary
- Unknown answer behavior
- Spam screening toggles

### JSON mapping

- `callHandling`
- `routing.urgentEscalation`
- `routing.ownerContacts`

---

## D-16 — Questions to ask callers

### Purpose

Manage intake fields without exposing complex logic.

### Layout

```text
Questions to ask callers

Name
Phone
Email
Service needed
Address/location
Preferred time
Reason for calling
Urgency

[ Add question ]
```

### Main components

- Ordered field list
- Required/optional toggle
- Spoken prompt
- Confirm-back toggle
- Used-for chips

### JSON mapping

- `intakeFields`
- `services.requiredIntakeFieldIds`
- `appointmentHandling.defaultFieldIds`
- `callHandling.callTypes.collectFieldIds`

---

## D-17 — Greeting & voice

### Purpose

Control caller-facing first impression.

### Layout

```text
Greeting & voice

Opening greeting
After-hours greeting
Voice
Tone
Language
Business name pronunciation
Closing wording
Recording disclosure

[ Play preview ]
[ Save draft ]
```

### JSON mapping

- `greeting`
- `privacy.callRecordingEnabled`

---

## D-18 — Owner alerts

### Purpose

Manage who gets messages and urgent alerts.

### Layout

```text
Owner alerts

Contacts
Primary owner/office
On-call backup

Alert types:
New message
Appointment request
Urgent request

[ Send test alert ]
[ Save ]
```

### Main components

- Contact cards
- SMS/email/call toggles
- Urgent escalation order
- Templates preview
- Test alert

### JSON mapping

- `routing.ownerContacts`
- `routing.ownerAlerts`
- `routing.urgentEscalation`

---

## D-19 — Phone Setup

### Purpose

Show phone connection and answer timing.

### Layout

```text
Phone Setup

Status: Not connected

Business phone
Answering number
Forwarding method
Answer timing
Routing test

[ Set up forwarding ]
[ Test phone routing ]
[ Edit answer timing ]
```

### Main components

- Connection status
- Business number
- Assigned answering number
- Forwarding instructions
- Test call status
- Troubleshooting

### JSON mapping

- `activation.phoneRoutingStatus`
- `callHandling.businessHours`
- `callHandling.afterHours`

---

## D-20 — Sources

### Purpose

Show where information came from and what needs confirmation.

### Layout

```text
Sources

Website
Processed date
Status

Owner edits
Manual answers

Fields needing review:
Business hours
Service area
Pricing wording

[ Re-scan website ]
[ Add approved answer ]
```

### Main components

- Source list
- Field-level confidence
- Conflicts if any
- Rescan button
- Confirm value button

### JSON mapping

- `sources`
- `fieldSources`
- `approvedAnswers`

---

## D-21 — Billing

### Purpose

Show plan, payment, invoices, and usage.

### Layout

```text
Billing

Current plan
Usage this month
Calls answered
Minutes used
Spam screened
Payment method
Invoices

[ Change plan ]
[ Update payment method ]
```

### Main components

- Plan card
- Usage meter
- Spam usage note
- Payment method
- Invoice table

### JSON mapping

Billing is outside canonical setup, but references:

- `activation.paymentStatus`
- `callHandling.spamScreening.countBlockedSpamTowardUsage`

---

## D-22 — Settings

### Purpose

Account, team, privacy, and service-level settings.

### Layout

```text
Settings

Account
Team members
Privacy & recording
Data export
Delete call records
Business workspace
```

### Main components

- Account profile
- Simple member roles: owner, admin, viewer
- Privacy settings
- Data export
- Delete data
- Danger zone

### JSON mapping

- `privacy`
- app account/workspace records

---

## D-23 — Review changes / publish

### Purpose

Handle draft/live revision difference.

### Layout

```text
Review changes before publishing

Changed:
- Greeting updated
- New approved answer added
- After-hours wording changed

Impact:
Future calls will use these updates.

[ Publish changes ]
[ Keep editing ]
[ Discard draft ]
```

### Main components

- Diff summary
- Caller impact explanation
- Publish CTA
- Test before publish CTA

### JSON mapping

- `status.draftRevision`
- `status.liveRevision`
- entire document diff

---

## D-24 — Pause answering modal

### Purpose

Give owner control and reduce fear.

### Layout

```text
Pause answering?

Small Business Answering will stop answering calls until you resume.

What should happen while paused?
○ Send calls back to my normal phone behavior
○ Play paused message

[ Pause answering ]
[ Cancel ]
```

### JSON mapping

- `status.isPaused`
- phone routing operational state

---

# 11. Empty states

## No calls yet

```text
No calls yet

When Small Business Answering answers a call, it will appear here with the summary, transcript, and outcome.

[ Test a call ]
```

## No requests yet

```text
No requests captured yet

Messages, callbacks, appointment requests, and urgent requests will appear here.

[ Test a request call ]
```

## No approved answers yet

```text
No approved answers yet

Add answers callers can safely hear, such as hours, service area, policies, and pricing wording.

[ Add approved answer ]
```

## Phone not connected

```text
Phone routing is not connected

Your answering setup is saved, but real callers will not reach Small Business Answering until phone setup is complete.

[ Connect phone ]
```

## Calendar not connected

```text
Calendar is not connected

You can still capture appointment requests and send booking links.

[ Connect calendar ]
[ Keep capturing requests ]
```

---

# 12. Screen design rules

## 12.1 Every setup screen needs a preview

Use a right-side preview wherever possible.

Examples:

| Setup screen | Right-side preview |
|---|---|
| Services | “What callers can ask” and “request created” preview |
| Approved answers | Caller question + approved answer preview |
| Hours | Open/closed caller wording preview |
| Appointment handling | Request captured vs booking link vs calendar event preview |
| Call handling | Call flow diagram |
| Owner alerts | SMS/email preview |
| Greeting | Voice/greeting preview |
| Unknown questions | Safe fallback preview |

## 12.2 Use owner language, not system language

| Avoid | Use |
|---|---|
| Scenario | Call type |
| Workflow | What happens next |
| Action graph | Call handling |
| Intake schema | Questions to ask callers |
| Knowledge item | Approved answer |
| Routing rule | Call rule |
| Follow-up object | Owner alert / caller confirmation |
| Integration connection ID | Connected calendar |
| Published revision | Live version |

## 12.3 Default to safe wording

Use:

- “appointment request captured”
- “preferred time collected”
- “message sent to the team”
- “urgent call flagged”
- “owner notified”
- “answer from approved information”

Avoid:

- “appointment booked” unless truly booked
- “emergency resolved”
- “guaranteed lead captured”
- “never miss a call”
- “AI knows your business”
- “fully automated business”

---

# 13. What the full focused product includes

This is not an MVP. This is the full focused product for this niche.

## Core answering

- Answer all calls, overflow calls, or after-hours calls
- Owner-first ring delay
- Immediate after-hours answering
- Pause/resume
- Demo/test number
- Final test before live

## Caller handling

- Business information questions
- Service questions
- Message/callback requests
- Appointment/estimate requests
- Urgent calls
- Unknown questions
- Spam screening

## Owner controls

- Business details
- Services
- Approved answers
- Hours
- Service area
- Appointment mode
- Answer timing
- Owner alerts
- Urgent escalation
- Greeting
- Unknown answer behavior
- Call recording/privacy

## Outputs

- Call summaries
- Transcripts
- Request records
- Appointment request records
- Owner SMS/email alerts
- Caller confirmations
- Improvement suggestions
- Usage/billing visibility

## Integrations kept

Only keep integrations that directly support answering calls:

- Google Calendar
- Outlook Calendar
- booking link
- contact link
- optional webhook/Zapier-style export later, but not core navigation

## Integrations not core

- CRM sync
- job management sync
- review requests
- outbound campaigns
- payments
- social DMs
- email marketing
- inventory/order systems

---

# 14. Final product summary

Small Business Answering should be ruthlessly focused.

The product should do this better than anyone:

> **Answer small business calls when the owner or team cannot, capture what matters, route what is urgent, and keep the owner in control.**

The best UX is not the most configurable UX. The best UX is the one where the owner immediately understands:

1. what callers will hear,
2. what information will be collected,
3. what happens after the call,
4. who gets notified,
5. when the system answers,
6. and how to stop or change it.

Everything else is noise.

---

# 15. Sources

[Source 1] Reddit r/smallbusiness, “How are other solo business owners handling missed calls professionally?” — https://www.reddit.com/r/smallbusiness/comments/1jwbhpr/how_are_other_solo_business_owners_handling/

[Source 2] Reddit r/smallbusiness, “Cheapest way to have a real person answer the phone?” — https://www.reddit.com/r/smallbusiness/comments/1iu5qg4/cheapest_way_to_have_a_real_person_answer_the/

[Source 3] Reddit r/smallbusiness, “Small Business Owners: How do you handle missed customer calls during the day?” — https://www.reddit.com/r/smallbusiness/comments/1k8osu5/small_business_owners_how_do_you_handle_missed/

[Source 4] Reddit r/smallbusiness, “How much does an answering service cost for your business?” — https://www.reddit.com/r/smallbusiness/comments/1cnbbhw/how_much_does_an_answering_service_cost_for_your/

[Source 5] Reddit r/smallbusiness, “Call answering service” — https://www.reddit.com/r/smallbusiness/comments/181gn7e/call_answering_service/

[Source 6] Reddit r/Plumbing, “Answering service recommendations” — https://www.reddit.com/r/Plumbing/comments/1kk4tg9/answering_service_recommendations/

[Source 7] Reddit r/landscaping, “Recommend answering service?” — https://www.reddit.com/r/landscaping/comments/1pzlz1d/recommend_answering_service/

[Source 8] Reddit r/Plumbing, “Do you guys not answer calls after a certain time?” — https://www.reddit.com/r/Plumbing/comments/14n4oa5/do_you_guys_not_answer_calls_after_a_certain_time/

[Source 9] Reddit r/Plumbing, “Plumbers - how do you handle missed calls when you're on a job?” — https://www.reddit.com/r/Plumbing/comments/1smlr5g/plumbers_how_do_you_handle_missed_calls_when/

[Source 10] Reddit r/landscaping, “Too many calls” — https://www.reddit.com/r/landscaping/comments/ue4ksb/too_many_calls/

[Source 11] Office of the Privacy Commissioner of Canada, “Recording of Customer Telephone Calls” — https://www.priv.gc.ca/en/privacy-topics/surveillance/02_05_d_14/
