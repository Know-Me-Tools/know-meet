// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/agents_repository.dart';
import '../../domain/dot.dart';
import '../providers/agents_providers.dart';
import '../widgets/agent_widgets.dart';

/// `agents.dots`: your dot, a shared dot you can see, the "bring by
/// default" switch, and how dots differ from other agents.
class DotsScreen extends ConsumerStatefulWidget {
  const DotsScreen({super.key});

  @override
  ConsumerState<DotsScreen> createState() => _DotsScreenState();
}

class _DotsScreenState extends ConsumerState<DotsScreen> {
  /// Unsaved toggle; the dot's stored preference seeds it.
  bool? _byDefault;

  @override
  Widget build(BuildContext context) {
    final AgentsRepository repo = ref.watch(agentsRepositoryProvider);
    final Dot iris = repo.myDot();
    final Dot sol = repo.sharedDot();
    final int memories = repo.memories().length;
    final bool byDefault = _byDefault ?? iris.joinsByDefault;
    final String join = iris.alwaysJoin ? 'Joins your meetings' : 'Asks before joining your meetings';
    final String speak = iris.speaksWhenAsked ? 'only when asked' : 'never';
    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Agents',
          title: 'Your dots',
          lede:
              'A dot is a persistent personal agent. It keeps a private memory that only its '
              'owner can see, and it can come with you into meetings.',
          crumbs: <KmCrumb>[
            KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
            const KmCrumb('Dots'),
          ],
        ),
        KmCard(
          raised: true,
          child: _DotCard(
            orb: KmOrb(size: 64, paused: iris.paused),
            name: iris.name,
            owner: 'Your dot',
            badge: iris.paused
                ? const KmChip('Paused', tone: KmChipTone.amber, pip: true)
                : const KmChip('Active', tone: KmChipTone.green, pip: true),
            text: '$join · speaks $speak · $memories meeting memories',
            action: KmButton(
              label: '${iris.name} settings',
              icon: LucideIcons.settings,
              size: KmButtonSize.small,
              onPressed: () => context.go('/agents/dot/${iris.id}'),
            ),
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        KmCard(
          child: _DotCard(
            orb: const KmOrb(size: 64, cyan: true),
            name: sol.name,
            owner: 'Avery’s dot — visible in shared meetings',
            badge: const KmLockBadge('Read-only', icon: LucideIcons.lock),
            text:
                'You’ll see ${sol.name} in meetings you share with ${sol.owner}. Only Avery '
                'can change its settings or see its memory.',
          ),
        ),
        const SizedBox(height: KmTokens.s4),
        KmCard(
          panel: true,
          padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s1),
          child: KmSwitchRow(
            title: 'Bring ${iris.name} to meetings by default',
            description: iris.paused
                ? '${iris.name} is paused, so it won’t join until you resume it.'
                : 'When off, add ${iris.name} from the Agents panel in each meeting.',
            value: byDefault,
            onChanged: (bool v) => setState(() => _byDefault = v),
          ),
        ),
        const SizedBox(height: KmTokens.s7),
        Padding(
          padding: const EdgeInsets.only(bottom: KmTokens.s4),
          child: Semantics(
            header: true,
            child: Text('Dots, registered agents and the Concierge', style: KmText.h2(context)),
          ),
        ),
        const _Explain(
          title: 'Dots',
          text:
              'One per person, always on. Remembers across meetings in a private memory you '
              'control and can clear.',
        ),
        const SizedBox(height: KmTokens.s4),
        _Explain(
          title: 'Registered agents',
          text:
              'LiveKit workers you run. Dispatched into a meeting by agent_name, with the '
              'permissions you set.',
          link: AgentLink('Your agents', onTap: () => context.go('/agents/registry')),
        ),
        const SizedBox(height: KmTokens.s4),
        _Explain(
          title: 'Concierge',
          text:
              'Provided by KnowMe in every meeting, and the only agent guests get. Remembers '
              'nothing afterwards.',
          link: AgentLink('About the Concierge', onTap: () => context.go('/agents/concierge')),
        ),
      ],
    );
  }
}

class _DotCard extends StatelessWidget {
  const _DotCard({
    required this.orb,
    required this.name,
    required this.owner,
    required this.badge,
    required this.text,
    this.action,
  });

  final Widget orb;
  final String name;
  final String owner;
  final Widget badge;
  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        orb,
        const SizedBox(width: KmTokens.s4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Wrap(
                spacing: KmTokens.s3,
                runSpacing: KmTokens.s2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Semantics(
                        header: true,
                        child: Text(name, style: KmText.h3(context)),
                      ),
                      Text(owner, style: KmText.smallSub(context)),
                    ],
                  ),
                  badge,
                ],
              ),
              const SizedBox(height: KmTokens.s2),
              Text(text, style: KmText.smallSub(context)),
              if (action != null) ...<Widget>[const SizedBox(height: KmTokens.s2), action!],
            ],
          ),
        ),
      ],
    );
  }
}

class _Explain extends StatelessWidget {
  const _Explain({required this.title, required this.text, this.link});

  final String title;
  final String text;
  final Widget? link;

  @override
  Widget build(BuildContext context) => KmCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Semantics(header: true, child: Text(title, style: KmText.h3(context))),
        const SizedBox(height: KmTokens.s3),
        Text(text, style: KmText.smallSub(context)),
        if (link != null) ...<Widget>[const SizedBox(height: KmTokens.s3), link!],
      ],
    ),
  );
}
