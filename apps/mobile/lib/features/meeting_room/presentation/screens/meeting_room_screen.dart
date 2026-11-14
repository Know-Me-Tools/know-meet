// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/room_snapshot.dart';
import '../providers/room_providers.dart';
import '../widgets/participant_tile.dart';
import '../widgets/room_controls.dart';
import '../widgets/room_header.dart';

/// The meeting-room layout (`meet.html#room` / `#room-guest`) with media
/// stubbed: header, participant stage, captions, control bar and the
/// "You joined" notice.
class MeetingRoomScreen extends ConsumerWidget {
  const MeetingRoomScreen({super.key, required this.guest});

  /// `#room-guest`: joined without an account.
  final bool guest;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmPalette p = context.km;
    final RoomSnapshot room = ref.watch(roomSnapshotProvider(guest: guest));
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        child: Stack(
          children: <Widget>[
            Column(
              children: <Widget>[
                RoomHeader(room: room),
                Expanded(child: _Stage(room: room)),
                _Captions(phone: phone),
                RoomControls(room: room),
              ],
            ),
            if (room.joinedNotice != null)
              Positioned(
                left: KmTokens.s4,
                right: KmTokens.s4,
                bottom: phone ? 96 : 112,
                child: Center(child: _JoinedNotice(text: room.joinedNotice!)),
              ),
          ],
        ),
      ),
    );
  }
}

/// `.stage` / `.tile-grid`: one column on phones, two from 600px, three
/// from 900px.
class _Stage extends StatelessWidget {
  const _Stage({required this.room});

  final RoomSnapshot room;

  @override
  Widget build(BuildContext context) {
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Participants',
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints c) {
          final double pad = phone ? KmTokens.s3 : KmTokens.s5;
          final double inner = c.maxWidth - pad * 2;
          final int cols = c.maxWidth >= 900 ? 3 : (c.maxWidth >= 600 ? 2 : 1);
          final double tileWidth = (inner - KmTokens.s3 * (cols - 1)) / cols;
          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(pad, KmTokens.s2, pad, phone ? KmTokens.s3 : KmTokens.s4),
            child: Wrap(
              spacing: KmTokens.s3,
              runSpacing: KmTokens.s3,
              children: <Widget>[
                for (final RoomParticipant participant in room.participants)
                  SizedBox(
                    width: tileWidth,
                    child: ParticipantTile(participant: participant),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// `.captions`: who is speaking and what they said; a polite live region.
class _Captions extends StatelessWidget {
  const _Captions({required this.phone});

  final bool phone;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        phone ? KmTokens.s3 : KmTokens.s5,
        0,
        phone ? KmTokens.s3 : KmTokens.s5,
        phone ? KmTokens.s2 : KmTokens.s3,
      ),
      child: Center(
        child: Semantics(
          liveRegion: true,
          container: true,
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 760, minHeight: 72),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(KmTokens.radius),
              boxShadow: p.shadowCard,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'CAPTIONS',
                  style: TextStyle(
                    fontFamily: KmTokens.fontMono,
                    fontSize: KmTokens.text11,
                    fontWeight: KmTokens.fontWeightSemibold,
                    letterSpacing: KmTokens.trackingLabelEm * KmTokens.text11,
                    color: p.fgSub,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Waiting for someone to speak…',
                  style: KmText.body(context).copyWith(height: KmTokens.leadingBody),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The join toast (`.toast`), rendered statically with a polite live region
/// so it is announced once on arrival.
class _JoinedNotice extends StatelessWidget {
  const _JoinedNotice({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      liveRegion: true,
      container: true,
      label: text,
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 440),
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        decoration: BoxDecoration(
          color: p.fg,
          borderRadius: BorderRadius.circular(KmTokens.radius),
          boxShadow: p.shadowFloat,
        ),
        child: Row(
          children: <Widget>[
            Icon(LucideIcons.check, size: 16, color: p.bg),
            const SizedBox(width: KmTokens.s2),
            Expanded(
              child: Text(
                text,
                style: KmText.small(context).copyWith(
                  color: p.bg,
                  fontWeight: KmTokens.fontWeightMedium,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
