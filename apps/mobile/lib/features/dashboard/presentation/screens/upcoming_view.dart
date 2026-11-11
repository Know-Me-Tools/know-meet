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
import '../widgets/meeting_cards.dart';
import '../widgets/side_cards.dart';

/// Upcoming-list filter (prototype `FILTERS`), carried in the route query
/// (`/dashboard/upcoming?filter=hosting`) like the prototype's hash.
enum UpcomingFilter { all, hosting, invited }

/// `dashboard.upcoming`: live banner, filtered day groups, calendars and
/// invite-delivery cards.
class UpcomingView extends ConsumerWidget {
  const UpcomingView({super.key, required this.filter});

  final UpcomingFilter filter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final DateTime now = ref.watch(dashboardNowProvider);
    final MeetingsRepository repo = ref.watch(meetingsRepositoryProvider);
    final List<Meeting> active = ref
        .watch(dashboardMeetingsProvider)
        .where((Meeting m) => m.statusAt(now) != MeetingStatus.ended)
        .toList();
    final Meeting? live =
        active.where((Meeting m) => m.statusAt(now) == MeetingStatus.live).firstOrNull;
    final List<Meeting> rows = active.where((Meeting m) {
      if (m == live) return false;
      return switch (filter) {
        UpcomingFilter.all => true,
        UpcomingFilter.hosting => m.isHostedBy(repo.ownerName),
        UpcomingFilter.invited => !m.isHostedBy(repo.ownerName),
      };
    }).toList();
    return KmPage(
      children: <Widget>[
        KmPageHead(
          title: 'Meetings',
          lede: 'Everything on your connected calendars, plus meetings scheduled in KnowMe.',
          actions: <Widget>[
            KmButton(
              label: 'Start now',
              icon: LucideIcons.video,
              onPressed: () => context.go('/meet/room'),
            ),
            KmButton(
              label: 'Schedule meeting',
              icon: LucideIcons.plus,
              variant: KmButtonVariant.primary,
              onPressed: () => context.go('/dashboard/schedule'),
            ),
          ],
        ),
        const DashTabs(active: 'upcoming'),
        if (live != null) LiveBanner(meeting: live, now: now),
        Align(
          alignment: Alignment.centerLeft,
          child: KmSegmented<UpcomingFilter>(
            label: 'Filter meetings',
            options: const <KmOption<UpcomingFilter>>[
              KmOption<UpcomingFilter>(UpcomingFilter.all, 'All'),
              KmOption<UpcomingFilter>(UpcomingFilter.hosting, 'Hosting'),
              KmOption<UpcomingFilter>(UpcomingFilter.invited, 'Invited'),
            ],
            selected: filter,
            onChanged: (UpcomingFilter f) => context.go(
              f == UpcomingFilter.all ? '/dashboard/upcoming' : '/dashboard/upcoming?filter=${f.name}',
            ),
          ),
        ),
        const SizedBox(height: KmTokens.s3),
        Text('Times shown in UTC', style: KmText.smallSub(context)),
        const SizedBox(height: KmTokens.s4),
        Semantics(
          liveRegion: true,
          child: _MeetingList(rows: rows, now: now, repo: repo, filter: filter),
        ),
        const SizedBox(height: KmTokens.s5),
        CalendarsCard(calendars: repo.calendars(), lastSynced: repo.lastSynced(now)),
        const SizedBox(height: KmTokens.s4),
        DeliveryCard(deliveries: ref.watch(inviteDeliveriesProvider)),
      ],
    );
  }
}

class _MeetingList extends StatelessWidget {
  const _MeetingList({
    required this.rows,
    required this.now,
    required this.repo,
    required this.filter,
  });

  final List<Meeting> rows;
  final DateTime now;
  final MeetingsRepository repo;
  final UpcomingFilter filter;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      final bool all = filter == UpcomingFilter.all;
      return KmEmptyState(
        icon: LucideIcons.calendar,
        title: all
            ? 'Nothing else on the calendar'
            : (filter == UpcomingFilter.hosting
                  ? 'No upcoming meetings you’re hosting'
                  : 'No upcoming meetings you’re invited to'),
        body: all
            ? 'Schedule a meeting and invite people by email or phone number.'
            : 'Try a different filter, or schedule a new meeting.',
        actions: <Widget>[
          KmButton(
            label: 'Schedule meeting',
            icon: LucideIcons.plus,
            variant: KmButtonVariant.primary,
            size: KmButtonSize.small,
            onPressed: () => context.go('/dashboard/schedule'),
          ),
          if (!all)
            KmButton(
              label: 'Show all',
              size: KmButtonSize.small,
              onPressed: () => context.go('/dashboard/upcoming'),
            ),
        ],
      );
    }
    final List<(String, List<Meeting>)> groups = <(String, List<Meeting>)>[];
    for (final Meeting m in rows) {
      final String label = DashFormat.relDay(m.start, now);
      if (groups.isEmpty || groups.last.$1 != label) {
        groups.add((label, <Meeting>[m]));
      } else {
        groups.last.$2.add(m);
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (int g = 0; g < groups.length; g++) ...<Widget>[
          if (g > 0) const SizedBox(height: KmTokens.s5),
          _DayLabel(label: groups[g].$1, first: groups[g].$2.first.start),
          const SizedBox(height: KmTokens.s2),
          for (int i = 0; i < groups[g].$2.length; i++) ...<Widget>[
            if (i > 0) const SizedBox(height: KmTokens.s2),
            MeetingCard(meeting: groups[g].$2[i], repository: repo),
          ],
        ],
      ],
    );
  }
}

/// `.day-label`: mono uppercase day heading, with the date after
/// Today/Tomorrow (`.count-sub`).
class _DayLabel extends StatelessWidget {
  const _DayLabel({required this.label, required this.first});

  final String label;
  final DateTime first;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final TextStyle mono = TextStyle(
      fontFamily: KmTokens.fontMono,
      fontSize: KmTokens.textXs,
      fontWeight: KmTokens.fontWeightSemibold,
      letterSpacing: KmTokens.trackingTableEm * KmTokens.textXs,
      color: p.fgSub,
    );
    final bool rel = label == 'Today' || label == 'Tomorrow';
    return Semantics(
      header: true,
      child: Text.rich(
        TextSpan(
          text: label.toUpperCase(),
          style: mono,
          children: <InlineSpan>[
            if (rel)
              TextSpan(
                text: '  ${DashFormat.day(first).toUpperCase()}',
                style: mono.copyWith(fontSize: KmTokens.textSm),
              ),
          ],
        ),
      ),
    );
  }
}
