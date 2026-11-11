// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'schedule_draft.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Draft state of the schedule form. Widgets render it and call these
/// intents; nothing is submitted in the static-screen phase.

@ProviderFor(ScheduleDraftController)
final scheduleDraftControllerProvider = ScheduleDraftControllerProvider._();

/// Draft state of the schedule form. Widgets render it and call these
/// intents; nothing is submitted in the static-screen phase.
final class ScheduleDraftControllerProvider
    extends $NotifierProvider<ScheduleDraftController, ScheduleDraft> {
  /// Draft state of the schedule form. Widgets render it and call these
  /// intents; nothing is submitted in the static-screen phase.
  ScheduleDraftControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'scheduleDraftControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$scheduleDraftControllerHash();

  @$internal
  @override
  ScheduleDraftController create() => ScheduleDraftController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ScheduleDraft value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ScheduleDraft>(value),
    );
  }
}

String _$scheduleDraftControllerHash() =>
    r'a8a22fcb41e214a3c18eeab7a451a9324bee28e2';

/// Draft state of the schedule form. Widgets render it and call these
/// intents; nothing is submitted in the static-screen phase.

abstract class _$ScheduleDraftController extends $Notifier<ScheduleDraft> {
  ScheduleDraft build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<ScheduleDraft, ScheduleDraft>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ScheduleDraft, ScheduleDraft>,
              ScheduleDraft,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
