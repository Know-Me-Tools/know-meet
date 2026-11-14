// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'room_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The realtime room port. The port fake until the realtime phase replaces
/// it with the livekit_client adapter.

@ProviderFor(realtimeRoomPort)
final realtimeRoomPortProvider = RealtimeRoomPortProvider._();

/// The realtime room port. The port fake until the realtime phase replaces
/// it with the livekit_client adapter.

final class RealtimeRoomPortProvider
    extends
        $FunctionalProvider<
          RealtimeRoomPort,
          RealtimeRoomPort,
          RealtimeRoomPort
        >
    with $Provider<RealtimeRoomPort> {
  /// The realtime room port. The port fake until the realtime phase replaces
  /// it with the livekit_client adapter.
  RealtimeRoomPortProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'realtimeRoomPortProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$realtimeRoomPortHash();

  @$internal
  @override
  $ProviderElement<RealtimeRoomPort> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  RealtimeRoomPort create(Ref ref) {
    return realtimeRoomPort(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RealtimeRoomPort value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RealtimeRoomPort>(value),
    );
  }
}

String _$realtimeRoomPortHash() => r'bbe6efe603eb2c21284050f4dc3b94a715476195';

/// The room for the viewer: [guest] for `/meet/room-guest`, otherwise the
/// signed-in person (falls back to guest naming when nobody is signed in).

@ProviderFor(roomSnapshot)
final roomSnapshotProvider = RoomSnapshotFamily._();

/// The room for the viewer: [guest] for `/meet/room-guest`, otherwise the
/// signed-in person (falls back to guest naming when nobody is signed in).

final class RoomSnapshotProvider
    extends $FunctionalProvider<RoomSnapshot, RoomSnapshot, RoomSnapshot>
    with $Provider<RoomSnapshot> {
  /// The room for the viewer: [guest] for `/meet/room-guest`, otherwise the
  /// signed-in person (falls back to guest naming when nobody is signed in).
  RoomSnapshotProvider._({
    required RoomSnapshotFamily super.from,
    required bool super.argument,
  }) : super(
         retry: null,
         name: r'roomSnapshotProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$roomSnapshotHash();

  @override
  String toString() {
    return r'roomSnapshotProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<RoomSnapshot> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  RoomSnapshot create(Ref ref) {
    final argument = this.argument as bool;
    return roomSnapshot(ref, guest: argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RoomSnapshot value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RoomSnapshot>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is RoomSnapshotProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$roomSnapshotHash() => r'2d538f3d66b8fcb40d502789b6ca2af63ab758b8';

/// The room for the viewer: [guest] for `/meet/room-guest`, otherwise the
/// signed-in person (falls back to guest naming when nobody is signed in).

final class RoomSnapshotFamily extends $Family
    with $FunctionalFamilyOverride<RoomSnapshot, bool> {
  RoomSnapshotFamily._()
    : super(
        retry: null,
        name: r'roomSnapshotProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The room for the viewer: [guest] for `/meet/room-guest`, otherwise the
  /// signed-in person (falls back to guest naming when nobody is signed in).

  RoomSnapshotProvider call({required bool guest}) =>
      RoomSnapshotProvider._(argument: guest, from: this);

  @override
  String toString() => r'roomSnapshotProvider';
}
