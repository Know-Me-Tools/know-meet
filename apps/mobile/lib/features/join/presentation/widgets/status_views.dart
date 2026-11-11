// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/invitation.dart';
import 'join_chrome.dart';

/// `.center-card`: the centred card of the waiting, expired and wrong-code
/// views.
class _CenterCard extends StatelessWidget {
  const _CenterCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: KmTokens.s7),
    child: KmCard(
      panel: true,
      padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s6),
      child: Column(children: children),
    ),
  );
}

/// `.badge.warn` / `.badge.err`: a 64px tinted icon tile.
class _Badge extends StatelessWidget {
  const _Badge({required this.icon, required this.fill, required this.color});

  final IconData icon;
  final Color fill;
  final Color color;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(KmTokens.radiusTile)),
      child: Icon(icon, size: 28, color: color),
    ),
  );
}

Widget _title(BuildContext context, String text) => Padding(
  padding: const EdgeInsets.only(top: KmTokens.s5, bottom: KmTokens.s3),
  child: Semantics(
    header: true,
    child: Text(text, textAlign: TextAlign.center, style: KmText.h1(context)),
  ),
);

/// `#waiting`: asking the host to let you in.
class WaitingView extends StatelessWidget {
  const WaitingView({super.key, required this.invite});

  final Invitation invite;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle body = KmText.sub(context);
    final TextStyle strong = body.copyWith(color: p.fg, fontWeight: KmTokens.fontWeightSemibold);
    return _CenterCard(
      children: <Widget>[
        const SizedBox(height: KmTokens.s4),
        const KmOrb(size: 64, cyan: true),
        const SizedBox(height: KmTokens.s6),
        const KmEyebrow('Waiting room'),
        _title(context, 'The host will let you in soon'),
        Text.rich(
          TextSpan(
            text: 'You’re asking to join ',
            children: <InlineSpan>[
              TextSpan(text: invite.title, style: strong),
              const TextSpan(text: ' as '),
              TextSpan(text: 'Guest', style: strong),
              TextSpan(text: '. ${invite.hostName} has been notified. Keep this page open.'),
            ],
          ),
          textAlign: TextAlign.center,
          style: body,
        ),
        const SizedBox(height: KmTokens.s4),
        Semantics(
          liveRegion: true,
          child: Text(
            'Waiting for ${invite.hostName} to let you in…',
            textAlign: TextAlign.center,
            style: KmText.label(context).copyWith(fontSize: KmTokens.textBase, color: p.fgSub),
          ),
        ),
        const SizedBox(height: KmTokens.s3),
        const Wrap(
          spacing: 6,
          alignment: WrapAlignment.center,
          children: <Widget>[
            KmChip('Camera on', icon: LucideIcons.video),
            KmChip('Mic on', icon: LucideIcons.mic),
          ],
        ),
        const SizedBox(height: KmTokens.s3),
        KmButton(
          label: 'Leave waiting room',
          icon: LucideIcons.phoneOff,
          onPressed: () => context.go('/join/invite'),
        ),
      ],
    );
  }
}

/// `.options li`: icon, title, description and an optional link.
class _Option extends StatelessWidget {
  const _Option({
    required this.icon,
    required this.title,
    this.body,
    this.link,
    this.onLink,
  });

  final IconData icon;
  final String title;
  final String? body;
  final String? link;
  final VoidCallback? onLink;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: KmTokens.s2),
      padding: const EdgeInsets.all(KmTokens.s4),
      decoration: BoxDecoration(color: p.card, borderRadius: BorderRadius.circular(KmTokens.radius)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 18, color: p.emberText),
          ),
          const SizedBox(width: KmTokens.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: KmText.displayAt(context, size: KmTokens.textBase)),
                if (body != null) ...<Widget>[
                  const SizedBox(height: 2),
                  Text(body!, style: KmText.smallSub(context)),
                ],
                if (link != null && onLink != null) JoinLink(link!, onTap: onLink!),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The shared meeting-code form (`codeForm`): renders, does not look up.
class _CodeForm extends StatelessWidget {
  const _CodeForm();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            const Expanded(
              child: KmTextField(
                label: 'Meeting code',
                required: true,
                placeholder: 'km-4fq-82x',
                mono: true,
              ),
            ),
            const SizedBox(width: KmTokens.s2),
            KmButton(
              label: 'Find meeting',
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/join/invite'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Find it in your invite email, SMS or calendar event.',
          style: KmText.smallSub(context),
        ),
      ],
    );
  }
}

/// `#expired`: the invite link no longer works. Rendered as the prototype
/// does when no specific meeting is named in the link.
class ExpiredView extends StatelessWidget {
  const ExpiredView({super.key, required this.invite});

  final Invitation invite;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return _CenterCard(
      children: <Widget>[
        _Badge(icon: LucideIcons.clock, fill: p.amberSoft, color: p.amber),
        _title(context, 'This meeting has ended'),
        Text(
          'This invite link has expired. The meeting has ended or the host closed the link.',
          textAlign: TextAlign.center,
          style: KmText.sub(context),
        ),
        const SizedBox(height: KmTokens.s4),
        _Option(
          icon: LucideIcons.mail,
          title: 'Ask ${invite.hostName} for a new link',
          body: 'If the meeting was rescheduled, the host can send a fresh invite by email, SMS or calendar.',
          link: 'Email ${invite.hostFirstName}',
          onLink: () => copyWithNotice(
            context,
            invite.hostEmail,
            'Copied ${invite.hostFirstName}’s email address',
          ),
        ),
        const _Option(
          icon: LucideIcons.send,
          title: 'Watch for the summary',
          body: 'If you took part, the transcript and summary arrive by email or SMS shortly after the meeting ends.',
        ),
        _Option(
          icon: LucideIcons.video,
          title: 'Start your own meeting',
          body: 'No account needed — you’ll get the Concierge and live transcription.',
          link: 'Start a meeting',
          onLink: () => context.go('/meet/room-guest'),
        ),
        const KmRule(vertical: KmTokens.s5),
        Align(
          alignment: Alignment.centerLeft,
          child: Semantics(
            header: true,
            child: Text(
              'Have a different code?',
              style: KmText.label(context).copyWith(fontSize: KmTokens.textBase),
            ),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        const _CodeForm(),
      ],
    );
  }
}

/// `#wrong-code`: no meeting matches the code. Rendered without a tried
/// code, as the inventory state is captured.
class WrongCodeView extends StatelessWidget {
  const WrongCodeView({super.key});

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return _CenterCard(
      children: <Widget>[
        _Badge(icon: LucideIcons.search, fill: p.redSoft, color: p.redText),
        _title(context, 'We couldn’t find that meeting'),
        Text(
          'Enter the meeting code from your invite to find the meeting.',
          textAlign: TextAlign.center,
          style: KmText.sub(context),
        ),
        const SizedBox(height: KmTokens.s5),
        const _CodeForm(),
        const SizedBox(height: KmTokens.s5),
        const _Option(
          icon: LucideIcons.info,
          title: 'Where to find the code',
          body: 'It’s in the invite email, the SMS, or the calendar event description — or just open the link in the invite.',
        ),
        _Option(
          icon: LucideIcons.video,
          title: 'Start your own meeting instead',
          link: 'Start a meeting',
          onLink: () => context.go('/meet/room-guest'),
        ),
      ],
    );
  }
}
