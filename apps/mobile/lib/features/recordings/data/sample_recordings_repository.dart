// TJ-ARCH-MOB-001 compliant
import '../application/recordings_repository.dart';
import '../domain/recording.dart';
import 'sample_recordings.dart';
import 'sample_summaries.dart';
import 'sample_transcripts.dart';

/// [RecordingsRepository] over the prototype's fictional sample data.
final class SampleRecordingsRepository implements RecordingsRepository {
  const SampleRecordingsRepository();

  @override
  List<Recording> all() {
    final List<Recording> list = List<Recording>.of(sampleRecordings)
      ..sort((Recording a, Recording b) => b.date.compareTo(a.date));
    return List<Recording>.unmodifiable(list);
  }

  @override
  Recording? byId(String id) {
    for (final Recording r in sampleRecordings) {
      if (r.id == id) return r;
    }
    return null;
  }

  @override
  List<TranscriptChapter> transcript(String id) =>
      sampleTranscripts[id] ?? const <TranscriptChapter>[];

  @override
  RecordingSummary? summary(String id) => sampleSummaries[id];

  /// One email row per participant with an address; an SMS row only where
  /// an SMS link was sent (recordings.html `buildDelivery`).
  @override
  List<DeliveryRow> delivery(String id) {
    final Recording? r = byId(id);
    if (r == null) return const <DeliveryRow>[];
    final Map<String, (DeliveryStatus, DeliveryStatus?)> status =
        sampleDelivery[id] ?? const <String, (DeliveryStatus, DeliveryStatus?)>{};
    final List<DeliveryRow> rows = <DeliveryRow>[];
    for (final String name in r.participants) {
      final (String, String?)? contact = sampleContacts[name];
      if (contact == null) continue;
      final (String email, String? phone) = contact;
      final (DeliveryStatus, DeliveryStatus?)? s = status[name];
      rows.add(
        DeliveryRow(
          name: name,
          channel: DeliveryChannel.email,
          destination: email,
          status: s?.$1 ?? DeliveryStatus.delivered,
        ),
      );
      final DeliveryStatus? sms = s?.$2;
      if (phone != null && sms != null) {
        rows.add(
          DeliveryRow(
            name: name,
            channel: DeliveryChannel.sms,
            destination: phone,
            status: sms,
          ),
        );
      }
    }
    return List<DeliveryRow>.unmodifiable(rows);
  }
}
