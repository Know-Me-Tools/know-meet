// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/registration_draft.dart';
import '../providers/agents_providers.dart';
import '../widgets/agent_widgets.dart';

/// The worker name the prototype's failure path uses when the draft has none
/// (agents.html `FAIL_WORKER`).
const String _failWorker = 'missing-worker';

/// `agents.register-error`: the connection test failed because no worker
/// announced the agent_name. Explains what passed and failed, lists likely
/// causes as a checklist, and offers retry, edit or save for later.
class RegisterErrorScreen extends ConsumerStatefulWidget {
  const RegisterErrorScreen({super.key});

  @override
  ConsumerState<RegisterErrorScreen> createState() => _RegisterErrorScreenState();
}

class _RegisterErrorScreenState extends ConsumerState<RegisterErrorScreen> {
  /// Ticked causes: the visitor's own checklist, not business state.
  final Set<int> _checked = <int>{};

  @override
  Widget build(BuildContext context) {
    final RegistrationDraft d = ref.watch(registrationDraftControllerProvider);
    final String url = ref.watch(agentsRepositoryProvider).managedProjectUrl;
    final String name = d.agentName.isEmpty ? _failWorker : d.agentName;
    final List<(String, String)> causes = <(String, String)>[
      ('The worker isn’t running', 'Start it with python worker.py start and leave it running while you test.'),
      ('The names don’t match', 'agent_name in WorkerOptions must equal “$name” exactly — it’s case-sensitive.'),
      ('It’s connected to a different project', 'Check that the worker’s LIVEKIT_URL is $url.'),
      ('Credentials were rejected', 'Make sure LIVEKIT_API_KEY and LIVEKIT_API_SECRET belong to that same project.'),
      (
        'It started without agent_name',
        'Workers without agent_name are dispatched automatically to every room and can’t be called by name.',
      ),
    ];
    return KmPage(
      children: <Widget>[
        KmPageHead(
          eyebrow: 'Step 4 of 4 · Test & finish',
          title: 'Connection test failed',
          crumbs: <KmCrumb>[
            KmCrumb('Agents', onTap: () => context.go('/agents/registry')),
            KmCrumb('Register an agent', onTap: () => context.go('/agents/register/4')),
            const KmCrumb('Test failed'),
          ],
        ),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              AgentNotice(
                tone: AgentNoticeTone.danger,
                icon: LucideIcons.circleAlert,
                title: 'No worker is registered with agent_name $name.',
                // One sentence for assistive tech; the name chip and the full
                // stop are not separate stops.
                titleWidget: Semantics(
                  label: 'No worker is registered with agent_name $name.',
                  excludeSemantics: true,
                  child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: <Widget>[
                    Text(
                      'No worker is registered with agent_name ',
                      style: KmText.small(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                    ),
                    AgentCode(name),
                    Text('.', style: KmText.small(context)),
                  ],
                ),
                ),
                body: Text(
                  'KnowMe reached the LiveKit project, but no running worker announced that '
                  'name, so there was nothing to dispatch. Your registration hasn’t been saved yet.',
                  style: KmText.small(context),
                ),
              ),
              const SizedBox(height: KmTokens.s4),
              KmKeyValues(<(String, String)>[('Project', url), ('agent_name', name)]),
              const SizedBox(height: KmTokens.s3),
              const KmKeyValues(
                <(String, String)>[
                  ('Passed', 'Reach LiveKit project'),
                  ('Failed', 'Worker registered with agent_name'),
                  ('Skipped', 'Test dispatch, agent response'),
                ],
                plainValues: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s5),
        KmCard(
          panel: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Semantics(header: true, child: Text('Likely causes', style: KmText.h2(context))),
              const SizedBox(height: 2),
              Text('Tick each one off as you check it.', style: KmText.smallSub(context)),
              const SizedBox(height: KmTokens.s3),
              for (int i = 0; i < causes.length; i++)
                KmCheckRow(
                  label: causes[i].$1,
                  description: causes[i].$2,
                  value: _checked.contains(i),
                  onChanged: (bool v) => setState(() {
                    if (v) {
                      _checked.add(i);
                    } else {
                      _checked.remove(i);
                    }
                  }),
                ),
            ],
          ),
        ),
        const SizedBox(height: KmTokens.s6),
        const KmRule(vertical: 0),
        const SizedBox(height: KmTokens.s5),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            KmButton(
              label: 'Retry test',
              icon: LucideIcons.refreshCw,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/agents/register/4'),
            ),
            KmButton(
              label: 'Edit worker settings',
              icon: LucideIcons.pencil,
              onPressed: () => context.go('/agents/register/2'),
            ),
            KmButton(
              label: 'Save for later',
              variant: KmButtonVariant.ghost,
              onPressed: () => context.go('/agents/registry'),
            ),
          ],
        ),
      ],
    );
  }
}
