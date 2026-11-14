// TJ-ARCH-MOB-001 compliant
import '../application/agents_repository.dart';
import '../domain/agent.dart';
import '../domain/dot.dart';

/// Fictional sample registry from the prototype (km.js `buildData().agents`
/// merged with agents.html `CONFIG`, `ACTIVITY` and `MEMORIES`). Dates are
/// wall-clock values as the prototype writes them.
final class FixtureAgentsRepository implements AgentsRepository {
  const FixtureAgentsRepository();

  static const List<Agent> _agents = <Agent>[
    Agent(
      id: 'concierge',
      name: 'Concierge',
      role: 'Guide',
      worker: 'knowme-concierge',
      mono: 'CG',
      system: true,
      status: AgentStatus.online,
      owner: 'KnowMe',
      description:
          'Greets guests, explains the room, and routes questions to the right agent. Always present.',
      media: AgentMedia.speak,
      knowledge: AgentKnowledge.shared,
      dispatch: AgentDispatch.system,
      autoJoin: AgentAutoJoin.always,
    ),
    Agent(
      id: 'scribe',
      name: 'Scribe',
      role: 'Note-taker',
      worker: 'scribe-notes',
      mono: 'SC',
      status: AgentStatus.online,
      owner: 'Jordan Reyes',
      description:
          'Keeps live notes, decisions and action items, then sends the summary after the call.',
      media: AgentMedia.listen,
      knowledge: AgentKnowledge.shared,
      dispatch: AgentDispatch.anyone,
      autoJoin: AgentAutoJoin.mine,
    ),
    Agent(
      id: 'researcher',
      name: 'Researcher',
      role: 'Research',
      worker: 'kb-researcher',
      mono: 'RS',
      status: AgentStatus.online,
      owner: 'Avery Chen',
      description: 'Answers questions from the meeting’s shared knowledge with cited sources.',
      media: AgentMedia.speak,
      knowledge: AgentKnowledge.files,
      dispatch: AgentDispatch.me,
      autoJoin: AgentAutoJoin.never,
    ),
    Agent(
      id: 'facilitator',
      name: 'Facilitator',
      role: 'Facilitation',
      worker: 'agenda-facilitator',
      mono: 'FA',
      status: AgentStatus.online,
      owner: 'Jordan Reyes',
      description:
          'Tracks the agenda and time boxes, and nudges the group when a topic runs long.',
      media: AgentMedia.speak,
      knowledge: AgentKnowledge.shared,
      dispatch: AgentDispatch.anyone,
      autoJoin: AgentAutoJoin.tagged,
      tag: 'workshop',
    ),
    Agent(
      id: 'translator',
      name: 'Translator',
      role: 'Live translation',
      worker: 'live-translate',
      mono: 'TR',
      status: AgentStatus.offline,
      owner: 'Priya Natarajan',
      description: 'Speaks and captions the conversation in another language in real time.',
      media: AgentMedia.speak,
      knowledge: AgentKnowledge.shared,
      dispatch: AgentDispatch.me,
      autoJoin: AgentAutoJoin.never,
      project: AgentProject.own,
      projectUrl: 'wss://lumenlabs-voice.livekit.cloud',
    ),
  ];

  static final Map<String, List<AgentDispatchRecord>> _dispatches =
      <String, List<AgentDispatchRecord>>{
        'concierge': <AgentDispatchRecord>[
          const AgentDispatchRecord(meeting: 'Partner onboarding review', outcome: DispatchOutcome.live),
          AgentDispatchRecord(meeting: 'Partner onboarding review', date: DateTime(2026, 10, 14, 16), minutes: 46, outcome: DispatchOutcome.done),
          AgentDispatchRecord(meeting: 'Design critique', date: DateTime(2026, 10, 9, 11), minutes: 31, outcome: DispatchOutcome.done),
          AgentDispatchRecord(meeting: 'Vendor security call', date: DateTime(2026, 10, 2, 15, 30), minutes: 52, outcome: DispatchOutcome.done),
        ],
        'scribe': <AgentDispatchRecord>[
          const AgentDispatchRecord(meeting: 'Partner onboarding review', outcome: DispatchOutcome.live),
          AgentDispatchRecord(meeting: 'Partner onboarding review', date: DateTime(2026, 10, 14, 16), minutes: 46, outcome: DispatchOutcome.done),
          AgentDispatchRecord(meeting: 'Design critique', date: DateTime(2026, 10, 9, 11), minutes: 31, outcome: DispatchOutcome.done),
        ],
        'researcher': <AgentDispatchRecord>[
          const AgentDispatchRecord(meeting: 'Partner onboarding review', outcome: DispatchOutcome.live),
          AgentDispatchRecord(meeting: 'Partner onboarding review', date: DateTime(2026, 10, 14, 16), minutes: 38, outcome: DispatchOutcome.done),
          AgentDispatchRecord(meeting: 'Vendor security call', date: DateTime(2026, 10, 2, 15, 30), minutes: 52, outcome: DispatchOutcome.done),
        ],
        'facilitator': <AgentDispatchRecord>[
          AgentDispatchRecord(meeting: 'Weekly product sync', date: DateTime(2026, 10, 12, 10), minutes: 28, outcome: DispatchOutcome.done),
          AgentDispatchRecord(meeting: 'Weekly product sync', date: DateTime(2026, 10, 5, 10), minutes: 30, outcome: DispatchOutcome.done),
        ],
        'translator': <AgentDispatchRecord>[
          AgentDispatchRecord(meeting: 'Weekly product sync', date: DateTime(2026, 10, 12, 10), minutes: 0, outcome: DispatchOutcome.failed),
          AgentDispatchRecord(meeting: 'Design critique', date: DateTime(2026, 10, 9, 11), minutes: 24, outcome: DispatchOutcome.done),
        ],
      };

  @override
  List<Agent> agents() => _agents;

  @override
  Agent? agent(String id) {
    for (final Agent a in _agents) {
      if (a.id == id) return a;
    }
    return null;
  }

  @override
  List<AgentDispatchRecord> dispatches(String agentId) =>
      _dispatches[agentId] ?? const <AgentDispatchRecord>[];

  @override
  String get managedProjectUrl => 'wss://knowme-23fkf8pz.livekit.cloud';

  @override
  Dot myDot() => const Dot(id: 'iris', name: 'Iris', owner: 'you', mine: true);

  @override
  Dot sharedDot() => const Dot(id: 'sol', name: 'Sol', owner: 'Avery Chen', mine: false);

  @override
  List<DotMemory> memories() => <DotMemory>[
    DotMemory(
      id: 'm-1014',
      meeting: 'Partner onboarding review',
      date: DateTime(2026, 10, 14, 16, 46),
      text: 'Marcus owns the partner API checklist; you offered to review it before Friday.',
    ),
    DotMemory(
      id: 'm-1012',
      meeting: 'Weekly product sync',
      date: DateTime(2026, 10, 12, 10, 30),
      text: 'Pricing review moved to later this week; Avery will bring two options.',
    ),
    DotMemory(
      id: 'm-1009',
      meeting: 'Design critique',
      date: DateTime(2026, 10, 9, 11, 31),
      text: 'You preferred the grid layout for recordings; Dana is sharing revised mocks.',
    ),
    DotMemory(
      id: 'm-1002',
      meeting: 'Vendor security call',
      date: DateTime(2026, 10, 2, 16, 22),
      text: 'You asked to revisit data-retention terms before signing anything.',
    ),
  ];
}
