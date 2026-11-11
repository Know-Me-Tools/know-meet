// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';

/// `.poster`: a composed mini tile layout at 16:9 (speaker: main tile plus a
/// side column; grid: 2 x 2) with the duration badge. Decorative: the card
/// carries the title and details.
class RecordingPoster extends StatelessWidget {
  const RecordingPoster(this.recording, {super.key, this.compact = false});

  final Recording recording;

  /// `.rec-list .poster`: smaller tiles, no badge.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final List<String> people = recording.participants;
    final RecordingAgent? agent = recording.agents.isEmpty ? null : recording.agents.first;
    final double gap = compact ? 3 : 6;
    Widget tile(String text, {bool main = false, bool isAgent = false}) => _Tile(
      text: text,
      main: main,
      agent: isAgent,
      compact: compact,
    );
    final Widget body;
    if (recording.layout == RecordingLayout.grid) {
      final List<Widget> cells = <Widget>[
        for (int i = 0; i < people.length && i < 3; i++)
          tile(RecordingFormat.initials(people[i]), main: i == 0),
        if (agent != null) tile(agent.mono, isAgent: true),
      ];
      body = Column(
        children: <Widget>[
          for (int row = 0; row < 2; row++) ...<Widget>[
            if (row > 0) SizedBox(height: gap),
            Expanded(
              child: Row(
                children: <Widget>[
                  for (int col = 0; col < 2; col++) ...<Widget>[
                    if (col > 0) SizedBox(width: gap),
                    Expanded(
                      child: row * 2 + col < cells.length
                          ? cells[row * 2 + col]
                          : const SizedBox.shrink(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      );
    } else {
      final List<Widget> side = <Widget>[
        for (int i = 1; i < people.length && i < 3; i++)
          tile(RecordingFormat.initials(people[i])),
        if (agent != null) tile(agent.mono, isAgent: true),
      ];
      body = Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Expanded(flex: 3, child: tile(RecordingFormat.initials(people.first), main: true)),
          SizedBox(width: gap),
          Expanded(
            child: Column(
              children: <Widget>[
                for (int i = 0; i < 3; i++) ...<Widget>[
                  if (i > 0) SizedBox(height: gap),
                  Expanded(child: i < side.length ? side[i] : const SizedBox.shrink()),
                ],
              ],
            ),
          ),
        ],
      );
    }
    return ExcludeSemantics(
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: p.bg2,
          padding: EdgeInsets.all(compact ? 4 : 8),
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              body,
              if (!compact)
                Positioned(
                  right: 6,
                  bottom: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: p.fg,
                      borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                    ),
                    child: Text(
                      RecordingFormat.duration(recording.durationSeconds),
                      style: TextStyle(
                        fontFamily: KmTokens.fontMono,
                        fontSize: KmTokens.textXs,
                        fontWeight: KmTokens.fontWeightSemibold,
                        color: p.bg,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.text,
    required this.main,
    required this.agent,
    required this.compact,
  });

  final String text;
  final bool main;
  final bool agent;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color bg = agent ? p.cyanSoft : (main ? p.tile2 : p.tile);
    final Color fg = agent ? p.cyanText : (main ? p.fg : p.fgSub);
    final double size = compact ? (main ? 14 : 10) : (main ? 18 : 13);
    return Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(compact ? 5 : KmTokens.radius8),
        border: main ? Border.all(color: p.ember, width: 2) : null,
      ),
      child: Text(
        text,
        maxLines: 1,
        style: agent
            ? TextStyle(
                fontFamily: KmTokens.fontMono,
                fontSize: size,
                fontWeight: KmTokens.fontWeightSemibold,
                color: fg,
              )
            : KmText.displayAt(context, size: size, color: fg),
      ),
    );
  }
}
