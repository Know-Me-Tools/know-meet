// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/agent.dart';
import '../../domain/registration_draft.dart';
import '../providers/agents_providers.dart';
import 'agent_form_widgets.dart';
import 'agent_widgets.dart';

/// One summary row: (key, value, mono). An empty value reads "Not set".
typedef SummaryRow = (String, String, bool);

/// Step 4, Test & finish: blockers, the draft summary and the connection
/// test. The test cannot run while a required field is missing; the static
/// phase never contacts LiveKit, so running it goes to the documented
/// failure state (`agents.register-error`).
class RegisterTestStep extends ConsumerWidget {
  const RegisterTestStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final RegistrationDraft d = ref.watch(registrationDraftControllerProvider);
    final String managedUrl = ref.watch(agentsRepositoryProvider).managedProjectUrl;
    final List<DraftIssue> issues = draftIssues(d);
    final String url = d.project == AgentProject.own ? 'Own LiveKit project' : managedUrl;
    const SizedBox gap = SizedBox(height: KmTokens.s4);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (issues.isNotEmpty) ...<Widget>[_Blockers(issues: issues), gap],
        _SummaryCard(
          title: 'Identity',
          step: 1,
          rows: <SummaryRow>[('Name', d.name, false), ('Role', d.role, false), ('Glyph', d.glyph, true)],
        ),
        gap,
        _SummaryCard(
          title: 'Worker & dispatch',
          step: 2,
          rows: <SummaryRow>[
            ('Project', d.project == AgentProject.own ? 'My own LiveKit project' : 'KnowMe-managed', false),
            ('URL', url, true),
            ('agent_name', d.agentName, true),
          ],
        ),
        gap,
        _SummaryCard(
          title: 'Permissions',
          step: 3,
          rows: <SummaryRow>[
            ('Media', d.media.label, false),
            ('Knowledge', d.knowledge.label, false),
            ('Dispatch', d.dispatch.label, false),
            (
              'Auto-join',
              d.autoJoin == AgentAutoJoin.tagged
                  ? 'Meetings tagged “${d.tag.isEmpty ? '—' : d.tag}”'
                  : d.autoJoin.label,
              false,
            ),
          ],
        ),
        gap,
        _ConnectionTest(
          url: url,
          agentName: d.agentName,
          blocked: issues.isNotEmpty,
        ),
      ],
    );
  }
}

class _Blockers extends StatelessWidget {
  const _Blockers({required this.issues});

  final List<DraftIssue> issues;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return AgentNotice(
      tone: AgentNoticeTone.warn,
      icon: LucideIcons.circleAlert,
      title: 'Finish these before testing',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          for (final DraftIssue i in issues)
            Padding(
              padding: const EdgeInsets.only(top: KmTokens.s2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Padding(
                    padding: const EdgeInsets.only(top: 1),
                    child: ExcludeSemantics(
                      child: Icon(LucideIcons.circleAlert, size: 18, color: p.redText),
                    ),
                  ),
                  const SizedBox(width: KmTokens.s2),
                  Expanded(
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: <Widget>[
                        Text('${i.field}: ${i.message} ', style: KmText.small(context)),
                        AgentLink(
                          'Fix in step ${i.step}',
                          onTap: () => context.go('/agents/register/${i.step}'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.title, required this.step, required this.rows});

  final String title;
  final int step;
  final List<SummaryRow> rows;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Semantics(header: true, child: Text(title, style: KmText.h3(context))),
              ),
              // Visible "Edit", announced as "Edit <section>" (prototype
              // aria-label), so the three Edit buttons are distinguishable.
              Semantics(
                button: true,
                label: 'Edit $title',
                onTap: () => context.go('/agents/register/$step'),
                excludeSemantics: true,
                child: KmButton(
                  label: 'Edit',
                  icon: LucideIcons.pencil,
                  variant: KmButtonVariant.ghost,
                  size: KmButtonSize.small,
                  onPressed: () => context.go('/agents/register/$step'),
                ),
              ),
            ],
          ),
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
                      rows[i].$2.isEmpty ? 'Not set' : rows[i].$2,
                      style: (rows[i].$3 ? KmText.mono(context) : KmText.small(context)).copyWith(
                        color: rows[i].$2.isEmpty ? p.fgSub : p.fg,
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

class _ConnectionTest extends StatelessWidget {
  const _ConnectionTest({required this.url, required this.agentName, required this.blocked});

  final String url;
  final String agentName;
  final bool blocked;

  @override
  Widget build(BuildContext context) {
    final List<(String, String)> checks = <(String, String)>[
      ('Reach LiveKit project', url),
      ('Worker registered with agent_name', 'Looking for “${agentName.isEmpty ? '—' : agentName}”'),
      ('Test dispatch into sandbox room', 'Private room, no participants other than the agent'),
      ('Agent joined & responded', 'Waits for the agent to join and answer a test message'),
    ];
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Connection test', style: KmText.h2(context))),
          const SizedBox(height: 2),
          Text(
            'Confirms KnowMe can reach your project and dispatch your worker by agent_name.',
            style: KmText.smallSub(context),
          ),
          const SizedBox(height: KmTokens.s3),
          Align(
            alignment: Alignment.centerLeft,
            child: KmButton(
              label: 'Run connection test',
              icon: LucideIcons.zap,
              variant: KmButtonVariant.primary,
              onPressed: blocked ? null : () => context.go('/agents/register-error'),
            ),
          ),
          const SizedBox(height: KmTokens.s4),
          for (int i = 0; i < checks.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: KmTokens.s2),
              child: AgentCheckRow(index: i, title: checks[i].$1, detail: checks[i].$2),
            ),
          const SizedBox(height: KmTokens.s2),
          Semantics(
            liveRegion: true,
            child: Text(
              blocked
                  ? 'Fix the items above to run the test.'
                  : 'Runs four checks against your worker. Takes a few seconds.',
              style: KmText.smallSub(context),
            ),
          ),
        ],
      ),
    );
  }
}
