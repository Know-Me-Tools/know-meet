// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/clock/km_clock.dart';
import '../../../../shared/ui/ui.dart';
import '../../application/agents_repository.dart';
import '../../domain/agent.dart';
import '../../domain/dot.dart';
import '../agents_format.dart';
import '../providers/agents_providers.dart';
import '../widgets/agent_rows.dart';

/// Status filter of the registry (prototype `?status=`).
enum AgentStatusFilter { all, online, offline }

/// `agents.registry`: your agents, the system Concierge and your dot. The
/// status filter lives in the URL (`?status=`), as in the prototype; the
/// search text is the field's own editing state.
class AgentsRegistryScreen extends ConsumerStatefulWidget {
  const AgentsRegistryScreen({super.key, this.status = AgentStatusFilter.all});

  final AgentStatusFilter status;

  @override
  ConsumerState<AgentsRegistryScreen> createState() => _AgentsRegistryScreenState();
}

class _AgentsRegistryScreenState extends ConsumerState<AgentsRegistryScreen> {
  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  bool _matches(Agent a, String needle) {
    final AgentStatusFilter s = widget.status;
    if (s == AgentStatusFilter.online && !a.online) return false;
    if (s == AgentStatusFilter.offline && a.online) return false;
    if (needle.isEmpty) return true;
    return <String>[a.name, a.role, a.worker, a.owner, a.description]
        .join(' ')
        .toLowerCase()
        .contains(needle);
  }

  void _setStatus(AgentStatusFilter s) => context.go(
    s == AgentStatusFilter.all ? '/agents/registry' : '/agents/registry?status=${s.name}',
  );

  @override
  Widget build(BuildContext context) {
    final AgentsRepository repo = ref.watch(agentsRepositoryProvider);
    final DateTime now = ref.watch(kmClockProvider)();
    final String needle = _search.text.trim().toLowerCase();
    final List<Agent> all = repo.agents();
    final List<Agent> mine = all.where((Agent a) => !a.system).toList();
    final List<Agent> mineShown = mine.where((Agent a) => _matches(a, needle)).toList();
    final List<Agent> sysShown = all.where((Agent a) => a.system && _matches(a, needle)).toList();
    final bool filtering = needle.isNotEmpty || widget.status != AgentStatusFilter.all;
    final int total = mineShown.length + sysShown.length;
    final String count = filtering
        ? '$total ${total == 1 ? 'agent matches' : 'agents match'}'
        : '${mine.length + sysShown.length} agents';
    final Dot iris = repo.myDot();

    Widget row(Agent a) => Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s2),
      child: AgentRegistryRow(
        agent: a,
        lastDispatched: lastDispatchedText(repo.dispatches(a.id), now),
        onTap: () => context.go('/agents/detail/${a.id}'),
      ),
    );

    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Agents',
          title: 'Agents',
          lede:
              'LiveKit Agents workers you can dispatch into your meetings by their '
              'agent_name, plus your dots. All of this is optional — every meeting '
              'already has the Concierge.',
          actions: <Widget>[
            KmButton(
              label: 'Register an agent',
              icon: LucideIcons.plus,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/agents/register/1'),
            ),
          ],
        ),
        _SearchField(controller: _search),
        const SizedBox(height: KmTokens.s4),
        ExcludeSemantics(child: Text('Status', style: KmText.label(context))),
        const SizedBox(height: 6),
        KmSegmented<AgentStatusFilter>(
          label: 'Status',
          options: const <KmOption<AgentStatusFilter>>[
            KmOption<AgentStatusFilter>(AgentStatusFilter.all, 'All'),
            KmOption<AgentStatusFilter>(AgentStatusFilter.online, 'Online'),
            KmOption<AgentStatusFilter>(AgentStatusFilter.offline, 'Offline'),
          ],
          selected: widget.status,
          onChanged: _setStatus,
        ),
        const SizedBox(height: KmTokens.s5),
        Semantics(liveRegion: true, child: Text(count, style: KmText.smallSub(context))),
        const AgentSectionHead(
          title: 'Your agents',
          description:
              'Registered workers you can dispatch. Status reflects whether the worker '
              'is connected to LiveKit right now.',
        ),
        if (mine.isEmpty)
          KmEmptyState(
            icon: LucideIcons.bot,
            title: 'No registered agents yet',
            body:
                'Register a LiveKit Agents worker by its agent_name and you can dispatch '
                'it into any meeting you host.',
            actions: <Widget>[
              KmButton(
                label: 'Register an agent',
                icon: LucideIcons.plus,
                variant: KmButtonVariant.primary,
                onPressed: () => context.go('/agents/register/1'),
              ),
            ],
          )
        else if (mineShown.isEmpty)
          KmEmptyState(
            icon: LucideIcons.filter,
            title: 'No agents match these filters',
            body: 'Try a different name, role or worker name, or show agents in every status.',
            actions: <Widget>[
              KmButton(
                label: 'Clear filters',
                icon: LucideIcons.x,
                onPressed: () {
                  _search.clear();
                  _setStatus(AgentStatusFilter.all);
                },
              ),
            ],
          )
        else
          ...mineShown.map(row),
        const SizedBox(height: KmTokens.s7),
        AgentSectionHead(
          title: 'System agents',
          description: 'Provided by KnowMe. Always available, including to guests.',
          action: KmButton(
            label: 'What guests get',
            icon: LucideIcons.info,
            variant: KmButtonVariant.ghost,
            size: KmButtonSize.small,
            onPressed: () => context.go('/agents/concierge'),
          ),
        ),
        if (sysShown.isEmpty)
          Text('The Concierge doesn’t match these filters.', style: KmText.smallSub(context))
        else
          ...sysShown.map(row),
        const SizedBox(height: KmTokens.s7),
        AgentSectionHead(
          title: 'Your dots',
          description: 'Persistent personal agents with private memory.',
          action: KmButton(
            label: 'Manage dots',
            trailingIcon: LucideIcons.chevronRight,
            variant: KmButtonVariant.ghost,
            size: KmButtonSize.small,
            onPressed: () => context.go('/agents/dots'),
          ),
        ),
        _DotRow(dot: iris, onTap: () => context.go('/agents/dot/${iris.id}')),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const KmFieldLabel('Search agents'),
        const SizedBox(height: 6),
        Semantics(
          label: 'Search agents',
          child: TextField(
            controller: controller,
            style: kmFieldStyle(context),
            decoration: kmFieldDecoration(
              context,
              placeholder: 'e.g. Scribe, note-taker or a worker name',
              prefixIcon: const ExcludeSemantics(child: Icon(LucideIcons.search, size: 20)),
            ),
          ),
        ),
      ],
    );
  }
}

class _DotRow extends StatelessWidget {
  const _DotRow({required this.dot, required this.onTap});

  final Dot dot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final String join = dot.joinsByDefault
        ? 'joins your meetings by default'
        : 'joins when you bring it';
    return AgentListRow(
      leading: KmOrb(paused: dot.paused),
      title: dot.name,
      semanticLabel: '${dot.name}, your dot, ${dot.paused ? 'paused' : 'active'}, $join',
      meta: (Color color) => Text(
        'Your dot · private memory · $join',
        style: KmText.small(context).copyWith(color: color),
      ),
      chip: dot.paused
          ? const KmChip('Paused', tone: KmChipTone.amber, pip: true)
          : const KmChip('Active', tone: KmChipTone.green, pip: true),
      onTap: onTap,
    );
  }
}
