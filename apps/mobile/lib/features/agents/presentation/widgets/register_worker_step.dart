// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/agent.dart';
import '../../domain/registration_draft.dart';
import '../providers/agents_providers.dart';
import 'agent_form_widgets.dart';
import 'agent_widgets.dart';

/// The minimal worker snippet for [draft] (prototype `snippetText`).
String workerSnippet(RegistrationDraft draft, String managedUrl) {
  final String name = draft.agentName.trim().isEmpty ? 'your-agent-name' : draft.agentName.trim();
  final String url = draft.project == AgentProject.own
      ? 'wss://<your-project>.livekit.cloud'
      : managedUrl;
  final String display = draft.name.trim().isEmpty
      ? 'a helpful meeting agent'
      : draft.name.trim().replaceAll(RegExp(r'["\\]'), '');
  return <String>[
    '# worker.py — minimal LiveKit Agents worker for KnowMe',
    '# Environment (names only — never commit the values):',
    '#   LIVEKIT_URL=$url',
    '#   LIVEKIT_API_KEY',
    '#   LIVEKIT_API_SECRET',
    'from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli',
    '',
    '',
    'async def entrypoint(ctx: JobContext):',
    '    await ctx.connect()',
    '    session = AgentSession()  # add your STT, LLM and TTS (or a realtime model)',
    '    await session.start(room=ctx.room, agent=Agent(instructions="You are $display."))',
    '',
    '',
    'if __name__ == "__main__":',
    '    cli.run_app(WorkerOptions(',
    '        entrypoint_fnc=entrypoint,',
    '        agent_name="$name",  # explicit dispatch: KnowMe calls this name',
    '    ))',
  ].join('\n');
}

/// Step 2, Worker & dispatch: LiveKit project, `agent_name` and the
/// minimal worker. Own-project credentials are entered here and never kept
/// in the draft (secrets stay server-side once registered).
class RegisterWorkerStep extends ConsumerWidget {
  const RegisterWorkerStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final RegistrationDraft d = ref.watch(registrationDraftControllerProvider);
    final String managedUrl = ref.watch(agentsRepositoryProvider).managedProjectUrl;
    final String snippet = workerSnippet(d, managedUrl);
    const SizedBox gap = SizedBox(height: KmTokens.s5);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const AgentRequiredNote(),
        gap,
        AgentOptionGroup<AgentProject>(
          legend: 'LiveKit project',
          required: true,
          selected: d.project,
          options: const <AgentOption<AgentProject>>[
            AgentOption<AgentProject>(
              AgentProject.managed,
              'KnowMe-managed project',
              'Your worker connects to the same LiveKit project your meetings run on.',
            ),
            AgentOption<AgentProject>(
              AgentProject.own,
              'My own LiveKit project',
              'Your worker runs against your own LiveKit Cloud or self-hosted project.',
            ),
          ],
          onChanged: (AgentProject v) => ref
              .read(registrationDraftControllerProvider.notifier)
              .edit((RegistrationDraft x) => x.copyWith(project: v)),
        ),
        const SizedBox(height: KmTokens.s3),
        if (d.project == AgentProject.managed)
          _Reveal(child: _ManagedProject(url: managedUrl))
        else
          const _Reveal(child: _OwnProject()),
        gap,
        const KmTextField(
          label: 'agent_name',
          required: true,
          mono: true,
          placeholder: 'e.g. scribe-notes',
          hint:
              'KnowMe dispatches your worker by this exact name. It must match agent_name '
              'in your worker’s WorkerOptions (or AgentServer). Lowercase letters, numbers '
              'and hyphens.',
        ),
        gap,
        Row(
          children: <Widget>[
            Expanded(
              child: Semantics(
                header: true,
                child: Text('Minimal worker', style: KmText.h3(context)),
              ),
            ),
            KmButton(
              label: 'Copy code',
              icon: LucideIcons.copy,
              size: KmButtonSize.small,
              onPressed: () => Clipboard.setData(ClipboardData(text: snippet)),
            ),
          ],
        ),
        const SizedBox(height: KmTokens.s2),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            Text('Start it with ', style: KmText.smallSub(context)),
            const AgentCode('python worker.py start'),
            Text('. Keep it running so it can accept dispatches.', style: KmText.smallSub(context)),
          ],
        ),
        const SizedBox(height: KmTokens.s2),
        Semantics(label: 'Python worker example', child: KmCodeBlock(snippet)),
      ],
    );
  }
}

/// `.reveal`: the surface that holds the project details.
class _Reveal extends StatelessWidget {
  const _Reveal({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(KmTokens.s4),
    decoration: BoxDecoration(
      color: context.km.surface,
      borderRadius: BorderRadius.circular(KmTokens.radiusTile),
    ),
    child: child,
  );
}

class _ManagedProject extends StatelessWidget {
  const _ManagedProject({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            Expanded(
              child: KmTextField(label: 'Project URL', initialValue: url, readOnly: true, mono: true),
            ),
            const SizedBox(width: KmTokens.s2),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: KmButton(
                label: 'Copy',
                icon: LucideIcons.copy,
                size: KmButtonSize.small,
                onPressed: () => Clipboard.setData(ClipboardData(text: url)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            Text(
              'Run your worker with this project’s LIVEKIT_URL, LIVEKIT_API_KEY and '
              'LIVEKIT_API_SECRET. Find them in ',
              style: KmText.smallSub(context),
            ),
            AgentLink('Settings › LiveKit', onTap: () => context.go('/settings/livekit')),
            Text('.', style: KmText.smallSub(context)),
          ],
        ),
      ],
    );
  }
}

class _OwnProject extends StatelessWidget {
  const _OwnProject();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        KmTextField(
          label: 'Project URL',
          required: true,
          mono: true,
          placeholder: 'wss://your-project.livekit.cloud',
          keyboardType: TextInputType.url,
        ),
        SizedBox(height: KmTokens.s4),
        KmTextField(label: 'API key', required: true, mono: true, obscure: true),
        SizedBox(height: KmTokens.s4),
        KmTextField(label: 'API secret', required: true, mono: true, obscure: true),
        SizedBox(height: KmTokens.s4),
        AgentNotice(
          icon: LucideIcons.shield,
          title: 'Stored server-side only',
          body: _SecretNoticeBody(),
        ),
      ],
    );
  }
}

class _SecretNoticeBody extends StatelessWidget {
  const _SecretNoticeBody();

  @override
  Widget build(BuildContext context) => Text(
    'Your key and secret are sent to KnowMe once and kept on the server. They’re never '
    'shown again — afterwards you’ll only see a masked value, and you can replace them '
    'at any time.',
    style: KmText.small(context),
  );
}
