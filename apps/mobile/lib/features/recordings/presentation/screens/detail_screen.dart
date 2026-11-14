// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/recordings_repository.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import '../providers/recordings_providers.dart';
import '../widgets/delivery_panel.dart';
import '../widgets/rec_crumbs.dart';
import '../widgets/recording_bits.dart';
import '../widgets/recording_player.dart';
import '../widgets/storage_panel.dart';
import '../widgets/summary_panel.dart';
import '../widgets/transcript_panel.dart';
import 'not_found_screen.dart';

/// `#detail:<id>[:<tab>]` (states `recordings.detail.<id>` and its
/// `.transcript|.summary|.delivery|.storage` tabs). The selected tab comes
/// from the route; tapping a tab navigates.
class RecordingDetailScreen extends ConsumerWidget {
  const RecordingDetailScreen({super.key, required this.id, required this.tab});

  final String id;
  final RecordingTab tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Recording? r = ref.watch(recordingByIdProvider(id));
    if (r == null) return RecordingNotFoundScreen(id: id);
    final RecordingsRepository repo = ref.watch(recordingsRepositoryProvider);
    final List<TranscriptChapter> chapters = repo.transcript(r.id);
    final bool showPlayer = tab == RecordingTab.transcript || tab == RecordingTab.summary;
    final RecordingSummary? summary = repo.summary(r.id);
    final Widget panel = switch (tab) {
      RecordingTab.transcript => TranscriptPanel(recording: r, chapters: chapters),
      RecordingTab.summary when summary != null => SummaryPanel(recording: r, summary: summary),
      RecordingTab.summary => Text('No summary yet.', style: KmText.sub(context)),
      RecordingTab.delivery => DeliveryPanel(recording: r, rows: repo.delivery(r.id)),
      RecordingTab.storage => StoragePanel(recording: r),
    };
    return KmPage(
      children: <Widget>[
        _Head(recording: r),
        const SizedBox(height: KmTokens.s5),
        if (showPlayer) ...<Widget>[
          RecordingPlayer(recording: r, chapters: chapters),
          const SizedBox(height: KmTokens.s5),
        ],
        KmTabs<RecordingTab>(
          selected: tab,
          onChanged: (RecordingTab t) => context.go('/recordings/detail/${r.id}/${t.name}'),
          tabs: const <KmOption<RecordingTab>>[
            KmOption<RecordingTab>(RecordingTab.transcript, 'Transcript', icon: LucideIcons.captions),
            KmOption<RecordingTab>(RecordingTab.summary, 'Summary', icon: LucideIcons.book),
            KmOption<RecordingTab>(RecordingTab.delivery, 'Delivery', icon: LucideIcons.send),
            KmOption<RecordingTab>(RecordingTab.storage, 'Storage', icon: LucideIcons.database),
          ],
        ),
        const SizedBox(height: KmTokens.s4),
        panel,
      ],
    );
  }
}

class _Head extends StatelessWidget {
  const _Head({required this.recording});

  final Recording recording;

  @override
  Widget build(BuildContext context) {
    final Recording r = recording;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        RecCrumbs(<(String, VoidCallback?)>[
          ('Recordings', () => context.go('/recordings/library')),
          (r.title, null),
        ]),
        const SizedBox(height: KmTokens.s3),
        Semantics(header: true, child: Text(r.title, style: KmText.h1(context))),
        const SizedBox(height: KmTokens.s2),
        Wrap(
          spacing: KmTokens.s4,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            RecIconText(LucideIcons.calendar, RecordingFormat.date(r.date)),
            RecIconText(LucideIcons.clock, RecordingFormat.minutes(r.durationMin)),
            RecIconText(LucideIcons.users, '${r.participants.length} participants'),
            RecIconText(LucideIcons.user, 'Host: ${r.host}'),
          ],
        ),
        const SizedBox(height: KmTokens.s3),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Download',
              icon: LucideIcons.download,
              onPressed: () => showRecordingsUnavailable(context, 'Download'),
            ),
            KmButton(
              label: 'Share',
              icon: LucideIcons.link,
              onPressed: () => showRecordingsUnavailable(context, 'Sharing'),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s3),
        RecordingChips(r),
      ],
    );
  }
}
