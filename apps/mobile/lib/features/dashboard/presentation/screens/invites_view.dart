// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invite_delivery.dart';
import '../../domain/meeting.dart';
import '../dashboard_format.dart';
import '../providers/dashboard_providers.dart';
import '../widgets/dash_bits.dart';

/// `dashboard.invites`: every sent invite with delivery status. The
/// prototype's seven-column table overflows a 375px viewport; at phone
/// width each invite is a stacked card with the same fields and actions.
/// Channel and status filters live in the route query
/// (`?channel=sms&status=failed`).
class InvitesView extends ConsumerWidget {
  const InvitesView({super.key, this.channel, this.status});

  /// null = all channels.
  final InviteChannel? channel;

  /// null = any status.
  final DeliveryStatus? status;

  String _location({InviteChannel? channel, DeliveryStatus? status}) {
    final Map<String, String> q = <String, String>{
      if (channel != null) 'channel': channel.name,
      if (status != null) 'status': status.name,
    };
    return Uri(path: '/dashboard/invites', queryParameters: q.isEmpty ? null : q).toString();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<Meeting> meetings = ref.watch(dashboardMeetingsProvider);
    final List<InviteDelivery> all = ref.watch(inviteDeliveriesProvider);
    final String q = ref.watch(inviteSearchProvider).toLowerCase();
    final Set<String> selected = ref.watch(inviteSelectionProvider);
    Meeting meetingOf(String id) => meetings.firstWhere((Meeting m) => m.id == id);
    final List<InviteDelivery> rows = all.where((InviteDelivery d) {
      if (channel != null && d.channel != channel) return false;
      if (status != null && d.status != status) return false;
      if (q.isNotEmpty &&
          !('${d.name} ${d.to} ${meetingOf(d.meetingId).title}'.toLowerCase().contains(q))) {
        return false;
      }
      return true;
    }).toList();
    final int failedN = all.where((InviteDelivery d) => d.isFailed).length;
    final int selN = rows.where((InviteDelivery d) => selected.contains(d.id)).length;
    void toast(String m) =>
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(m)));
    return KmPage(
      children: <Widget>[
        KmPageHead(
          title: 'Invites',
          lede: 'Every invite you’ve sent for upcoming meetings, with delivery status by '
              'email, SMS and calendar.',
          actions: <Widget>[
            KmButton(
              label: 'Schedule meeting',
              icon: LucideIcons.plus,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/dashboard/schedule'),
            ),
          ],
        ),
        const DashTabs(active: 'invites'),
        Align(
          alignment: Alignment.centerLeft,
          child: KmSegmented<InviteChannel?>(
            label: 'Filter by channel',
            options: const <KmOption<InviteChannel?>>[
              KmOption<InviteChannel?>(null, 'All'),
              KmOption<InviteChannel?>(InviteChannel.email, 'Email'),
              KmOption<InviteChannel?>(InviteChannel.sms, 'SMS'),
              KmOption<InviteChannel?>(InviteChannel.calendar, 'Calendar'),
            ],
            selected: channel,
            onChanged: (InviteChannel? c) => context.go(_location(channel: c, status: status)),
          ),
        ),
        const SizedBox(height: KmTokens.s3),
        _StatusSelect(
          value: status,
          onChanged: (DeliveryStatus? s) => context.go(_location(channel: channel, status: s)),
        ),
        const SizedBox(height: KmTokens.s3),
        _SearchField(onChanged: ref.read(inviteSearchProvider.notifier).set),
        const SizedBox(height: KmTokens.s4),
        Semantics(
          liveRegion: true,
          child: Text(
            '${rows.length} ${rows.length == 1 ? 'invite' : 'invites'}',
            style: KmText.smallSub(context),
          ),
        ),
        const SizedBox(height: KmTokens.s3),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Resend failed ($failedN)',
              icon: LucideIcons.circleAlert,
              size: KmButtonSize.small,
              onPressed: failedN == 0
                  ? null
                  : () => toast('Nothing resent. $failedN SMS still undeliverable — send email instead.'),
            ),
            KmButton(
              label: 'Resend selected ($selN)',
              icon: LucideIcons.refreshCw,
              variant: KmButtonVariant.primary,
              size: KmButtonSize.small,
              onPressed: selN == 0 ? null : () => toast('Resent $selN ${selN == 1 ? 'invite' : 'invites'}'),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s4),
        if (rows.isEmpty)
          KmEmptyState(
            icon: LucideIcons.filter,
            title: 'No invites match these filters',
            body: 'Try another channel or status, or clear the search.',
            actions: <Widget>[
              KmButton(
                label: 'Clear filters',
                size: KmButtonSize.small,
                onPressed: () {
                  ref.read(inviteSearchProvider.notifier).set('');
                  context.go('/dashboard/invites');
                },
              ),
            ],
          )
        else ...<Widget>[
          KmCheckRow(
            label: 'Select all ${rows.length} shown invites',
            value: rows.every((InviteDelivery d) => selected.contains(d.id)),
            onChanged: (bool v) => ref
                .read(inviteSelectionProvider.notifier)
                .setAll(rows.map((InviteDelivery d) => d.id), v),
          ),
          const SizedBox(height: KmTokens.s2),
          for (final InviteDelivery d in rows) ...<Widget>[
            _InviteCard(
              delivery: d,
              meeting: meetingOf(d.meetingId),
              selected: selected.contains(d.id),
              onSelect: (bool v) => ref.read(inviteSelectionProvider.notifier).toggle(d.id, v),
              onResend: () => toast(
                d.isFailed
                    ? 'SMS still undeliverable — this number is a landline. Send email instead.'
                    : 'Invite resent to ${d.name}',
              ),
              onEmailInstead: () => toast('Email invite sent to ${d.name}'),
            ),
            const SizedBox(height: KmTokens.s2),
          ],
        ],
      ],
    );
  }
}

