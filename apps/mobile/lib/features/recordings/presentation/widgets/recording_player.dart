// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import '../providers/recordings_providers.dart';
import 'rec_form_controls.dart';
import 'recording_bits.dart';
import 'recording_stage.dart';

/// Index of the transcript line playing at [t] seconds, or -1.
int lineIndexAt(List<TranscriptLine> lines, int t) {
  int idx = -1;
  for (int i = 0; i < lines.length; i++) {
    if (lines[i].at <= t) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

/// `.player`: the stubbed Room Composite stage, seek bar with chapter
/// markers, play / time / speed / captions row and chapter chips. Media is
/// stubbed this phase (no video plugin): seeking moves the position and the
/// synced transcript; Play explains that playback is not available.
class RecordingPlayer extends ConsumerWidget {
  const RecordingPlayer({super.key, required this.recording, required this.chapters});

  final Recording recording;
  final List<TranscriptChapter> chapters;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmPalette p = context.km;
    final Recording r = recording;
    final int t = ref.watch(playerPositionProvider(r.id));
    final bool cc = ref.watch(playerCaptionsProvider);
    final double speed = ref.watch(playerSpeedProvider);
    final PlayerPosition position = ref.read(playerPositionProvider(r.id).notifier);
    final List<TranscriptLine> lines = <TranscriptLine>[
      for (final TranscriptChapter c in chapters) ...c.lines,
    ];
    final int idx = lineIndexAt(lines, t);
    final TranscriptLine? current = idx < 0 ? null : lines[idx];
    final int total = r.durationSeconds;
    int chapterIdx = -1;
    for (int i = 0; i < chapters.length; i++) {
      if (chapters[i].start <= t) chapterIdx = i;
    }
    void play() => showRecordingsUnavailable(context, 'Playback');
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Recording player',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(KmTokens.radiusLg),
        child: ColoredBox(
          color: p.surface,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              RecordingStage(
                recording: r,
                current: cc ? current : null,
                speaker: current?.speaker,
                onPlay: play,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(KmTokens.s4, KmTokens.s3, KmTokens.s4, KmTokens.s4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    _Scrubber(
                      total: total,
                      t: t,
                      markers: <int>[for (final TranscriptChapter c in chapters) c.start],
                      activeMarker: chapterIdx,
                      onSeek: position.seek,
                    ),
                    const SizedBox(height: KmTokens.s2),
                    Row(
                      children: <Widget>[
                        KmIconButton(icon: LucideIcons.play, label: 'Play', onPressed: play),
                        const SizedBox(width: KmTokens.s2),
                        Text(
                          '${RecordingFormat.duration(t)} / ${RecordingFormat.duration(total)}',
                          style: KmText.mono(context).copyWith(
                            color: p.fgSub,
                            fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                          ),
                        ),
                        const Spacer(),
                        RecSelect<double>(
                          label: 'Playback speed',
                          showLabel: false,
                          dense: true,
                          value: speed,
                          onChanged: ref.read(playerSpeedProvider.notifier).set,
                          options: const <(double, String)>[
                            (0.75, '0.75×'),
                            (1.0, '1×'),
                            (1.25, '1.25×'),
                            (1.5, '1.5×'),
                            (2.0, '2×'),
                          ],
                        ),
                        const SizedBox(width: KmTokens.s2),
                        KmIconButton(
                          icon: LucideIcons.captions,
                          label: 'Captions',
                          selected: cc,
                          onPressed: ref.read(playerCaptionsProvider.notifier).toggle,
                        ),
                      ],
                    ),
                    const SizedBox(height: KmTokens.s2),
                    Semantics(
                      container: true,
                      explicitChildNodes: true,
                      label: 'Chapters',
                      child: Wrap(
                        spacing: 6,
                        children: <Widget>[
                          for (int i = 0; i < chapters.length; i++)
                            _ChapterChip(
                              chapter: chapters[i],
                              current: i == chapterIdx,
                              onTap: () => position.seek(chapters[i].start),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Scrubber extends StatelessWidget {
  const _Scrubber({
    required this.total,
    required this.t,
    required this.markers,
    required this.activeMarker,
    required this.onSeek,
  });

  final int total;
  final int t;
  final List<int> markers;
  final int activeMarker;
  final ValueChanged<int> onSeek;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        ExcludeSemantics(
          child: SizedBox(
            height: 10,
            child: LayoutBuilder(
              builder: (BuildContext context, BoxConstraints c) {
                final double w = c.maxWidth - 16;
                return Stack(
                  children: <Widget>[
                    for (int i = 0; i < markers.length; i++)
                      Positioned(
                        left: 8 + w * (total == 0 ? 0 : markers[i] / total) - 2,
                        top: 0,
                        child: Container(
                          width: 4,
                          height: 10,
                          decoration: BoxDecoration(
                            color: i == activeMarker ? p.ember : p.fgSub,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: p.emberBtn,
            inactiveTrackColor: p.muted,
            thumbColor: p.emberBtn,
            overlayColor: p.emberSoft,
            trackHeight: 4,
          ),
          child: Semantics(
            label: 'Seek',
            child: Slider(
              value: t.clamp(0, total).toDouble(),
              max: total.toDouble(),
              semanticFormatterCallback: (double v) =>
                  '${RecordingFormat.duration(v.round())} of ${RecordingFormat.duration(total)}',
              onChanged: (double v) => onSeek(v.round()),
            ),
          ),
        ),
      ],
    );
  }
}

class _ChapterChip extends StatelessWidget {
  const _ChapterChip({required this.chapter, required this.current, required this.onTap});

  final TranscriptChapter chapter;
  final bool current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Color fg = current ? p.emberText : p.fg;
    final String at = RecordingFormat.duration(chapter.start);
    return Semantics(
      button: true,
      selected: current,
      label: 'Jump to $at, ${chapter.title}',
      excludeSemantics: true,
      onTap: onTap,
      // 32px chip (`.chapters .chip`) inside a 44px tap target (a11y gate).
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Material(
            color: current ? p.emberSoft : p.muted,
            borderRadius: BorderRadius.circular(KmTokens.radiusPill),
            child: InkWell(
              borderRadius: BorderRadius.circular(KmTokens.radiusPill),
              onTap: onTap,
              child: Container(
                constraints: const BoxConstraints(minHeight: 32),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      at,
                      style: TextStyle(
                        fontFamily: KmTokens.fontMono,
                        fontSize: KmTokens.text11,
                        fontWeight: KmTokens.fontWeightMedium,
                        color: fg,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      chapter.title,
                      style: Theme.of(context).textTheme.labelMedium!.copyWith(color: fg),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
