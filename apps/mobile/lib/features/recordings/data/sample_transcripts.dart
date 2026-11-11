// TJ-ARCH-MOB-001 compliant
import '../domain/recording.dart';

// Sample transcripts (fictional; recordings.html `TRANSCRIPTS`).

int _s(int m, int s) => m * 60 + s;

final Map<String, List<TranscriptChapter>> sampleTranscripts =
    <String, List<TranscriptChapter>>{
  'partner-onboarding-1014': <TranscriptChapter>[
    TranscriptChapter('Welcome and agenda', <TranscriptLine>[
      TranscriptLine(_s(0, 5), 'Jordan Reyes', 'Thanks for joining. Today we want to walk through the integration timeline, confirm data access, and leave with an owner for each next step.'),
      TranscriptLine(_s(0, 48), 'Avery Chen', 'Sounds good. Marcus is leading the technical work on our side, so I will mostly listen in on timeline.'),
      TranscriptLine(_s(1, 30), 'Marcus Oyelaran', 'I sent the API questions ahead of time. Happy to start there if that helps.'),
    ]),
    TranscriptChapter('Integration timeline', <TranscriptLine>[
      TranscriptLine(_s(7, 0), 'Jordan Reyes', 'Our proposal is a two-phase rollout: sandbox access next week, production after the security review.'),
      TranscriptLine(_s(8, 15), 'Avery Chen', 'Two phases works. Can we hold the production date until the review closes rather than fixing it now?'),
      TranscriptLine(_s(9, 40), 'Marcus Oyelaran', 'Sandbox next week is realistic if we get credentials by Monday.'),
      TranscriptLine(_s(10, 30), 'Jordan Reyes', 'I will issue sandbox credentials Monday morning.'),
    ]),
    TranscriptChapter('Data access and permissions', <TranscriptLine>[
      TranscriptLine(_s(19, 40), 'Marcus Oyelaran', 'Which scopes does the integration need? We would like read-only to start.'),
      TranscriptLine(_s(20, 55), 'Researcher', 'From the shared partner guide: read-only scopes cover the reporting endpoints. Write access is only needed for webhook registration.', agent: true),
      TranscriptLine(_s(22, 10), 'Avery Chen', 'Then read-only plus webhook registration. Let us document that in the onboarding checklist.'),
    ]),
    TranscriptChapter('Commercial questions', <TranscriptLine>[
      TranscriptLine(_s(31, 40), 'Avery Chen', 'Is the partner tier priced per seat or per workspace?'),
      TranscriptLine(_s(32, 30), 'Jordan Reyes', 'Per workspace. I will send the current partner terms after the call so you have them in writing.'),
      TranscriptLine(_s(34, 5), 'Marcus Oyelaran', 'That keeps our procurement simple.'),
    ]),
    TranscriptChapter('Next steps', <TranscriptLine>[
      TranscriptLine(_s(41, 0), 'Jordan Reyes', 'Recapping owners: I send credentials and partner terms, Marcus confirms scopes, Avery schedules the security review.'),
      TranscriptLine(_s(42, 20), 'Avery Chen', 'Agreed. I will book the review for the week after sandbox access.'),
      TranscriptLine(_s(44, 45), 'Jordan Reyes', 'Great. Scribe will send the summary and transcript to everyone when we close.'),
    ]),
  ],
  'design-crit-1009': <TranscriptChapter>[
    TranscriptChapter('Context', <TranscriptLine>[
      TranscriptLine(_s(0, 10), 'Priya Natarajan', 'Goal today is feedback on the new onboarding flow before we hand off to engineering.'),
      TranscriptLine(_s(1, 5), 'Dana Whitfield', 'I have notes on the empty states, so let us leave time for those.'),
      TranscriptLine(_s(1, 50), 'Jordan Reyes', 'I will keep time: fifteen minutes on the flow, ten on empty states.'),
    ]),
    TranscriptChapter('Onboarding flow', <TranscriptLine>[
      TranscriptLine(_s(5, 0), 'Priya Natarajan', 'Step two asks for a calendar connection. Is that too early?'),
      TranscriptLine(_s(6, 20), 'Jordan Reyes', 'It is early for guests. Signed-out people should be able to skip it entirely.'),
      TranscriptLine(_s(7, 45), 'Dana Whitfield', 'Agree. Make Skip for now a real button, not a text link.'),
      TranscriptLine(_s(9, 30), 'Priya Natarajan', 'Noted. I will move calendar connection after the first meeting.'),
    ]),
    TranscriptChapter('Empty states', <TranscriptLine>[
      TranscriptLine(_s(15, 0), 'Dana Whitfield', 'The recordings empty state says nothing about how recording works.'),
      TranscriptLine(_s(16, 40), 'Jordan Reyes', 'Let us explain the pipeline in one line and link to storage settings.'),
      TranscriptLine(_s(18, 10), 'Dana Whitfield', 'And make starting a meeting the primary action.'),
    ]),
    TranscriptChapter('Decisions', <TranscriptLine>[
      TranscriptLine(_s(25, 0), 'Scribe', 'Decisions so far: calendar connection moves after the first meeting, and the recordings empty state explains the pipeline.', agent: true),
      TranscriptLine(_s(26, 30), 'Priya Natarajan', 'That is right. I will update the file by Friday.'),
      TranscriptLine(_s(29, 40), 'Jordan Reyes', 'Thanks all. The summary goes out when we end.'),
    ]),
  ],
  'vendor-call-1002': <TranscriptChapter>[
    TranscriptChapter('Introductions', <TranscriptLine>[
      TranscriptLine(_s(0, 8), 'Jordan Reyes', 'Thanks for making time. We want to understand the vendor security posture before we renew.'),
      TranscriptLine(_s(1, 0), 'Dana Whitfield', 'I will cover compliance. Marcus has the infrastructure questions.'),
    ]),
    TranscriptChapter('SOC 2 scope', <TranscriptLine>[
      TranscriptLine(_s(8, 0), 'Marcus Oyelaran', 'Does the SOC 2 report cover the media servers, or only the web app?'),
      TranscriptLine(_s(9, 30), 'Dana Whitfield', 'Both, per the latest report. I will share the bridge letter for the gap period.'),
      TranscriptLine(_s(10, 45), 'Researcher', 'The vendor questionnaire in the meeting knowledge lists media servers as in-scope systems in section 4.', agent: true),
    ]),
    TranscriptChapter('Data residency', <TranscriptLine>[
      TranscriptLine(_s(21, 40), 'Marcus Oyelaran', 'Can recordings stay in our own bucket?'),
      TranscriptLine(_s(23, 0), 'Jordan Reyes', 'Yes. This account uses bring-your-own storage, so files land in our R2 bucket.'),
      TranscriptLine(_s(24, 15), 'Dana Whitfield', 'Then residency follows your bucket region.'),
    ]),
    TranscriptChapter('Incident response', <TranscriptLine>[
      TranscriptLine(_s(35, 0), 'Marcus Oyelaran', 'What is the notification window for incidents?'),
      TranscriptLine(_s(36, 20), 'Dana Whitfield', 'Seventy-two hours contractually, faster in practice. I will send the runbook summary.'),
    ]),
    TranscriptChapter('Follow-ups', <TranscriptLine>[
      TranscriptLine(_s(46, 40), 'Jordan Reyes', 'Owners: Dana sends the bridge letter and runbook summary, Marcus reviews both, and I will hold the summary for review before it goes out.'),
      TranscriptLine(_s(48, 10), 'Marcus Oyelaran', 'Works for me.'),
    ]),
  ],
};
