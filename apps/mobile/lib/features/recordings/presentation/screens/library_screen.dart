// TJ-ARCH-MOB-001 compliant
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import '../providers/recordings_providers.dart';
import '../widgets/rec_form_controls.dart';
import '../widgets/recording_bits.dart';
import '../widgets/recording_card.dart';
import 'empty_screen.dart';

/// Illustrative managed-storage quota (recordings.html `SAMPLE_QUOTA`).
const int _sampleQuotaBytes = 50 * 1024 * 1024 * 1024;

/// `#library` (state `recordings.library`): head, storage strip, toolbar and
/// the recordings grid or list. With no recordings it shows the empty page.
class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<Recording> all = ref.watch(allRecordingsProvider);
    if (all.isEmpty) return const RecordingsEmptyScreen();
    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Library',
          title: 'Recordings',
          lede:
              'Room Composite recordings of meetings you hosted or joined, with '
              'transcripts, summaries and where each file is stored.',
          actions: <Widget>[
            KmButton(
              label: 'Storage settings',
              icon: LucideIcons.database,
              onPressed: () => context.go('/settings/storage'),
            ),
            KmButton(
              label: 'Start meeting',
              icon: LucideIcons.video,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/meet/room'),
            ),
          ],
        ),
        _StorageStrip(all: all),
        const SizedBox(height: KmTokens.s6),
        const _Toolbar(),
        const SizedBox(height: KmTokens.s4),
        const _Results(),
      ],
    );
  }
}

class _StorageStrip extends StatelessWidget {
  const _StorageStrip({required this.all});

  final List<Recording> all;

  @override
  Widget build(BuildContext context) {
    final int used = all
        .where((Recording r) => !r.isByo)
        .fold<int>(0, (int s, Recording r) => s + r.sizeBytes);
    final int byo = all.where((Recording r) => r.isByo).length;
    final double pct = math.max(1.0, (used / _sampleQuotaBytes * 1000).round() / 10);
    final String usedText = RecordingFormat.bytes(used);
    final String quotaText = RecordingFormat.bytes(_sampleQuotaBytes);
    final String byoText = byo == 0
        ? ''
        : ' $byo ${byo == 1 ? 'recording is' : 'recordings are'} in your own bucket and not counted here.';
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Wrap(
            spacing: KmTokens.s2,
            runSpacing: KmTokens.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Semantics(
                header: true,
                child: Text(
                  'KnowMe-managed storage',
                  style: KmText.displayAt(context, size: KmTokens.textBase),
                ),
              ),
              const KmChip('Sample quota', tone: KmChipTone.amber, icon: LucideIcons.info),
            ],
          ),
          const SizedBox(height: KmTokens.s2),
          RecMeter(
            fraction: pct / 100,
            semanticLabel: '$usedText used of a $quotaText sample quota',
          ),
          const SizedBox(height: KmTokens.s2),
          Text(
            '$usedText used of $quotaText · illustrative sample, not a real plan limit.$byoText',
            style: KmText.smallSub(context),
          ),
          const SizedBox(height: KmTokens.s4),
          KmButton(
            label: 'Manage storage',
            trailingIcon: LucideIcons.chevronRight,
            size: KmButtonSize.small,
            block: true,
            onPressed: () => context.go('/settings/storage'),
          ),
        ],
      ),
    );
  }
}

class _Toolbar extends ConsumerWidget {
  const _Toolbar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final LibraryQuery q = ref.watch(libraryQueryControllerProvider);
    final LibraryQueryController c = ref.read(libraryQueryControllerProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        RecSearchField(
          label: 'Search recordings',
          placeholder: 'Title or participant',
          value: q.text,
          onChanged: c.setText,
        ),
        const SizedBox(height: KmTokens.s4),
        _Labelled(
          label: 'Show',
          child: KmSegmented<LibraryFilter>(
            label: 'Show',
            selected: q.filter,
            onChanged: c.setFilter,
            options: const <KmOption<LibraryFilter>>[
              KmOption<LibraryFilter>(LibraryFilter.all, 'All'),
              KmOption<LibraryFilter>(LibraryFilter.shared, 'Shared with me'),
              KmOption<LibraryFilter>(LibraryFilter.mine, 'Mine'),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        Wrap(
          spacing: KmTokens.s4,
          runSpacing: KmTokens.s3,
          crossAxisAlignment: WrapCrossAlignment.end,
          children: <Widget>[
            RecSelect<LibrarySort>(
              label: 'Sort by',
              value: q.sort,
              onChanged: c.setSort,
              options: <(LibrarySort, String)>[
                for (final LibrarySort s in LibrarySort.values) (s, s.label),
              ],
            ),
            _Labelled(
              label: 'View',
              child: KmSegmented<LibraryView>(
                label: 'View',
                selected: q.view,
                onChanged: c.setView,
                options: const <KmOption<LibraryView>>[
                  KmOption<LibraryView>(LibraryView.grid, 'Grid', icon: LucideIcons.film),
                  KmOption<LibraryView>(LibraryView.list, 'List', icon: LucideIcons.menu),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// A field label above a control (`.field > .label`).
class _Labelled extends StatelessWidget {
  const _Labelled({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      ExcludeSemantics(child: Text(label, style: KmText.label(context))),
      const SizedBox(height: 6),
      child,
    ],
  );
}

class _Results extends ConsumerWidget {
  const _Results();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final LibraryQuery q = ref.watch(libraryQueryControllerProvider);
    final List<Recording> list = ref.watch(visibleRecordingsProvider);
    final String needle = q.text.trim();
    final String count =
        '${list.length} ${list.length == 1 ? 'recording' : 'recordings'}'
        '${needle.isEmpty ? '' : ' matching “$needle”'}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(liveRegion: true, child: Text(count, style: KmText.smallSub(context))),
        const SizedBox(height: KmTokens.s3),
        if (list.isEmpty)
          KmEmptyState(
            icon: LucideIcons.search,
            title: 'No recordings match',
            body: 'Try a different title or participant name, or switch the filter back to All.',
            actions: <Widget>[
              KmButton(
                label: 'Clear search and filter',
                icon: LucideIcons.x,
                size: KmButtonSize.small,
                onPressed: () {
                  final LibraryQueryController c =
                      ref.read(libraryQueryControllerProvider.notifier);
                  c.setText('');
                  c.setFilter(LibraryFilter.all);
                },
              ),
            ],
          )
        else if (q.view == LibraryView.list)
          for (final Recording r in list)
            Padding(
              padding: const EdgeInsets.only(bottom: KmTokens.s2),
              child: RecordingListRow(recording: r),
            )
        else
          LayoutBuilder(
            builder: (BuildContext context, BoxConstraints c) {
              const double gap = KmTokens.s4;
              final int cols = math.max(1, ((c.maxWidth + gap) / (300 + gap)).floor());
              final double w = (c.maxWidth - gap * (cols - 1)) / cols;
              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: <Widget>[
                  for (final Recording r in list)
                    SizedBox(width: w, child: RecordingCard(recording: r)),
                ],
              );
            },
          ),
      ],
    );
  }
}
