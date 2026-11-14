// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'screens/home_screen.dart';

/// Home routes; mounted inside the app-frame ShellRoute by the app router.
List<RouteBase> get homeRoutes => <RouteBase>[
  GoRoute(
    path: '/',
    builder: (BuildContext context, GoRouterState state) => const HomeScreen(),
  ),
];
