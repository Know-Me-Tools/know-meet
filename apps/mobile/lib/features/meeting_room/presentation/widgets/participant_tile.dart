// TJ-ARCH-MOB-001 compliant
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/room_snapshot.dart';

/// A room tile (meet.html `.tile`): head chips and actions, the media area
/// (avatar, orb or agent glyph; real video is stubbed this phase) and the
/// name foot. Announced as one group named like the prototype's
/// `aria-label`.
class ParticipantTile extends StatelessWidget {
  const ParticipantTile({super.key, required this.participant});

  final RoomParticipant participant;

  String get _semanticLabel {
    final RoomParticipant p = participant;
    return switch (p.kind) {
      RoomParticipantKind.human =>
        '${p.name}${p.isSelf ? ' (you)' : ''}${p.isHost ? ', host' : ''}',
      RoomParticipantKind.dot => '${p.name}, ${p.owner ?? ''}, persistent dot',
      RoomParticipantKind.agent =>
        '${p.name}${p.system ? ', system agent' : ', LiveKit agent, ${p.role ?? ''}'}',
    };
  }

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: _semanticLabel,
      child: AspectRatio(
        aspectRatio: 4 / 3,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: p.tile,
            borderRadius: BorderRadius.circular(KmTokens.radiusTile),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              _TileHead(participant: participant),
              Expanded(child: _TileMedia(participant: participant)),
              _TileFoot(participant: participant),
            ],
          ),
        ),
      ),
    );
  }
}

class _TileHead extends StatelessWidget {
  const _TileHead({required this.participant});

  final RoomParticipant participant;

  @override
  Widget build(BuildContext context) {
    final RoomParticipant r = participant;
    final Widget? chip = switch (r.kind) {
      RoomParticipantKind.human => null,
      RoomParticipantKind.dot => KmChip(
        'Dot · ${r.owner ?? ''}',
        tone: r.mine ? KmChipTone.ember : KmChipTone.cyan,
      ),
      RoomParticipantKind.agent => KmChip(
        r.system ? 'System agent' : 'Agent · ${r.role ?? ''}',
        tone: r.system ? KmChipTone.ember : KmChipTone.cyan,
      ),
    };
    // Room actions are static this phase (no realtime adapter yet): they
    // render and are named, but do nothing.
    final Widget? action = switch (r.kind) {
      RoomParticipantKind.dot when r.mine => KmIconButton(
        icon: LucideIcons.pause,
        label: 'Pause ${r.name}',
        onPressed: () {},
      ),
      RoomParticipantKind.agent when !r.system => KmIconButton(
        icon: LucideIcons.x,
        label: 'Remove ${r.name} from the room',
        onPressed: () {},
      ),
      _ => null,
    };
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 52),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(KmTokens.s3, KmTokens.s2, KmTokens.s2, 0),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Align(
                alignment: Alignment.centerLeft,
                child: chip ?? const SizedBox.shrink(),
              ),
            ),
            ?action,
          ],
        ),
      ),
    );
  }
}

class _TileMedia extends StatelessWidget {
  const _TileMedia({required this.participant});

  final RoomParticipant participant;

  @override
  Widget build(BuildContext context) {
    final RoomParticipant r = participant;
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints c) {
        final double w = c.maxWidth;
        final double h = c.maxHeight;
        return Center(
          child: switch (r.kind) {
            RoomParticipantKind.human => KmAvatar(
              r.initials,
              size: math.min((w * 0.3).clamp(64, 104).toDouble(), h - KmTokens.s2),
            ),
            RoomParticipantKind.dot => Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                KmOrb(
                  size: math.min((w * 0.32).clamp(64, 120).toDouble(), h - 48),
                  cyan: r.cyan,
                  paused: r.state == RoomAgentState.paused,
                ),
                const SizedBox(height: KmTokens.s3),
                _StateLine(state: r.state),
              ],
            ),
            RoomParticipantKind.agent => Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                KmAgentGlyph(
                  r.mono ?? '',
                  size: (w * 0.22).clamp(56, 84).toDouble(),
                  system: r.system,
                ),
                const SizedBox(height: KmTokens.s3),
                _Bars(system: r.system),
                const SizedBox(height: KmTokens.s3),
                _StateLine(state: r.state),
              ],
            ),
          },
        );
      },
    );
  }
}

class _TileFoot extends StatelessWidget {
  const _TileFoot({required this.participant});

  final RoomParticipant participant;

  @override
  Widget build(BuildContext context) {
    final RoomParticipant r = participant;
    final String name = r.isSelf ? '${r.name} (you)' : r.name;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 44),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(KmTokens.s3, KmTokens.s2, KmTokens.s3, KmTokens.s3),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: KmText.label(context),
              ),
            ),
            if (r.isHost) const KmChip('Host', tone: KmChipTone.ember),
          ],
        ),
      ),
    );
  }
}

/// `.state-line`: shape + text, never colour alone.
class _StateLine extends StatelessWidget {
  const _StateLine({required this.state});

  final RoomAgentState state;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String label = switch (state) {
      RoomAgentState.listening => 'Listening',
      RoomAgentState.thinking => 'Thinking',
      RoomAgentState.speaking => 'Speaking',
      RoomAgentState.paused => 'Paused',
    };
    final Widget glyph = switch (state) {
      RoomAgentState.listening => Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: p.green, shape: BoxShape.circle),
      ),
      RoomAgentState.thinking => Transform.rotate(
        angle: math.pi / 4,
        child: Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: p.amber,
            borderRadius: BorderRadius.circular(KmTokens.radius2),
          ),
        ),
      ),
      RoomAgentState.speaking => Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          for (int i = 0; i < 3; i++)
            Container(
              width: 4,
              height: 12,
              margin: const EdgeInsets.symmetric(horizontal: 1),
              decoration: BoxDecoration(
                color: p.cyan,
                borderRadius: BorderRadius.circular(KmTokens.radius2),
              ),
            ),
        ],
      ),
      RoomAgentState.paused => Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: p.fgSub, width: 2),
        ),
      ),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        ExcludeSemantics(child: glyph),
        const SizedBox(width: KmTokens.s2),
        Text(label, style: KmText.label(context)),
      ],
    );
  }
}

/// `.bars`: the agent's voice meter, idle (scaleY 0.2) while listening.
class _Bars extends StatelessWidget {
  const _Bars({required this.system});

  final bool system;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return ExcludeSemantics(
      child: SizedBox(
        height: 24,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            for (int i = 0; i < 5; i++)
              Container(
                width: 4,
                height: 24 * 0.2,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: system ? p.ember : p.cyan,
                  borderRadius: BorderRadius.circular(KmTokens.radius2),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
