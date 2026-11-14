// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/agents_repository.dart';
import '../../domain/dot.dart';
import '../agents_format.dart';
import '../providers/agents_providers.dart';
import '../widgets/agent_form_widgets.dart';
import '../widgets/agent_widgets.dart';
import '../widgets/agents_gate.dart';

/// `agents.dot.<id>`: your dot's pause switch, settings and memories. Only
/// your own dot opens; another person's dot or an unknown id shows the
/// prototype's not-found copy. Form edits are the form's own state until
/// saved (no dot backend this phase).
class DotScreen extends ConsumerStatefulWidget {
  const DotScreen({super.key, required this.dotId});

  final String dotId;

  @override
  ConsumerState<DotScreen> createState() => _DotScreenState();
}

class _DotScreenState extends ConsumerState<DotScreen> {
  bool? _paused;
  bool? _alwaysJoin;
  bool? _speakWhenAsked;
  DotVoice? _voice;
  final Map<String, bool> _scope = <String, bool>{};
  final Set<String> _forgotten = <String>{};

  @override
  Widget build(BuildContext context) {
    final AgentsRepository repo = ref.watch(agentsRepositoryProvider);
    final Dot iris = repo.myDot();
    if (widget.dotId != iris.id) {
      final Dot shared = repo.sharedDot();
      return widget.dotId == shared.id
          ? AgentsNotFound(
              title: '${shared.name} is Avery’s dot',
              message:
                  'Only ${shared.owner} can open ${shared.name}’s settings and memory. You’ll '
                  'see ${shared.name} in meetings you share with Avery.',
            )
          : AgentsNotFound(
              title: 'Dot not found',
              message: 'You have one dot, ${iris.name}. There’s no dot called “${widget.dotId}”.',
            );
    }
    final bool paused = _paused ?? iris.paused;
    final List<DotMemory> memories =
        repo.memories().where((DotMemory m) => !_forgotten.contains(m.id)).toList();
    return KmPage(
      children: <Widget>[
        _DotHead(dot: iris, paused: paused),
        KmCard(
          panel: true,
          padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s1),
          child: KmSwitchRow(
            title: 'Pause ${iris.name}',
            description:
                'While paused, ${iris.name} won’t join meetings or add new memories. '
                'Existing memory is kept.',
            value: paused,
            onChanged: (bool v) => setState(() => _paused = v),
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        _settings(iris),
        const SizedBox(height: KmTokens.s5),
        _memories(iris, memories),
      ],
    );
  }

  bool _scoped(String key, bool fallback) => _scope[key] ?? fallback;

  Widget _settings(Dot iris) {
    const SizedBox gap = SizedBox(height: KmTokens.s4);
    final List<(String, String, String, bool)> scope = <(String, String, String, bool)>[
      ('summaries', 'Transcript summaries', 'Decisions and action items from meetings it attends.', iris.remembersSummaries),
      ('conversations', 'My private agent conversations', 'What you ask it directly, in or out of meetings.', iris.remembersConversations),
      ('files', 'Files I upload', 'Documents you add to its memory yourself.', iris.remembersFiles),
    ];
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Settings', style: KmText.h2(context))),
          gap,
          KmTextField(label: 'Name', required: true, initialValue: iris.name),
          gap,
          AgentSelectField<DotVoice>(
            label: 'Voice',
            options: <(DotVoice, String)>[for (final DotVoice v in DotVoice.values) (v, v.label)],
            value: _voice ?? iris.voice,
            onChanged: (DotVoice? v) => setState(() => _voice = v),
          ),
          gap,
          AgentOptionGroup<bool>(
            legend: 'Join behavior',
            onCard: true,
            selected: _alwaysJoin ?? iris.alwaysJoin,
            options: const <AgentOption<bool>>[
              AgentOption<bool>(true, 'Always join my meetings', 'Joins as soon as a meeting you’re in starts.'),
              AgentOption<bool>(false, 'Ask me first', 'Asks in the lobby before each meeting.'),
            ],
            onChanged: (bool v) => setState(() => _alwaysJoin = v),
          ),
          gap,
          AgentOptionGroup<bool>(
            legend: 'Speak in meetings',
            onCard: true,
            selected: _speakWhenAsked ?? iris.speaksWhenAsked,
            options: const <AgentOption<bool>>[
              AgentOption<bool>(true, 'Only when asked', 'Speaks when you or someone addresses it by name.'),
              AgentOption<bool>(false, 'Never', 'Listens and remembers for you, but stays silent.'),
            ],
            onChanged: (bool v) => setState(() => _speakWhenAsked = v),
          ),
          gap,
          Semantics(
            container: true,
            explicitChildNodes: true,
            label: 'What it may remember',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const AgentLegend('What it may remember'),
                const SizedBox(height: KmTokens.s1),
                Text(
                  'Memory is private to you. Nothing is shared with other participants or their dots.',
                  style: KmText.smallSub(context),
                ),
                const SizedBox(height: KmTokens.s2),
                for (final (String key, String title, String desc, bool initial) in scope)
                  Padding(
                    padding: const EdgeInsets.only(bottom: KmTokens.s2),
                    child: AgentOptionCard(
                      title: title,
                      description: desc,
                      multi: true,
                      onCard: true,
                      selected: _scoped(key, initial),
                      onTap: () => setState(() => _scope[key] = !_scoped(key, initial)),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: KmTokens.s2),
          Align(
            alignment: Alignment.centerLeft,
            child: KmButton(
              label: 'Save settings',
              icon: LucideIcons.check,
              variant: KmButtonVariant.primary,
              onPressed: () {},
            ),
          ),
        ],
      ),
    );
  }

