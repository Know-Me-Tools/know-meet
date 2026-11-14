// TJ-ARCH-MOB-001 compliant

/// Where a meeting came from (prototype `SOURCE`).
enum MeetingSource { google, outlook, knowme }

/// A meeting's status relative to now (prototype `meetingStatus`).
enum MeetingStatus { upcoming, live, ended }

/// Phone dial-in details for a meeting room.
final class DialIn {
  const DialIn({required this.number, required this.pin});

  final String number;
  final String pin;
}

/// One public dial-in number (Telnyx inbound).
final class DialInNumber {
  const DialInNumber({required this.number, required this.region});

  final String number;
  final String region;
}

/// A document attached to the meeting's knowledge base.
final class PreRead {
  const PreRead({required this.name, required this.sizeBytes});

  final String name;
  final int sizeBytes;
}

/// A registered agent as the dashboard lists it.
final class AgentSummary {
  const AgentSummary({
    required this.id,
    required this.name,
    required this.role,
    required this.worker,
    required this.mono,
    required this.online,
    this.system = false,
  });

  final String id;
  final String name;
  final String role;
  final String worker;

  /// Two-letter glyph.
  final String mono;
  final bool online;

  /// The Concierge: always present.
  final bool system;
}

/// A person's dot (private-memory companion).
final class DotSummary {
  const DotSummary({
    required this.id,
    required this.name,
    required this.ownerLabel,
    required this.cyan,
  });

  final String id;
  final String name;
  final String ownerLabel;
  final bool cyan;
}

/// A scheduled meeting (prototype `D.meetings` merged with `BASE_EXTRA`).
final class Meeting {
  const Meeting({
    required this.id,
    required this.title,
    required this.start,
    required this.durationMin,
    required this.source,
    required this.host,
    required this.invitees,
    required this.agentIds,
    required this.dotIds,
    required this.record,
    required this.joinCode,
    required this.description,
    required this.preReads,
    this.dialIn,
    this.transcribe = true,
    this.sendSummary = true,
  });

  final String id;
  final String title;

  /// Start instant (UTC).
  final DateTime start;
  final int durationMin;
  final MeetingSource source;
  final String host;
  final List<String> invitees;
  final List<String> agentIds;
  final List<String> dotIds;
  final bool record;
  final bool transcribe;
  final bool sendSummary;
  final String joinCode;
  final String description;
  final List<PreRead> preReads;
  final DialIn? dialIn;

  DateTime get end => start.add(Duration(minutes: durationMin));

  /// Status at [now].
  MeetingStatus statusAt(DateTime now) {
    if (now.isBefore(start)) return MeetingStatus.upcoming;
    if (!now.isAfter(end)) return MeetingStatus.live;
    return MeetingStatus.ended;
  }

  /// Whether [user] (display name) hosts this meeting.
  bool isHostedBy(String user) => host == user;
}
