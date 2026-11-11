// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/clock/km_clock.dart';
import '../../../../shared/ui/ui.dart';
import '../../domain/agent.dart';
import '../agents_format.dart';
import 'agent_form_widgets.dart';
import 'agent_widgets.dart';

/// Overview tab: About (with offline or managed notices) and Configuration.
class AgentOverviewPanel extends StatelessWidget {
  const AgentOverviewPanel({super.key, required this.agent, required this.managedUrl});

  final Agent agent;
  final String managedUrl;

  String get _project =>
      agent.project == AgentProject.own ? (agent.projectUrl ?? 'Own LiveKit project') : managedUrl;

  @override
  Widget build(BuildContext context) {
    final List<(String, String, bool)> rows = <(String, String, bool)>[
      ('agent_name', agent.worker, true),
      ('LiveKit project', _project, true),
      ('Media', agent.media.label, false),
      ('Knowledge', agent.knowledge.label, false),
      ('Dispatch', agent.dispatch.label, false),
      ('Auto-join', agent.autoJoinText, false),
      ('Owner', agent.owner, false),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        KmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Semantics(header: true, child: Text('About', style: KmText.h3(context))),
              const SizedBox(height: KmTokens.s3),
              Text(
                agent.description.isEmpty ? 'No description yet.' : agent.description,
                style: KmText.body(context),
              ),
              if (!agent.online) ...<Widget>[
                const SizedBox(height: KmTokens.s3),
                AgentNotice(
                  tone: AgentNoticeTone.warn,
                  icon: LucideIcons.circleAlert,
                  title: 'Worker offline',
                  body: Text(
                    'Dispatches to this agent will fail until its worker reconnects to $_project.',
                    style: KmText.small(context),
                  ),
                ),
              ],
              if (agent.system) ...<Widget>[
                const SizedBox(height: KmTokens.s3),
                AgentNotice(
                  icon: LucideIcons.shield,
                  title: 'Managed by KnowMe',
                  body: Text(
                    'The Concierge can’t be unregistered or reconfigured. It joins every '
                    'meeting, including guest meetings, and keeps nothing after the meeting ends.',
                    style: KmText.small(context),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        KmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Semantics(header: true, child: Text('Configuration', style: KmText.h3(context))),
              const SizedBox(height: KmTokens.s3),
              for (int i = 0; i < rows.length; i++)
                Padding(
                  padding: EdgeInsets.only(top: i == 0 ? 0 : KmTokens.s3),
                  child: MergeSemantics(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(rows[i].$1, style: KmText.smallSub(context)),
                        const SizedBox(height: 2),
                        Text(
                          rows[i].$2,
                          style: rows[i].$3 ? KmText.mono(context) : KmText.small(context),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Activity tab: recent dispatches as stacked rows (the prototype's table
/// scrolls sideways at phone width; rows keep every cell readable).
class AgentActivityPanel extends ConsumerWidget {
  const AgentActivityPanel({super.key, required this.agent, required this.records});

  final Agent agent;
  final List<AgentDispatchRecord> records;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (records.isEmpty) {
      return KmEmptyState(
        icon: LucideIcons.clock,
        title: 'No dispatches yet',
        body:
            'When ${agent.name} joins a meeting, it shows up here with how long it '
            'stayed and how it went.',
        actions: <Widget>[
          KmButton(
            label: 'See upcoming meetings',
            icon: LucideIcons.calendar,
            onPressed: () => context.go('/dashboard/upcoming'),
          ),
        ],
      );
    }
    final DateTime now = ref.watch(kmClockProvider)();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(header: true, child: Text('Recent dispatches', style: KmText.h3(context))),
        const SizedBox(height: KmTokens.s4),
        for (final AgentDispatchRecord r in records)
          Padding(
            padding: const EdgeInsets.only(bottom: KmTokens.s2),
            child: _DispatchRow(record: r, now: now),
          ),
      ],
    );
  }
}

class _DispatchRow extends StatelessWidget {
  const _DispatchRow({required this.record, required this.now});

  final AgentDispatchRecord record;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final bool live = record.outcome == DispatchOutcome.live;
    final DateTime? date = record.date;
    final String when = live
        ? 'Today · ${formatTime(liveMeetingStart(now))}'
        : (date == null ? '—' : formatDate(date));
    final int? min = record.minutes;
    final String duration = live ? 'In progress' : (min == null || min == 0 ? '—' : formatMinutes(min));
    final KmChipTone tone = switch (record.outcome) {
      DispatchOutcome.live => KmChipTone.cyan,
      DispatchOutcome.done => KmChipTone.green,
      DispatchOutcome.failed => KmChipTone.red,
    };
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
        decoration: BoxDecoration(
          color: context.km.surface,
          borderRadius: BorderRadius.circular(KmTokens.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(record.meeting, style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold)),
            const SizedBox(height: 2),
            Text('$when · $duration', style: KmText.smallSub(context)),
            const SizedBox(height: KmTokens.s2),
            KmChip(record.outcome.label, tone: tone),
          ],
        ),
      ),
    );
  }
}

/// Settings tab: availability, dispatch, auto-join and file access, and the
/// media select. Edits are this form's own state until saved; saving is out
/// of scope this phase (no registry backend), so Save only confirms.
class AgentSettingsPanel extends StatefulWidget {
  const AgentSettingsPanel({super.key, required this.agent});

  final Agent agent;

  @override
  State<AgentSettingsPanel> createState() => _AgentSettingsPanelState();
}

class _AgentSettingsPanelState extends State<AgentSettingsPanel> {
  bool _available = true;
  late bool _anyone = widget.agent.dispatch == AgentDispatch.anyone;
  late bool _auto = widget.agent.autoJoin != AgentAutoJoin.never;
  late bool _files = widget.agent.knowledge == AgentKnowledge.files;
  late AgentMedia _media = widget.agent.media;
  bool _dirty = false;

  void _mark(VoidCallback change) => setState(() {
    change();
    _dirty = true;
  });

  @override
  Widget build(BuildContext context) {
    final Agent a = widget.agent;
    final bool noKnowledge = a.knowledge == AgentKnowledge.none;
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Settings', style: KmText.h3(context))),
          KmSwitchRow(
            title: 'Available for dispatch',
            description:
                'Turn off to stop new dispatches without unregistering. Meetings it’s already '
                'in aren’t affected.',
            value: _available,
            onChanged: (bool v) => _mark(() => _available = v),
          ),
          KmSwitchRow(
            title: 'Anyone in meetings I host can dispatch it',
            description: 'When off, only you can bring it into a meeting.',
            value: _anyone,
            onChanged: (bool v) => _mark(() => _anyone = v),
          ),
          KmSwitchRow(
            title: 'Join meetings automatically',
            description: a.autoJoin == AgentAutoJoin.tagged
                ? 'Currently joins meetings tagged “${a.tag}”. Turning this off means it joins only on request.'
                : 'Joins every meeting you host as soon as it starts.',
            value: _auto,
            onChanged: (bool v) => _mark(() => _auto = v),
          ),
          KmSwitchRow(
            title: 'Read host-only files',
            description: noKnowledge
                ? 'Knowledge access is off for this agent. Change it by registering again with knowledge access.'
                : 'Adds files the host keeps private to their agents, on top of shared meeting '
                      'knowledge and the live transcript.',
            value: _files,
            onChanged: noKnowledge ? null : (bool v) => _mark(() => _files = v),
          ),
          const SizedBox(height: KmTokens.s3),
          AgentSelectField<AgentMedia>(
            label: 'In meetings it can',
            options: <(AgentMedia, String)>[for (final AgentMedia m in AgentMedia.values) (m, m.label)],
            value: _media,
            onChanged: (AgentMedia? v) => _mark(() => _media = v ?? _media),
          ),
          const SizedBox(height: KmTokens.s4),
          Wrap(
            spacing: KmTokens.s3,
            runSpacing: KmTokens.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              KmButton(
                label: 'Save settings',
                icon: LucideIcons.check,
                variant: KmButtonVariant.primary,
                onPressed: () => setState(() => _dirty = false),
              ),
              Semantics(
                liveRegion: true,
                child: Text(_dirty ? 'Unsaved changes' : '', style: KmText.smallSub(context)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Danger zone tab: unregister the agent.
class AgentDangerPanel extends StatelessWidget {
  const AgentDangerPanel({super.key, required this.agent});

  final Agent agent;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Container(
      padding: const EdgeInsets.all(KmTokens.s4),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(KmTokens.radiusLg),
        border: Border.all(color: p.redSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(
            header: true,
            child: Row(
              children: <Widget>[
                ExcludeSemantics(child: Icon(LucideIcons.circleAlert, size: 20, color: p.redText)),
                const SizedBox(width: KmTokens.s2),
                Text('Danger zone', style: KmText.h2(context)),
              ],
            ),
          ),
          const SizedBox(height: KmTokens.s4),
          Text(
            'Unregister this agent',
            style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
          ),
          const SizedBox(height: 2),
          Text(
            'Removes it from your registry and from every meeting’s agent list. Activity '
            'history is removed too.',
            style: KmText.smallSub(context),
          ),
          const SizedBox(height: KmTokens.s3),
          Align(
            alignment: Alignment.centerLeft,
            child: KmButton(
              label: 'Unregister ${agent.name}',
              icon: LucideIcons.trash2,
              variant: KmButtonVariant.danger,
              onPressed: () => context.go('/agents/registry'),
            ),
          ),
        ],
      ),
    );
  }
}
