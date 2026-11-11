// TJ-ARCH-MOB-001 compliant

/// What kind of participant a room tile shows (prototype meet.html tiles).
enum RoomParticipantKind { human, dot, agent }

/// An agent's or dot's activity state (`[data-state]`).
enum RoomAgentState { listening, thinking, speaking, paused }

/// One participant in the room. Pure Dart: no Flutter or LiveKit types, so
/// the realtime adapter (realtime phase) can produce it from any SDK.
final class RoomParticipant {
  const RoomParticipant({
    required this.id,
    required this.name,
    required this.kind,
    this.isSelf = false,
    this.isHost = false,
    this.muted = false,
    this.owner,
    this.mine = false,
    this.cyan = false,
    this.system = false,
    this.role,
    this.mono,
    this.state = RoomAgentState.listening,
  });

  final String id;
  final String name;
  final RoomParticipantKind kind;
  final bool isSelf;
  final bool isHost;
  final bool muted;

  /// Dots: whose dot this is ("Your dot", "Avery’s dot").
  final String? owner;

  /// Dots: the viewer's own dot (pausable).
  final bool mine;

  /// Dots: rendered in the agent colour.
  final bool cyan;

  /// Agents: the system agent (the Concierge).
  final bool system;

  /// Agents: role shown in the tile chip ("Note-taker").
  final String? role;

  /// Agents: two-letter glyph.
  final String? mono;
  final RoomAgentState state;

  /// Up to two initials of [name].
  String get initials {
    final List<String> parts = name
        .split(' ')
        .where((String s) => s.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    final String last = parts.length > 1 ? parts.last.substring(0, 1) : '';
    return (parts.first.substring(0, 1) + last).toUpperCase();
  }
}

/// The room as the static layout renders it: title, code, roster and the
/// local controls' state. Media itself is out of scope this phase.
final class RoomSnapshot {
  const RoomSnapshot({
    required this.title,
    required this.code,
    required this.guest,
    required this.transcribing,
    required this.participants,
    required this.micOn,
    required this.cameraOn,
    required this.captionsOn,
    required this.recording,
    required this.joinedNotice,
  });

  final String title;
  final String code;

  /// The viewer joined without an account (`#room-guest`).
  final bool guest;
  final bool transcribing;
  final List<RoomParticipant> participants;
  final bool micOn;
  final bool cameraOn;
  final bool captionsOn;
  final bool recording;

  /// The "You joined…" notice, or null.
  final String? joinedNotice;

  /// Header status line, e.g. "Transcribing · 8 in room · km-4fq-82x".
  String get statusLine {
    final String transcript = !transcribing
        ? 'Not transcribing'
        : (guest ? 'Transcribing (deleted at end)' : 'Transcribing');
    return '$transcript · ${participants.length} in room · $code';
  }
}
