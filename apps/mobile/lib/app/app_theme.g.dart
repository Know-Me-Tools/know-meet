// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_theme.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The generated Know Meet themes (packages/design-tokens). The golden suite
/// overrides this provider for the VS-3 negative control
/// (`KM_GOLDEN_THEME_OVERRIDE=stock-dark`); production never does.

@ProviderFor(kmThemeFactory)
final kmThemeFactoryProvider = KmThemeFactoryProvider._();

/// The generated Know Meet themes (packages/design-tokens). The golden suite
/// overrides this provider for the VS-3 negative control
/// (`KM_GOLDEN_THEME_OVERRIDE=stock-dark`); production never does.

final class KmThemeFactoryProvider
    extends $FunctionalProvider<KmThemeFactory, KmThemeFactory, KmThemeFactory>
    with $Provider<KmThemeFactory> {
  /// The generated Know Meet themes (packages/design-tokens). The golden suite
  /// overrides this provider for the VS-3 negative control
  /// (`KM_GOLDEN_THEME_OVERRIDE=stock-dark`); production never does.
  KmThemeFactoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'kmThemeFactoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$kmThemeFactoryHash();

  @$internal
  @override
  $ProviderElement<KmThemeFactory> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  KmThemeFactory create(Ref ref) {
    return kmThemeFactory(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(KmThemeFactory value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<KmThemeFactory>(value),
    );
  }
}

String _$kmThemeFactoryHash() => r'2a2b7e73a3bb19d1e2e77fcc9d14ea77adf26376';
