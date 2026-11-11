// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/meetings_repository.dart';
import '../../domain/invite_delivery.dart';
import '../../domain/meeting.dart';
import '../dashboard_format.dart';
import '../providers/dashboard_providers.dart';
import '../widgets/dash_bits.dart';

/// "Recording & transcript" with per-meeting toggles.
class RecordingCard extends ConsumerWidget {
  const RecordingCard({super.key, required this.meeting, required this.editable});

  final Meeting meeting;
  final bool editable;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final MeetingOptions o = ref.watch(meetingOptionsControllerProvider(meeting.id));
    final MeetingOptionsController ctl =
        ref.read(meetingOptionsControllerProvider(meeting.id).notifier);
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(
            title: 'Recording & transcript',
            sub: 'Saved to KnowMe-managed S3 storage, then pinned to IPFS.',
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: DashLink('Defaults', onTap: () => context.go('/settings/recording')),
          ),
          KmSwitchRow(
            title: 'Record automatically',
            description: 'Room Composite (all participants, one layout) · MP4',
            value: o.record,
            onChanged: editable ? ctl.setRecord : null,
          ),
          const DashRowRule(),
          KmSwitchRow(
            title: 'Live transcription',
            description: 'Feeds the meeting’s knowledge base',
            value: o.transcribe,
            onChanged: editable ? ctl.setTranscribe : null,
          ),
          const DashRowRule(),
          KmSwitchRow(
            title: 'Send transcript & summary',
            description: 'Email + SMS link after the meeting',
            value: o.sendSummary,
            onChanged: editable ? ctl.setSendSummary : null,
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: DashLink('Delivery settings', onTap: () => context.go('/settings/delivery')),
          ),
          if (!editable)
            Text(
              'These settings can’t be changed for a meeting that has ended or was cancelled.',
              style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
            ),
        ],
      ),
    );
  }
}

/// "Invitees": per-person channels and delivery status. The prototype's
/// four-column table overflows 375px; rows stack at phone width.
class InviteesCard extends ConsumerWidget {
  const InviteesCard({super.key, required this.meeting});

  final Meeting meeting;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<InviteDelivery> ds = ref
        .watch(inviteDeliveriesProvider)
        .where((InviteDelivery d) => d.meetingId == meeting.id)
        .toList();
    final List<String> names = <String>[];
    for (final InviteDelivery d in ds) {
      if (!names.contains(d.name)) names.add(d.name);
    }
    for (final String n in meeting.invitees) {
      if (!names.contains(n)) names.add(n);
    }
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(
            title: 'Invitees',
            sub: 'Email, SMS (via Telnyx) and calendar delivery. Invitees never need an account.',
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: DashLink('All invites', onTap: () => context.go('/dashboard/invites')),
          ),
          const SizedBox(height: KmTokens.s2),
          if (names.isEmpty)
            const KmEmptyState(icon: LucideIcons.users, title: 'No invitees', body: 'Add people from Edit.')
          else
            for (int i = 0; i < names.length; i++) ...<Widget>[
              if (i > 0) const DashRowRule(),
              _InviteeRow(
                name: names[i],
                mine: ds.where((InviteDelivery d) => d.name == names[i]).toList(),
              ),
            ],
        ],
      ),
    );
  }
}

class _InviteeRow extends StatelessWidget {
  const _InviteeRow({required this.name, required this.mine});

