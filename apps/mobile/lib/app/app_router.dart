// TJ-ARCH-MOB-001 compliant
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../features/agents/agents.dart';
import '../features/auth/auth.dart';
import '../features/dashboard/dashboard.dart';
import '../features/home/home.dart';
import '../features/join/join.dart';
import '../features/meeting_room/meeting_room.dart';
import '../features/notes/presentation/screens/notes_screen.dart';
import '../features/recordings/recordings.dart';
import '../features/settings/settings.dart';
import 'frame/km_app_frame.dart';

part 'app_router.g.dart';

/// Developer route for the generator's native-bridge notes screen. The
/// baseline restart certification (baseline-mobile.md) relaunches with
/// `/verify-restart`, which now lands here instead of on Home.
const String kmNotesLocation = '/dev/notes';

/// Where the router starts. Production: Home, unless
/// `--dart-define=KM_INITIAL_LOCATION=<path>` says otherwise (the notes
/// integration test needs `/dev/notes`). The golden suite overrides it with
/// the location of the state under test.
@Riverpod(keepAlive: true)
String kmInitialLocation(Ref ref) {
  const String fromDefine = String.fromEnvironment('KM_INITIAL_LOCATION');
  return fromDefine.isEmpty ? '/' : fromDefine;
}

/// The frame popover open at start. Always closed in production; the golden
/// suite opens it for `frame.account-menu-open`.
@Riverpod(keepAlive: true)
KmFrameOverlay kmInitialFrameOverlay(Ref ref) => KmFrameOverlay.none;

/// Route tree. Home and the four app pages share the app frame (ShellRoute);
/// sign-in, join and the meeting room are full-screen with their own
/// headers, as in the prototype.
@Riverpod(keepAlive: true)
GoRouter appRouter(Ref ref) {
  final KmFrameOverlay overlay = ref.read(kmInitialFrameOverlayProvider);
  final GoRouter router = GoRouter(
    initialLocation: ref.read(kmInitialLocationProvider),
    routes: <RouteBase>[
      ShellRoute(
        builder: (BuildContext context, GoRouterState state, Widget child) =>
            KmAppFrame(
              location: state.uri.path,
              initialOverlay: overlay,
              child: child,
            ),
        routes: <RouteBase>[
          ...homeRoutes,
          ...dashboardRoutes,
          ...recordingsRoutes,
          ...agentsRoutes,
          ...settingsRoutes,
        ],
      ),
      ...authRoutes,
      ...joinRoutes,
      ...meetingRoomRoutes,
      GoRoute(
        path: kmNotesLocation,
        builder: (BuildContext context, GoRouterState state) =>
            const NotesScreen(),
      ),
      GoRoute(
        path: '/verify-restart',
        redirect: (BuildContext context, GoRouterState state) =>
            kmNotesLocation,
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
}
