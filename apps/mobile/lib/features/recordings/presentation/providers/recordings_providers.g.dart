// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'recordings_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The recordings port. Sample adapter until the BFF adapter lands.

@ProviderFor(recordingsRepository)
final recordingsRepositoryProvider = RecordingsRepositoryProvider._();

/// The recordings port. Sample adapter until the BFF adapter lands.

final class RecordingsRepositoryProvider
    extends
        $FunctionalProvider<
          RecordingsRepository,
          RecordingsRepository,
          RecordingsRepository
        >
    with $Provider<RecordingsRepository> {
  /// The recordings port. Sample adapter until the BFF adapter lands.
  RecordingsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'recordingsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$recordingsRepositoryHash();

  @$internal
  @override
  $ProviderElement<RecordingsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  RecordingsRepository create(Ref ref) {
    return recordingsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RecordingsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RecordingsRepository>(value),
    );
  }
}

String _$recordingsRepositoryHash() =>
    r'2edafc4555140f15c516393d5d657ad481848806';

/// Library controls. Widgets read it and call the setters.

@ProviderFor(LibraryQueryController)
final libraryQueryControllerProvider = LibraryQueryControllerProvider._();

/// Library controls. Widgets read it and call the setters.
final class LibraryQueryControllerProvider
    extends $NotifierProvider<LibraryQueryController, LibraryQuery> {
  /// Library controls. Widgets read it and call the setters.
  LibraryQueryControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'libraryQueryControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$libraryQueryControllerHash();

  @$internal
  @override
  LibraryQueryController create() => LibraryQueryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LibraryQuery value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LibraryQuery>(value),
    );
  }
}

String _$libraryQueryControllerHash() =>
    r'28f56a018eb4b3d4d304a3ed0b385471b06a2c09';

/// Library controls. Widgets read it and call the setters.

