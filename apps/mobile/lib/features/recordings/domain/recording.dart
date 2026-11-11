// TJ-ARCH-MOB-001 compliant

/// Room Composite layout of a recording.
enum RecordingLayout { speaker, grid }

/// Where the file lives: KnowMe-managed S3-compatible storage, or the
/// team's own bucket ("bring your own").
enum RecordingStorage { managed, byo }

/// Whose recording it is, for the library's Show filter.
enum RecordingOwner { mine, shared }

/// A recorded meeting (prototype km.js `recordings` + recordings.html META).
final class Recording {
  const Recording({
    required this.id,
    required this.title,
    required this.date,
    required this.durationMin,
    required this.format,
    required this.layout,
    required this.storage,
    required this.bucket,
    required this.path,
    required this.cid,
    required this.sizeBytes,
    required this.summarySent,
    required this.transcriptWords,
    required this.participants,
    required this.agents,
    required this.owner,
    required this.host,
    required this.resolution,
    required this.provider,
    required this.endpoint,
    required this.region,
    required this.checksum,
    required this.pin,
    required this.retention,
  });

  final String id;
  final String title;

  /// Wall-clock start, as the prototype shows it.
  final DateTime date;
  final int durationMin;
  final String format;
  final RecordingLayout layout;
  final RecordingStorage storage;
  final String bucket;
  final String path;
  final String cid;
  final int sizeBytes;
  final bool summarySent;
  final int transcriptWords;
  final List<String> participants;

  /// Agents in the room, excluding the Concierge (never shown on tiles).
  final List<RecordingAgent> agents;
  final RecordingOwner owner;
  final String host;
  final String resolution;
  final String provider;
  final String endpoint;
  final String region;
  final String checksum;
  final String pin;
  final String retention;

  bool get isByo => storage == RecordingStorage.byo;

  /// Object key inside the bucket.
  String get objectKey =>
      path.startsWith('$bucket/') ? path.substring(bucket.length + 1) : path;

  String get gatewayUrl => 'https://ipfs.io/ipfs/$cid';

  int get durationSeconds => durationMin * 60;
}

/// An agent that took part, with its two-letter glyph.
final class RecordingAgent {
  const RecordingAgent(this.name, this.mono);

  final String name;
  final String mono;
}

/// One transcript chapter with its speaker-attributed lines.
final class TranscriptChapter {
  const TranscriptChapter(this.title, this.lines);

  final String title;
  final List<TranscriptLine> lines;

  int get start => lines.first.at;
}

/// One transcript line: seconds from the start, speaker, text.
final class TranscriptLine {
  const TranscriptLine(this.at, this.speaker, this.text, {this.agent = false});

  final int at;
  final String speaker;
  final String text;

  /// Spoken by an agent (shown with an "Agent" chip).
  final bool agent;
}

/// The generated summary of a recording.
final class RecordingSummary {
  const RecordingSummary({
    required this.paragraphs,
    required this.decisions,
    required this.actions,
  });

  final List<String> paragraphs;
  final List<String> decisions;
  final List<ActionItem> actions;
}

/// One action item from the summary.
final class ActionItem {
  const ActionItem(this.title, this.owner, this.due, {this.done = false});

  final String title;
  final String owner;
  final String due;
  final bool done;
}

/// Delivery channel of the transcript and summary.
enum DeliveryChannel { email, sms }

/// Delivery status per participant and channel.
enum DeliveryStatus { delivered, opened, bounced, heldForReview }

/// One row of the delivery table.
final class DeliveryRow {
  const DeliveryRow({
    required this.name,
    required this.channel,
    required this.destination,
    required this.status,
  });

  final String name;
  final DeliveryChannel channel;
  final String destination;
  final DeliveryStatus status;
}

/// Detail sections, in tab order.
enum RecordingTab {
  transcript('Transcript'),
  summary('Summary'),
  delivery('Delivery'),
  storage('Storage');

  const RecordingTab(this.label);

  final String label;

  /// Parses a route segment; unknown or missing is [transcript], as the
  /// prototype's router does.
  static RecordingTab parse(String? value) => RecordingTab.values.firstWhere(
    (RecordingTab t) => t.name == value,
    orElse: () => RecordingTab.transcript,
  );
}
