// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The meetings port. Fixture data until the BFF adapter exists.

@ProviderFor(meetingsRepository)
final meetingsRepositoryProvider = MeetingsRepositoryProvider._();

/// The meetings port. Fixture data until the BFF adapter exists.

final class MeetingsRepositoryProvider
    extends
        $FunctionalProvider<
          MeetingsRepository,
          MeetingsRepository,
          MeetingsRepository
        >
    with $Provider<MeetingsRepository> {
  /// The meetings port. Fixture data until the BFF adapter exists.
  MeetingsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'meetingsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$meetingsRepositoryHash();

  @$internal
  @override
  $ProviderElement<MeetingsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MeetingsRepository create(Ref ref) {
    return meetingsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MeetingsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MeetingsRepository>(value),
    );
  }
}

String _$meetingsRepositoryHash() =>
    r'f613498504ea4c4dac422dfad904749b82cceec6';

/// "Now" for the dashboard, from the shared (overridable) clock.

@ProviderFor(dashboardNow)
final dashboardNowProvider = DashboardNowProvider._();

/// "Now" for the dashboard, from the shared (overridable) clock.

final class DashboardNowProvider
    extends $FunctionalProvider<DateTime, DateTime, DateTime>
    with $Provider<DateTime> {
  /// "Now" for the dashboard, from the shared (overridable) clock.
  DashboardNowProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dashboardNowProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dashboardNowHash();

  @$internal
  @override
  $ProviderElement<DateTime> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  DateTime create(Ref ref) {
    return dashboardNow(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DateTime value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DateTime>(value),
    );
  }
}

String _$dashboardNowHash() => r'cc02e4af7db0326bd7bbb04fabf058ace0aa9cfe';

/// All meetings, sorted by start.

@ProviderFor(dashboardMeetings)
final dashboardMeetingsProvider = DashboardMeetingsProvider._();

/// All meetings, sorted by start.

final class DashboardMeetingsProvider
    extends $FunctionalProvider<List<Meeting>, List<Meeting>, List<Meeting>>
    with $Provider<List<Meeting>> {
  /// All meetings, sorted by start.
  DashboardMeetingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dashboardMeetingsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dashboardMeetingsHash();

  @$internal
  @override
  $ProviderElement<List<Meeting>> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  List<Meeting> create(Ref ref) {
    return dashboardMeetings(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<Meeting> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<Meeting>>(value),
    );
  }
}

String _$dashboardMeetingsHash() => r'bb324304f49773bc907f33717c6d76f47e4d327b';

/// One meeting by id, or null.

@ProviderFor(dashboardMeeting)
final dashboardMeetingProvider = DashboardMeetingFamily._();

/// One meeting by id, or null.

