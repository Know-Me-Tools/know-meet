// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'home_content_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The home content port; static fixtures this phase.

@ProviderFor(homeContentRepository)
final homeContentRepositoryProvider = HomeContentRepositoryProvider._();

/// The home content port; static fixtures this phase.

final class HomeContentRepositoryProvider
    extends
        $FunctionalProvider<
          HomeContentRepository,
          HomeContentRepository,
          HomeContentRepository
        >
    with $Provider<HomeContentRepository> {
  /// The home content port; static fixtures this phase.
  HomeContentRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'homeContentRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$homeContentRepositoryHash();

  @$internal
  @override
  $ProviderElement<HomeContentRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HomeContentRepository create(Ref ref) {
    return homeContentRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HomeContentRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HomeContentRepository>(value),
    );
  }
}

String _$homeContentRepositoryHash() =>
    r'6f78458b17c40890d3d648d4dac56b3fff4711a2';

/// The home page's content.

@ProviderFor(homeContent)
final homeContentProvider = HomeContentProvider._();

/// The home page's content.

final class HomeContentProvider
    extends $FunctionalProvider<HomeContent, HomeContent, HomeContent>
    with $Provider<HomeContent> {
  /// The home page's content.
  HomeContentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'homeContentProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$homeContentHash();

  @$internal
  @override
  $ProviderElement<HomeContent> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HomeContent create(Ref ref) {
    return homeContent(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HomeContent value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HomeContent>(value),
    );
  }
}

String _$homeContentHash() => r'8513705d04781c919db6fddb614b5ffc61430e67';
