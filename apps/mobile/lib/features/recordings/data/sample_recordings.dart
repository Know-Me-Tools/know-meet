// TJ-ARCH-MOB-001 compliant
import '../domain/recording.dart';

/// Sample recordings (fictional; prototype km.js `buildData().recordings`
/// joined with recordings.html `META`). Dates are fixed in the prototype,
/// so they do not move with the clock.
const RecordingAgent _scribe = RecordingAgent('Scribe', 'SC');
const RecordingAgent _researcher = RecordingAgent('Researcher', 'RS');

final List<Recording> sampleRecordings = <Recording>[
  Recording(
    id: 'partner-onboarding-1014',
    title: 'Partner onboarding review',
    date: DateTime(2026, 10, 14, 16),
    durationMin: 46,
    format: 'mp4',
    layout: RecordingLayout.speaker,
    storage: RecordingStorage.managed,
    bucket: 'knowme-meet-recordings',
    path: 'knowme-meet-recordings/2026/10/14/partner-onboarding-1014.mp4',
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    sizeBytes: 432013312,
    summarySent: true,
    transcriptWords: 6910,
    participants: const <String>['Jordan Reyes', 'Avery Chen', 'Marcus Oyelaran'],
    agents: const <RecordingAgent>[_scribe, _researcher],
    owner: RecordingOwner.mine,
    host: 'Jordan Reyes',
    resolution: '1920 × 1080 (1080p, 30 fps)',
    provider: 'KnowMe-managed · S3-compatible',
    endpoint: 'Managed by KnowMe (not exposed)',
    region: 'us-west',
    checksum: 'sha256:9f2c41e7b0d85a36c1fe4b92d7a03e5c8b61f04d2a97c3e815b6d0f4a2c7e913',
    pin: 'Pinned via KnowMe pinning',
    retention: '365 days · until Oct 14, 2027',
  ),
  Recording(
    id: 'design-crit-1009',
    title: 'Design critique',
    date: DateTime(2026, 10, 9, 11),
    durationMin: 31,
    format: 'mp4',
    layout: RecordingLayout.grid,
    storage: RecordingStorage.managed,
    bucket: 'knowme-meet-recordings',
    path: 'knowme-meet-recordings/2026/10/09/design-crit-1009.mp4',
    cid: 'bafybeihkoviema7g3gxyt6la7vd5ho32ictqbilu3wnlo3rs7ewhnp7lly',
    sizeBytes: 291504128,
    summarySent: true,
    transcriptWords: 4380,
    participants: const <String>['Jordan Reyes', 'Priya Natarajan', 'Dana Whitfield'],
    agents: const <RecordingAgent>[_scribe],
    owner: RecordingOwner.shared,
    host: 'Priya Natarajan',
    resolution: '1280 × 720 (720p, 30 fps)',
    provider: 'KnowMe-managed · S3-compatible',
    endpoint: 'Managed by KnowMe (not exposed)',
    region: 'us-west',
    checksum: 'sha256:4be0a7c15d93f26e8a01c7b4d5e2f9a63c08b7d1e4f5a29c6b3d80e7f1a4c52d',
    pin: 'Pinned via KnowMe pinning',
    retention: '365 days · until Oct 9, 2027',
  ),
  Recording(
    id: 'vendor-call-1002',
    title: 'Vendor security call',
    date: DateTime(2026, 10, 2, 15, 30),
    durationMin: 52,
    format: 'mp4',
    layout: RecordingLayout.speaker,
    storage: RecordingStorage.byo,
    bucket: 'acme-meet-archive',
    path: 'acme-meet-archive/meet/2026/10/02/vendor-call-1002.mp4',
    cid: 'bafybeie5gq4jxvzmsrq3wrk5lklbqzpmbeb3ji4s5gwzzpxrqxt2vtwgfu',
    sizeBytes: 488636416,
    summarySent: false,
    transcriptWords: 7720,
    participants: const <String>['Jordan Reyes', 'Marcus Oyelaran', 'Dana Whitfield'],
    agents: const <RecordingAgent>[_researcher],
    owner: RecordingOwner.mine,
    host: 'Jordan Reyes',
    resolution: '1920 × 1080 (1080p, 30 fps)',
    provider: 'Cloudflare R2 · your bucket',
    endpoint: 'https://acme-account.r2.cloudflarestorage.com',
    region: 'auto',
    checksum: 'sha256:c71d5e09a3f2b84e6d10a9c7f3e5b2d8a04c6e19f7b3d2a58e0c4f6b91d7a3e2',
    pin: 'Pinned via your pinning service',
    retention: 'Forever · governed by your bucket policy',
  ),
];

/// Contact details used by the delivery table (km.js `people` + `user`).
const Map<String, (String email, String? phone)> sampleContacts =
    <String, (String, String?)>{
      'Jordan Reyes': ('jordan.reyes@know-me.tools', null),
      'Avery Chen': ('avery.chen@northwind.io', '+1 415 555 0142'),
      'Marcus Oyelaran': ('marcus@northwind.io', '+1 312 555 0190'),
      'Priya Natarajan': ('priya.n@lumenlabs.co', '+1 646 555 0117'),
      'Dana Whitfield': ('dana@lumenlabs.co', '+1 206 555 0163'),
    };

/// Delivery status per recording, participant and channel
/// (recordings.html `DELIVERY`). A missing SMS entry means no SMS was sent.
const Map<String, Map<String, (DeliveryStatus email, DeliveryStatus? sms)>>
sampleDelivery = <String, Map<String, (DeliveryStatus, DeliveryStatus?)>>{
  'partner-onboarding-1014': <String, (DeliveryStatus, DeliveryStatus?)>{
    'Jordan Reyes': (DeliveryStatus.opened, null),
    'Avery Chen': (DeliveryStatus.opened, DeliveryStatus.delivered),
    'Marcus Oyelaran': (DeliveryStatus.bounced, DeliveryStatus.delivered),
  },
  'design-crit-1009': <String, (DeliveryStatus, DeliveryStatus?)>{
    'Jordan Reyes': (DeliveryStatus.opened, null),
    'Priya Natarajan': (DeliveryStatus.delivered, DeliveryStatus.delivered),
    'Dana Whitfield': (DeliveryStatus.opened, DeliveryStatus.delivered),
  },
  'vendor-call-1002': <String, (DeliveryStatus, DeliveryStatus?)>{
    'Jordan Reyes': (DeliveryStatus.heldForReview, null),
    'Marcus Oyelaran': (DeliveryStatus.heldForReview, DeliveryStatus.heldForReview),
    'Dana Whitfield': (DeliveryStatus.heldForReview, DeliveryStatus.heldForReview),
  },
};
