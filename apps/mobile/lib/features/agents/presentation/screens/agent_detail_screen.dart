// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/agents_repository.dart';
import '../../domain/agent.dart';
import '../widgets/agent_detail_panels.dart';
import '../widgets/agent_widgets.dart';
import '../widgets/agents_gate.dart';
import '../providers/agents_providers.dart';

/// Sections of the agent detail page (`?tab=`); the Concierge shows only
/// the first two.
enum AgentDetailTab {
  overview('Overview'),
  activity('Activity'),
  settings('Settings'),
  danger('Danger zone');

  const AgentDetailTab(this.label);

  final String label;

  static AgentDetailTab parse(String? value) => AgentDetailTab.values.firstWhere(
    (AgentDetailTab t) => t.name == value,
    orElse: () => AgentDetailTab.overview,
  );
}

/// `agents.detail.<id>`: the agent's head (glyph, status, worker) and its
/// tabbed sections. The selected tab is the URL's `?tab=`, never stored.
class AgentDetailScreen extends ConsumerWidget {
  const AgentDetailScreen({super.key, required this.agentId, required this.tab});

  final String agentId;
  final AgentDetailTab tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AgentsRepository repo = ref.watch(agentsRepositoryProvider);
    final Agent? agent = repo.agent(agentId);
    if (agent == null) {
      return AgentsNotFound(
        title: 'Agent not found',
        message:
            'No agent “$agentId” is registered to your account. It may have been '
            'unregistered, or the link is mistyped.',
      );
    }
    final List<AgentDetailTab> tabs = agent.system
        ? const <AgentDetailTab>[AgentDetailTab.overview, AgentDetailTab.activity]
        : AgentDetailTab.values;
    final AgentDetailTab current = tabs.contains(tab) ? tab : AgentDetailTab.overview;
    final Widget panel = switch (current) {
      AgentDetailTab.overview => AgentOverviewPanel(agent: agent, managedUrl: repo.managedProjectUrl),
      AgentDetailTab.activity => AgentActivityPanel(agent: agent, records: repo.dispatches(agent.id)),
      AgentDetailTab.settings => AgentSettingsPanel(agent: agent),
      AgentDetailTab.danger => AgentDangerPanel(agent: agent),
    };
    return KmPage(
      children: <Widget>[
        _DetailHead(agent: agent),
        const SizedBox(height: KmTokens.s5),
        KmTabs<AgentDetailTab>(
          tabs: <KmOption<AgentDetailTab>>[
            for (final AgentDetailTab t in tabs)
              KmOption<AgentDetailTab>(
                t,
                t.label,
                icon: t == AgentDetailTab.danger ? LucideIcons.circleAlert : null,
              ),
          ],
          selected: current,
          onChanged: (AgentDetailTab t) => context.go(
            t == AgentDetailTab.overview
                ? '/agents/detail/${agent.id}'
                : '/agents/detail/${agent.id}?tab=${t.name}',
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        panel,
      ],
    );
  }
}

class _DetailHead extends StatelessWidget {
  const _DetailHead({required this.agent});

  final Agent agent;

  @override
  Widget build(BuildContext context) {
    final TextStyle sub = KmText.smallSub(context);
    final Widget titles = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        KmPageHead(
          title: agent.name,
          crumbs: <KmCrumb>[
            KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
            KmCrumb(agent.name),
          ],
        ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(top: KmTokens.s5),
              child: KmAgentGlyph(agent.mono, size: 56, system: agent.system),
            ),
            const SizedBox(width: KmTokens.s4),
            Expanded(child: titles),
          ],
        ),
        Wrap(
          spacing: KmTokens.s4,
          runSpacing: KmTokens.s2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            AgentStateLine(
              online: agent.online,
              label: agent.online ? 'Online — worker connected' : 'Offline — worker not connected',
            ),
            if (agent.system)
              const KmChip('System agent', tone: KmChipTone.ember)
            else
              Text(agent.role.isEmpty ? 'Agent' : agent.role, style: sub),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text('Worker', style: sub),
                const SizedBox(width: 4),
                AgentCode(agent.worker),
                KmIconButton(
                  icon: LucideIcons.copy,
                  label: 'Copy agent_name ${agent.worker}',
                  size: 36,
                  onPressed: () => Clipboard.setData(ClipboardData(text: agent.worker)),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s4),
        Align(
          alignment: Alignment.centerLeft,
          child: agent.system
              ? KmButton(
                  label: 'What guests get',
                  icon: LucideIcons.info,
                  onPressed: () => context.go('/agents/concierge'),
                )
              : KmButton(
                  label: 'Dispatch in a meeting',
                  icon: LucideIcons.bot,
                  onPressed: () => context.go('/meet/room'),
                ),
        ),
      ],
    );
  }
}
