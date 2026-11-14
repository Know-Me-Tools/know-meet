// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/meeting.dart';
import '../dashboard_format.dart';
import '../providers/schedule_draft.dart';
import '../widgets/dash_bits.dart';

/// `select.input` with a visible label (the label is its accessible name).
class DashSelect extends StatefulWidget {
  const DashSelect({super.key, required this.label, required this.options, required this.initial});

  final String label;
  final List<String> options;
  final String initial;

  @override
  State<DashSelect> createState() => _DashSelectState();
}

class _DashSelectState extends State<DashSelect> {
  late String _value = widget.initial;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        KmFieldLabel(widget.label),
        const SizedBox(height: 6),
        KmSelect<String>(
          label: widget.label,
          value: _value,
          options: <(String, String)>[for (final String o in widget.options) (o, o)],
          onChanged: (String v) => setState(() => _value = v),
        ),
      ],
    );
  }
}

/// "Meeting options": recording, transcription, summary, dial-in, waiting room.
class OptionsPanel extends StatelessWidget {
  const OptionsPanel({
    super.key,
    required this.draft,
    required this.controller,
    required this.dialIns,
  });

  final ScheduleDraft draft;
  final ScheduleDraftController controller;
  final List<DialInNumber> dialIns;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Meeting options', style: KmText.h3(context))),
          const SizedBox(height: KmTokens.s2),
          KmSwitchRow(
            title: 'Record automatically',
            description: 'Room Composite recording of all participants, saved to your storage and '
                'pinned to IPFS. Everyone sees a recording notice.',
            value: draft.record,
            onChanged: controller.setRecord,
          ),
          const DashRowRule(),
          KmSwitchRow(
            title: 'Live transcription',
            description: 'Transcript feeds the meeting’s knowledge base for every agent in the room.',
            value: draft.transcribe,
            onChanged: controller.setTranscribe,
          ),
          const DashRowRule(),
          KmSwitchRow(
            title: 'Send transcript & summary after the meeting',
            description: 'Emailed to participants, with an SMS link for phone invitees.',
            value: draft.sendSummary,
            onChanged: controller.setSendSummary,
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: DashLink('Delivery settings', onTap: () => context.go('/settings/delivery')),
          ),
          const DashRowRule(),
          KmSwitchRow(
            title: 'Allow phone dial-in',
            description: 'Callers dial in to the room — inbound only.',
            value: draft.dialIn,
            onChanged: controller.setDialIn,
          ),
          if (draft.dialIn && dialIns.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(bottom: KmTokens.s3),
              padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3, vertical: KmTokens.s2),
              decoration: BoxDecoration(
                color: p.card,
                borderRadius: BorderRadius.circular(KmTokens.radius),
              ),
              child: Wrap(
                spacing: KmTokens.s4,
                runSpacing: KmTokens.s2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Icon(LucideIcons.phoneIncoming, size: 16, color: p.fg),
                      const SizedBox(width: 6),
                      Text('${dialIns.first.number} (${dialIns.first.region})', style: KmText.mono(context)),
                    ],
                  ),
                  for (final DialInNumber n in dialIns.skip(1))
                    Text('${n.number} (${n.region})', style: KmText.mono(context)),
                  Text('PIN 482 913 07', style: KmText.mono(context)),
                ],
              ),
            ),
          const DashRowRule(),
          KmSwitchRow(
            title: 'Waiting room',
            description: 'You admit each person before they enter.',
            value: draft.waitingRoom,
            onChanged: controller.setWaitingRoom,
          ),
        ],
      ),
    );
  }
}

/// "Agents to bring": registered agents and the user's dot.
class AgentsPanel extends StatelessWidget {
  const AgentsPanel({
    super.key,
    required this.draft,
    required this.controller,
    required this.agents,
  });

  final ScheduleDraft draft;
  final ScheduleDraftController controller;
  final List<AgentSummary> agents;

