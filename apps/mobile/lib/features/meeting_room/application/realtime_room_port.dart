// TJ-ARCH-MOB-001 compliant
import '../domain/room_snapshot.dart';

/// Port for the meeting room's realtime state. The LiveKit adapter
/// (livekit_client) is deferred to the realtime phase and will implement
/// this to the webrtc-engineer's adapter spec; until then the app uses
/// [FakeRealtimeRoom](../data/fake_realtime_room.dart).
abstract interface class RealtimeRoomPort {
  /// The room as the viewer sees it. [selfName] is the signed-in person's
  /// name; null joins as a guest.
  RoomSnapshot snapshot({required bool guest, String? selfName});
}
