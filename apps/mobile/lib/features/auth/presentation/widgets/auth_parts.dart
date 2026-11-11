// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';

/// `.auth-panel`: the flow's main card.
class AuthPanel extends StatelessWidget {
  const AuthPanel({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => KmCard(
    panel: true,
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
  );
}

/// Tone of the head's icon tile (`.mark.mail`, `.mark.ok`).
enum AuthMarkTone { brand, mail, ok }

/// `.auth-head`: icon tile (brand mark by default), h1 and sub copy.
class AuthHead extends StatelessWidget {
  const AuthHead({
    super.key,
    required this.title,
    required this.sub,
    this.icon,
    this.tone = AuthMarkTone.brand,
  });

  final String title;

  /// Rich so an email address can be bold.
  final InlineSpan sub;
  final IconData? icon;
  final AuthMarkTone tone;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final (Color fill, Color fg) = switch (tone) {
      AuthMarkTone.brand => (p.card, p.fg),
      AuthMarkTone.mail => (p.emberSoft, p.emberText),
      AuthMarkTone.ok => (p.greenSoft, p.greenText),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        ExcludeSemantics(
          child: Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: fill,
              borderRadius: BorderRadius.circular(KmTokens.radius14),
            ),
            child: icon == null ? const KmBrandMark() : Icon(icon, size: 28, color: fg),
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        Semantics(header: true, child: Text(title, style: KmText.h1(context))),
        const SizedBox(height: KmTokens.s2),
        Text.rich(sub, style: KmText.sub(context)),
        const SizedBox(height: KmTokens.s5),
      ],
    );
  }
}

/// Inline ember link. Feature-local: the kit has no text-link widget.
class AuthLink extends StatelessWidget {
  const AuthLink(this.label, {super.key, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: KmInteractive(
        onTap: onTap,
        builder: (BuildContext context, Set<WidgetState> s) {
          final KmStateColors c = KmStateColors.quiet(p, s, restOn: p.emberText);
          return KmFillBox(
            colors: c,
            radius: KmTokens.radius4,
            constraints: const BoxConstraints(minHeight: KmTokens.sizeTarget),
            padding: const EdgeInsets.symmetric(horizontal: 2),
            alignment: Alignment.center,
            child: Text(
              label,
              style: KmText.small(context).copyWith(
                color: c.on,
                fontWeight: KmTokens.fontWeightMedium,
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

/// `.or`: "or with email", centred in its own spacing (D-6: the two rules
/// on either side are removed; separation is by space).
class OrDivider extends StatelessWidget {
  const OrDivider({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: KmTokens.s4),
        child: Center(child: Text(label, style: KmText.smallSub(context))),
      ),
    );
  }
}

/// `.auth-foot`: spacing (the kit rule renders as space), then "prompt + link" lines.
class AuthFoot extends StatelessWidget {
  const AuthFoot({super.key, required this.lines});

  /// (prompt, link label, location)
  final List<(String, String, String)> lines;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const KmRule(vertical: KmTokens.s4),
        for (final (String prompt, String link, String location) in lines)
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Text('$prompt ', style: KmText.smallSub(context)),
              AuthLink(link, onTap: () => context.go(location)),
            ],
          ),
      ],
    );
  }
}

/// `.hint-box`: an icon and explanatory copy on a card fill.
class AuthHintBox extends StatelessWidget {
  const AuthHintBox({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      padding: const EdgeInsets.all(KmTokens.s4),
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(KmTokens.radius),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 18, color: p.fg),
          const SizedBox(width: KmTokens.s3),
          Expanded(child: Text(text, style: KmText.smallSub(context))),
        ],
      ),
    );
  }
}

/// A password field with a show/hide toggle (`.pw-wrap`). Visibility is
/// ephemeral widget state.
class AuthPasswordField extends StatefulWidget {
  const AuthPasswordField({super.key, this.error, this.labelTrailing});

  final String? error;
  final Widget? labelTrailing;

  @override
  State<AuthPasswordField> createState() => _AuthPasswordFieldState();
}

class _AuthPasswordFieldState extends State<AuthPasswordField> {
  bool _shown = false;

  @override
  Widget build(BuildContext context) {
    return KmTextField(
      label: 'Password',
      required: true,
      obscure: !_shown,
      error: widget.error,
      labelTrailing: widget.labelTrailing,
      trailing: KmIconButton(
        icon: _shown ? LucideIcons.eyeOff : LucideIcons.eye,
        label: _shown ? 'Hide password' : 'Show password',
        selected: _shown,
        onPressed: () => setState(() => _shown = !_shown),
      ),
    );
  }
}

/// `aside.why`: why signing in matters, plus the guest shortcut.
class WhySignIn extends StatelessWidget {
  const WhySignIn({super.key});

  static const List<(IconData, String, String)> _items = <(IconData, String, String)>[
    (
      LucideIcons.bot,
      'Agents in your meetings',
      'Bring your dot Iris and dispatch registered agents like Scribe and '
          'Researcher. Guests only get the Concierge.',
    ),
    (
      LucideIcons.circleDot,
      'Recording and delivery',
      'Record with Room Composite egress to your storage, and have the '
          'transcript, summary and action items sent to everyone at close.',
    ),
    (
      LucideIcons.calendar,
      'Calendars and scheduling',
      'Connect Google Calendar, Microsoft 365 / Outlook or iCloud / CalDAV, '
          'and send invites by email, SMS and calendar.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const KmEyebrow('Why sign in'),
        const SizedBox(height: KmTokens.s3),
        Semantics(
          header: true,
          child: Text('Your account is what lets KnowMe remember.', style: KmText.h2(context)),
        ),
        const SizedBox(height: KmTokens.s6),
        for (final (IconData icon, String title, String body) in _items)
          Padding(
            padding: const EdgeInsets.only(left: KmTokens.s6 + KmTokens.s2, bottom: KmTokens.s4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                ExcludeSemantics(
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: BorderRadius.circular(KmTokens.radius10),
                    ),
                    child: Icon(icon, size: 18, color: p.emberText),
                  ),
                ),
                const SizedBox(width: KmTokens.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(title, style: KmText.displayAt(context, size: KmTokens.text15)),
                      const SizedBox(height: 2),
                      Text(body, style: KmText.smallSub(context)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: KmTokens.s3),
        KmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'In a hurry? Guests can start or join a meeting right now with '
                'the Concierge and live transcription. The transcript is '
                'deleted when the meeting ends.',
                style: KmText.smallSub(context),
              ),
              const SizedBox(height: KmTokens.s3),
              KmButton(
                label: 'Continue as guest',
                icon: LucideIcons.video,
                block: true,
                onPressed: () => context.go('/meet/room-guest'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
