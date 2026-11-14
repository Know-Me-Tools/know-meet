// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../domain/auth_view.dart';
import 'screens/auth_screen.dart';

/// Sign-in flow routes: `/auth/<view>` for the five `auth.*` states; bare
/// `/auth` and unknown views go to sign-in.
List<RouteBase> get authRoutes => <RouteBase>[
  GoRoute(
    path: '/auth',
    redirect: (BuildContext context, GoRouterState state) => '/auth/sign-in',
  ),
  GoRoute(
    path: '/auth/:view',
    redirect: (BuildContext context, GoRouterState state) =>
        AuthView.fromSlug(state.pathParameters['view']) == null
        ? '/auth/sign-in'
        : null,
    builder: (BuildContext context, GoRouterState state) => AuthScreen(
      view: AuthView.fromSlug(state.pathParameters['view']) ?? AuthView.signIn,
    ),
  ),
];
