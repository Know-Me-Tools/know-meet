// TJ-ARCH-MOB-001 compliant
import '../domain/recording.dart';

/// Sample summaries (fictional; recordings.html `SUMMARIES`).
const Map<String, RecordingSummary> sampleSummaries = <String, RecordingSummary>{
  'partner-onboarding-1014': RecordingSummary(
    paragraphs: <String>[
      'Jordan, Avery and Marcus agreed on a two-phase rollout for the partner integration: sandbox access first, then production once the security review closes.',
      'The integration starts with read-only scopes plus webhook registration. The partner tier is priced per workspace; written terms follow by email.',
    ],
    decisions: <String>[
      'Two-phase rollout: sandbox first, production after the security review.',
      'Start with read-only scopes plus webhook registration.',
      'The production date stays open until the review closes.',
    ],
    actions: <ActionItem>[
      ActionItem('Send partner terms in writing', 'Jordan Reyes', 'Oct 15', done: true),
      ActionItem('Issue sandbox credentials', 'Jordan Reyes', 'Oct 19'),
      ActionItem('Confirm required API scopes', 'Marcus Oyelaran', 'Oct 20'),
      ActionItem('Schedule the security review', 'Avery Chen', 'Oct 23'),
    ],
  ),
  'design-crit-1009': RecordingSummary(
    paragraphs: <String>[
      'The team reviewed the new onboarding flow and the recordings empty state before engineering handoff.',
      'Calendar connection moves after a person’s first meeting, with a real Skip for now button. The recordings empty state will explain the recording pipeline and lead with starting a meeting.',
    ],
    decisions: <String>[
      'Calendar connection moves after the first meeting.',
      'Skip for now becomes a button.',
      'The recordings empty state explains the pipeline and links to storage settings.',
    ],
    actions: <ActionItem>[
      ActionItem('Rewrite recordings empty state copy', 'Dana Whitfield', 'Oct 12', done: true),
      ActionItem('Update the onboarding flow file', 'Priya Natarajan', 'Oct 16'),
      ActionItem('Review the revised flow', 'Jordan Reyes', 'Oct 20'),
    ],
  ),
  'vendor-call-1002': RecordingSummary(
    paragraphs: <String>[
      'Security review with the vendor ahead of renewal. Their SOC 2 report covers both the web app and media servers; a bridge letter covers the gap period.',
      'Recordings for this account stay in the team’s own R2 bucket, so data residency follows that bucket’s region. Contractual incident notification is 72 hours.',
    ],
    decisions: <String>[
      'Keep bring-your-own storage for this account.',
      'Hold this summary for host review before delivery.',
    ],
    actions: <ActionItem>[
      ActionItem('Send the SOC 2 bridge letter', 'Dana Whitfield', 'Oct 6'),
      ActionItem('Send the incident runbook summary', 'Dana Whitfield', 'Oct 7'),
      ActionItem('Review bridge letter and runbook', 'Marcus Oyelaran', 'Oct 9'),
    ],
  ),
};
