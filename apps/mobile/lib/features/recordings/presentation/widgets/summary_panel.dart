// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import '../providers/recordings_providers.dart';
import 'recording_bits.dart';

/// Summary tab: generated-at line, Edit / Regenerate, the summary prose,
/// decisions and checkable action items.
class SummaryPanel extends ConsumerWidget {
  const SummaryPanel({super.key, required this.recording, required this.summary});

  final Recording recording;
  final RecordingSummary summary;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Recording r = recording;
    final DateTime generated = r.date.add(Duration(minutes: r.durationMin + 3));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(header: true, child: Text('Summary', style: KmText.h2(context))),
        const SizedBox(height: KmTokens.s2),
        Text('Generated ${RecordingFormat.date(generated)}', style: KmText.smallSub(context)),
        const SizedBox(height: KmTokens.s2),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Edit',
              icon: LucideIcons.pencil,
              size: KmButtonSize.small,
              onPressed: () => showRecordingsUnavailable(context, 'Editing the summary'),
            ),
            KmButton(
              label: 'Regenerate summary',
              icon: LucideIcons.refreshCw,
              size: KmButtonSize.small,
              onPressed: () => showRecordingsUnavailable(context, 'Regenerating the summary'),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s4),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              for (int i = 0; i < summary.paragraphs.length; i++)
                Padding(
                  padding: EdgeInsets.only(top: i == 0 ? 0 : KmTokens.s5),
                  child: Text(summary.paragraphs[i], style: KmText.body(context)),
                ),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Semantics(header: true, child: Text('Decisions', style: KmText.h3(context))),
              for (final String d in summary.decisions)
                Padding(
                  padding: const EdgeInsets.only(top: KmTokens.s3),
                  child: Text(d, style: KmText.body(context)),
                ),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        _ActionItems(recordingId: r.id, actions: summary.actions),
      ],
    );
  }
}

class _ActionItems extends ConsumerWidget {
  const _ActionItems({required this.recordingId, required this.actions});

  final String recordingId;
  final List<ActionItem> actions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<bool> done = ref.watch(actionItemsDoneProvider(recordingId));
    final int open = done.where((bool d) => !d).length;
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Semantics(header: true, child: Text('Action items', style: KmText.h3(context))),
              ),
              Text('$open open of ${done.length}', style: KmText.smallSub(context)),
            ],
          ),
          for (int i = 0; i < actions.length; i++) ...<Widget>[
            // D-6: items separate by spacing, not a rule.
            if (i > 0) const SizedBox(height: KmTokens.s1),
            _Todo(
              item: actions[i],
              done: i < done.length && done[i],
              onChanged: (bool v) =>
                  ref.read(actionItemsDoneProvider(recordingId).notifier).set(i, v),
            ),
          ],
        ],
      ),
    );
  }
}

/// `.todo`: checkbox, title + owner, due chip.
class _Todo extends StatelessWidget {
  const _Todo({required this.item, required this.done, required this.onChanged});

  final ActionItem item;
  final bool done;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: KmTokens.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Semantics(
              checked: done,
              label: '${item.title}, ${item.owner}',
              excludeSemantics: true,
              onTap: () => onChanged(!done),
              // Fill-only checkbox; keyboard focus fills the indicator.
              child: KmInteractive(
                onTap: () => onChanged(!done),
                builder: (BuildContext context, Set<WidgetState> s) => ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: KmIndicator(
                          kind: KmIndicatorKind.checkbox,
                          checked: done,
                          states: s,
                        ),
                      ),
                      const SizedBox(width: KmTokens.s3),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                item.title,
                                style: KmText.body(context).copyWith(
                                  fontWeight: KmTokens.fontWeightMedium,
                                  color: done ? p.fgSub : p.fg,
                                  decoration: done ? TextDecoration.lineThrough : null,
                                ),
                              ),
                              Text(item.owner, style: KmText.smallSub(context)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: KmTokens.s3),
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: KmChip('Due ${item.due}', icon: LucideIcons.calendar),
          ),
        ],
      ),
    );
  }
}
