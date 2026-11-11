// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'agents_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The agents registry adapter. Fixture data this phase (static screens);
/// tests and later phases override it.

@ProviderFor(agentsRepository)
final agentsRepositoryProvider = AgentsRepositoryProvider._();

/// The agents registry adapter. Fixture data this phase (static screens);
/// tests and later phases override it.

final class AgentsRepositoryProvider
    extends
        $FunctionalProvider<
          AgentsRepository,
          AgentsRepository,
          AgentsRepository
        >
    with $Provider<AgentsRepository> {
  /// The agents registry adapter. Fixture data this phase (static screens);
  /// tests and later phases override it.
  AgentsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'agentsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$agentsRepositoryHash();

  @$internal
  @override
  $ProviderElement<AgentsRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  AgentsRepository create(Ref ref) {
    return agentsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AgentsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AgentsRepository>(value),
    );
  }
}

String _$agentsRepositoryHash() => r'bd922165292c5e0b9c561452ae304c2d2bcfa74a';

/// The registration in progress. Widgets render it and submit intent; the
/// option groups of steps 2 and 3 write through [RegistrationDraftController].

@ProviderFor(RegistrationDraftController)
final registrationDraftControllerProvider =
    RegistrationDraftControllerProvider._();

/// The registration in progress. Widgets render it and submit intent; the
/// option groups of steps 2 and 3 write through [RegistrationDraftController].
final class RegistrationDraftControllerProvider
    extends $NotifierProvider<RegistrationDraftController, RegistrationDraft> {
  /// The registration in progress. Widgets render it and submit intent; the
  /// option groups of steps 2 and 3 write through [RegistrationDraftController].
  RegistrationDraftControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'registrationDraftControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$registrationDraftControllerHash();

  @$internal
  @override
  RegistrationDraftController create() => RegistrationDraftController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RegistrationDraft value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RegistrationDraft>(value),
    );
  }
}

String _$registrationDraftControllerHash() =>
    r'a943dcbb77a69b5bacad10d7efb6b4f950256afd';

/// The registration in progress. Widgets render it and submit intent; the
/// option groups of steps 2 and 3 write through [RegistrationDraftController].

abstract class _$RegistrationDraftController
    extends $Notifier<RegistrationDraft> {
  RegistrationDraft build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<RegistrationDraft, RegistrationDraft>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<RegistrationDraft, RegistrationDraft>,
              RegistrationDraft,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
