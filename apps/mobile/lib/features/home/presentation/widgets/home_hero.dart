// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';

/// Hero: eyebrow, display headline, lede, actions and join-with-a-code.
/// Signed in, "Sign in" becomes "Your meetings" and the guest note hides
/// (prototype index.html signed-in state).
class HomeHero extends StatelessWidget {
  const HomeHero({super.key, required this.user});

  final KmUser? user;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle display = KmText.display(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SizedBox(height: KmTokens.s5),
        const KmEyebrow('Know Meet · agentic video meetings'),
        const SizedBox(height: KmTokens.s4),
        Semantics(
          header: true,
          child: Text.rich(
            TextSpan(
              text: 'Meetings where agents do the ',
              style: display,
              children: <InlineSpan>[
                TextSpan(text: 'follow-through.', style: display.copyWith(color: p.emberText)),
              ],
            ),
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        Text(
          'Your dot, the agents you register and a Concierge sit in the call '
          'with you, transcribe as you talk, and send everyone the transcript, '
          'summary and action items when you close.',
          style: KmText.lede(context),
        ),
        const SizedBox(height: KmTokens.s5),
        KmButton(
          label: 'Start a meeting',
          icon: LucideIcons.video,
          variant: KmButtonVariant.primary,
          block: true,
          onPressed: () => context.go(user == null ? '/meet/room-guest' : '/meet/room'),
        ),
        const SizedBox(height: KmTokens.s2),
        if (user == null)
          KmButton(
            label: 'Sign in',
            icon: LucideIcons.user,
            block: true,
            onPressed: () => context.go('/auth/sign-in'),
          )
        else
          KmButton(
            label: 'Your meetings',
            icon: LucideIcons.calendar,
            block: true,
            onPressed: () => context.go('/dashboard'),
          ),
        if (user == null) ...<Widget>[
          const SizedBox(height: KmTokens.s5),
          Text(
            'No account needed to start: guests get the Concierge and live transcription.',
            style: KmText.smallSub(context),
          ),
        ],
        const SizedBox(height: KmTokens.s5),
        const _JoinWithCode(),
      ],
    );
  }
}

class _JoinWithCode extends StatelessWidget {
  const _JoinWithCode();

  @override
  Widget build(BuildContext context) {
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              const Expanded(
                child: KmTextField(
                  label: 'Join with a code',
                  placeholder: 'km-4fq-82x',
                  mono: true,
                ),
              ),
              const SizedBox(width: KmTokens.s2),
              KmButton(
                label: 'Join',
                trailingIcon: LucideIcons.chevronRight,
                variant: KmButtonVariant.primary,
                onPressed: () => context.go('/join/invite'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'The code is in your email, SMS or calendar invite.',
            style: KmText.smallSub(context),
          ),
        ],
      ),
    );
  }
}
