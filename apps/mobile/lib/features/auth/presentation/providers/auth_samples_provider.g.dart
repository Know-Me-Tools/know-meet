// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_samples_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Sample identity for the static auth views.

@ProviderFor(authSamples)
final authSamplesProvider = AuthSamplesProvider._();

/// Sample identity for the static auth views.

final class AuthSamplesProvider
    extends
        $FunctionalProvider<
          AuthSampleSource,
          AuthSampleSource,
          AuthSampleSource
        >
    with $Provider<AuthSampleSource> {
  /// Sample identity for the static auth views.
  AuthSamplesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'authSamplesProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$authSamplesHash();

  @$internal
  @override
  $ProviderElement<AuthSampleSource> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  AuthSampleSource create(Ref ref) {
    return authSamples(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AuthSampleSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AuthSampleSource>(value),
    );
  }
}

String _$authSamplesHash() => r'731cf03da0cdafc16ee77110d29cf32fe9ad436e';