  Widget _memories(Dot iris, List<DotMemory> memories) {
    final KmPalette p = context.km;
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Recent meeting memories', style: KmText.h2(context))),
          Text(
            '${memories.length} ${memories.length == 1 ? 'memory' : 'memories'}',
            style: KmText.smallSub(context),
          ),
          const SizedBox(height: KmTokens.s4),
          if (memories.isEmpty)
            KmEmptyState(
              icon: LucideIcons.book,
              title: 'No meeting memories',
              body:
                  '${iris.name} will add memories from the next meeting it attends, within the '
                  'scope you set.',
            ),
          for (final DotMemory m in memories)
            Padding(
              padding: const EdgeInsets.only(bottom: KmTokens.s2),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
                decoration: BoxDecoration(
                  color: p.surface,
                  borderRadius: BorderRadius.circular(KmTokens.radius),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    MergeSemantics(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          const KmLeadIcon(LucideIcons.book),
                          const SizedBox(width: KmTokens.s3),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(
                                  m.meeting,
                                  style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                                ),
                                Text(formatDate(m.date), style: KmText.smallSub(context)),
                                const SizedBox(height: 2),
                                Text(m.text, style: KmText.small(context)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: KmTokens.s3),
                    Semantics(
                      button: true,
                      label: 'Forget memory from ${m.meeting}, ${formatDay(m.date)}',
                      excludeSemantics: true,
                      onTap: () => setState(() => _forgotten.add(m.id)),
                      child: KmButton(
                        label: 'Forget',
                        icon: LucideIcons.trash2,
                        variant: KmButtonVariant.ghost,
                        size: KmButtonSize.small,
                        onPressed: () => setState(() => _forgotten.add(m.id)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _DotHead extends StatelessWidget {
  const _DotHead({required this.dot, required this.paused});

  final Dot dot;
  final bool paused;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          KmOrb(size: 56, paused: paused),
          const SizedBox(width: KmTokens.s4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                AgentCrumbs(<KmCrumb>[
                  KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
                  KmCrumb('Dots', onTap: () => context.go('/agents/dots')),
                  KmCrumb(dot.name),
                ]),
                const SizedBox(height: KmTokens.s2),
                Semantics(header: true, child: Text(dot.name, style: KmText.h1(context))),
                const SizedBox(height: KmTokens.s2),
                Wrap(
                  spacing: KmTokens.s4,
                  runSpacing: KmTokens.s2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: <Widget>[
                    if (paused)
                      const KmChip('Paused', tone: KmChipTone.amber, pip: true)
                    else
                      const KmChip('Active', tone: KmChipTone.green, pip: true),
                    Text('Your dot · private memory', style: KmText.smallSub(context)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
