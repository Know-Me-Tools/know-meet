// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'theme_preference_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The persistence port. main() overrides it with the opened store before
/// runApp, so reads are synchronous; tests override it with a fake.

@ProviderFor(themePreferenceStore)
final themePreferenceStoreProvider = ThemePreferenceStoreProvider._();

/// The persistence port. main() overrides it with the opened store before
/// runApp, so reads are synchronous; tests override it with a fake.

final class ThemePreferenceStoreProvider
    extends
        $FunctionalProvider<
          ThemePreferenceStore,
          ThemePreferenceStore,
          ThemePreferenceStore
        >
    with $Provider<ThemePreferenceStore> {
  /// The persistence port. main() overrides it with the opened store before
  /// runApp, so reads are synchronous; tests override it with a fake.
  ThemePreferenceStoreProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themePreferenceStoreProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themePreferenceStoreHash();

  @$internal
  @override
  $ProviderElement<ThemePreferenceStore> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ThemePreferenceStore create(Ref ref) {
    return themePreferenceStore(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemePreferenceStore value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemePreferenceStore>(value),
    );
  }
}

String _$themePreferenceStoreHash() =>
    r'e665f3dd46034ba6d258b14346755556d05bc0c8';

/// Current theme choice. Widgets read it and call [select]; they never touch
/// the store directly.

@ProviderFor(ThemePreferenceController)
final themePreferenceControllerProvider = ThemePreferenceControllerProvider._();

/// Current theme choice. Widgets read it and call [select]; they never touch
/// the store directly.
final class ThemePreferenceControllerProvider
    extends $NotifierProvider<ThemePreferenceController, ThemePreference> {
  /// Current theme choice. Widgets read it and call [select]; they never touch
  /// the store directly.
  ThemePreferenceControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themePreferenceControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themePreferenceControllerHash();

  @$internal
  @override
  ThemePreferenceController create() => ThemePreferenceController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemePreference value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemePreference>(value),
    );
  }
}

String _$themePreferenceControllerHash() =>
    r'd61f9612f264667f938fe8450af76a16864110b1';

/// Current theme choice. Widgets read it and call [select]; they never touch
/// the store directly.

abstract class _$ThemePreferenceController extends $Notifier<ThemePreference> {
  ThemePreference build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<ThemePreference, ThemePreference>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ThemePreference, ThemePreference>,
              ThemePreference,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
