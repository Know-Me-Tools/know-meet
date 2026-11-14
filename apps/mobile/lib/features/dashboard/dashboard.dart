// TJ-ARCH-MOB-001 compliant
// Public surface of the dashboard (Meetings) feature: its routes. They
// render inside the app frame's ShellRoute.
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'presentation/dashboard_route_screen.dart';

/// `/dashboard` → upcoming; `/dashboard/:view` (upcoming | schedule |
/// invites | empty); `/dashboard/meeting/:id`.
List<RouteBase> get dashboardRoutes => <RouteBase>[
  GoRoute(
    path: '/dashboard',
    redirect: (BuildContext context, GoRouterState state) =>
        state.uri.path == '/dashboard' ? '/dashboard/upcoming' : null,
    routes: <RouteBase>[
      GoRoute(
        path: 'meeting/:id',
        builder: (BuildContext context, GoRouterState state) => DashboardRouteScreen(
          view: DashboardView.meeting,
          meetingId: state.pathParameters['id'],
        ),
      ),
      GoRoute(
        path: ':view',
        builder: (BuildContext context, GoRouterState state) => DashboardRouteScreen(
          view: DashboardView.values
              .where(
                (DashboardView v) =>
                    v != DashboardView.meeting && v.name == state.pathParameters['view'],
              )
              .firstOrNull ??
              DashboardView.upcoming,
          query: state.uri.queryParameters,
        ),
      ),
    ],
  ),
];