final class DashboardMeetingProvider
    extends $FunctionalProvider<Meeting?, Meeting?, Meeting?>
    with $Provider<Meeting?> {
  /// One meeting by id, or null.
  DashboardMeetingProvider._({
    required DashboardMeetingFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'dashboardMeetingProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$dashboardMeetingHash();

  @override
  String toString() {
    return r'dashboardMeetingProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<Meeting?> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Meeting? create(Ref ref) {
    final argument = this.argument as String;
    return dashboardMeeting(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Meeting? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Meeting?>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is DashboardMeetingProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$dashboardMeetingHash() => r'ed833c55cdb069b2cf98f65b0f880197365686ce';

/// One meeting by id, or null.

final class DashboardMeetingFamily extends $Family
    with $FunctionalFamilyOverride<Meeting?, String> {
  DashboardMeetingFamily._()
    : super(
        retry: null,
        name: r'dashboardMeetingProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One meeting by id, or null.

  DashboardMeetingProvider call(String id) =>
      DashboardMeetingProvider._(argument: id, from: this);

  @override
  String toString() => r'dashboardMeetingProvider';
}

/// Every invite, failed first, then by meeting start (prototype order).

@ProviderFor(inviteDeliveries)
final inviteDeliveriesProvider = InviteDeliveriesProvider._();

/// Every invite, failed first, then by meeting start (prototype order).

final class InviteDeliveriesProvider
    extends
        $FunctionalProvider<
          List<InviteDelivery>,
          List<InviteDelivery>,
          List<InviteDelivery>
        >
    with $Provider<List<InviteDelivery>> {
  /// Every invite, failed first, then by meeting start (prototype order).
  InviteDeliveriesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inviteDeliveriesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inviteDeliveriesHash();

  @$internal
  @override
  $ProviderElement<List<InviteDelivery>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  List<InviteDelivery> create(Ref ref) {
    return inviteDeliveries(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<InviteDelivery> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<InviteDelivery>>(value),
    );
  }
}

String _$inviteDeliveriesHash() => r'133d0a1a6e73ac46f8d3d42b0042e9fc20593df1';

@ProviderFor(MeetingOptionsController)
final meetingOptionsControllerProvider = MeetingOptionsControllerFamily._();

final class MeetingOptionsControllerProvider
    extends $NotifierProvider<MeetingOptionsController, MeetingOptions> {
  MeetingOptionsControllerProvider._({
    required MeetingOptionsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'meetingOptionsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$meetingOptionsControllerHash();

  @override
  String toString() {
    return r'meetingOptionsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  MeetingOptionsController create() => MeetingOptionsController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MeetingOptions value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MeetingOptions>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is MeetingOptionsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$meetingOptionsControllerHash() =>
    r'00588b7e45b5397a802e2a343a70940c8bc1d8b9';

final class MeetingOptionsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          MeetingOptionsController,
          MeetingOptions,
          MeetingOptions,
          MeetingOptions,
          String
        > {
  MeetingOptionsControllerFamily._()
    : super(
        retry: null,
        name: r'meetingOptionsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  MeetingOptionsControllerProvider call(String meetingId) =>
      MeetingOptionsControllerProvider._(argument: meetingId, from: this);

  @override
  String toString() => r'meetingOptionsControllerProvider';
}

abstract class _$MeetingOptionsController extends $Notifier<MeetingOptions> {
  late final _$args = ref.$arg as String;
  String get meetingId => _$args;

  MeetingOptions build(String meetingId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<MeetingOptions, MeetingOptions>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<MeetingOptions, MeetingOptions>,
              MeetingOptions,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}

/// Invites selected for bulk resend (by delivery id).

@ProviderFor(InviteSelection)
final inviteSelectionProvider = InviteSelectionProvider._();

/// Invites selected for bulk resend (by delivery id).
final class InviteSelectionProvider
    extends $NotifierProvider<InviteSelection, Set<String>> {
  /// Invites selected for bulk resend (by delivery id).
  InviteSelectionProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inviteSelectionProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inviteSelectionHash();

  @$internal
  @override
  InviteSelection create() => InviteSelection();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Set<String> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Set<String>>(value),
    );
  }
}

String _$inviteSelectionHash() => r'f1a7cce702fe88d054f1010dc1baae8148d2bc49';

/// Invites selected for bulk resend (by delivery id).

abstract class _$InviteSelection extends $Notifier<Set<String>> {
  Set<String> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<Set<String>, Set<String>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<Set<String>, Set<String>>,
              Set<String>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}

/// The invites search box text.

@ProviderFor(InviteSearch)
final inviteSearchProvider = InviteSearchProvider._();

/// The invites search box text.
final class InviteSearchProvider
    extends $NotifierProvider<InviteSearch, String> {
  /// The invites search box text.
  InviteSearchProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'inviteSearchProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$inviteSearchHash();

  @$internal
  @override
  InviteSearch create() => InviteSearch();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$inviteSearchHash() => r'b75ad7aee4f49b6ffe2a46b1a33feee72ada6bf8';

/// The invites search box text.

abstract class _$InviteSearch extends $Notifier<String> {
  String build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<String, String>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<String, String>,
              String,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
