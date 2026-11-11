// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invite_delivery.dart';
import '../dashboard_format.dart';
import 'dash_bits.dart';

/// "Connected calendars" card.
class CalendarsCard extends StatelessWidget {
  const CalendarsCard({super.key, required this.calendars, required this.lastSynced});

  final List<CalendarConnection> calendars;
  final DateTime lastSynced;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(
            title: 'Connected calendars',
            sub: 'KnowMe adds a join link and dial-in to each event.',
          ),
          const SizedBox(height: KmTokens.s3),
          for (int i = 0; i < calendars.length; i++) ...<Widget>[
            if (i > 0) const DashRowRule(),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: KmTokens.s2 + 2),
              child: Row(
                children: <Widget>[
                  ExcludeSemantics(
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: p.muted,
                        borderRadius: BorderRadius.circular(KmTokens.radius10),
                      ),
                      child: Icon(LucideIcons.calendar, size: 16, color: p.fg),
                    ),
                  ),
                  const SizedBox(width: KmTokens.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(calendars[i].name, style: KmText.label(context)),
                        Text(
                          calendars[i].account,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: KmText.xsmall(context).copyWith(color: p.fgSub),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: KmTokens.s3),
                  if (calendars[i].connected)
                    const KmChip('Connected', tone: KmChipTone.green, pip: true)
                  else
                    KmButton(
                      label: 'Connect',
                      size: KmButtonSize.small,
                      onPressed: () => context.go('/settings/calendars'),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: KmTokens.s3),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: KmTokens.s2,
            runSpacing: KmTokens.s2,
            children: <Widget>[
              Semantics(
                liveRegion: true,
                child: MetaItem(
                  icon: LucideIcons.clock,
                  text: 'Last synced ${DashFormat.time(lastSynced)}',
                ),
              ),
              KmButton(
                label: 'Sync now',
                icon: LucideIcons.refreshCw,
                size: KmButtonSize.small,
                onPressed: () => ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                  const SnackBar(content: Text('Synced just now')),
                ),
              ),
            ],
          ),
          const SizedBox(height: KmTokens.s2),
          Align(
            alignment: Alignment.centerLeft,
            child: DashLink('Manage calendars', onTap: () => context.go('/settings/calendars')),
          ),
        ],
      ),
    );
  }
}

/// "Invite delivery" tally card.
class DeliveryCard extends StatelessWidget {
  const DeliveryCard({super.key, required this.deliveries});

  final List<InviteDelivery> deliveries;

  int _count(DeliveryStatus s) => deliveries.where((InviteDelivery d) => d.status == s).length;

  @override
  Widget build(BuildContext context) {
    final int failed = _count(DeliveryStatus.failed);
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(
            title: 'Invite delivery',
            sub: 'Email, SMS and calendar invites across upcoming meetings.',
          ),
          const SizedBox(height: KmTokens.s3),
          Row(
            children: <Widget>[
              Expanded(child: _Tally(value: _count(DeliveryStatus.delivered) + _count(DeliveryStatus.opened), label: 'Delivered')),
              const SizedBox(width: KmTokens.s2),
              Expanded(child: _Tally(value: _count(DeliveryStatus.queued), label: 'Queued')),
              const SizedBox(width: KmTokens.s2),
              Expanded(child: _Tally(value: failed, label: 'Failed')),
            ],
          ),
          if (failed > 0) ...<Widget>[
            const SizedBox(height: KmTokens.s3),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(LucideIcons.circleAlert, size: 16, color: context.km.fg),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    failed == 1
                        ? '1 SMS invite couldn’t be delivered.'
                        : '$failed invites couldn’t be delivered.',
                    style: KmText.small(context),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: KmTokens.s3),
          KmButton(
            label: 'Review invites',
            trailingIcon: LucideIcons.chevronRight,
            size: KmButtonSize.small,
            block: true,
            onPressed: () => context.go('/dashboard/invites'),
          ),
        ],
      ),
    );
  }
}

class _Tally extends StatelessWidget {
  const _Tally({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.all(KmTokens.s3),
        decoration: BoxDecoration(
          color: context.km.card,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              '$value',
              style: KmText.displayAt(context, size: KmTokens.textXl).copyWith(
                fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 2),
            Text(label, style: KmText.xsmall(context).copyWith(color: context.km.fgSub)),
          ],
        ),
      ),
    );
  }
}