class _StatusSelect extends StatelessWidget {
  const _StatusSelect({required this.value, required this.onChanged});

  final DeliveryStatus? value;
  final ValueChanged<DeliveryStatus?> onChanged;

  static const List<(DeliveryStatus?, String)> _options = <(DeliveryStatus?, String)>[
    (null, 'Any status'),
    (DeliveryStatus.delivered, 'Delivered'),
    (DeliveryStatus.opened, 'Opened'),
    (DeliveryStatus.queued, 'Queued'),
    (DeliveryStatus.failed, 'Failed'),
  ];

  @override
  Widget build(BuildContext context) => KmSelect<DeliveryStatus?>(
    label: 'Status',
    value: value,
    options: _options,
    onChanged: onChanged,
  );
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onChanged});

  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Search invites',
      child: TextField(
        onChanged: onChanged,
        style: kmFieldStyle(context),
        decoration: kmFieldDecoration(
          context,
          placeholder: 'e.g. name, email, phone or meeting',
          prefixIcon: const ExcludeSemantics(child: Icon(LucideIcons.search, size: 16)),
        ),
      ),
    );
  }
}

class _InviteCard extends StatelessWidget {
  const _InviteCard({
    required this.delivery,
    required this.meeting,
    required this.selected,
    required this.onSelect,
    required this.onResend,
    required this.onEmailInstead,
  });

  final InviteDelivery delivery;
  final Meeting meeting;
  final bool selected;
  final ValueChanged<bool> onSelect;
  final VoidCallback onResend;
  final VoidCallback onEmailInstead;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final InviteDelivery d = delivery;
    final String channel = ChannelChip.label(d.channel);
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              KmCheckbox(
                label: 'Select invite to ${d.name} by $channel for ${meeting.title}',
                value: selected,
                onChanged: onSelect,
              ),
              const SizedBox(width: KmTokens.s2),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(d.name, style: KmText.label(context)),
                      Text(d.to, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          DashLink(meeting.title, onTap: () => context.go('/dashboard/meeting/${meeting.id}')),
          Text(DashFormat.date(meeting.start), style: KmText.xsmall(context).copyWith(color: p.fgSub)),
          const SizedBox(height: KmTokens.s3),
          Wrap(
            spacing: KmTokens.s2,
            runSpacing: KmTokens.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[ChannelChip(d.channel), DeliveryStatusChip(d.status)],
          ),
          if (d.isFailed && d.reason != null) ...<Widget>[
            const SizedBox(height: KmTokens.s2),
            Text(
              '${d.reason}. Suggestion: send an email invite instead.',
              style: KmText.xsmall(context).copyWith(color: p.fgSub),
            ),
          ],
          const SizedBox(height: KmTokens.s2),
          Text('Sent ${DashFormat.date(d.sentAt)}', style: KmText.small(context)),
          const SizedBox(height: KmTokens.s3),
          Wrap(
            spacing: KmTokens.s2,
            runSpacing: KmTokens.s2,
            children: <Widget>[
              if (d.isFailed && d.landline)
                KmButton(
                  label: 'Send email instead',
                  icon: LucideIcons.mail,
                  variant: KmButtonVariant.primary,
                  size: KmButtonSize.small,
                  onPressed: onEmailInstead,
                ),
              KmButton(
                label: 'Resend',
                icon: LucideIcons.refreshCw,
                size: KmButtonSize.small,
                onPressed: onResend,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
