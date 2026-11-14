// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/session/session.dart';
import '../../../shared/ui/ui.dart';
import '../domain/invite_delivery.dart';
import 'screens/empty_view.dart';
import 'screens/invites_view.dart';
import 'screens/meeting_detail_view.dart';
import 'screens/schedule_view.dart';
import 'screens/upcoming_view.dart';

/// Which dashboard view a route renders.
enum DashboardView { upcoming, schedule, invites, empty, meeting }

/// Entry for every `/dashboard` route: the signed-out gate
/// (`dashboard.gate-signed-out`) or the requested view.
class DashboardRouteScreen extends ConsumerWidget {
  const DashboardRouteScreen({
    super.key,
    required this.view,
    this.meetingId,
    this.query = const <String, String>{},
  });

  final DashboardView view;
  final String? meetingId;

  /// Route query (filters).
  final Map<String, String> query;

  static const Map<DashboardView, String> _gateTitles = <DashboardView, String>{
    DashboardView.upcoming: 'Sign in to see your meetings',
    DashboardView.schedule: 'Sign in to schedule a meeting',
    DashboardView.meeting: 'Sign in to view this meeting',
    DashboardView.invites: 'Sign in to see the invites you sent',
    DashboardView.empty: 'Sign in to set up meetings',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(sessionControllerProvider) == null) {
      return KmSignInGate(
        pageTitle: 'Meetings',
        pageLede: 'Scheduling, calendars and invites belong to your KnowMe account.',
        title: _gateTitles[view]!,
        body: 'Scheduling meetings, connecting Google or Outlook calendars, and sending '
            'email or SMS invites need an account. People you invite never do. Prefer to '
            'skip it? Start a guest meeting — guests get the Concierge and live '
            'transcription that is deleted when the meeting ends.',
      );
    }
    return switch (view) {
      DashboardView.upcoming => UpcomingView(
        filter: UpcomingFilter.values.firstWhere(
          (UpcomingFilter f) => f.name == query['filter'],
          orElse: () => UpcomingFilter.all,
        ),
      ),
      DashboardView.schedule => const ScheduleView(),
      DashboardView.invites => InvitesView(
        channel: InviteChannel.values.where((InviteChannel c) => c.name == query['channel']).firstOrNull,
        status: DeliveryStatus.values.where((DeliveryStatus s) => s.name == query['status']).firstOrNull,
      ),
      DashboardView.empty => const EmptyDashboardView(),
      DashboardView.meeting => MeetingDetailView(meetingId: meetingId ?? ''),
    };
  }
}
