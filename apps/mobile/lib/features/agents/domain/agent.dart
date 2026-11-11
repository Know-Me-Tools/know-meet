// TJ-ARCH-MOB-001 compliant

/// Whether a registered agent's LiveKit worker is connected right now.
enum AgentStatus { online, offline }

/// What an agent may do with the room's media (prototype `MEDIA`).
enum AgentMedia {
  speak('Speak and listen', 'Hears the room and can talk. Can also post to meeting chat.'),
  listen('Listen only', 'Hears the room and reads granted knowledge. Never speaks or posts.'),
  chat('Chat only', 'Hears the room and replies in meeting chat, never out loud.');

  const AgentMedia(this.label, this.description);

  final String label;
  final String description;
}

/// Knowledge an agent may read (prototype `KNOWLEDGE`).
enum AgentKnowledge {
  shared(
    'Shared meeting knowledge',
    'Includes the live transcript and anything participants add to the meeting’s knowledge.',
  ),
  files(
    'Shared knowledge plus host-only files',
    'Also reads files the host has kept private to their own agents.',
  ),
  none('None', 'Gets no transcript or files from KnowMe. Works only from what it hears.');

  const AgentKnowledge(this.label, this.description);

  final String label;
  final String description;
}

/// Who may dispatch an agent (prototype `DISPATCH`; [system] is the
/// Concierge, which is never dispatched by anyone).
enum AgentDispatch {
  me('Only me', 'Only you can bring it into meetings you host.'),
  anyone('Anyone in meetings I host', 'Any participant in a meeting you host can dispatch it.'),
  system('Automatic — present in every meeting', '');

  const AgentDispatch(this.label, this.description);

  final String label;
  final String description;
}

/// When an agent joins on its own (prototype `AUTOJOIN`; [always] is the
/// Concierge).
enum AgentAutoJoin {
  never('Never — on request', 'Joins only when someone dispatches it.'),
  mine('My meetings', 'Joins every meeting you host as soon as it starts.'),
  tagged('Meetings tagged…', 'Joins meetings you host that carry a tag you choose.'),
  always('Joins every meeting automatically', '');

  const AgentAutoJoin(this.label, this.description);

  final String label;
  final String description;
}

/// The LiveKit project a worker connects to.
enum AgentProject { managed, own }

/// A registered LiveKit Agents worker, or the system Concierge.
final class Agent {
  const Agent({
    required this.id,
    required this.name,
    required this.role,
    required this.worker,
    required this.mono,
    required this.status,
    required this.owner,
    required this.description,
    required this.media,
    required this.knowledge,
    required this.dispatch,
    required this.autoJoin,
    this.system = false,
    this.project = AgentProject.managed,
    this.projectUrl,
    this.tag,
  });

  final String id;
  final String name;
  final String role;

  /// The `agent_name` KnowMe dispatches the worker by.
  final String worker;

  /// Two glyph letters for the agent tile.
  final String mono;
  final AgentStatus status;
  final String owner;
  final String description;
  final AgentMedia media;
  final AgentKnowledge knowledge;
  final AgentDispatch dispatch;
  final AgentAutoJoin autoJoin;
  final bool system;
  final AgentProject project;

  /// Own-project URL; null for the managed project.
  final String? projectUrl;

  /// Meeting tag for [AgentAutoJoin.tagged].
  final String? tag;

  bool get online => status == AgentStatus.online;

  /// The auto-join rule in words (prototype `autoJoinText`).
  String get autoJoinText => switch (autoJoin) {
    AgentAutoJoin.always => 'Joins every meeting automatically',
    AgentAutoJoin.tagged => 'Joins meetings tagged “${tag ?? '—'}”',
    _ => autoJoin.label,
  };
}

/// How one dispatch went (prototype `OUTCOME`).
enum DispatchOutcome {
  live('In meeting now'),
  done('Completed'),
  failed('Worker offline — not joined');

  const DispatchOutcome(this.label);

  final String label;
}

/// One past or current dispatch of an agent into a meeting.
final class AgentDispatchRecord {
  const AgentDispatchRecord({
    required this.meeting,
    required this.outcome,
    this.date,
    this.minutes,
  });

  final String meeting;

  /// Null for the live dispatch, whose start is the live meeting's start.
  final DateTime? date;
  final int? minutes;
  final DispatchOutcome outcome;
}
