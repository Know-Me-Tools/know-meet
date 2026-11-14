// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/agent.dart';
import '../../domain/registration_draft.dart';
import '../providers/agents_providers.dart';
import 'agent_form_widgets.dart';
import 'agent_widgets.dart';

List<AgentOption<T>> _options<T>(List<T> values, String Function(T) title, String Function(T) desc) =>
    <AgentOption<T>>[for (final T v in values) AgentOption<T>(v, title(v), desc(v))];

/// Step 3, Permissions & knowledge: media, knowledge, dispatch, auto-join
/// (and the meeting tag when auto-join is by tag).
class RegisterPermissionsStep extends ConsumerWidget {
  const RegisterPermissionsStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final RegistrationDraft d = ref.watch(registrationDraftControllerProvider);
    void change(RegistrationDraft Function(RegistrationDraft) f) =>
        ref.read(registrationDraftControllerProvider.notifier).edit(f);
    const SizedBox gap = SizedBox(height: KmTokens.s5);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        AgentOptionGroup<AgentMedia>(
          legend: 'In meetings it can',
          selected: d.media,
          options: _options(AgentMedia.values, (AgentMedia v) => v.label, (AgentMedia v) => v.description),
          onChanged: (AgentMedia v) => change((RegistrationDraft x) => x.copyWith(media: v)),
        ),
        gap,
        AgentOptionGroup<AgentKnowledge>(
          legend: 'Knowledge access',
          selected: d.knowledge,
          options: _options(
            AgentKnowledge.values,
            (AgentKnowledge v) => v.label,
            (AgentKnowledge v) => v.description,
          ),
          onChanged: (AgentKnowledge v) => change((RegistrationDraft x) => x.copyWith(knowledge: v)),
        ),
        gap,
        AgentOptionGroup<AgentDispatch>(
          legend: 'Who may dispatch it',
          selected: d.dispatch,
          options: _options(
            const <AgentDispatch>[AgentDispatch.me, AgentDispatch.anyone],
            (AgentDispatch v) => v.label,
            (AgentDispatch v) => v.description,
          ),
          onChanged: (AgentDispatch v) => change((RegistrationDraft x) => x.copyWith(dispatch: v)),
        ),
        gap,
        AgentOptionGroup<AgentAutoJoin>(
          legend: 'Auto-join',
          selected: d.autoJoin,
          options: _options(
            const <AgentAutoJoin>[AgentAutoJoin.never, AgentAutoJoin.mine, AgentAutoJoin.tagged],
            (AgentAutoJoin v) => v.label,
            (AgentAutoJoin v) => v.description,
          ),
          onChanged: (AgentAutoJoin v) => change((RegistrationDraft x) => x.copyWith(autoJoin: v)),
        ),
        if (d.autoJoin == AgentAutoJoin.tagged) ...<Widget>[
          const SizedBox(height: KmTokens.s3),
          Container(
            padding: const EdgeInsets.all(KmTokens.s4),
            decoration: BoxDecoration(
              color: context.km.surface,
              borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            ),
            child: KmTextField(
              label: 'Meeting tag',
              required: true,
              mono: true,
              initialValue: d.tag,
              placeholder: 'workshop',
              hint: 'Add this tag when scheduling a meeting to bring the agent in automatically.',
            ),
          ),
        ],
        gap,
        AgentNotice(
          icon: LucideIcons.info,
          title: 'Data retention',
          body: Text(
            'While it’s in a meeting, the agent can read only the knowledge you grant here. '
            'Anything your worker stores lives on your infrastructure under your own '
            'retention policy. In guest meetings the live transcript is deleted when the '
            'meeting ends.',
            style: KmText.small(context),
          ),
        ),
      ],
    );
  }
}
