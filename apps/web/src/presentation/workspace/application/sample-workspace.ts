// TJ-ARCH-MOB-001 compliant
// Static fixture builder (no network): km.js `buildData()` ported field for field.
// Meeting times are derived from `now` exactly as the prototype does, so the
// fidelity capture's frozen clock (capture-environment.ts) yields the same views.
import type {
  Agent,
  DialIn,
  Dot,
  Meeting,
  Person,
  Recording,
  Workspace,
} from "../domain/workspace";

const MINUTE_MS = 60_000;

function at(now: Date, dayOffset: number, hours: number, minutes: number): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    hours,
    minutes,
    0,
    0,
  );
}

/** Live now: started ~18 min ago, rounded down to 5 min. */
function liveStartFor(now: Date): Date {
  return new Date(Math.floor((now.getTime() - 18 * MINUTE_MS) / (5 * MINUTE_MS)) * 5 * MINUTE_MS);
}

/** Later today: ~90 min from now on a 15-min boundary; stays today. */
function laterStartFor(now: Date): Date {
  const later = new Date(
    Math.ceil((now.getTime() + 90 * MINUTE_MS) / (15 * MINUTE_MS)) * 15 * MINUTE_MS,
  );
  return later.getDate() === now.getDate() ? later : new Date(now.getTime() + 10 * MINUTE_MS);
}

const DIAL_IN: DialIn = { number: "+1 (415) 555-0199", pin: "482 913 07" };

const PEOPLE: readonly Person[] = [
  {
    id: "avery",
    name: "Avery Chen",
    email: "avery.chen@northwind.io",
    phone: "+1 415 555 0142",
    org: "Northwind",
    initials: "AC",
  },
  {
    id: "marcus",
    name: "Marcus Oyelaran",
    email: "marcus@northwind.io",
    phone: "+1 312 555 0190",
    org: "Northwind",
    initials: "MO",
  },
  {
    id: "priya",
    name: "Priya Natarajan",
    email: "priya.n@lumenlabs.co",
    phone: "+1 646 555 0117",
    org: "Lumen Labs",
    initials: "PN",
  },
  {
    id: "dana",
    name: "Dana Whitfield",
    email: "dana@lumenlabs.co",
    phone: "+1 206 555 0163",
    org: "Lumen Labs",
    initials: "DW",
  },
];

const AGENTS: readonly Agent[] = [
  {
    id: "concierge",
    name: "Concierge",
    role: "Guide",
    worker: "knowme-concierge",
    mono: "CG",
    system: true,
    status: "online",
    owner: "KnowMe",
    desc: "Greets guests, explains the room, and routes questions to the right agent. Always present.",
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "Note-taker",
    worker: "scribe-notes",
    mono: "SC",
    system: false,
    status: "online",
    owner: "Jordan Reyes",
    desc: "Keeps live notes, decisions and action items, then sends the summary after the call.",
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Research",
    worker: "kb-researcher",
    mono: "RS",
    system: false,
    status: "online",
    owner: "Avery Chen",
    desc: "Answers questions from the meeting’s shared knowledge with cited sources.",
  },
  {
    id: "facilitator",
    name: "Facilitator",
    role: "Facilitation",
    worker: "agenda-facilitator",
    mono: "FA",
    system: false,
    status: "online",
    owner: "Jordan Reyes",
    desc: "Tracks the agenda and time boxes, and nudges the group when a topic runs long.",
  },
  {
    id: "translator",
    name: "Translator",
    role: "Live translation",
    worker: "live-translate",
    mono: "TR",
    system: false,
    status: "offline",
    owner: "Priya Natarajan",
    desc: "Speaks and captions the conversation in another language in real time.",
  },
];

