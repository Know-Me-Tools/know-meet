// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../shared/session/session.dart';
import '../../application/realtime_room_port.dart';
import '../../data/fake_realtime_room.dart';
import '../../domain/room_snapshot.dart';

part 'room_providers.g.dart';

/// The realtime room port. The port fake until the realtime phase replaces
/// it with the livekit_client adapter.
@Riverpod(keepAlive: true)
RealtimeRoomPort realtimeRoomPort(Ref ref) => const FakeRealtimeRoom();

/// The room for the viewer: [guest] for `/meet/room-guest`, otherwise the
/// signed-in person (falls back to guest naming when nobody is signed in).
@riverpod
RoomSnapshot roomSnapshot(Ref ref, {required bool guest}) {
  final KmUser? user = ref.watch(sessionControllerProvider);
  return ref
      .watch(realtimeRoomPortProvider)
      .snapshot(guest: guest || user == null, selfName: user?.name);
}
