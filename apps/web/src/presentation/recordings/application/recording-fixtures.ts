// TJ-ARCH-MOB-001 compliant
// Static sample content for the recordings screens (recordings.html META,
// TRANSCRIPTS, SUMMARIES, DELIVERY), ported verbatim. Fictional people and data.
import type {
  DeliveryReceipts,
  RecordingMeta,
  RecordingSummary,
  TranscriptChapter,
  TranscriptSegment,
} from "../domain/recording-details";

/** Illustrative sample quota for KnowMe-managed storage (not a real plan limit). */
export const SAMPLE_QUOTA_BYTES = 50 * 1024 * 1024 * 1024;

export const RECORDING_META: Readonly<Record<string, RecordingMeta>> = {
  "partner-onboarding-1014": {
    owner: "mine", host: "Jordan Reyes", resolution: "1920 × 1080 (1080p, 30 fps)",
    provider: "KnowMe-managed · S3-compatible", endpoint: "Managed by KnowMe (not exposed)", region: "us-west",
    checksum: "sha256:9f2c41e7b0d85a36c1fe4b92d7a03e5c8b61f04d2a97c3e815b6d0f4a2c7e913",
    pin: "Pinned via KnowMe pinning", retention: "365 days · until Oct 14, 2027",
  },
  "design-crit-1009": {
    owner: "shared", host: "Priya Natarajan", resolution: "1280 × 720 (720p, 30 fps)",
    provider: "KnowMe-managed · S3-compatible", endpoint: "Managed by KnowMe (not exposed)", region: "us-west",
    checksum: "sha256:4be0a7c15d93f26e8a01c7b4d5e2f9a63c08b7d1e4f5a29c6b3d80e7f1a4c52d",
    pin: "Pinned via KnowMe pinning", retention: "365 days · until Oct 9, 2027",
  },
  "vendor-call-1002": {
    owner: "mine", host: "Jordan Reyes", resolution: "1920 × 1080 (1080p, 30 fps)",
    provider: "Cloudflare R2 · your bucket", endpoint: "https://acme-account.r2.cloudflarestorage.com", region: "auto",
    checksum: "sha256:c71d5e09a3f2b84e6d10a9c7f3e5b2d8a04c6e19f7b3d2a58e0c4f6b91d7a3e2",
    pin: "Pinned via your pinning service", retention: "Forever · governed by your bucket policy",
  },
};

type Line = readonly [minutes: number, seconds: number, who: string, text: string];

function chapter(title: string, lines: readonly Line[]): TranscriptChapter {
  const segments: TranscriptSegment[] = lines.map(([m, s, who, text]) => ({ t: m * 60 + s, who, text }));
  return { title, segments };
}

export const TRANSCRIPTS: Readonly<Record<string, readonly TranscriptChapter[]>> = {
  "partner-onboarding-1014": [
    chapter("Welcome and agenda", [
      [0, 5, "Jordan Reyes", "Thanks for joining. Today we want to walk through the integration timeline, confirm data access, and leave with an owner for each next step."],
      [0, 48, "Avery Chen", "Sounds good. Marcus is leading the technical work on our side, so I will mostly listen in on timeline."],
      [1, 30, "Marcus Oyelaran", "I sent the API questions ahead of time. Happy to start there if that helps."],
    ]),
    chapter("Integration timeline", [
      [7, 0, "Jordan Reyes", "Our proposal is a two-phase rollout: sandbox access next week, production after the security review."],
      [8, 15, "Avery Chen", "Two phases works. Can we hold the production date until the review closes rather than fixing it now?"],
      [9, 40, "Marcus Oyelaran", "Sandbox next week is realistic if we get credentials by Monday."],
      [10, 30, "Jordan Reyes", "I will issue sandbox credentials Monday morning."],
    ]),
    chapter("Data access and permissions", [
      [19, 40, "Marcus Oyelaran", "Which scopes does the integration need? We would like read-only to start."],
      [20, 55, "Researcher", "From the shared partner guide: read-only scopes cover the reporting endpoints. Write access is only needed for webhook registration."],
      [22, 10, "Avery Chen", "Then read-only plus webhook registration. Let us document that in the onboarding checklist."],
    ]),
    chapter("Commercial questions", [
      [31, 40, "Avery Chen", "Is the partner tier priced per seat or per workspace?"],
      [32, 30, "Jordan Reyes", "Per workspace. I will send the current partner terms after the call so you have them in writing."],
      [34, 5, "Marcus Oyelaran", "That keeps our procurement simple."],
    ]),
    chapter("Next steps", [
      [41, 0, "Jordan Reyes", "Recapping owners: I send credentials and partner terms, Marcus confirms scopes, Avery schedules the security review."],
      [42, 20, "Avery Chen", "Agreed. I will book the review for the week after sandbox access."],
      [44, 45, "Jordan Reyes", "Great. Scribe will send the summary and transcript to everyone when we close."],
    ]),
  ],
  "design-crit-1009": [
    chapter("Context", [
      [0, 10, "Priya Natarajan", "Goal today is feedback on the new onboarding flow before we hand off to engineering."],
      [1, 5, "Dana Whitfield", "I have notes on the empty states, so let us leave time for those."],
      [1, 50, "Jordan Reyes", "I will keep time: fifteen minutes on the flow, ten on empty states."],
    ]),
    chapter("Onboarding flow", [
      [5, 0, "Priya Natarajan", "Step two asks for a calendar connection. Is that too early?"],
      [6, 20, "Jordan Reyes", "It is early for guests. Signed-out people should be able to skip it entirely."],
      [7, 45, "Dana Whitfield", "Agree. Make Skip for now a real button, not a text link."],
      [9, 30, "Priya Natarajan", "Noted. I will move calendar connection after the first meeting."],
    ]),
    chapter("Empty states", [
      [15, 0, "Dana Whitfield", "The recordings empty state says nothing about how recording works."],
      [16, 40, "Jordan Reyes", "Let us explain the pipeline in one line and link to storage settings."],
      [18, 10, "Dana Whitfield", "And make starting a meeting the primary action."],
    ]),
    chapter("Decisions", [
      [25, 0, "Scribe", "Decisions so far: calendar connection moves after the first meeting, and the recordings empty state explains the pipeline."],
      [26, 30, "Priya Natarajan", "That is right. I will update the file by Friday."],
      [29, 40, "Jordan Reyes", "Thanks all. The summary goes out when we end."],
    ]),
  ],
  "vendor-call-1002": [
    chapter("Introductions", [
      [0, 8, "Jordan Reyes", "Thanks for making time. We want to understand the vendor security posture before we renew."],
      [1, 0, "Dana Whitfield", "I will cover compliance. Marcus has the infrastructure questions."],
    ]),
    chapter("SOC 2 scope", [
      [8, 0, "Marcus Oyelaran", "Does the SOC 2 report cover the media servers, or only the web app?"],
      [9, 30, "Dana Whitfield", "Both, per the latest report. I will share the bridge letter for the gap period."],
      [10, 45, "Researcher", "The vendor questionnaire in the meeting knowledge lists media servers as in-scope systems in section 4."],
    ]),
    chapter("Data residency", [
      [21, 40, "Marcus Oyelaran", "Can recordings stay in our own bucket?"],
      [23, 0, "Jordan Reyes", "Yes. This account uses bring-your-own storage, so files land in our R2 bucket."],
      [24, 15, "Dana Whitfield", "Then residency follows your bucket region."],
    ]),
    chapter("Incident response", [
      [35, 0, "Marcus Oyelaran", "What is the notification window for incidents?"],
      [36, 20, "Dana Whitfield", "Seventy-two hours contractually, faster in practice. I will send the runbook summary."],
    ]),
    chapter("Follow-ups", [
      [46, 40, "Jordan Reyes", "Owners: Dana sends the bridge letter and runbook summary, Marcus reviews both, and I will hold the summary for review before it goes out."],
      [48, 10, "Marcus Oyelaran", "Works for me."],
    ]),
  ],
};

