// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/registration_draft.dart';
import '../providers/agents_providers.dart';
import 'agent_widgets.dart';

/// Step 1, Identity: name, role, description, glyph, and the tile preview.
class RegisterIdentityStep extends ConsumerWidget {
  const RegisterIdentityStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final RegistrationDraft d = ref.watch(registrationDraftControllerProvider);
    const SizedBox gap = SizedBox(height: KmTokens.s5);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const AgentRequiredNote(),
        gap,
        KmTextField(
          label: 'Name',
          required: true,
          initialValue: d.name,
          placeholder: 'e.g. Scribe',
          hint: 'Shown on the agent’s tile and in the participant list.',
        ),
        gap,
        KmTextField(label: 'Role', initialValue: d.role, placeholder: 'e.g. Note-taker'),
        gap,
        KmTextField(
          label: 'Description',
          initialValue: d.description,
          placeholder: 'What does it do in a meeting?',
          hint: 'Up to 200 characters. Hosts see this when choosing agents.',
          maxLines: 3,
        ),
        gap,
        KmTextField(
          label: 'Glyph letters',
          required: true,
          mono: true,
          initialValue: d.glyph,
          placeholder: 'SC',
          hint: 'Two letters or digits shown on the tile while the agent has no video.',
        ),
        const SizedBox(height: KmTokens.s6),
        _TilePreview(draft: d),
      ],
    );
  }
}

/// `aside.preview`: how the agent's tile looks before its worker connects.
class _TilePreview extends StatelessWidget {
  const _TilePreview({required this.draft});

  final RegistrationDraft draft;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String glyph = draft.glyph.isNotEmpty
        ? draft.glyph
        : (draft.name.isNotEmpty ? draft.name.substring(0, 1) : '?');
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: const KmEyebrow('Tile preview', muted: true)),
          const SizedBox(height: KmTokens.s3),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s6),
            decoration: BoxDecoration(
              color: p.bg,
              borderRadius: BorderRadius.circular(KmTokens.radiusTile),
            ),
            child: Column(
              children: <Widget>[
                KmAgentGlyph(glyph, size: 84),
                const SizedBox(height: KmTokens.s3),
                Text(
                  draft.name.isEmpty ? 'Agent name' : draft.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
                ),
                const SizedBox(height: KmTokens.s3),
                Text(draft.role.isEmpty ? 'Role' : draft.role, style: KmText.smallSub(context)),
                const SizedBox(height: KmTokens.s3),
                const AgentStateLine(online: false, label: 'Offline until its worker connects'),
              ],
            ),
          ),
          const SizedBox(height: KmTokens.s3),
          Text(
            draft.description.isEmpty
                ? 'A short description helps people decide when to dispatch it.'
                : draft.description,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: KmText.smallSub(context),
          ),
        ],
      ),
    );
  }
}
