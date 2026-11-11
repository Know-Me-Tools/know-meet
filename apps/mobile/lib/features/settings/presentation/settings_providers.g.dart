// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The settings port. Fixture adapter until a settings backend exists.

@ProviderFor(settingsRepository)
final settingsRepositoryProvider = SettingsRepositoryProvider._();

/// The settings port. Fixture adapter until a settings backend exists.

final class SettingsRepositoryProvider
    extends
        $FunctionalProvider<
          SettingsRepository,
          SettingsRepository,
          SettingsRepository
        >
    with $Provider<SettingsRepository> {
  /// The settings port. Fixture adapter until a settings backend exists.
  SettingsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'settingsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$settingsRepositoryHash();

  @$internal
  @override
  $ProviderElement<SettingsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SettingsRepository create(Ref ref) {
    return settingsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SettingsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SettingsRepository>(value),
    );
  }
}

String _$settingsRepositoryHash() =>
    r'49eebc4b3e07b23de24457e25049e92815609118';

/// The settings the screens show, as of the app clock.

@ProviderFor(settingsSnapshot)
final settingsSnapshotProvider = SettingsSnapshotProvider._();

/// The settings the screens show, as of the app clock.

final class SettingsSnapshotProvider
    extends
        $FunctionalProvider<
          SettingsSnapshot,
          SettingsSnapshot,
          SettingsSnapshot
        >
    with $Provider<SettingsSnapshot> {
  /// The settings the screens show, as of the app clock.
  SettingsSnapshotProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'settingsSnapshotProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$settingsSnapshotHash();

  @$internal
  @override
  $ProviderElement<SettingsSnapshot> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  SettingsSnapshot create(Ref ref) {
    return settingsSnapshot(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SettingsSnapshot value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SettingsSnapshot>(value),
    );
  }
}

String _$settingsSnapshotHash() => r'57c4c533af2c6f11bbdf7afb6deb55e6f7175d58';

/// Switch and checkbox values on the settings pages, keyed as in
/// [SettingsSnapshot.toggles]. Widgets render a value and call [toggle];
/// nothing is persisted (static screens, no settings backend this phase).

@ProviderFor(SettingsToggles)
final settingsTogglesProvider = SettingsTogglesProvider._();

/// Switch and checkbox values on the settings pages, keyed as in
/// [SettingsSnapshot.toggles]. Widgets render a value and call [toggle];
/// nothing is persisted (static screens, no settings backend this phase).
final class SettingsTogglesProvider
    extends $NotifierProvider<SettingsToggles, Map<String, bool>> {
  /// Switch and checkbox values on the settings pages, keyed as in
  /// [SettingsSnapshot.toggles]. Widgets render a value and call [toggle];
  /// nothing is persisted (static screens, no settings backend this phase).
  SettingsTogglesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'settingsTogglesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$settingsTogglesHash();

  @$internal
  @override
  SettingsToggles create() => SettingsToggles();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Map<String, bool> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Map<String, bool>>(value),
    );
  }
}

String _$settingsTogglesHash() => r'2203d0b0baa10acd3def376be383b777d5ab2851';

/// Switch and checkbox values on the settings pages, keyed as in
/// [SettingsSnapshot.toggles]. Widgets render a value and call [toggle];
/// nothing is persisted (static screens, no settings backend this phase).

abstract class _$SettingsToggles extends $Notifier<Map<String, bool>> {
  Map<String, bool> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<Map<String, bool>, Map<String, bool>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<Map<String, bool>, Map<String, bool>>,
              Map<String, bool>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
