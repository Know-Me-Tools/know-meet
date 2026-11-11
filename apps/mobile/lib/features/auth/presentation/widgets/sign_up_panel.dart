// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import 'auth_parts.dart';

/// `#sign-up`. The form renders but does not create an account (static
/// phase); "Create account" continues to the check-email view.
class SignUpPanel extends StatefulWidget {
  const SignUpPanel({super.key});

  @override
  State<SignUpPanel> createState() => _SignUpPanelState();
}

class _SignUpPanelState extends State<SignUpPanel> {
  bool _agreed = false;
  bool _termsOpen = false;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return AuthPanel(
      children: <Widget>[
        const AuthHead(
          title: 'Create your KnowMe account',
          sub: TextSpan(
            text: 'Turn on agents, recording, delivery and calendars for the meetings you host.',
          ),
        ),
        Text.rich(
          TextSpan(
            text: 'Fields marked ',
            children: <InlineSpan>[
              TextSpan(text: '*', style: TextStyle(color: p.emberText)),
              const TextSpan(text: ' are required.'),
            ],
          ),
          style: KmText.smallSub(context),
        ),
        const SizedBox(height: KmTokens.s5),
        const KmTextField(label: 'Full name', required: true),
        const SizedBox(height: KmTokens.s5),
        const KmTextField(
          label: 'Work email',
          required: true,
          placeholder: 'you@company.com',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: KmTokens.s5),
        const AuthPasswordField(),
        const SizedBox(height: KmTokens.s2),
        const _PasswordRule('At least 10 characters'),
        const _PasswordRule('Includes a number'),
        const SizedBox(height: KmTokens.s4),
        KmCheckRow(
          label: 'I agree to the KnowMe terms of service and privacy notice *',
          value: _agreed,
          onChanged: (bool? v) => setState(() => _agreed = v ?? false),
        ),
        Padding(
          padding: const EdgeInsets.only(left: KmTokens.s6),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Semantics(
              button: true,
              expanded: _termsOpen,
              label: 'What you’re agreeing to',
              excludeSemantics: true,
              onTap: () => setState(() => _termsOpen = !_termsOpen),
              child: InkWell(
                onTap: () => setState(() => _termsOpen = !_termsOpen),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 44),
                  child: Align(
                    widthFactor: 1,
                    child: Text(
                      'What you’re agreeing to',
                      style: KmText.label(context).copyWith(color: p.emberText),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        if (_termsOpen)
          Padding(
            padding: const EdgeInsets.only(left: KmTokens.s6, bottom: KmTokens.s3),
            child: Text(
              'KnowMe stores your account details, the meetings you host, and — '
              'only when you turn them on — recordings, transcripts and '
              'summaries in KnowMe-managed or your own storage. You decide who '
              'receives meeting summaries in Delivery settings, and you can '
              'delete your recordings at any time.',
              style: KmText.smallSub(context),
            ),
          ),
        const SizedBox(height: KmTokens.s2),
        KmButton(
          label: 'Create account',
          variant: KmButtonVariant.primary,
          block: true,
          onPressed: () => context.go('/auth/check-email'),
        ),
        const AuthFoot(
          lines: <(String, String, String)>[
            ('Already have an account?', 'Sign in', '/auth/sign-in'),
            ('Not ready?', 'Continue as guest', '/meet/room-guest'),
          ],
        ),
      ],
    );
  }
}

/// `.pw-rules li`: a requirement with a check (unmet until typed).
class _PasswordRule extends StatelessWidget {
  const _PasswordRule(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: <Widget>[
          Icon(LucideIcons.check, size: 14, color: p.fgSub),
          const SizedBox(width: KmTokens.s2),
          Text(text, style: KmText.smallSub(context)),
        ],
      ),
    );
  }
}
