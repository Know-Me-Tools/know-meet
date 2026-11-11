// TJ-ARCH-MOB-001 compliant
import '../domain/home_content.dart';

/// The prototype's home content (docs/design/prototype/index.html).
final class StaticHomeContentRepository implements HomeContentRepository {
  const StaticHomeContentRepository();

  @override
  HomeContent load() => _content;
}

const HomeContent _content = HomeContent(
  sampleCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  agents: <AgentTeaser>[
    AgentTeaser('SC', 'Scribe', 'Notes, decisions, action items'),
    AgentTeaser('RS', 'Researcher', 'Cited answers from meeting knowledge'),
    AgentTeaser('FA', 'Facilitator', 'Agenda and time boxes'),
    AgentTeaser('TR', 'Translator', 'Live speech and captions'),
  ],
  capabilities: <CapabilityRow>[
    CapabilityRow(capability: 'Start or join a meeting', guestIncluded: true),
    CapabilityRow(
      capability: 'Concierge agent',
      note: 'The system agent in every room',
      guestIncluded: true,
    ),
    CapabilityRow(
      capability: 'Live transcription',
      guestIncluded: true,
      guestNote: 'Deleted when the meeting ends',
      signedInNote: 'Saved with the meeting',
    ),
    CapabilityRow(
      capability: 'Phone dial-in for invitees',
      note: 'Audio-only, via PIN',
      guestIncluded: true,
    ),
    CapabilityRow(
      capability: 'Registered agents',
      note: 'Scribe, Researcher, Facilitator, Translator, your own',
      guestIncluded: false,
    ),
    CapabilityRow(
      capability: 'Your dot and private agent panel',
      note: 'Iris, with private memory',
      guestIncluded: false,
    ),
    CapabilityRow(capability: 'Uploads to meeting knowledge', guestIncluded: false),
    CapabilityRow(
      capability: 'Recording',
      note: 'LiveKit Room Composite egress, MP4 or HLS',
      guestIncluded: false,
    ),
    CapabilityRow(
      capability: 'Transcript, summary and action items sent at close',
      note: 'Email and SMS',
      guestIncluded: false,
    ),
    CapabilityRow(
      capability: 'Recordings library',
      note: 'S3-compatible storage, pinned to IPFS',
      guestIncluded: false,
    ),
    CapabilityRow(
      capability: 'Scheduling and calendar connections',
      note: 'Google, Microsoft 365, iCloud / CalDAV',
      guestIncluded: false,
    ),
    CapabilityRow(capability: 'Settings and delivery preferences', guestIncluded: false),
  ],
  flow: <FlowStep>[
    FlowStep(
      number: '01',
      title: 'Schedule & invite',
      body:
          'Pick a time, add people by email or phone, and choose which agents join. Invites go out by email, SMS and calendar.',
      linkLabel: 'Schedule form',
      location: '/dashboard/schedule',
    ),
    FlowStep(
      number: '02',
      title: 'Meet with agents',
      body:
          'Your dot and the Concierge are already there. Dispatch Scribe, Researcher or others whenever you need them.',
      linkLabel: 'Add an agent',
      location: '/meet/room',
    ),
    FlowStep(
      number: '03',
      title: 'Record & transcribe',
      body:
          'The transcript builds as you talk. Start a Room Composite recording when everyone has agreed.',
      linkLabel: 'Live transcript',
      location: '/meet/room',
    ),
    FlowStep(
      number: '04',
      title: 'Summary delivered',
      body:
          'On close: recording finalized to S3, pinned to IPFS, summary written and sent to every participant.',
      linkLabel: 'After the meeting',
      location: '/recordings/processing/partner-onboarding-1014',
    ),
  ],
);
