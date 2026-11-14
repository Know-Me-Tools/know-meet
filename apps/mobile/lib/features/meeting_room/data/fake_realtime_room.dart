// TJ-ARCH-MOB-001 compliant
import '../application/realtime_room_port.dart';
import '../domain/room_snapshot.dart';

/// Port fake with the prototype's sample room (meet.html `roster()`,
/// km.js `partner-onboarding`). Signed in: you host with your dot Iris,
/// Avery's dot Sol, the Concierge and Scribe. Guest: Avery hosts and only
/// the Concierge joins.
final class FakeRealtimeRoom implements RealtimeRoomPort {
  const FakeRealtimeRoom();

  static const String _title = 'Partner onboarding review';
  static const String _code = 'km-4fq-82x';

  @override
  RoomSnapshot snapshot({required bool guest, String? selfName}) {
    final List<RoomParticipant> people = <RoomParticipant>[
      RoomParticipant(
        id: 'me',
        name: guest ? 'Guest' : (selfName ?? 'You'),
        kind: RoomParticipantKind.human,
        isSelf: true,
        isHost: !guest,
      ),
      RoomParticipant(
        id: 'avery',
        name: 'Avery Chen',
        kind: RoomParticipantKind.human,
        isHost: guest,
      ),
      const RoomParticipant(
        id: 'marcus',
        name: 'Marcus Oyelaran',
        kind: RoomParticipantKind.human,
      ),
      const RoomParticipant(
        id: 'priya',
        name: 'Priya Natarajan',
        kind: RoomParticipantKind.human,
      ),
    ];
    const RoomParticipant concierge = RoomParticipant(
      id: 'concierge',
      name: 'Concierge',
      kind: RoomParticipantKind.agent,
      system: true,
      role: 'Guide',
      mono: 'CG',
    );
    final List<RoomParticipant> roster = guest
        ? <RoomParticipant>[...people, concierge]
        : <RoomParticipant>[
            ...people,
            const RoomParticipant(
              id: 'iris',
              name: 'Iris',
              kind: RoomParticipantKind.dot,
              owner: 'Your dot',
              mine: true,
            ),
            const RoomParticipant(
              id: 'sol',
              name: 'Sol',
              kind: RoomParticipantKind.dot,
              owner: 'Avery’s dot',
              cyan: true,
            ),
            concierge,
            const RoomParticipant(
              id: 'scribe',
              name: 'Scribe',
              kind: RoomParticipantKind.agent,
              role: 'Note-taker',
              mono: 'SC',
            ),
          ];
    return RoomSnapshot(
      title: _title,
      code: _code,
      guest: guest,
      transcribing: true,
      participants: roster,
      micOn: true,
      cameraOn: false,
      captionsOn: true,
      recording: false,
      joinedNotice: 'You joined. Captions and transcription are on.',
    );
  }
}
