// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/session/session.dart';
import '../../../../shared/ui/ui.dart';
import 'agent_widgets.dart';

/// Renders [builder] for a signed-in person, otherwise the agents sign-in
/// gate (`agents.gate-signed-out`) under a page head titled [title], as the
/// prototype's `gated(title)` does.
class AgentsGated extends ConsumerWidget {
  const AgentsGated({super.key, required this.title, required this.builder});

  final String title;
  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final KmUser? user = ref.watch(sessionControllerProvider);
    if (user != null) return builder(context);
    return AgentsGatePage(title: title);
  }
}

/// The signed-out gate: crumbs, eyebrow and h1, then the gate card with the
/// agents copy and the Concierge link (agents.html `gated`).
class AgentsGatePage extends StatelessWidget {
  const AgentsGatePage({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Agents',
          title: title,
          crumbs: <KmCrumb>[
            KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
            KmCrumb(title),
          ],
        ),
        Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 520),
            margin: const EdgeInsets.only(bottom: KmTokens.s6),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s5, vertical: KmTokens.s7),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(KmTokens.radiusLg),
              boxShadow: p.shadowCard,
            ),
            child: Column(
              children: <Widget>[
                ExcludeSemantics(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: p.emberSoft,
                      borderRadius: BorderRadius.circular(KmTokens.radiusTile),
                    ),
                    child: Icon(LucideIcons.lock, color: p.emberText, size: 28),
                  ),
                ),
                const SizedBox(height: KmTokens.s2 + KmTokens.s3),
                Semantics(
                  header: true,
                  child: Text(
                    'Sign in to bring agents into meetings',
                    textAlign: TextAlign.center,
                    style: KmText.h2(context),
                  ),
                ),
                const SizedBox(height: KmTokens.s3),
                Text(
                  'Registering LiveKit agents and using dots is optional, and it needs a '
                  'KnowMe account so your agents, permissions and memory stay yours. '
                  'Guests still get the Concierge in every meeting.',
                  textAlign: TextAlign.center,
                  style: KmText.sub(context),
                ),
                const SizedBox(height: KmTokens.s3 * 2),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: KmTokens.s2,
                  runSpacing: KmTokens.s2,
                  children: <Widget>[
                    KmButton(
                      label: 'Sign in',
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
                const SizedBox(height: KmTokens.s3),
                Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: <Widget>[
                    Text('Joining as a guest? ', style: KmText.smallSub(context)),
                    AgentLink(
                      'See what the Concierge does for you',
                      onTap: () => context.go('/agents/concierge'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// The prototype's `notFound`: page head plus an empty state that leads back
/// to the registry.
class AgentsNotFound extends StatelessWidget {
  const AgentsNotFound({super.key, required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Agents',
          title: title,
          crumbs: <KmCrumb>[
            KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
            const KmCrumb('Not found'),
          ],
        ),
        KmEmptyState(
          icon: LucideIcons.search,
          title: 'Nothing here',
          body: message,
          actions: <Widget>[
            KmButton(
              label: 'Back to agents',
              icon: LucideIcons.bot,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/agents/registry'),
            ),
          ],
        ),
      ],
    );
  }
}
