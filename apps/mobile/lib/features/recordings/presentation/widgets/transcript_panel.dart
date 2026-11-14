// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import '../providers/recordings_providers.dart';
import 'rec_form_controls.dart';
import 'recording_player.dart' show lineIndexAt;

/// Transcript tab: count and copy, search, "Follow playback", and the
/// chaptered, speaker-attributed lines. Selecting a line seeks the player.
class TranscriptPanel extends ConsumerWidget {
  const TranscriptPanel({super.key, required this.recording, required this.chapters});

  final Recording recording;
  final List<TranscriptChapter> chapters;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String q = ref.watch(transcriptSearchProvider).trim();
    final bool follow = ref.watch(transcriptFollowProvider);
    final int t = ref.watch(playerPositionProvider(recording.id));
    final List<TranscriptLine> lines = <TranscriptLine>[
      for (final TranscriptChapter c in chapters) ...c.lines,
    ];
    final int current = lineIndexAt(lines, t);
    final int matches = q.isEmpty
        ? 0
        : lines.where((TranscriptLine l) => l.text.toLowerCase().contains(q.toLowerCase())).length;
    final String count = q.isEmpty
        ? '${lines.length} lines'
        : '$matches ${matches == 1 ? 'line matches' : 'lines match'} “$q”';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(header: true, child: Text('Transcript', style: KmText.h2(context))),
        const SizedBox(height: KmTokens.s2),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            Text(
              '${RecordingFormat.number(recording.transcriptWords)} words · speaker-attributed',
              style: KmText.smallSub(context),
            ),
            KmButton(
              label: 'Copy',
              icon: LucideIcons.copy,
              size: KmButtonSize.small,
              onPressed: () => _copy(context, lines),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s4),
        RecSearchField(
          label: 'Search transcript',
          placeholder: 'Find a word or phrase',
          value: ref.watch(transcriptSearchProvider),
          onChanged: ref.read(transcriptSearchProvider.notifier).set,
        ),
        const SizedBox(height: KmTokens.s2),
        KmCheckRow(
          label: 'Follow playback',
          value: follow,
          onChanged: ref.read(transcriptFollowProvider.notifier).set,
        ),
        const SizedBox(height: KmTokens.s2),
        Wrap(
          spacing: KmTokens.s2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            Semantics(liveRegion: true, child: Text(count, style: KmText.smallSub(context))),
            Text(
              'Select a line to jump the player to that moment.',
              style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s4),
        _TranscriptList(
          recordingId: recording.id,
          chapters: chapters,
          current: current,
          query: q,
        ),
      ],
    );
  }

  Future<void> _copy(BuildContext context, List<TranscriptLine> lines) async {
    final String text = lines
        .map((TranscriptLine l) => '[${RecordingFormat.duration(l.at)}] ${l.speaker}: ${l.text}')
        .join('\n');
    await Clipboard.setData(ClipboardData(text: text));
    if (!context.mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      const SnackBar(content: Text('Transcript copied')),
    );
  }
}

/// `.tx-list`: at most 620px tall, scrolling inside its own surface.
class _TranscriptList extends ConsumerWidget {
  const _TranscriptList({
    required this.recordingId,
    required this.chapters,
    required this.current,
    required this.query,
  });

  final String recordingId;
  final List<TranscriptChapter> chapters;
  final int current;
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmPalette p = context.km;
    final PlayerPosition position = ref.read(playerPositionProvider(recordingId).notifier);
    int k = 0;
    final List<Widget> children = <Widget>[];
    for (final TranscriptChapter c in chapters) {
      children.add(
        Padding(
          padding: EdgeInsets.fromLTRB(KmTokens.s3, children.isEmpty ? 0 : KmTokens.s4, KmTokens.s3, KmTokens.s2),
          child: Semantics(
            header: true,
            child: Text(
              '${RecordingFormat.duration(c.start)} · ${c.title}'.toUpperCase(),
              style: TextStyle(
                fontFamily: KmTokens.fontMono,
                fontSize: KmTokens.textSm,
                fontWeight: KmTokens.fontWeightMedium,
                letterSpacing: KmTokens.trackingLabelEm * KmTokens.textSm,
                color: p.fgSub,
              ),
            ),
          ),
        ),
      );
      for (final TranscriptLine l in c.lines) {
        final int idx = k++;
        children.add(
          _LineButton(
            line: l,
            current: idx == current,
            query: query,
            onTap: () => position.seek(l.at),
          ),
        );
      }
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Transcript',
      child: Container(
        constraints: const BoxConstraints(maxHeight: 620),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(KmTokens.radiusTile),
          boxShadow: p.shadowCard,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(KmTokens.s3),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      ),
    );
  }
}

class _LineButton extends StatelessWidget {
  const _LineButton({
    required this.line,
    required this.current,
    required this.query,
    required this.onTap,
  });

  final TranscriptLine line;
  final bool current;
  final String query;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String at = RecordingFormat.duration(line.at);
    return Semantics(
      button: true,
      selected: current,
      label: '$at, ${line.speaker}: ${line.text}',
      excludeSemantics: true,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 2),
        // List row: text identifies it. The current line keeps its
        // `ember-soft` fill (supplementary; announced as selected); hover
        // `card-hov`; keyboard focus fills the row with `focus`.
        child: KmInteractive(
          onTap: onTap,
          builder: (BuildContext context, Set<WidgetState> s) {
            final KmStateColors c = KmStateColors.resolve(
              p,
              s,
              rest: current ? p.emberSoft : Colors.transparent,
              restOn: p.fg,
              hover: p.cardHov,
            );
            final bool focused = s.contains(WidgetState.focused);
            return KmFillBox(
              colors: c,
              padding: const EdgeInsets.all(KmTokens.s3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  SizedBox(
                    width: 56,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        at,
                        style: TextStyle(
                          fontFamily: KmTokens.fontMono,
                          fontSize: KmTokens.textXs,
                          color: focused ? c.on : (current ? p.emberText : p.fgSub),
                          fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: KmTokens.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Wrap(
                          spacing: 6,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: <Widget>[
                            Text(line.speaker, style: KmText.label(context).copyWith(color: c.on)),
                            if (line.agent) const KmChip('Agent', tone: KmChipTone.cyan),
                          ],
                        ),
                        Text.rich(
                          TextSpan(children: _highlight(context, line.text, query)),
                          style: KmText.small(context).copyWith(
                            height: KmTokens.leadingBubble,
                            color: c.on,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  /// Marks every case-insensitive occurrence of [q] (`mark`).
  static List<InlineSpan> _highlight(BuildContext context, String text, String q) {
    if (q.isEmpty) return <InlineSpan>[TextSpan(text: text)];
    final KmPalette p = context.km;
    final String lower = text.toLowerCase();
    final String ql = q.toLowerCase();
    final List<InlineSpan> out = <InlineSpan>[];
    int i = 0;
    int j;
    while ((j = lower.indexOf(ql, i)) > -1) {
      if (j > i) out.add(TextSpan(text: text.substring(i, j)));
      out.add(
        TextSpan(
          text: text.substring(j, j + q.length),
          style: TextStyle(backgroundColor: p.amberSoft),
        ),
      );
      i = j + q.length;
    }
    if (i < text.length) out.add(TextSpan(text: text.substring(i)));
    return out;
  }
}
