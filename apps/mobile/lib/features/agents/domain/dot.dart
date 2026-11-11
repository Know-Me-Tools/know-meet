// TJ-ARCH-MOB-001 compliant

/// A dot: a persistent personal agent with a private memory.
final class Dot {
  const Dot({
    required this.id,
    required this.name,
    required this.owner,
    required this.mine,
    this.paused = false,
    this.joinsByDefault = true,
    this.alwaysJoin = true,
    this.speaksWhenAsked = true,
    this.voice = DotVoice.warm,
    this.remembersSummaries = true,
    this.remembersConversations = true,
    this.remembersFiles = false,
  });

  final String id;
  final String name;

  /// Owner's display name ("you" for the signed-in person's own dot).
  final String owner;

  /// Whether the signed-in person owns it (can see memory and settings).
  final bool mine;
  final bool paused;
  final bool joinsByDefault;
  final bool alwaysJoin;
  final bool speaksWhenAsked;
  final DotVoice voice;
  final bool remembersSummaries;
  final bool remembersConversations;
  final bool remembersFiles;
}

/// Voices a dot can speak with (prototype `VOICES`).
enum DotVoice {
  warm('Warm (default)'),
  calm('Calm'),
  bright('Bright'),
  low('Low');

  const DotVoice(this.label);

  final String label;
}

/// One memory a dot kept from a meeting.
final class DotMemory {
  const DotMemory({
    required this.id,
    required this.meeting,
    required this.date,
    required this.text,
  });

  final String id;
  final String meeting;
  final DateTime date;
  final String text;
}
