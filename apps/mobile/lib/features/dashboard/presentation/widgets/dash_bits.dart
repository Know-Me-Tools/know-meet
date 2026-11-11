// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invite_delivery.dart';
import '../../domain/meeting.dart';
import '../dashboard_format.dart';

/// The Meetings section tabs (Upcoming / Invites / Schedule). Selection is
/// derived from the route; choosing a tab navigates.
class DashTabs extends StatelessWidget {
  const DashTabs({super.key, required this.active});

  /// 'upcoming' | 'invites' | 'schedule'
  final String active;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s5),
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: 'Meetings sections',
        child: KmTabs<String>(
          tabs: const <KmOption<String>>[
            KmOption<String>('upcoming', 'Upcoming', icon: LucideIcons.calendar),
            KmOption<String>('invites', 'Invites', icon: LucideIcons.send),
            KmOption<String>('schedule', 'Schedule', icon: LucideIcons.plus),
          ],
          selected: active,
          onChanged: (String v) => context.go('/dashboard/$v'),
        ),
      ),
    );
  }
}

/// Calendar source chip (Google Calendar, Outlook, KnowMe).
class SourceChip extends StatelessWidget {
  const SourceChip(this.source, {super.key});

  final MeetingSource source;

  @override
  Widget build(BuildContext context) => switch (source) {
    MeetingSource.google => const KmChip('Google Calendar', icon: LucideIcons.calendar),
    MeetingSource.outlook => const KmChip('Outlook', icon: LucideIcons.calendar),
    MeetingSource.knowme => const KmChip('KnowMe', tone: KmChipTone.ember, icon: LucideIcons.circleDot),
  };
}

/// Invite channel chip.
class ChannelChip extends StatelessWidget {
  const ChannelChip(this.channel, {super.key});

  final InviteChannel channel;

  static String label(InviteChannel c) => switch (c) {
    InviteChannel.email => 'Email',
    InviteChannel.sms => 'SMS',
    InviteChannel.calendar => 'Calendar',
  };

  @override
  Widget build(BuildContext context) => KmChip(
    label(channel),
    icon: switch (channel) {
      InviteChannel.email => LucideIcons.mail,
      InviteChannel.sms => LucideIcons.messageSquareText,
      InviteChannel.calendar => LucideIcons.calendar,
    },
  );
}

/// Delivery status chip: icon + text, never colour alone.
class DeliveryStatusChip extends StatelessWidget {
  const DeliveryStatusChip(this.status, {super.key});

  final DeliveryStatus status;

  @override
  Widget build(BuildContext context) => switch (status) {
    DeliveryStatus.delivered => const KmChip('Delivered', tone: KmChipTone.green, icon: LucideIcons.check),
    DeliveryStatus.opened => const KmChip('Opened', tone: KmChipTone.green, icon: LucideIcons.eye),
    DeliveryStatus.queued => const KmChip('Queued', tone: KmChipTone.amber, icon: LucideIcons.clock),
    DeliveryStatus.sent => const KmChip('Sent', icon: LucideIcons.send),
    DeliveryStatus.failed => const KmChip('Failed', tone: KmChipTone.red, icon: LucideIcons.circleAlert),
  };
}

/// Meeting status chip on the detail screen.
class MeetingStatusChip extends StatelessWidget {
  const MeetingStatusChip(this.status, {super.key});

  final MeetingStatus status;

  @override
  Widget build(BuildContext context) => switch (status) {
    MeetingStatus.live => const KmChip('Live now', tone: KmChipTone.ember, pip: true),
    MeetingStatus.ended => const KmChip('Ended', icon: LucideIcons.check),
    MeetingStatus.upcoming => const KmChip('Upcoming', tone: KmChipTone.green, icon: LucideIcons.clock),
  };
}

/// `.meta-item`: small sub-coloured icon + text.
class MetaItem extends StatelessWidget {
  const MetaItem({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      Icon(icon, size: 16, color: context.km.fgSub),
      const SizedBox(width: 6),
      Text(text, style: KmText.smallSub(context)),
    ],
  );
}

/// Up to three small avatars plus "N invitees".
class AvatarStack extends StatelessWidget {
  const AvatarStack(this.names, {super.key});

  final List<String> names;

  @override
  Widget build(BuildContext context) {
    final List<String> shown = names.take(3).toList();
    // D-6: no 2px cut-out ring; avatars sit 4px apart without overlapping.
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        for (int i = 0; i < shown.length; i++) ...<Widget>[
          if (i > 0) const SizedBox(width: 4),
          KmAvatar(
            DashFormat.initials(shown[i]),
            size: 32,
            tone: KmAvatarTone.onSurface,
          ),
        ],
        const SizedBox(width: 6),
        Text(
          '${names.length} ${names.length == 1 ? 'invitee' : 'invitees'}',
          style: KmText.smallSub(context),
        ),
      ],
    );
  }
}

/// An inline text link (ember, underlined) with a 44px-high target.
class DashLink extends StatelessWidget {
  const DashLink(this.label, {super.key, required this.onTap, this.small = true});

  final String label;
  final VoidCallback onTap;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle base = small ? KmText.small(context) : KmText.body(context);
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      // Link row of the state table: text identifies it; hover `card-hov`,
      // keyboard focus is the `focus` fill with `on-focus` text.
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.resolve(
            p,
            s,
            rest: Colors.transparent,
            restOn: p.emberText,
            hover: p.cardHov,
          );
          return KmFillBox(
            colors: c,
            radius: KmTokens.radius6,
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            alignment: Alignment.centerLeft,
            child: Text(
              label,
              style: base.copyWith(
                color: c.on,
                decoration: TextDecoration.underline,
                decorationColor: c.on,
              ),
            ),
          );
        },
      ),
    );
  }
}

/// A card title (h2 at `--text-lg`) with optional subline and trailing.
class DashCardHead extends StatelessWidget {
  const DashCardHead({super.key, required this.title, this.sub, this.trailing});

  final String title;
  final String? sub;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final Widget text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Semantics(header: true, child: Text(title, style: KmText.h3(context))),
        if (sub != null) ...<Widget>[
          const SizedBox(height: 2),
          Text(sub!, style: KmText.smallSub(context)),
        ],
      ],
    );
    if (trailing == null) return text;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[Expanded(child: text), const SizedBox(width: KmTokens.s3), trailing!],
    );
  }
}

/// Copies [value] and confirms with a snackbar (prototype `KM.copy`).
void copyWithToast(BuildContext context, String value, {String message = 'Copied'}) {
  Clipboard.setData(ClipboardData(text: value));
  ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(message)));
}

/// The "Copy link" button for a meeting.
class CopyLinkButton extends StatelessWidget {
  const CopyLinkButton({super.key, required this.meeting, this.small = true});

  final Meeting meeting;
  final bool small;

  @override
  Widget build(BuildContext context) => KmButton(
    label: 'Copy link',
    icon: LucideIcons.link,
    size: small ? KmButtonSize.small : KmButtonSize.normal,
    onPressed: () => copyWithToast(
      context,
      DashFormat.joinLink(meeting.joinCode),
      message: 'Join link copied',
    ),
  );
}

/// Separation between rows inside a card. D-6 (Flat 2.0): spacing, never a
/// 1px line.
class DashRowRule extends StatelessWidget {
  const DashRowRule({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(height: KmTokens.s1, width: double.infinity);
}