const RECORDINGS: readonly Recording[] = [
  {
    id: "partner-onboarding-1014",
    meetingId: "partner-onboarding",
    title: "Partner onboarding review",
    date: "2026-10-14T16:00:00",
    durationMin: 46,
    format: "mp4",
    layout: "speaker",
    storage: "s3",
    bucket: "knowme-meet-recordings",
    path: "knowme-meet-recordings/2026/10/14/partner-onboarding-1014.mp4",
    cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    sizeBytes: 432013312,
    summarySent: true,
    transcriptWords: 6910,
    participants: ["Jordan Reyes", "Avery Chen", "Marcus Oyelaran"],
    agents: ["concierge", "scribe", "researcher"],
  },
  {
    id: "design-crit-1009",
    meetingId: null,
    title: "Design critique",
    date: "2026-10-09T11:00:00",
    durationMin: 31,
    format: "mp4",
    layout: "grid",
    storage: "s3",
    bucket: "knowme-meet-recordings",
    path: "knowme-meet-recordings/2026/10/09/design-crit-1009.mp4",
    cid: "bafybeihkoviema7g3gxyt6la7vd5ho32ictqbilu3wnlo3rs7ewhnp7lly",
    sizeBytes: 291504128,
    summarySent: true,
    transcriptWords: 4380,
    participants: ["Jordan Reyes", "Priya Natarajan", "Dana Whitfield"],
    agents: ["concierge", "scribe"],
  },
  {
    id: "vendor-call-1002",
    meetingId: null,
    title: "Vendor security call",
    date: "2026-10-02T15:30:00",
    durationMin: 52,
    format: "mp4",
    layout: "speaker",
    storage: "byo",
    bucket: "acme-meet-archive",
    path: "acme-meet-archive/meet/2026/10/02/vendor-call-1002.mp4",
    cid: "bafybeie5gq4jxvzmsrq3wrk5lklbqzpmbeb3ji4s5gwzzpxrqxt2vtwgfu",
    sizeBytes: 488636416,
    summarySent: false,
    transcriptWords: 7720,
    participants: ["Jordan Reyes", "Marcus Oyelaran", "Dana Whitfield"],
    agents: ["concierge", "researcher"],
  },
];

const DOTS: readonly Dot[] = [
  { id: "iris", name: "Iris", owner: "you", ownerLabel: "Your dot", color: "ember" },
  { id: "sol", name: "Sol", owner: "Avery Chen", ownerLabel: "Avery’s dot", color: "cyan" },
];

function meetingsFor(now: Date): readonly Meeting[] {
  return [
    {
      id: "partner-onboarding",
      title: "Partner onboarding review",
      start: liveStartFor(now).toISOString(),
      durationMin: 60,
      source: "google",
      host: "Jordan Reyes",
      invitees: ["Avery Chen", "Marcus Oyelaran", "Priya Natarajan"],
      dialIn: DIAL_IN,
      agents: ["concierge", "scribe", "researcher"],
      record: true,
      joinCode: "km-4fq-82x",
    },
    {
      id: "cohort-kickoff",
      title: "Cohort 2 kickoff",
      start: laterStartFor(now).toISOString(),
      durationMin: 45,
      source: "outlook",
      host: "Jordan Reyes",
      invitees: ["Priya Natarajan", "Dana Whitfield"],
      dialIn: DIAL_IN,
      agents: ["concierge", "facilitator"],
      record: true,
      joinCode: "km-7td-31p",
    },
    {
      id: "product-sync",
      title: "Weekly product sync",
      start: at(now, 1, 10, 0).toISOString(),
      durationMin: 30,
      source: "knowme",
      host: "Avery Chen",
      invitees: ["Jordan Reyes", "Marcus Oyelaran"],
      dialIn: DIAL_IN,
      agents: ["concierge", "scribe"],
      record: false,
      joinCode: "km-2hn-95k",
    },
    {
      id: "pricing-review",
      title: "Pricing review",
      start: at(now, 3, 14, 0).toISOString(),
      durationMin: 60,
      source: "google",
      host: "Jordan Reyes",
      invitees: ["Avery Chen", "Priya Natarajan", "Dana Whitfield"],
      dialIn: DIAL_IN,
      agents: ["concierge", "researcher", "translator"],
      record: true,
      joinCode: "km-9wc-48m",
    },
  ];
}

/** The fictional workspace the static screens render, anchored at `now`. */
export function buildSampleWorkspace(now: Date): Workspace {
  return {
    user: { name: "Jordan Reyes", email: "jordan.reyes@know-me.tools" },
    people: PEOPLE,
    meetings: meetingsFor(now),
    recordings: RECORDINGS,
    agents: AGENTS,
    dots: DOTS,
    livekit: {
      url: "wss://knowme-23fkf8pz.livekit.cloud",
      keyVar: "LIVEKIT_API_KEY",
      secretVar: "LIVEKIT_API_SECRET",
    },
    telnyx: {
      smsFrom: "+1 (415) 555-0123",
      messagingProfile: "Know Meet invites",
      dialIn: [
        { number: "+1 (415) 555-0199", region: "US" },
        { number: "+44 20 7946 0958", region: "UK" },
      ],
      sipTrunk: "knowme-livekit-inbound",
    },
  };
}
