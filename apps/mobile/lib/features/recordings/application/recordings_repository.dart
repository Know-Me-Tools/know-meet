// TJ-ARCH-MOB-001 compliant
import '../domain/recording.dart';

/// Port for the recordings library. The static-screen phase uses the
/// sample adapter; the real adapter (BFF + egress metadata) replaces it
/// without touching presentation.
abstract interface class RecordingsRepository {
  /// Every recording, newest first.
  List<Recording> all();

  /// The recording with [id], or null.
  Recording? byId(String id);

  List<TranscriptChapter> transcript(String id);

  RecordingSummary? summary(String id);

  List<DeliveryRow> delivery(String id);
}