  @override
  Widget build(BuildContext context) {
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Agents to bring', style: KmText.h3(context))),
          const SizedBox(height: KmTokens.s2),
          Text(
            'Concierge is always in the room. Pick the registered agents and dots to dispatch at start.',
            style: KmText.smallSub(context),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: DashLink('Manage agents', onTap: () => context.go('/agents/registry')),
          ),
          const SizedBox(height: KmTokens.s2),
          for (final AgentSummary a in agents) ...<Widget>[
            _Pick(
              label: a.name,
              lines: <String>[a.role, a.online ? 'Online' : 'Offline — joins if online at start'],
              leading: KmAgentGlyph(a.mono, size: 40),
              value: draft.agentIds.contains(a.id),
              onChanged: (bool v) => controller.toggleAgent(a.id, v),
            ),
            const SizedBox(height: KmTokens.s2),
          ],
          _Pick(
            label: 'Iris',
            lines: const <String>['Your dot · private memory'],
            leading: const KmOrb(size: 28),
            value: draft.bringIris,
            onChanged: controller.setBringIris,
          ),
        ],
      ),
    );
  }
}

/// `.pick`: checkbox + glyph + name/meta, one named control.
class _Pick extends StatelessWidget {
  const _Pick({
    required this.label,
    required this.lines,
    required this.leading,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final List<String> lines;
  final Widget leading;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    return Semantics(
      checked: value,
      label: '$label, ${lines.join(', ')}',
      excludeSemantics: true,
      onTap: () => onChanged(!value),
      child: KmInteractive(
        onTap: () => onChanged(!value),
        builder: (BuildContext context, Set<WidgetState> s) {
          // Text identifies the row (card fill); focus fills the whole row.
          final KmStateColors c = KmStateColors.resolve(
            p,
            s,
            rest: p.card,
            restOn: p.fg,
            hover: p.cardHov,
          );
          final bool focused = s.contains(WidgetState.focused);
          return KmFillBox(
            colors: c,
            constraints: const BoxConstraints(minHeight: 56),
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s3, vertical: KmTokens.s2),
            child: Row(
              children: <Widget>[
                KmIndicator(
                  kind: KmIndicatorKind.checkbox,
                  checked: value,
                  states: s.difference(<WidgetState>{WidgetState.focused, WidgetState.hovered}),
                ),
                const SizedBox(width: KmTokens.s3),
                leading,
                const SizedBox(width: KmTokens.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(label, style: KmText.label(context).copyWith(color: c.on)),
                      for (final String l in lines)
                        Text(
                          l,
                          style: KmText.xsmall(context).copyWith(color: focused ? c.on : p.fgSub),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// "Knowledge": pre-read attachments.
class KnowledgePanel extends StatelessWidget {
  const KnowledgePanel({super.key});

  @override
  Widget build(BuildContext context) {
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(header: true, child: Text('Knowledge', style: KmText.h3(context))),
          const SizedBox(height: KmTokens.s3),
          // D-6: the ringed attach box is a drop zone on the `control` fill.
          KmDropZone(
            label: 'Attach pre-reads',
            hint: 'Added to this meeting’s knowledge base so agents can cite them. Up to 50 MB each.',
            onBrowse: () {},
          ),
          const SizedBox(height: KmTokens.s3),
          Text('No pre-reads attached.', style: KmText.smallSub(context)),
        ],
      ),
    );
  }
}

/// "Invite preview": the email and SMS recipients will get.
class InvitePreviewPanel extends StatelessWidget {
  const InvitePreviewPanel({
    super.key,
    required this.draft,
    required this.start,
    required this.dialIns,
  });

  final ScheduleDraft draft;
  final DateTime start;
  final List<DialInNumber> dialIns;

  static const String _host = 'Avery Chen';

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final String title = draft.title.isEmpty ? 'Untitled meeting' : draft.title;
    final DateTime end = start.add(const Duration(minutes: 30));
    final String link = DashFormat.joinLink('km-a8t-629');
    const String pin = '482 913 07';
    final List<String> agentNames = <String>[
      'Concierge',
      if (draft.agentIds.contains('scribe')) 'Scribe',
      if (draft.agentIds.contains('researcher')) 'Researcher',
      if (draft.agentIds.contains('facilitator')) 'Facilitator',
      if (draft.agentIds.contains('translator')) 'Translator',
      if (draft.bringIris) 'Iris (Avery’s dot)',
    ];
    final String sms = '$_host invited you to "$title" ${DashFormat.date(start)}.\n'
        'Join: $link\n'
        '${draft.dialIn && dialIns.isNotEmpty ? 'Dial in: ${dialIns.first.number} PIN $pin\n' : ''}'
        '${draft.record ? 'This meeting is recorded.\n' : ''}'
        'Reply STOP to opt out.';
    final TextStyle sub = KmText.small(context).copyWith(color: p.fgSub);
    final TextStyle small = KmText.small(context);
    return KmCard(
      panel: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(title: 'Invite preview', sub: 'What recipients will see. Updates as you type.'),
          const SizedBox(height: KmTokens.s4),
          const KmEyebrow('Email', muted: true),
          const SizedBox(height: KmTokens.s2),
          Container(
            padding: const EdgeInsets.all(KmTokens.s4),
            decoration: BoxDecoration(color: p.card, borderRadius: BorderRadius.circular(KmTokens.radius)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('From: $_host via Know Meet', style: KmText.xsmall(context).copyWith(color: p.fgSub)),
                Text('To: email invitees', style: KmText.xsmall(context).copyWith(color: p.fgSub)),
                const SizedBox(height: 2),
                Text(
                  'Invitation: $title · ${DashFormat.day(start)}',
                  style: KmText.displayAt(context, size: KmTokens.textBase),
                ),
                const SizedBox(height: KmTokens.s3),
                const DashRowRule(),
                const SizedBox(height: KmTokens.s3),
                Text('$_host invited you to a Know Meet video meeting.', style: small),
                const SizedBox(height: KmTokens.s3),
                ExcludeSemantics(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: p.emberBtn,
                      borderRadius: BorderRadius.circular(KmTokens.radius10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Icon(LucideIcons.video, size: 16, color: p.onEmber),
                        const SizedBox(width: 6),
                        Text('Join in browser', style: small.copyWith(color: p.onEmber, fontWeight: KmTokens.fontWeightSemibold)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: KmTokens.s3),
                for (final (String k, String v) in <(String, String)>[
                  ('When', '${DashFormat.date(start)} – ${DashFormat.time(end)} (UTC)'),
                  ('Link', link),
                  if (draft.dialIn && dialIns.isNotEmpty) ('Dial in', '${dialIns.first.number}, PIN $pin'),
                  ('Agents', agentNames.join(', ')),
                ])
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        SizedBox(width: 64, child: Text(k, style: sub)),
                        Expanded(child: Text(v, style: small)),
                      ],
                    ),
                  ),
                const SizedBox(height: KmTokens.s2),
                Text(
                  '${draft.record ? 'This meeting will be recorded. ' : ''}'
                  '${draft.transcribe ? 'Live transcription is on. ' : ''}'
                  '${draft.sendSummary ? 'The transcript and summary are sent to participants afterwards. ' : ''}'
                  'No KnowMe account needed to join.',
                  style: small,
                ),
              ],
            ),
          ),
          const SizedBox(height: KmTokens.s4),
          const KmEyebrow('SMS via Telnyx', muted: true),
          const SizedBox(height: KmTokens.s2),
          Container(
            padding: const EdgeInsets.all(KmTokens.s4),
            decoration: BoxDecoration(color: p.card, borderRadius: BorderRadius.circular(KmTokens.radius)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: p.muted,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(KmTokens.radius18),
                      topRight: Radius.circular(KmTokens.radius18),
                      bottomRight: Radius.circular(KmTokens.radius18),
                      bottomLeft: Radius.circular(KmTokens.radius4),
                    ),
                  ),
                  child: Text(sms, style: small),
                ),
                const SizedBox(height: KmTokens.s2),
                Text(
                  '${sms.length} characters · ${(sms.length / 153).ceil()} SMS segments · '
                  'from +1 (415) 555-0123 · no phone invitees yet',
                  style: KmText.xsmall(context).copyWith(color: p.fgSub),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
