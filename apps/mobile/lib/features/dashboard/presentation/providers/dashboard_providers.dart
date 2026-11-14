// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../shared/clock/km_clock.dart';
import '../../application/meetings_repository.dart';
import '../../data/fixture_meetings_repository.dart';
import '../../domain/invite_delivery.dart';
import '../../domain/meeting.dart';

part 'dashboard_providers.g.dart';

/// The meetings port. Fixture data until the BFF adapter exists.
@Riverpod(keepAlive: true)
MeetingsRepository meetingsRepository(Ref ref) => const FixtureMeetingsRepository();

/// "Now" for the dashboard, from the shared (overridable) clock.
@riverpod
DateTime dashboardNow(Ref ref) => ref.watch(kmClockProvider)().toUtc();

/// All meetings, sorted by start.
@riverpod
List<Meeting> dashboardMeetings(Ref ref) {
  final List<Meeting> list = List<Meeting>.of(
    ref.watch(meetingsRepositoryProvider).meetings(ref.watch(dashboardNowProvider)),
  )..sort((Meeting a, Meeting b) => a.start.compareTo(b.start));
  return List<Meeting>.unmodifiable(list);
}

/// One meeting by id, or null.
@riverpod
Meeting? dashboardMeeting(Ref ref, String id) {
  for (final Meeting m in ref.watch(dashboardMeetingsProvider)) {
    if (m.id == id) return m;
  }
  return null;
}

/// Every invite, failed first, then by meeting start (prototype order).
@riverpod
List<InviteDelivery> inviteDeliveries(Ref ref) {
  final DateTime now = ref.watch(dashboardNowProvider);
  final List<Meeting> meetings = ref.watch(dashboardMeetingsProvider);
  DateTime startOf(String id) =>
      meetings.firstWhere((Meeting m) => m.id == id).start;
  final List<InviteDelivery> list = List<InviteDelivery>.of(
    ref.watch(meetingsRepositoryProvider).deliveries(now),
  );
  // Stable merge sort keeps the source order within equal keys.
  _stableSort(list, (InviteDelivery a, InviteDelivery b) {
    final int fa = a.isFailed ? 0 : 1;
    final int fb = b.isFailed ? 0 : 1;
    if (fa != fb) return fa - fb;
    return startOf(a.meetingId).compareTo(startOf(b.meetingId));
  });
  return List<InviteDelivery>.unmodifiable(list);
}

/// Stable in-place merge sort (List.sort is not guaranteed stable).
void _stableSort<T>(List<T> list, int Function(T a, T b) compare) {
  if (list.length < 2) return;
  final int mid = list.length ~/ 2;
  final List<T> left = list.sublist(0, mid);
  final List<T> right = list.sublist(mid);
  _stableSort(left, compare);
  _stableSort(right, compare);
  int i = 0, j = 0, k = 0;
  while (i < left.length && j < right.length) {
    list[k++] = compare(left[i], right[j]) <= 0 ? left[i++] : right[j++];
  }
  while (i < left.length) {
    list[k++] = left[i++];
  }
  while (j < right.length) {
    list[k++] = right[j++];
  }
}

/// Per-meeting option toggles on the detail screen (record, transcription,
/// summary delivery). Session-local, like the prototype's overrides.
final class MeetingOptions {
  const MeetingOptions({
    required this.record,
    required this.transcribe,
    required this.sendSummary,
  });

  final bool record;
  final bool transcribe;
  final bool sendSummary;

  MeetingOptions copyWith({bool? record, bool? transcribe, bool? sendSummary}) =>
      MeetingOptions(
        record: record ?? this.record,
        transcribe: transcribe ?? this.transcribe,
        sendSummary: sendSummary ?? this.sendSummary,
      );
}

@riverpod
class MeetingOptionsController extends _$MeetingOptionsController {
  @override
  MeetingOptions build(String meetingId) {
    final Meeting? m = ref.watch(dashboardMeetingProvider(meetingId));
    return MeetingOptions(
      record: m?.record ?? false,
      transcribe: m?.transcribe ?? true,
      sendSummary: m?.sendSummary ?? true,
    );
  }

  void setRecord(bool v) => state = state.copyWith(record: v);

  void setTranscribe(bool v) => state = state.copyWith(transcribe: v);

  void setSendSummary(bool v) => state = state.copyWith(sendSummary: v);
}

/// Invites selected for bulk resend (by delivery id).
@riverpod
class InviteSelection extends _$InviteSelection {
  @override
  Set<String> build() => const <String>{};

  void toggle(String id, bool selected) => state = selected
      ? <String>{...state, id}
      : state.where((String s) => s != id).toSet();

  void setAll(Iterable<String> ids, bool selected) =>
      state = selected ? <String>{...state, ...ids} : const <String>{};
}

/// The invites search box text.
@riverpod
class InviteSearch extends _$InviteSearch {
  @override
  String build() => '';

  void set(String value) => state = value.trim();
}
