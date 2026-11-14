// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_router.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Where the router starts. Production: Home, unless
/// `--dart-define=KM_INITIAL_LOCATION=<path>` says otherwise (the notes
/// integration test needs `/dev/notes`). The golden suite overrides it with
/// the location of the state under test.

@ProviderFor(kmInitialLocation)
final kmInitialLocationProvider = KmInitialLocationProvider._();

/// Where the router starts. Production: Home, unless
/// `--dart-define=KM_INITIAL_LOCATION=<path>` says otherwise (the notes
/// integration test needs `/dev/notes`). The golden suite overrides it with
/// the location of the state under test.

final class KmInitialLocationProvider
    extends $FunctionalProvider<String, String, String>
    with $Provider<String> {
  /// Where the router starts. Production: Home, unless
  /// `--dart-define=KM_INITIAL_LOCATION=<path>` says otherwise (the notes
  /// integration test needs `/dev/notes`). The golden suite overrides it with
  /// the location of the state under test.
  KmInitialLocationProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'kmInitialLocationProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$kmInitialLocationHash();

  @$internal
  @override
  $ProviderElement<String> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String create(Ref ref) {
    return kmInitialLocation(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$kmInitialLocationHash() => r'6c21f3ea79b75c5ce5f38bc0b7aa117907be12b2';

/// The frame popover open at start. Always closed in production; the golden
/// suite opens it for `frame.account-menu-open`.

@ProviderFor(kmInitialFrameOverlay)
final kmInitialFrameOverlayProvider = KmInitialFrameOverlayProvider._();

/// The frame popover open at start. Always closed in production; the golden
/// suite opens it for `frame.account-menu-open`.

final class KmInitialFrameOverlayProvider
    extends $FunctionalProvider<KmFrameOverlay, KmFrameOverlay, KmFrameOverlay>
    with $Provider<KmFrameOverlay> {
  /// The frame popover open at start. Always closed in production; the golden
  /// suite opens it for `frame.account-menu-open`.
  KmInitialFrameOverlayProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'kmInitialFrameOverlayProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$kmInitialFrameOverlayHash();

  @$internal
  @override
  $ProviderElement<KmFrameOverlay> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  KmFrameOverlay create(Ref ref) {
    return kmInitialFrameOverlay(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(KmFrameOverlay value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<KmFrameOverlay>(value),
    );
  }
}

String _$kmInitialFrameOverlayHash() =>
    r'a1449ac97fc05489ff20ceeacf876918017684b1';

/// Route tree. Home and the four app pages share the app frame (ShellRoute);
/// sign-in, join and the meeting room are full-screen with their own
/// headers, as in the prototype.

@ProviderFor(appRouter)
final appRouterProvider = AppRouterProvider._();

/// Route tree. Home and the four app pages share the app frame (ShellRoute);
/// sign-in, join and the meeting room are full-screen with their own
/// headers, as in the prototype.

final class AppRouterProvider
    extends $FunctionalProvider<GoRouter, GoRouter, GoRouter>
    with $Provider<GoRouter> {
  /// Route tree. Home and the four app pages share the app frame (ShellRoute);
  /// sign-in, join and the meeting room are full-screen with their own
  /// headers, as in the prototype.
  AppRouterProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'appRouterProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$appRouterHash();

  @$internal
  @override
  $ProviderElement<GoRouter> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  GoRouter create(Ref ref) {
    return appRouter(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(GoRouter value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<GoRouter>(value),
    );
  }
}

String _$appRouterHash() => r'53767d7040eef7df13bdae2d935dbf210646e151';
