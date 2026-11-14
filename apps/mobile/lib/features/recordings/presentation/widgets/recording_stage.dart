// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';

/// `.stage`: the Room Composite frame, stubbed (no media). Speaker layout at
/// phone width is the main tile over a row of four; grid layout is 3 x 2.
/// Shows the format tag, captions for [current] and the big Play button.
class RecordingStage extends StatelessWidget {
  const RecordingStage({
    super.key,
    required this.recording,
    required this.current,
    required this.speaker,
    required this.onPlay,
  });

  final Recording recording;

  /// The line to caption, or null (captions off or nobody speaking yet).
  final TranscriptLine? current;

  /// Who is speaking at the current position, or null before the first line.
  final String? speaker;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Recording r = recording;
    final Map<String, String> agentMono = <String, String>{
      for (final RecordingAgent a in r.agents) a.name: a.mono,
    };
    final List<String> tiles = <String>[
      ...r.participants,
      for (final RecordingAgent a in r.agents) a.name,
    ];
    final String main = speaker ?? r.participants.first;
    final bool grid = r.layout == RecordingLayout.grid;
    final List<String> order = grid
        ? tiles.take(6).toList()
        : <String>[main, ...tiles.where((String n) => n != main)].take(5).toList();
    Widget tile(String name, {bool isMain = false}) => _VideoTile(
      name: name,
      mono: agentMono[name],
      main: isMain,
      speaking: speaker != null && name == speaker,
      showName: isMain,
    );
    const double gap = 8;
    final Widget layout = grid
        ? Column(
            children: <Widget>[
              for (int row = 0; row < 2; row++) ...<Widget>[
                if (row > 0) const SizedBox(height: gap),
                Expanded(
                  child: Row(
                    children: <Widget>[
                      for (int col = 0; col < 3; col++) ...<Widget>[
                        if (col > 0) const SizedBox(width: gap),
                        Expanded(
                          child: row * 3 + col < order.length
                              ? tile(order[row * 3 + col])
                              : const SizedBox.shrink(),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          )
        : Column(
            children: <Widget>[
              Expanded(flex: 3, child: tile(order.first, isMain: true)),
              const SizedBox(height: gap),
              Expanded(
                child: Row(
                  children: <Widget>[
                    for (int i = 1; i < 5; i++) ...<Widget>[
                      if (i > 1) const SizedBox(width: gap),
                      Expanded(child: i < order.length ? tile(order[i]) : const SizedBox.shrink()),
                    ],
                  ],
                ),
              ),
            ],
          );
    final String label =
        'Room Composite recording, ${grid ? 'grid' : 'speaker'} layout.'
        '${speaker == null ? '' : ' $speaker speaking.'}';
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ColoredBox(
        color: p.bg,
        child: Stack(
          fit: StackFit.expand,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.all(10),
              child: Semantics(label: label, image: true, excludeSemantics: true, child: layout),
            ),
            Positioned(
              top: 16,
              left: 16,
              child: ExcludeSemantics(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: p.bg2,
                    borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Icon(LucideIcons.circleDot, size: 16, color: p.fg),
                      const SizedBox(width: 6),
                      Text(
                        'ROOM COMPOSITE · ${r.format.toUpperCase()}',
                        style: TextStyle(
                          fontFamily: KmTokens.fontMono,
                          fontSize: KmTokens.text11,
                          fontWeight: KmTokens.fontWeightSemibold,
                          color: p.fg,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (current != null)
              Positioned(
                left: 24,
                right: 24,
                bottom: 8,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: p.fg,
                      borderRadius: BorderRadius.circular(KmTokens.radius10),
                    ),
                    child: Text.rich(
                      TextSpan(
                        children: <InlineSpan>[
                          TextSpan(
                            text: '${current!.speaker}: ',
                            style: const TextStyle(fontWeight: KmTokens.fontWeightSemibold),
                          ),
                          TextSpan(text: current!.text),
                        ],
                      ),
                      textAlign: TextAlign.center,
                      style: KmText.xsmall(context).copyWith(color: p.bg, height: 1.4),
                    ),
                  ),
                ),
              ),
            Center(
              child: Semantics(
                button: true,
                label: 'Play recording',
                excludeSemantics: true,
                onTap: onPlay,
                // Primary-button row of the state table, round; focus fill.
                child: KmInteractive(
                  onTap: onPlay,
                  builder: (BuildContext context, Set<WidgetState> s) {
                    final KmStateColors c = KmStateColors.resolve(
                      p,
                      s,
                      rest: p.emberBtn,
                      restOn: p.onEmber,
                      hover: p.emberBtnHov,
                    );
                    return KmFillBox(
                      colors: c,
                      shape: BoxShape.circle,
                      width: 64,
                      height: 64,
                      alignment: Alignment.center,
                      child: Icon(LucideIcons.play, size: 28, color: c.on),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VideoTile extends StatelessWidget {
  const _VideoTile({
    required this.name,
    required this.mono,
    required this.main,
    required this.speaking,
    required this.showName,
  });

  final String name;

  /// Agent glyph letters, or null for a person.
  final String? mono;
  final bool main;
  final bool speaking;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Widget face = mono != null
        ? KmAgentGlyph(mono!, size: main ? 64 : 24)
        : KmAvatar(
            RecordingFormat.initials(name),
            size: main ? 48 : 24,
            tone: KmAvatarTone.onSurface,
          );
    return Container(
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Stack(
        children: <Widget>[
          Center(child: face),
          // D-6: speaking is a badge in the tile head, not a 2px ring.
          if (speaking)
            Positioned(
              top: 6,
              right: 6,
              child: KmSpeakBadge(speaker: mono != null ? KmSpeaker.agent : KmSpeaker.person),
            ),
          if (showName)
            Positioned(
              left: 6,
              bottom: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                decoration: BoxDecoration(
                  color: p.bg2,
                  borderRadius: BorderRadius.circular(KmTokens.radiusPill),
                ),
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: KmText.xsmall(context).copyWith(
                    fontSize: KmTokens.text11,
                    fontWeight: KmTokens.fontWeightSemibold,
                    color: p.fg,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