export const SUMMARIES: Readonly<Record<string, RecordingSummary>> = {
  "partner-onboarding-1014": {
    paragraphs: [
      "Jordan, Avery and Marcus agreed on a two-phase rollout for the partner integration: sandbox access first, then production once the security review closes.",
      "The integration starts with read-only scopes plus webhook registration. The partner tier is priced per workspace; written terms follow by email.",
    ],
    decisions: ["Two-phase rollout: sandbox first, production after the security review.", "Start with read-only scopes plus webhook registration.", "The production date stays open until the review closes."],
    actions: [
      { text: "Send partner terms in writing", owner: "Jordan Reyes", due: "Oct 15", done: true },
      { text: "Issue sandbox credentials", owner: "Jordan Reyes", due: "Oct 19", done: false },
      { text: "Confirm required API scopes", owner: "Marcus Oyelaran", due: "Oct 20", done: false },
      { text: "Schedule the security review", owner: "Avery Chen", due: "Oct 23", done: false },
    ],
  },
  "design-crit-1009": {
    paragraphs: [
      "The team reviewed the new onboarding flow and the recordings empty state before engineering handoff.",
      "Calendar connection moves after a person’s first meeting, with a real Skip for now button. The recordings empty state will explain the recording pipeline and lead with starting a meeting.",
    ],
    decisions: ["Calendar connection moves after the first meeting.", "Skip for now becomes a button.", "The recordings empty state explains the pipeline and links to storage settings."],
    actions: [
      { text: "Rewrite recordings empty state copy", owner: "Dana Whitfield", due: "Oct 12", done: true },
      { text: "Update the onboarding flow file", owner: "Priya Natarajan", due: "Oct 16", done: false },
      { text: "Review the revised flow", owner: "Jordan Reyes", due: "Oct 20", done: false },
    ],
  },
  "vendor-call-1002": {
    paragraphs: [
      "Security review with the vendor ahead of renewal. Their SOC 2 report covers both the web app and media servers; a bridge letter covers the gap period.",
      "Recordings for this account stay in the team’s own R2 bucket, so data residency follows that bucket’s region. Contractual incident notification is 72 hours.",
    ],
    decisions: ["Keep bring-your-own storage for this account.", "Hold this summary for host review before delivery."],
    actions: [
      { text: "Send the SOC 2 bridge letter", owner: "Dana Whitfield", due: "Oct 6", done: false },
      { text: "Send the incident runbook summary", owner: "Dana Whitfield", due: "Oct 7", done: false },
      { text: "Review bridge letter and runbook", owner: "Marcus Oyelaran", due: "Oct 9", done: false },
    ],
  },
};

export const DELIVERY_RECEIPTS: Readonly<Record<string, DeliveryReceipts>> = {
  "partner-onboarding-1014": {
    "Jordan Reyes": { email: "Opened" },
    "Avery Chen": { email: "Opened", sms: "Delivered" },
    "Marcus Oyelaran": { email: "Bounced", sms: "Delivered" },
  },
  "design-crit-1009": {
    "Jordan Reyes": { email: "Opened" },
    "Priya Natarajan": { email: "Delivered", sms: "Delivered" },
    "Dana Whitfield": { email: "Opened", sms: "Delivered" },
  },
  "vendor-call-1002": {
    "Jordan Reyes": { email: "Held for review" },
    "Marcus Oyelaran": { email: "Held for review", sms: "Held for review" },
    "Dana Whitfield": { email: "Held for review", sms: "Held for review" },
  },
};
