// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Who is signed in, or null for a guest. Static-screen phase: there is no
/// identity backend (contract exclusion), so sign-in records the sample
/// person locally, exactly as the prototype's `km-auth` key does. Tests
/// override this provider to render signed-in and signed-out states.

@ProviderFor(SessionController)
final sessionControllerProvider = SessionControllerProvider._();

/// Who is signed in, or null for a guest. Static-screen phase: there is no
/// identity backend (contract exclusion), so sign-in records the sample
/// person locally, exactly as the prototype's `km-auth` key does. Tests
/// override this provider to render signed-in and signed-out states.
final class SessionControllerProvider
    extends $NotifierProvider<SessionController, KmUser?> {
  /// Who is signed in, or null for a guest. Static-screen phase: there is no
  /// identity backend (contract exclusion), so sign-in records the sample
  /// person locally, exactly as the prototype's `km-auth` key does. Tests
  /// override this provider to render signed-in and signed-out states.
  SessionControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'sessionControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$sessionControllerHash();

  @$internal
  @override
  SessionController create() => SessionController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(KmUser? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<KmUser?>(value),
    );
  }
}

String _$sessionControllerHash() => r'76700dca4f95f81bcc2c5dbf8771a3f0d0f1d259';

/// Who is signed in, or null for a guest. Static-screen phase: there is no
/// identity backend (contract exclusion), so sign-in records the sample
/// person locally, exactly as the prototype's `km-auth` key does. Tests
/// override this provider to render signed-in and signed-out states.

abstract class _$SessionController extends $Notifier<KmUser?> {
  KmUser? build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<KmUser?, KmUser?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<KmUser?, KmUser?>,
              KmUser?,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
