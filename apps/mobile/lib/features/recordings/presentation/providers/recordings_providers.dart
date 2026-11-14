// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../application/recordings_repository.dart';
import '../../data/sample_recordings_repository.dart';
import '../../domain/recording.dart';

part 'recordings_providers.g.dart';

/// The recordings port. Sample adapter until the BFF adapter lands.
@Riverpod(keepAlive: true)
RecordingsRepository recordingsRepository(Ref ref) =>
    const SampleRecordingsRepository();

/// Show filter of the library.
enum LibraryFilter { all, shared, mine }

/// Sort order of the library.
enum LibrarySort {
  newest('Newest first'),
  oldest('Oldest first'),
  longest('Longest first'),
  title('Title A–Z');

  const LibrarySort(this.label);

  final String label;
}

/// Grid or list presentation of the library.
enum LibraryView { grid, list }

/// The library's search, filter, sort and view choices.
final class LibraryQuery {
  const LibraryQuery({
    this.text = '',
    this.filter = LibraryFilter.all,
    this.sort = LibrarySort.newest,
    this.view = LibraryView.grid,
  });

  final String text;
  final LibraryFilter filter;
  final LibrarySort sort;
  final LibraryView view;

  LibraryQuery copyWith({
    String? text,
    LibraryFilter? filter,
    LibrarySort? sort,
    LibraryView? view,
  }) => LibraryQuery(
    text: text ?? this.text,
    filter: filter ?? this.filter,
    sort: sort ?? this.sort,
    view: view ?? this.view,
  );
}

/// Library controls. Widgets read it and call the setters.
@riverpod
class LibraryQueryController extends _$LibraryQueryController {
  @override
  LibraryQuery build() => const LibraryQuery();

  void setText(String text) => state = state.copyWith(text: text);

  void setFilter(LibraryFilter filter) => state = state.copyWith(filter: filter);

  void setSort(LibrarySort sort) => state = state.copyWith(sort: sort);

  void setView(LibraryView view) => state = state.copyWith(view: view);
}

/// Every recording in the library.
@riverpod
List<Recording> allRecordings(Ref ref) =>
    ref.watch(recordingsRepositoryProvider).all();

/// The library after search, filter and sort (recordings.html `draw`).
@riverpod
List<Recording> visibleRecordings(Ref ref) {
  final LibraryQuery q = ref.watch(libraryQueryControllerProvider);
  final String needle = q.text.trim().toLowerCase();
  final List<Recording> list = ref.watch(allRecordingsProvider).where((Recording r) {
    if (q.filter == LibraryFilter.mine && r.owner != RecordingOwner.mine) return false;
    if (q.filter == LibraryFilter.shared && r.owner != RecordingOwner.shared) return false;
    if (needle.isEmpty) return true;
    return '${r.title} ${r.participants.join(' ')}'.toLowerCase().contains(needle);
  }).toList();
  list.sort((Recording a, Recording b) => switch (q.sort) {
    LibrarySort.oldest => a.date.compareTo(b.date),
    LibrarySort.longest => b.durationMin.compareTo(a.durationMin),
    LibrarySort.title => a.title.compareTo(b.title),
    LibrarySort.newest => b.date.compareTo(a.date),
  });
  return List<Recording>.unmodifiable(list);
}

/// One recording, or null when the id is unknown.
@riverpod
Recording? recordingById(Ref ref, String id) =>
    ref.watch(recordingsRepositoryProvider).byId(id);

/// The player's position in seconds for one recording. Media is stubbed in
/// this phase: chapters and transcript lines seek, nothing plays.
@riverpod
class PlayerPosition extends _$PlayerPosition {
  @override
  int build(String recordingId) => 0;

  void seek(int seconds) => state = seconds < 0 ? 0 : seconds;
}

/// Captions toggle of the player.
@riverpod
class PlayerCaptions extends _$PlayerCaptions {
  @override
  bool build() => true;

  void toggle() => state = !state;
}

/// Playback speed of the player.
@riverpod
class PlayerSpeed extends _$PlayerSpeed {
  @override
  double build() => 1;

  void set(double value) => state = value;
}

/// Transcript search text.
@riverpod
class TranscriptSearch extends _$TranscriptSearch {
  @override
  String build() => '';

  void set(String text) => state = text;
}

/// "Follow playback" toggle of the transcript.
@riverpod
class TranscriptFollow extends _$TranscriptFollow {
  @override
  bool build() => true;

  void set(bool value) => state = value;
}

/// Done flags of a recording's action items, seeded from the summary.
@riverpod
class ActionItemsDone extends _$ActionItemsDone {
  @override
  List<bool> build(String recordingId) {
    final RecordingSummary? s = ref.watch(recordingsRepositoryProvider).summary(recordingId);
    return List<bool>.unmodifiable(
      (s?.actions ?? const <ActionItem>[]).map((ActionItem a) => a.done),
    );
  }

  void set(int index, bool done) {
    final List<bool> next = List<bool>.of(state);
    if (index < 0 || index >= next.length) return;
    next[index] = done;
    state = List<bool>.unmodifiable(next);
  }
}

/// "Email me when it's ready" on the processing page.
@riverpod
class NotifyWhenReady extends _$NotifyWhenReady {
  @override
  bool build() => true;

  void set(bool value) => state = value;
}
