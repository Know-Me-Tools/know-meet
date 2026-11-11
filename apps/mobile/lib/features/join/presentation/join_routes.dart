// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../domain/invitation.dart';
import 'screens/join_screen.dart';

/// Invitee routes: `/join/<view>` for the four `join.*` states; bare
/// `/join` and unknown views go to the invite.
List<RouteBase> get joinRoutes => <RouteBase>[
  GoRoute(
    path: '/join',
    redirect: (BuildContext context, GoRouterState state) => '/join/invite',
  ),
  GoRoute(
    path: '/join/:view',
    redirect: (BuildContext context, GoRouterState state) =>
        JoinView.fromSlug(state.pathParameters['view']) == null
        ? '/join/invite'
        : null,
    builder: (BuildContext context, GoRouterState state) => JoinScreen(
      view: JoinView.fromSlug(state.pathParameters['view']) ?? JoinView.invite,
    ),
  ),
];
