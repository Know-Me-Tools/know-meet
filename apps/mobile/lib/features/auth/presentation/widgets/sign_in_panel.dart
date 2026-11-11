// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import 'auth_parts.dart';

/// `#sign-in` and `#sign-in-error`. Static-screen phase: there is no
/// identity backend (contract exclusion), so every sign-in action records
/// the sample person locally, as the prototype's `km-auth` does, and opens
/// Meetings.
class SignInPanel extends ConsumerWidget {
  const SignInPanel({super.key, required this.isError});

  /// `#sign-in-error`: the error summary and the invalid password field.
  final bool isError;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void signIn() {
      ref.read(sessionControllerProvider.notifier).signIn();
      context.go('/dashboard');
    }

    void magicLink() => context.go('/auth/magic-link-sent');

    return AuthPanel(
      children: <Widget>[
        const AuthHead(
          title: 'Sign in to Know Meet',
          sub: TextSpan(text: 'Pick up your meetings, agents and recordings.'),
        ),
        if (isError) ...<Widget>[
          _ErrorSummary(onMagicLink: magicLink),
          const SizedBox(height: KmTokens.s5),
        ],
        KmButton(label: 'Continue with Google', block: true, onPressed: signIn),
        const SizedBox(height: KmTokens.s2),
        KmButton(label: 'Continue with Microsoft', block: true, onPressed: signIn),
        const OrDivider(label: 'or with email'),
        const KmTextField(
          label: 'Email',
          required: true,
          placeholder: 'you@company.com',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: KmTokens.s5),
        AuthPasswordField(
          error: isError ? 'Re-enter your password for this email.' : null,
          labelTrailing: AuthLink('Forgot password?', onTap: magicLink),
        ),
        const SizedBox(height: KmTokens.s4),
        KmButton(
          label: 'Sign in',
          variant: KmButtonVariant.primary,
          block: true,
          onPressed: signIn,
        ),
        const SizedBox(height: KmTokens.s4),
        KmButton(
          label: 'Email me a sign-in link',
          icon: LucideIcons.mail,
          block: true,
          onPressed: magicLink,
        ),
        const AuthFoot(
          lines: <(String, String, String)>[
            ('New to KnowMe?', 'Create an account', '/auth/sign-up'),
            ('Just need a quick call?', 'Continue as guest', '/meet/room-guest'),
          ],
        ),
      ],
    );
  }
}

/// `.err-summary` (role=alert): announced as a live region.
class _ErrorSummary extends StatelessWidget {
  const _ErrorSummary({required this.onMagicLink});

  final VoidCallback onMagicLink;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        padding: const EdgeInsets.all(KmTokens.s4),
        decoration: BoxDecoration(
          color: p.redSoft,
          borderRadius: BorderRadius.circular(KmTokens.radius),
          border: Border.all(color: p.red, width: 2),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(LucideIcons.circleAlert, size: 20, color: p.redText),
            const SizedBox(width: KmTokens.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Semantics(
                    header: true,
                    child: Text(
                      'That email and password don’t match',
                      style: KmText.displayAt(context, size: KmTokens.text15),
                    ),
                  ),
                  const SizedBox(height: KmTokens.s1),
                  Text(
                    'Check the email for typos and re-enter your password — '
                    'it’s case-sensitive. If you can’t remember it, we can '
                    'email you a one-time sign-in link instead, then you can '
                    'set a new password in Settings.',
                    style: KmText.small(context),
                  ),
                  const SizedBox(height: KmTokens.s3),
                  KmButton(
                    label: 'Email me a sign-in link',
                    icon: LucideIcons.mail,
                    size: KmButtonSize.small,
                    onPressed: onMagicLink,
                  ),
                  const SizedBox(height: KmTokens.s1),
                  KmButton(
                    label: 'Create an account',
                    variant: KmButtonVariant.ghost,
                    size: KmButtonSize.small,
                    onPressed: () => context.go('/auth/sign-up'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
