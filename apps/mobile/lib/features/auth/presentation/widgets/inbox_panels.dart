// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import 'auth_parts.dart';

/// Resend cooldown copy. Static this phase: the prototype starts a 30s
/// countdown; the app shows its first frame (resend disabled) without a
/// timer, which also keeps goldens deterministic.
const String _cooldownLine = 'You can resend in 30s.';

/// `#check-email`: verify the address after sign-up.
class CheckEmailPanel extends ConsumerWidget {
  const CheckEmailPanel({super.key, required this.email});

  final String email;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AuthPanel(
      children: <Widget>[
        AuthHead(
          title: 'Check your email',
          icon: LucideIcons.mail,
          tone: AuthMarkTone.mail,
          sub: _withAddress('We sent a verification link to ', email,
              '. Open it to finish creating your account.', context),
        ),
        const AuthHintBox(
          icon: LucideIcons.info,
          text: 'The email comes from Know Meet. If it isn’t in your inbox '
              'within a minute, check spam or promotions. The link expires in '
              '24 hours.',
        ),
        const SizedBox(height: KmTokens.s5),
        KmButton(
          label: 'I’ve verified my email',
          icon: LucideIcons.check,
          variant: KmButtonVariant.primary,
          block: true,
          onPressed: () {
            ref.read(sessionControllerProvider.notifier).signIn();
            context.go('/dashboard');
          },
        ),
        const SizedBox(height: KmTokens.s5),
        const Align(
          alignment: Alignment.centerLeft,
          child: KmButton(label: 'Resend email', icon: LucideIcons.refreshCw, onPressed: null),
        ),
        const SizedBox(height: KmTokens.s2),
        Align(
          alignment: Alignment.centerLeft,
          child: KmButton(
            label: 'Change email',
            icon: LucideIcons.pencil,
            variant: KmButtonVariant.ghost,
            onPressed: () => context.go('/auth/sign-up'),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        Semantics(liveRegion: true, child: Text(_cooldownLine, style: KmText.smallSub(context))),
      ],
    );
  }
}

/// `#magic-link-sent`: a one-time sign-in link was emailed.
class MagicLinkPanel extends StatelessWidget {
  const MagicLinkPanel({super.key, required this.email});

  final String email;

  @override
  Widget build(BuildContext context) {
    return AuthPanel(
      children: <Widget>[
        AuthHead(
          title: 'Check your inbox',
          icon: LucideIcons.send,
          tone: AuthMarkTone.ok,
          sub: _withAddress('We emailed a one-time sign-in link to ', email, '.', context),
        ),
        const AuthHintBox(
          icon: LucideIcons.mail,
          text: 'Open the email on this device and select “Sign in to Know '
              'Meet”. The link works once and expires in 15 minutes; you’ll '
              'land back where you started.',
        ),
        const SizedBox(height: KmTokens.s5),
        const Align(
          alignment: Alignment.centerLeft,
          child: KmButton(label: 'Send a new link', icon: LucideIcons.refreshCw, onPressed: null),
        ),
        const SizedBox(height: KmTokens.s2),
        Align(
          alignment: Alignment.centerLeft,
          child: KmButton(
            label: 'Use a different email',
            icon: LucideIcons.pencil,
            variant: KmButtonVariant.ghost,
            onPressed: () => context.go('/auth/sign-in'),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        Semantics(liveRegion: true, child: Text(_cooldownLine, style: KmText.smallSub(context))),
        const AuthFoot(
          lines: <(String, String, String)>[
            ('Prefer your password?', 'Sign in with password', '/auth/sign-in'),
            ('Need to talk now?', 'Continue as guest', '/meet/room-guest'),
          ],
        ),
      ],
    );
  }
}

InlineSpan _withAddress(String before, String email, String after, BuildContext context) =>
    TextSpan(
      text: before,
      children: <InlineSpan>[
        TextSpan(
          text: email,
          style: TextStyle(color: context.km.fg, fontWeight: KmTokens.fontWeightSemibold),
        ),
        TextSpan(text: after),
      ],
    );