  final String name;
  final List<InviteDelivery> mine;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final List<String> contacts = <String>[];
    for (final InviteDelivery d in mine) {
      if (d.to.isNotEmpty && !contacts.contains(d.to)) contacts.add(d.to);
    }
    final InviteDelivery? failed = mine.where((InviteDelivery d) => d.isFailed).firstOrNull;
    void toast(String m) =>
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(m)));
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: KmTokens.s3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(name, style: KmText.label(context)),
          for (final String c in contacts)
            Text(c, style: KmText.xsmall(context).copyWith(color: p.fgSub)),
          const SizedBox(height: KmTokens.s3),
          if (mine.isEmpty)
            Text('No invite sent', style: KmText.smallSub(context))
          else
            for (final InviteDelivery d in mine)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: <Widget>[ChannelChip(d.channel), DeliveryStatusChip(d.status)],
                    ),
                    if (d.isFailed && d.reason != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '${d.reason}. Send an email invite instead.',
                          style: KmText.xsmall(context).copyWith(color: p.fgSub),
                        ),
                      ),
                  ],
                ),
              ),
          if (mine.isNotEmpty) ...<Widget>[
            const SizedBox(height: KmTokens.s2),
            Wrap(
              spacing: KmTokens.s2,
              runSpacing: KmTokens.s2,
              children: <Widget>[
                if (failed != null && failed.landline)
                  KmButton(
                    label: 'Send email instead',
                    icon: LucideIcons.mail,
                    variant: KmButtonVariant.primary,
                    size: KmButtonSize.small,
                    onPressed: () => toast('Email invite sent to $name'),
                  ),
                KmButton(
                  label: 'Resend',
                  icon: LucideIcons.refreshCw,
                  size: KmButtonSize.small,
                  onPressed: () => toast(
                    failed != null
                        ? 'Email/calendar resent. SMS still undeliverable — send email instead.'
                        : 'Invite resent to $name',
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// "Agents & dots scheduled".
class AgentsCard extends StatelessWidget {
  const AgentsCard({
    super.key,
    required this.meeting,
    required this.repository,
    required this.editable,
  });

  final Meeting meeting;
  final MeetingsRepository repository;
  final bool editable;

  @override
  Widget build(BuildContext context) {
    final AgentSummary? concierge = repository.agent('concierge');
    final List<Widget> lines = <Widget>[
      _AgentLine(
        leading: KmAgentGlyph(concierge?.mono ?? 'CG', size: 40, system: true),
        title: Text('Concierge', style: KmText.label(context)),
        sub: 'System agent · always present, and the only agent guests get',
        trailing: const KmChip('Always', tone: KmChipTone.ember),
      ),
      for (final String id in meeting.agentIds.where((String a) => a != 'concierge'))
        if (repository.agent(id) != null)
          _AgentLine(
            leading: KmAgentGlyph(repository.agent(id)!.mono, size: 40),
            title: DashLink(repository.agent(id)!.name, onTap: () => context.go('/agents/detail/$id')),
            sub: '${repository.agent(id)!.role} · ${repository.agent(id)!.worker}',
            trailing: _StateLine(online: repository.agent(id)!.online),
          ),
      for (final String id in meeting.dotIds)
        if (repository.dot(id) != null)
          _AgentLine(
            leading: KmOrb(size: 28, cyan: repository.dot(id)!.cyan),
            title: id == 'iris'
                ? DashLink(repository.dot(id)!.name, onTap: () => context.go('/agents/dot/iris'))
                : Text(repository.dot(id)!.name, style: KmText.label(context)),
            sub: '${repository.dot(id)!.ownerLabel} · private memory',
            trailing: const KmChip('Dot'),
          ),
    ];
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          DashCardHead(
            title: 'Agents & dots scheduled',
            sub: 'Dispatched into the room when the meeting starts.',
            trailing: editable
                ? DashLink('Change', onTap: () => context.go('/dashboard/schedule'))
                : null,
          ),
          const SizedBox(height: KmTokens.s2),
          for (int i = 0; i < lines.length; i++) ...<Widget>[
            // D-6: rows separate by spacing, not a rule.
            if (i > 0) const SizedBox(height: KmTokens.s1),
            lines[i],
          ],
        ],
      ),
    );
  }
}

class _AgentLine extends StatelessWidget {
  const _AgentLine({
    required this.leading,
    required this.title,
    required this.sub,
    required this.trailing,
  });

  final Widget leading;
  final Widget title;
  final String sub;
  final Widget trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: KmTokens.s2),
    child: Row(
      children: <Widget>[
        SizedBox(width: 40, child: Center(child: leading)),
        const SizedBox(width: KmTokens.s3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              title,
              Text(sub, style: KmText.xsmall(context).copyWith(color: context.km.fgSub)),
            ],
          ),
        ),
        const SizedBox(width: KmTokens.s3),
        trailing,
      ],
    ),
  );
}

/// `.state-line`: shape + colour + text, never colour alone.
class _StateLine extends StatelessWidget {
  const _StateLine({required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        // Round pip = live; filled square = offline (D-6: no ring glyph).
        if (online) const KmPip(KmPipTone.green) else const KmPausedGlyph(),
        const SizedBox(width: KmTokens.s2),
        Text(
          online ? 'Online' : 'Offline',
          style: KmText.xsmall(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
        ),
      ],
    );
  }
}

/// "Pre-reads in knowledge".
class PreReadsCard extends StatelessWidget {
  const PreReadsCard({super.key, required this.meeting, required this.editable});

  final Meeting meeting;
  final bool editable;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    void toast(String m) =>
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(m)));
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(
            title: 'Pre-reads in knowledge',
            sub: 'Every agent in the room, including Concierge, can search these.',
          ),
          if (editable) ...<Widget>[
            const SizedBox(height: KmTokens.s3),
            Align(
              alignment: Alignment.centerLeft,
              child: KmButton(
                label: 'Add',
                icon: LucideIcons.upload,
                size: KmButtonSize.small,
                onPressed: () => toast('Choose files to add to meeting knowledge'),
              ),
            ),
          ],
          const SizedBox(height: KmTokens.s3),
          if (meeting.preReads.isEmpty)
            Text(
              'No pre-reads yet. Attach documents so agents can cite them during the meeting.',
              style: KmText.smallSub(context),
            )
          else
            for (final PreRead f in meeting.preReads)
              Container(
                margin: const EdgeInsets.only(bottom: KmTokens.s2),
                padding: const EdgeInsets.only(left: KmTokens.s3, top: 4, bottom: 4, right: 4),
                decoration: BoxDecoration(
                  color: p.card,
                  borderRadius: BorderRadius.circular(KmTokens.radius),
                ),
                child: Row(
                  children: <Widget>[
                    Icon(LucideIcons.bookOpen, size: 16, color: p.fg),
                    const SizedBox(width: KmTokens.s3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(f.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: KmText.small(context)),
                          Text(
                            '${DashFormat.bytes(f.sizeBytes)} · in meeting knowledge',
                            style: KmText.xsmall(context).copyWith(color: p.fgSub),
                          ),
                        ],
                      ),
                    ),
                    if (editable)
                      KmIconButton(
                        icon: LucideIcons.trash2,
                        label: 'Remove ${f.name}',
                        onPressed: () => toast('Pre-read removed'),
                      ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
