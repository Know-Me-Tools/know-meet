// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'settings_screen.dart';

/// Settings routes, inside the app frame: `/settings` (Account),
/// `/settings/<section>` and `/settings/calendar-connect/<provider>`.
List<RouteBase> get settingsRoutes => <RouteBase>[
  GoRoute(
    path: '/settings',
    builder: (BuildContext context, GoRouterState state) =>
        const SettingsScreen(page: 'account'),
    routes: <RouteBase>[
      GoRoute(
        path: '$calendarConnectKey/:provider',
        builder: (BuildContext context, GoRouterState state) => SettingsScreen(
          page: calendarConnectKey,
          provider: state.pathParameters['provider'],
        ),
      ),
      GoRoute(
        path: ':section',
        builder: (BuildContext context, GoRouterState state) =>
            SettingsScreen(page: state.pathParameters['section'] ?? 'account'),
      ),
    ],
  ),
];
