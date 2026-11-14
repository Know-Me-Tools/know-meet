// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'km_clock.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(kmClock)
final kmClockProvider = KmClockProvider._();

final class KmClockProvider
    extends $FunctionalProvider<KmClock, KmClock, KmClock>
    with $Provider<KmClock> {
  KmClockProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'kmClockProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$kmClockHash();

  @$internal
  @override
  $ProviderElement<KmClock> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  KmClock create(Ref ref) {
    return kmClock(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(KmClock value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<KmClock>(value),
    );
  }
}

String _$kmClockHash() => r'ee53f9f108df186b394baa514d0848cb7fc5860b';
