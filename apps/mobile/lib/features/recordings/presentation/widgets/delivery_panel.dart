// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/recording.dart';
import '../../domain/recording_format.dart';
import 'recording_bits.dart';

/// Column widths of the delivery table. The table scrolls sideways inside
/// its own surface at phone width (`.table-wrap`).
const List<double> _cols = <double>[184, 196, 220, 150, 120];

/// Delivery tab: who received the transcript and summary, per channel.
class DeliveryPanel extends StatelessWidget {
  const DeliveryPanel({super.key, required this.recording, required this.rows});

  final Recording recording;
  final List<DeliveryRow> rows;

  @override
  Widget build(BuildContext context) {
    final Recording r = recording;
    final bool held = !r.summarySent &&
        rows.any((DeliveryRow x) =>
            x.channel == DeliveryChannel.email && x.status == DeliveryStatus.heldForReview);
    final bool bounced = rows.any((DeliveryRow x) => x.status == DeliveryStatus.bounced);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(header: true, child: Text('Delivery', style: KmText.h2(context))),
        const SizedBox(height: KmTokens.s2),
        Text(
          'Who received the transcript and summary when the meeting closed. '
          'SMS messages carry a link, sent via Telnyx.',
          style: KmText.smallSub(context),
        ),
        const SizedBox(height: KmTokens.s2),
        Align(
          alignment: Alignment.centerLeft,
          child: KmButton(
            label: 'Delivery settings',
            icon: LucideIcons.settings,
            size: KmButtonSize.small,
            onPressed: () => context.go('/settings/delivery'),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        if (held) ...<Widget>[
          RecNote(
            kind: RecNoteKind.warn,
            icon: LucideIcons.clock,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'This summary is held for your review because delivery timing was '
                  'set to “After I review”. Nothing has been sent yet.',
                ),
                const SizedBox(height: KmTokens.s2),
                Wrap(
                  spacing: KmTokens.s2,
                  runSpacing: KmTokens.s2,
                  children: <Widget>[
                    KmButton(
                      label: 'Review done — send now',
                      icon: LucideIcons.send,
                      variant: KmButtonVariant.primary,
                      size: KmButtonSize.small,
                      onPressed: () => showRecordingsUnavailable(context, 'Sending the summary'),
                    ),
                    KmButton(
                      label: 'Review summary',
                      size: KmButtonSize.small,
                      onPressed: () => context.go('/recordings/detail/${r.id}/summary'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: KmTokens.s4),
        ],
        _Table(rows: rows),
        if (bounced) ...<Widget>[
          const SizedBox(height: KmTokens.s4),
          const RecNote(
            kind: RecNoteKind.err,
            icon: LucideIcons.circleAlert,
            child: Text(
              'One email bounced. Check the address with the participant, then '
              'resend. Their SMS link was delivered, so they still have access.',
            ),
          ),
        ],
        const SizedBox(height: KmTokens.s4),
        Text(
          'Opened is reported for email only. SMS status comes from Telnyx delivery '
          'receipts. Recipients without a KnowMe account can open the link without '
          'signing in until it expires.',
          style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
        ),
      ],
    );
  }
}

class _Table extends StatelessWidget {
  const _Table({required this.rows});

  final List<DeliveryRow> rows;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle head = TextStyle(
      fontFamily: KmTokens.fontMono,
      fontSize: KmTokens.text11,
      fontWeight: KmTokens.fontWeightSemibold,
      letterSpacing: KmTokens.trackingTableEm * KmTokens.text11,
      color: p.fgSub,
    );
    Widget cell(int col, Widget child) => SizedBox(
      width: _cols[col],
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        child: child,
      ),
    );
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: 'Delivery status per participant and channel',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(KmTokens.radiusTile),
        // D-6 table: no rules. Header row `bg-2`; body rows alternate
        // transparent and `surface`.
        child: ColoredBox(
          color: Colors.transparent,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                ExcludeSemantics(
                  child: ColoredBox(
                    color: p.bg2,
                    child: Row(
                    children: <Widget>[
                      cell(0, Text('PARTICIPANT', style: head)),
                      cell(1, Text('CHANNEL', style: head)),
                      cell(2, Text('SENT TO', style: head)),
                      cell(3, Text('STATUS', style: head)),
                      cell(4, const SizedBox.shrink()),
                    ],
                  ),
                  ),
                ),
                for (final (int i, DeliveryRow row) in rows.indexed) ...<Widget>[
                  ColoredBox(
                    color: i.isOdd ? p.surface : Colors.transparent,
                    child: Row(
                      children: <Widget>[
                        cell(
                          0,
                          Row(
                            children: <Widget>[
                              KmAvatar(
                                RecordingFormat.initials(row.name),
                                size: 32,
                                tone: KmAvatarTone.onSurface,
                              ),
                              const SizedBox(width: KmTokens.s2),
                              Expanded(
                                child: Text(
                                  row.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: KmText.small(context),
                                ),
                              ),
                            ],
                          ),
                        ),
                        cell(
                          1,
                          Row(
                            children: <Widget>[
                              ExcludeSemantics(
                                child: Icon(
                                  row.channel == DeliveryChannel.sms
                                      ? LucideIcons.messageSquareText
                                      : LucideIcons.mail,
                                  size: 16,
                                  color: p.fg,
                                ),
                              ),
                              const SizedBox(width: KmTokens.s2),
                              Text(
                                row.channel == DeliveryChannel.sms ? 'SMS link via Telnyx' : 'Email',
                                style: KmText.small(context),
                              ),
                            ],
                          ),
                        ),
                        cell(2, Text(row.destination, style: KmText.mono(context))),
                        cell(3, Align(alignment: Alignment.centerLeft, child: DeliveryStatusChip(row.status))),
                        cell(
                          4,
                          Align(
                            alignment: Alignment.centerRight,
                            child: Semantics(
                              button: true,
                              label: '${row.status == DeliveryStatus.heldForReview ? 'Send' : 'Resend'} '
                                  '${row.channel == DeliveryChannel.sms ? 'SMS link via Telnyx' : 'Email'} to ${row.name}',
                              excludeSemantics: true,
                              onTap: () => showRecordingsUnavailable(context, 'Resending'),
                              child: KmButton(
                                label: row.status == DeliveryStatus.heldForReview ? 'Send' : 'Resend',
                                icon: LucideIcons.refreshCw,
                                size: KmButtonSize.small,
                                onPressed: () => showRecordingsUnavailable(context, 'Resending'),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
