// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import '../widgets/agent_widgets.dart';

/// `agents.concierge`: public (guest-access) page about the system agent
/// every meeting has. The closing call to action depends on sign-in.
class ConciergeScreen extends ConsumerWidget {
  const ConciergeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool signedIn = ref.watch(sessionControllerProvider) != null;
    const SizedBox gap = SizedBox(height: KmTokens.s4);
    return KmPage(
      children: <Widget>[
        AgentCrumbs(<KmCrumb>[
          KmCrumb('Agents', onTap: () => context.go(signedIn ? '/agents/registry' : '/')),
          const KmCrumb('Concierge'),
        ]),
        const SizedBox(height: KmTokens.s2),
        const Align(
          alignment: Alignment.centerLeft,
          child: KmAgentGlyph('CG', size: 84, system: true),
        ),
        const SizedBox(height: KmTokens.s5),
        const KmPageHead(
          eyebrow: 'System agent · provided by KnowMe',
          title: 'Concierge',
          lede:
              'The one agent that’s in every meeting, including meetings where nobody has an '
              'account. It helps guests follow along and shows what agents can do.',
        ),
        const _Heading('What it does for guests'),
        const _Feature(
          icon: LucideIcons.messageSquare,
          title: 'Answers questions about the meeting',
          text:
              'Ask what was decided, who said what, or what you missed. It answers from the '
              'live transcript of this meeting.',
        ),
        gap,
        const _Feature(
          icon: LucideIcons.bot,
          cyan: true,
          title: 'Explains the other agents',
          text:
              'Describes what registered agents and dots in the room can do, and demonstrates '
              'them when the host allows it.',
        ),
        gap,
        const _Feature(
          icon: LucideIcons.captions,
          title: 'Works with live transcription',
          text:
              'Everyone gets live captions. The Concierge reads the same transcript, so its '
              'answers match what was said.',
        ),
        const SizedBox(height: KmTokens.s7),
        const _Heading('What it can’t do'),
        const KmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              AgentPlainItem('It can’t record the meeting or start a recording.', yes: false),
              AgentPlainItem('It doesn’t remember anything after the meeting ends.', yes: false),
              AgentPlainItem('It can’t read the host’s private files or anyone’s dot memory.', yes: false),
              AgentPlainItem('It can’t be removed, renamed or reconfigured — KnowMe runs it.', yes: false),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        KmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Semantics(header: true, child: Text('Privacy for guests', style: KmText.h3(context))),
              const SizedBox(height: KmTokens.s3),
              const AgentPlainItem(
                'In guest meetings the live transcript is deleted when the meeting ends.',
                yes: true,
              ),
              const AgentPlainItem(
                'Guest meetings aren’t recorded, and no transcript or summary is sent.',
                yes: true,
              ),
              const AgentPlainItem(
                'Invitees never need an account to join or to use the Concierge.',
                yes: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s7),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Semantics(
                header: true,
                child: Text(
                  signedIn ? 'Bring your own agents' : 'Want your own agents in meetings?',
                  style: KmText.h2(context),
                ),
              ),
              const SizedBox(height: KmTokens.s2),
              Text(
                signedIn
                    ? 'Register a LiveKit Agents worker by its agent_name and dispatch it into '
                          'meetings you host.'
                    : 'Sign in to register LiveKit agents and use your dot. It’s optional — '
                          'meetings work without it.',
                style: KmText.sub(context),
              ),
              const SizedBox(height: KmTokens.s5),
              Wrap(
                spacing: KmTokens.s2,
                runSpacing: KmTokens.s2,
                children: signedIn
                    ? <Widget>[
                        KmButton(
                          label: 'Register an agent',
                          icon: LucideIcons.plus,
                          variant: KmButtonVariant.primary,
                          onPressed: () => context.go('/agents/register/1'),
                        ),
                        KmButton(label: 'Your agents', onPressed: () => context.go('/agents/registry')),
                      ]
                    : <Widget>[
                        KmButton(
                          label: 'Sign in to register agents',
                          icon: LucideIcons.user,
                          variant: KmButtonVariant.primary,
                          onPressed: () => context.go('/auth/sign-in'),
                        ),
                        KmButton(
                          label: 'Start a guest meeting',
                          icon: LucideIcons.video,
                          onPressed: () => context.go('/meet/room-guest'),
                        ),
                      ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: KmTokens.s4),
    child: Semantics(header: true, child: Text(text, style: KmText.h2(context))),
  );
}

class _Feature extends StatelessWidget {
  const _Feature({required this.icon, required this.title, required this.text, this.cyan = false});

  final IconData icon;
  final String title;
  final String text;
  final bool cyan;

  @override
  Widget build(BuildContext context) => KmCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        AgentFeatureIcon(icon, cyan: cyan),
        const SizedBox(height: KmTokens.s3),
        Semantics(header: true, child: Text(title, style: KmText.h3(context))),
        const SizedBox(height: KmTokens.s3),
        Text(text, style: KmText.smallSub(context)),
      ],
    ),
  );
}
