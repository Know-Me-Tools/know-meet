// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'invitation_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The invite port; static fixtures this phase.

@ProviderFor(inviteRepository)
final inviteRepositoryProvider = InviteRepositoryProvider._();

/// The invite port; static fixtures this phase.

final class InviteRepositoryProvider
    extends
        $FunctionalProvider<
          InviteRepository,
          InviteRepository,
          InviteRepository
        >
    with $Provider<InviteRepository> {
  /// The invite port; static fixtures this phase.
  InviteRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inviteRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inviteRepositoryHash();

  @$internal
  @override
  $ProviderElement<InviteRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  InviteRepository create(Ref ref) {
    return inviteRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(InviteRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<InviteRepository>(value),
    );
  }
}

String _$inviteRepositoryHash() => r'57d9fe4c67c97915c9f25f3bcd1f76bac63d2338';

/// The invitation the join views show, placed relative to the clock.

@ProviderFor(invitation)
final invitationProvider = InvitationProvider._();

/// The invitation the join views show, placed relative to the clock.

final class InvitationProvider
    extends $FunctionalProvider<Invitation, Invitation, Invitation>
    with $Provider<Invitation> {
  /// The invitation the join views show, placed relative to the clock.
  InvitationProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'invitationProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$invitationHash();

  @$internal
  @override
  $ProviderElement<Invitation> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Invitation create(Ref ref) {
    return invitation(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Invitation value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Invitation>(value),
    );
  }
}

String _$invitationHash() => r'0295191db6926f1cd3cae940944f01b83a31b038';