abstract class _$LibraryQueryController extends $Notifier<LibraryQuery> {
  LibraryQuery build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<LibraryQuery, LibraryQuery>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<LibraryQuery, LibraryQuery>,
              LibraryQuery,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

/// Every recording in the library.

@ProviderFor(allRecordings)
final allRecordingsProvider = AllRecordingsProvider._();

/// Every recording in the library.

final class AllRecordingsProvider
    extends
        $FunctionalProvider<List<Recording>, List<Recording>, List<Recording>>
    with $Provider<List<Recording>> {
  /// Every recording in the library.
  AllRecordingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'allRecordingsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$allRecordingsHash();

  @$internal
  @override
  $ProviderElement<List<Recording>> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  List<Recording> create(Ref ref) {
    return allRecordings(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<Recording> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<Recording>>(value),
    );
  }
}

String _$allRecordingsHash() => r'83705af4dc0313e8b97dac4fb69c6be9e261fcb8';

/// The library after search, filter and sort (recordings.html `draw`).

@ProviderFor(visibleRecordings)
final visibleRecordingsProvider = VisibleRecordingsProvider._();

/// The library after search, filter and sort (recordings.html `draw`).

final class VisibleRecordingsProvider
    extends
        $FunctionalProvider<List<Recording>, List<Recording>, List<Recording>>
    with $Provider<List<Recording>> {
  /// The library after search, filter and sort (recordings.html `draw`).
  VisibleRecordingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'visibleRecordingsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$visibleRecordingsHash();

  @$internal
  @override
  $ProviderElement<List<Recording>> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  List<Recording> create(Ref ref) {
    return visibleRecordings(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<Recording> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<Recording>>(value),
    );
  }
}

String _$visibleRecordingsHash() => r'9dc43328001feca6f6fe32557336e53065e6c579';

/// One recording, or null when the id is unknown.

@ProviderFor(recordingById)
final recordingByIdProvider = RecordingByIdFamily._();

/// One recording, or null when the id is unknown.

final class RecordingByIdProvider
    extends $FunctionalProvider<Recording?, Recording?, Recording?>
    with $Provider<Recording?> {
  /// One recording, or null when the id is unknown.
  RecordingByIdProvider._({
    required RecordingByIdFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'recordingByIdProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$recordingByIdHash();

  @override
  String toString() {
    return r'recordingByIdProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<Recording?> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Recording? create(Ref ref) {
    final argument = this.argument as String;
    return recordingById(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Recording? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Recording?>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is RecordingByIdProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$recordingByIdHash() => r'33d030423726f2f168e81b33430e2b66bb295180';

/// One recording, or null when the id is unknown.

final class RecordingByIdFamily extends $Family
    with $FunctionalFamilyOverride<Recording?, String> {
  RecordingByIdFamily._()
    : super(
        retry: null,
        name: r'recordingByIdProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One recording, or null when the id is unknown.

  RecordingByIdProvider call(String id) =>
      RecordingByIdProvider._(argument: id, from: this);

  @override
  String toString() => r'recordingByIdProvider';
}

/// The player's position in seconds for one recording. Media is stubbed in
/// this phase: chapters and transcript lines seek, nothing plays.

@ProviderFor(PlayerPosition)
final playerPositionProvider = PlayerPositionFamily._();

/// The player's position in seconds for one recording. Media is stubbed in
/// this phase: chapters and transcript lines seek, nothing plays.
final class PlayerPositionProvider
    extends $NotifierProvider<PlayerPosition, int> {
  /// The player's position in seconds for one recording. Media is stubbed in
  /// this phase: chapters and transcript lines seek, nothing plays.
  PlayerPositionProvider._({
    required PlayerPositionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'playerPositionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$playerPositionHash();

  @override
  String toString() {
    return r'playerPositionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  PlayerPosition create() => PlayerPosition();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is PlayerPositionProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$playerPositionHash() => r'a7b0b37985f2a4ed0cdd62e4ecff515b90ad49c4';

/// The player's position in seconds for one recording. Media is stubbed in
/// this phase: chapters and transcript lines seek, nothing plays.

final class PlayerPositionFamily extends $Family
    with $ClassFamilyOverride<PlayerPosition, int, int, int, String> {
  PlayerPositionFamily._()
    : super(
        retry: null,
        name: r'playerPositionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The player's position in seconds for one recording. Media is stubbed in
  /// this phase: chapters and transcript lines seek, nothing plays.

  PlayerPositionProvider call(String recordingId) =>
      PlayerPositionProvider._(argument: recordingId, from: this);

  @override
  String toString() => r'playerPositionProvider';
}

/// The player's position in seconds for one recording. Media is stubbed in
/// this phase: chapters and transcript lines seek, nothing plays.

abstract class _$PlayerPosition extends $Notifier<int> {
  late final _$args = ref.$arg as String;
  String get recordingId => _$args;

  int build(String recordingId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}

/// Captions toggle of the player.

@ProviderFor(PlayerCaptions)
final playerCaptionsProvider = PlayerCaptionsProvider._();

/// Captions toggle of the player.
final class PlayerCaptionsProvider
    extends $NotifierProvider<PlayerCaptions, bool> {
  /// Captions toggle of the player.
  PlayerCaptionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'playerCaptionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$playerCaptionsHash();

  @$internal
  @override
  PlayerCaptions create() => PlayerCaptions();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$playerCaptionsHash() => r'4a38bcf583df9592dae507211cddefcc0fc2a6a0';

/// Captions toggle of the player.

abstract class _$PlayerCaptions extends $Notifier<bool> {
  bool build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<bool, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<bool, bool>,
              bool,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

/// Playback speed of the player.

@ProviderFor(PlayerSpeed)
final playerSpeedProvider = PlayerSpeedProvider._();

/// Playback speed of the player.
final class PlayerSpeedProvider extends $NotifierProvider<PlayerSpeed, double> {
  /// Playback speed of the player.
  PlayerSpeedProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'playerSpeedProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$playerSpeedHash();

  @$internal
  @override
  PlayerSpeed create() => PlayerSpeed();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(double value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<double>(value),
    );
  }
}

String _$playerSpeedHash() => r'f12b4d8fec686f2ff29d940824fae1494991eb84';

/// Playback speed of the player.

abstract class _$PlayerSpeed extends $Notifier<double> {
  double build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<double, double>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<double, double>,
              double,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

/// Transcript search text.

@ProviderFor(TranscriptSearch)
final transcriptSearchProvider = TranscriptSearchProvider._();

/// Transcript search text.
final class TranscriptSearchProvider
    extends $NotifierProvider<TranscriptSearch, String> {
  /// Transcript search text.
  TranscriptSearchProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'transcriptSearchProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$transcriptSearchHash();

  @$internal
  @override
  TranscriptSearch create() => TranscriptSearch();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$transcriptSearchHash() => r'321b220025c9e2396bff3fdbff826c93a5f0cb1b';

/// Transcript search text.

abstract class _$TranscriptSearch extends $Notifier<String> {
  String build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<String, String>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<String, String>,
              String,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

/// "Follow playback" toggle of the transcript.

@ProviderFor(TranscriptFollow)
final transcriptFollowProvider = TranscriptFollowProvider._();

/// "Follow playback" toggle of the transcript.
final class TranscriptFollowProvider
    extends $NotifierProvider<TranscriptFollow, bool> {
  /// "Follow playback" toggle of the transcript.
  TranscriptFollowProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'transcriptFollowProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$transcriptFollowHash();

  @$internal
  @override
  TranscriptFollow create() => TranscriptFollow();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$transcriptFollowHash() => r'260c0743b8bd86f460712822ae7bc4f3d740c718';

/// "Follow playback" toggle of the transcript.

abstract class _$TranscriptFollow extends $Notifier<bool> {
  bool build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<bool, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<bool, bool>,
              bool,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

/// Done flags of a recording's action items, seeded from the summary.

@ProviderFor(ActionItemsDone)
final actionItemsDoneProvider = ActionItemsDoneFamily._();

/// Done flags of a recording's action items, seeded from the summary.
final class ActionItemsDoneProvider
    extends $NotifierProvider<ActionItemsDone, List<bool>> {
  /// Done flags of a recording's action items, seeded from the summary.
  ActionItemsDoneProvider._({
    required ActionItemsDoneFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'actionItemsDoneProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$actionItemsDoneHash();

  @override
  String toString() {
    return r'actionItemsDoneProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  ActionItemsDone create() => ActionItemsDone();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<bool> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<bool>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ActionItemsDoneProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$actionItemsDoneHash() => r'03bd596242c20760d220e43d073dafcbe9032b8f';

/// Done flags of a recording's action items, seeded from the summary.

final class ActionItemsDoneFamily extends $Family
    with
        $ClassFamilyOverride<
          ActionItemsDone,
          List<bool>,
          List<bool>,
          List<bool>,
          String
        > {
  ActionItemsDoneFamily._()
    : super(
        retry: null,
        name: r'actionItemsDoneProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Done flags of a recording's action items, seeded from the summary.

  ActionItemsDoneProvider call(String recordingId) =>
      ActionItemsDoneProvider._(argument: recordingId, from: this);

  @override
  String toString() => r'actionItemsDoneProvider';
}

/// Done flags of a recording's action items, seeded from the summary.

abstract class _$ActionItemsDone extends $Notifier<List<bool>> {
  late final _$args = ref.$arg as String;
  String get recordingId => _$args;

  List<bool> build(String recordingId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<List<bool>, List<bool>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<List<bool>, List<bool>>,
              List<bool>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}

/// "Email me when it's ready" on the processing page.

@ProviderFor(NotifyWhenReady)
final notifyWhenReadyProvider = NotifyWhenReadyProvider._();

/// "Email me when it's ready" on the processing page.
final class NotifyWhenReadyProvider
    extends $NotifierProvider<NotifyWhenReady, bool> {
  /// "Email me when it's ready" on the processing page.
  NotifyWhenReadyProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'notifyWhenReadyProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$notifyWhenReadyHash();

  @$internal
  @override
  NotifyWhenReady create() => NotifyWhenReady();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$notifyWhenReadyHash() => r'2096afe1abca024702c29192e7f4724c448048f6';

/// "Email me when it's ready" on the processing page.

abstract class _$NotifyWhenReady extends $Notifier<bool> {
  bool build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<bool, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<bool, bool>,
              bool,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
