// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import 'recording_bits.dart';
import 'recording_poster.dart';

String _metaLine(Recording r) =>
    '${RecordingFormat.date(r.date)} · ${RecordingFormat.minutes(r.durationMin)} · '
    '${r.participants.length} participants';

String _detailPath(Recording r) => '/recordings/detail/${r.id}';

/// `.card.rec-card`: poster, title, meta, sharing note and chips; the whole
/// card opens the recording.
class RecordingCard extends StatelessWidget {
  const RecordingCard({super.key, required this.recording});

  final Recording recording;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final Recording r = recording;
    void open() => context.go(_detailPath(r));
    return Semantics(
      button: true,
      label: '${r.title}, ${_metaLine(r)}',
      excludeSemantics: true,
      onTap: open,
      // Interactive card: text identifies it; hover `card-hov`; keyboard
      // focus fills the whole card with `focus` and turns all text `on-focus`.
      child: KmInteractive(
        onTap: open,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.resolve(
            p,
            s,
            rest: p.surface,
            restOn: p.fg,
            hover: p.cardHov,
          );
          final Color sub = s.contains(WidgetState.focused) ? c.on : p.fgSub;
          return ClipRRect(
            borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            child: KmFillBox(
              colors: c,
              radius: KmTokens.radiusTile,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  RecordingPoster(r),
                  Padding(
                    padding: const EdgeInsets.all(KmTokens.s4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          r.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: KmText.displayAt(context, size: KmTokens.textBase, color: c.on),
                        ),
                        const SizedBox(height: KmTokens.s2),
                        Text(_metaLine(r), style: KmText.small(context).copyWith(color: sub)),
                        if (r.owner == RecordingOwner.shared) ...<Widget>[
                          const SizedBox(height: KmTokens.s2),
                          Text(
                            'Shared with you by ${r.host}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: KmText.xsmall(context).copyWith(color: sub),
                          ),
                        ],
                        const SizedBox(height: KmTokens.s2),
                        RecordingChips(r),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// `.rec-list .list-row`: compact poster, title, meta and chips.
class RecordingListRow extends StatelessWidget {
  const RecordingListRow({super.key, required this.recording});

  final Recording recording;

  @override
  Widget build(BuildContext context) {
    final Recording r = recording;
    return KmListRow(
      title: r.title,
      meta: <String>[
        _metaLine(r) +
            (r.owner == RecordingOwner.shared ? ' · Shared by ${r.host}' : ''),
      ],
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(KmTokens.radius10),
        child: SizedBox(width: 88, child: RecordingPoster(r, compact: true)),
      ),
      trailing: RecordingChips(r),
      semanticLabel: '${r.title}, ${_metaLine(r)}',
      onTap: () => context.go(_detailPath(r)),
    );
  }
}
