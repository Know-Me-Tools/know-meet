// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/ui/ui.dart';
import '../../application/meetings_repository.dart';
import '../../domain/meeting.dart';
import '../dashboard_format.dart';
import '../providers/dashboard_providers.dart';
import '../widgets/dash_bits.dart';
import 'meeting_detail_cards.dart';

/// `dashboard.meeting.<id>`: one meeting's details at phone width (the
/// prototype's two-column grid stacks below 900px).
class MeetingDetailView extends ConsumerWidget {
  const MeetingDetailView({super.key, required this.meetingId});

  final String meetingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Meeting? m = ref.watch(dashboardMeetingProvider(meetingId));
    if (m == null) return _NotFound(id: meetingId);
    final DateTime now = ref.watch(dashboardNowProvider);
    final MeetingsRepository repo = ref.watch(meetingsRepositoryProvider);
    final MeetingStatus st = m.statusAt(now);
    final bool canChange = st == MeetingStatus.upcoming;
    final TextStyle meta = KmText.smallSub(context);
    return KmPage(
      children: <Widget>[
        KmPageHead(
          title: m.title,
          crumbs: <KmCrumb>[
            KmCrumb('Meetings', onTap: () => context.go('/dashboard/upcoming')),
            KmCrumb(m.title),
          ],
        ),
        Wrap(
          spacing: KmTokens.s3,
          runSpacing: KmTokens.s2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            MeetingStatusChip(st),
            Text(DashFormat.day(m.start), style: meta),
            Text('${DashFormat.time(m.start)} – ${DashFormat.time(m.end)}', style: meta),
            Text('UTC', style: meta),
            SourceChip(m.source),
            Text('Host: ${m.isHostedBy(repo.ownerName) ? 'You' : m.host}', style: meta),
          ],
        ),
        if (m.description.isNotEmpty) ...<Widget>[
          const SizedBox(height: KmTokens.s3),
          Text(m.description, style: KmText.sub(context)),
        ],
        const SizedBox(height: KmTokens.s3),
        Wrap(
          spacing: KmTokens.s2,
          runSpacing: KmTokens.s2,
          children: <Widget>[
            if (st != MeetingStatus.ended)
              KmButton(
                label: 'Join',
                icon: LucideIcons.video,
                variant: KmButtonVariant.primary,
                onPressed: () => context.go('/meet/room'),
              ),
            CopyLinkButton(meeting: m, small: false),
            if (canChange) ...<Widget>[
              KmButton(
                label: 'Edit',
                icon: LucideIcons.pencil,
                onPressed: () => context.go('/dashboard/schedule'),
              ),
              KmButton(
                label: 'Cancel meeting',
                icon: LucideIcons.trash2,
                variant: KmButtonVariant.ghost,
                onPressed: () => ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                  const SnackBar(content: Text('Cancelling is not available in this preview.')),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: KmTokens.s5),
        _JoinInfoCard(meeting: m, dialIns: repo.dialInNumbers()),
        const SizedBox(height: KmTokens.s4),
        RecordingCard(meeting: m, editable: st != MeetingStatus.ended),
        const SizedBox(height: KmTokens.s4),
        InviteesCard(meeting: m),
        const SizedBox(height: KmTokens.s4),
        AgentsCard(meeting: m, repository: repo, editable: canChange),
        const SizedBox(height: KmTokens.s4),
        PreReadsCard(meeting: m, editable: st != MeetingStatus.ended),
      ],
    );
  }
}

class _JoinInfoCard extends StatelessWidget {
  const _JoinInfoCard({required this.meeting, required this.dialIns});

  final Meeting meeting;
  final List<DialInNumber> dialIns;

  @override
  Widget build(BuildContext context) {
    final Meeting m = meeting;
    final List<(String, String, String)> rows = <(String, String, String)>[
      ('Join link', DashFormat.joinLink(m.joinCode), 'join link'),
      ('Join code', m.joinCode, 'join code'),
      if (m.dialIn != null) ...<(String, String, String)>[
        for (final DialInNumber n in dialIns)
          ('Dial-in (${n.region})', n.number, '${n.region} dial-in number'),
        ('PIN', m.dialIn!.pin, 'PIN'),
      ],
    ];
    return KmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const DashCardHead(title: 'Join info'),
          const SizedBox(height: KmTokens.s3),
          for (final (String k, String v, String what) in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: KmTokens.s2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(k, style: KmText.smallSub(context)),
                  Row(
                    children: <Widget>[
                      Flexible(child: Text(v, style: KmText.mono(context))),
                      KmIconButton(
                        icon: LucideIcons.copy,
                        label: 'Copy $what',
                        onPressed: () => copyWithToast(context, what == 'PIN' ? v.replaceAll(' ', '') : v),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          if (m.dialIn == null)
            Text('Off for this meeting. Turn it on from Edit.', style: KmText.small(context))
          else
            Text(
              'Phone callers dial in to the room and enter the PIN. KnowMe never places outbound calls.',
              style: KmText.xsmall(context).copyWith(color: context.km.fgSub),
            ),
        ],
      ),
    );
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound({required this.id});

  final String id;

  @override
  Widget build(BuildContext context) => KmPage(
    children: <Widget>[
      KmEmptyState(
        icon: LucideIcons.calendar,
        title: 'Meeting not found',
        body: 'There is no meeting “$id”. It may have been cancelled or the link is wrong.',
        actions: <Widget>[
          KmButton(
            label: 'Back to meetings',
            size: KmButtonSize.small,
            onPressed: () => context.go('/dashboard/upcoming'),
          ),
        ],
      ),
    ],
  );
}
